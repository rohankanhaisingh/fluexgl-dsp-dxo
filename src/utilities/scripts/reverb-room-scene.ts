import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface ReverbSceneParameters {
    /** 0 to 1. */
    roomSize: number;
    /** 0 to 1. */
    damping: number;
    stereoSpreadMs: number;
    /** 0 to 1. */
    mix: number;
}

/** A snapshot of the signal that drives the particles. */
export interface ReverbSignalFrame {
    /** RMS level (linear) of the left and right channel. */
    levels: number[];
    /** Share of high frequencies in the signal, between 0 and 1. */
    brightness: number;
}

export type ReverbSignalReader = () => ReverbSignalFrame | null;

export interface ReverbSceneColors {
    accent: string;
    muted: string;
}

/**
 * Decay time (RT60, seconds) of the FluexGL DSP reverb at damping 0.5, measured by feeding an
 * impulse through the WASM reverb at these room sizes. Values in between are interpolated.
 */
const MEASURED_DECAY: [number, number][] = [
    [0, 0.28], [0.1, 0.31], [0.3, 0.41], [0.5, 0.57], [0.7, 0.9], [0.85, 1.54], [0.95, 2.82], [1, 4.85]
];

/**
 * Estimates the decay time (seconds) of the reverb. Damping mainly shortens the high frequencies,
 * but also the broadband decay slightly: at damping 0 it is about 14% longer, at damping 1 about 2% shorter.
 */
export function estimateReverbDecay(roomSize: number, damping: number): number {

    const size: number = THREE.MathUtils.clamp(roomSize, 0, 1);

    let decay: number = MEASURED_DECAY[MEASURED_DECAY.length - 1][1];

    for (let i = 1; i < MEASURED_DECAY.length; i++) {

        const [x0, y0] = MEASURED_DECAY[i - 1],
            [x1, y1] = MEASURED_DECAY[i];

        if (size <= x1) {
            // Interpolated in the log domain, because the decay grows exponentially towards size 1.
            const t: number = (size - x0) / (x1 - x0);
            decay = Math.exp(Math.log(y0) + t * (Math.log(y1) - Math.log(y0)));
            break;
        }
    }

    return decay * (1.14 - 0.16 * THREE.MathUtils.clamp(damping, 0, 1));
}

const PARTICLE_COUNT: number = 1800;
/** Particles per second, per channel, at full level. */
const EMISSION_RATE: number = 900;
/** Extra particles for a transient (a drum hit, a plucked note) at full strength. */
const ONSET_PARTICLES: number = 260;
/** How far the fast envelope must rise above the slow one to count as a transient. */
const ONSET_THRESHOLD: number = 0.1;
const ONSET_COOLDOWN: number = 0.09;
/** Below this (normalized) level a channel counts as silent. */
const SILENCE_LEVEL: number = 0.08;
/** After this much silence (seconds), the scene plays preview impulses so the room is never empty. */
const PREVIEW_AFTER_SILENCE: number = 1.5;
const PREVIEW_PARTICLES: number = 300;
/** Energy below which a particle is considered dead. */
const MIN_PARTICLE_ENERGY: number = 0.003;
/** Visual speed of sound, in scene units per second. */
const PARTICLE_SPEED: number = 10;
const STREAK_LENGTH: number = 0.07;
const EMITTER_HEIGHT: number = 1.4;

/** Index of each wall in the hit intensity array: -x, +x, floor, ceiling, -z, +z. */
const WALL_COUNT: number = 6;

interface RoomDimensions {
    width: number;
    height: number;
    depth: number;
}

function dimensionsForSize(roomSize: number): RoomDimensions {
    return {
        width: 6 + roomSize * 18,
        height: 3 + roomSize * 6,
        depth: 5 + roomSize * 14
    };
}

function createDotTexture(): THREE.Texture {

    const canvas: HTMLCanvasElement = document.createElement("canvas");
    canvas.width = canvas.height = 64;

    const ctx = canvas.getContext("2d")!,
        gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);

    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.35, "rgba(255,255,255,0.6)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
}

/**
 * A 3D visualisation of the reverb, driven by the signal: the left and right emitter release
 * sound particles along with the level of their channel, plus an extra burst on every transient.
 * The particles bounce through a room that scales with the room size, lose their high frequencies
 * (white turns into the accent color) with damping, and fade out over the estimated decay time.
 */
export class ReverbRoomScene {

    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene = new THREE.Scene();
    private camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
    private controls: OrbitControls;
    private resizeObserver: ResizeObserver;
    private frameId: number = 0;
    private clock: THREE.Clock = new THREE.Clock();

    private parameters: ReverbSceneParameters;
    private dimensions: RoomDimensions;

    private highColor: THREE.Color = new THREE.Color("#eaf6ff");
    private lowColor: THREE.Color = new THREE.Color("#FFA646");

    private roomEdges: THREE.LineSegments;
    private floorGrid: THREE.GridHelper;
    private walls: THREE.Mesh[] = [];
    private wallHits: Float32Array = new Float32Array(WALL_COUNT);

    private emitters: THREE.Mesh[] = [];
    private emitterRings: THREE.Mesh[] = [];

    private positions: Float32Array = new Float32Array(PARTICLE_COUNT * 3);
    private velocities: Float32Array = new Float32Array(PARTICLE_COUNT * 3);
    /** Remaining high frequency content of each particle, 1 is bright, 0 fully damped. */
    private brightness: Float32Array = new Float32Array(PARTICLE_COUNT);
    /** Level of the signal at the moment the particle was emitted. */
    private birthEnergy: Float32Array = new Float32Array(PARTICLE_COUNT);
    /** Seconds since emission; Infinity for unused particles. */
    private ages: Float32Array = new Float32Array(PARTICLE_COUNT).fill(Infinity);
    private nextParticle: number = 0;
    private particleColors: Float32Array = new Float32Array(PARTICLE_COUNT * 3);
    private streakPositions: Float32Array = new Float32Array(PARTICLE_COUNT * 6);
    private streakColors: Float32Array = new Float32Array(PARTICLE_COUNT * 6);

    private points: THREE.Points;
    private streaks: THREE.LineSegments;
    private dotTexture: THREE.Texture = createDotTexture();

    private signalReader: ReverbSignalReader | null = null;
    private fastEnvelopes: number[] = [0, 0];
    private slowEnvelopes: number[] = [0, 0];
    private emissionCarry: number[] = [0, 0];
    private onsetCooldowns: number[] = [0, 0];
    private ringAges: number[] = [Infinity, Infinity];
    private ringStrengths: number[] = [0, 0];
    private silentFor: number = Infinity;
    private previewTimer: number = Infinity;

    private container: HTMLElement;

    constructor(container: HTMLElement, parameters: ReverbSceneParameters) {

        this.container = container;
        this.parameters = { ...parameters };
        this.dimensions = dimensionsForSize(parameters.roomSize);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setClearColor(0x000000, 0);
        container.appendChild(this.renderer.domElement);

        this.camera.position.set(14, 11, 18);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.target.set(0, this.dimensions.height * 0.35, 0);
        this.controls.enableDamping = true;
        this.controls.enableZoom = false;
        this.controls.enablePan = false;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.5;
        this.controls.minPolarAngle = 0.25;
        this.controls.maxPolarAngle = Math.PI * 0.48;

        // Room outline and floor, built at unit size and scaled to the room dimensions.
        this.roomEdges = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
            new THREE.LineBasicMaterial({ transparent: true, opacity: 0.55 })
        );
        this.scene.add(this.roomEdges);

        this.floorGrid = new THREE.GridHelper(1, 16);

        // GridHelper colors its lines with vertex colors; a single material color follows the theme instead.
        const gridMaterial = this.floorGrid.material as THREE.LineBasicMaterial;
        gridMaterial.vertexColors = false;
        gridMaterial.transparent = true;
        gridMaterial.opacity = 0.16;
        this.scene.add(this.floorGrid);

        for (let i = 0; i < WALL_COUNT; i++) {

            const wall = new THREE.Mesh(
                new THREE.PlaneGeometry(1, 1),
                new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
            );

            this.walls.push(wall);
            this.scene.add(wall);
        }

        for (let i = 0; i < 2; i++) {

            const emitter = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 16), new THREE.MeshBasicMaterial());
            const ring = new THREE.Mesh(
                new THREE.RingGeometry(0.3, 0.38, 48),
                new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
            );

            this.emitters.push(emitter);
            this.emitterRings.push(ring);
            this.scene.add(emitter, ring);
        }

        const pointGeometry = new THREE.BufferGeometry();
        pointGeometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
        pointGeometry.setAttribute("color", new THREE.BufferAttribute(this.particleColors, 3));

        this.points = new THREE.Points(pointGeometry, new THREE.PointsMaterial({
            size: 0.35,
            map: this.dotTexture,
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        }));
        this.points.frustumCulled = false;

        const streakGeometry = new THREE.BufferGeometry();
        streakGeometry.setAttribute("position", new THREE.BufferAttribute(this.streakPositions, 3));
        streakGeometry.setAttribute("color", new THREE.BufferAttribute(this.streakColors, 3));

        this.streaks = new THREE.LineSegments(streakGeometry, new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        }));
        this.streaks.frustumCulled = false;

        this.scene.add(this.points, this.streaks);

        this.applyDimensions();

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        this.resize();

        this.frameId = window.requestAnimationFrame(this.render);
    }

    setParameters(parameters: ReverbSceneParameters) {
        this.parameters = { ...parameters };
    }

    /**
     * Sets where the signal comes from. Without a reader (or while it is silent),
     * the scene plays preview impulses instead.
     */
    setSignalReader(reader: ReverbSignalReader | null) {
        this.signalReader = reader;
    }

    /** True while the signal drives the particles, false while preview impulses play. */
    get hasSignal(): boolean {
        return this.silentFor < PREVIEW_AFTER_SILENCE;
    }

    setColors(colors: ReverbSceneColors) {

        this.lowColor.set(colors.accent);

        const muted = new THREE.Color(colors.muted);

        (this.roomEdges.material as THREE.LineBasicMaterial).color.copy(muted);
        (this.floorGrid.material as THREE.LineBasicMaterial).color.copy(muted);

        for (const wall of this.walls)
            (wall.material as THREE.MeshBasicMaterial).color.set(colors.accent);

        for (const emitter of this.emitters)
            (emitter.material as THREE.MeshBasicMaterial).color.set(colors.accent);

        for (const ring of this.emitterRings)
            (ring.material as THREE.MeshBasicMaterial).color.set(colors.accent);
    }

    dispose() {

        window.cancelAnimationFrame(this.frameId);
        this.resizeObserver.disconnect();
        this.controls.dispose();

        this.scene.traverse(function (object) {

            const mesh = object as THREE.Mesh;

            mesh.geometry?.dispose();

            const material = mesh.material as THREE.Material | THREE.Material[] | undefined;

            if (Array.isArray(material)) material.forEach(m => m.dispose());
            else material?.dispose();
        });

        this.dotTexture.dispose();
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }

    private resize() {

        const width: number = this.container.clientWidth,
            height: number = this.container.clientHeight;

        if (width === 0 || height === 0) return;

        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    private emitterPosition(side: number, target: THREE.Vector3): THREE.Vector3 {

        // The stereo spread delays one side, which is shown as the emitters moving apart.
        const spread: number = THREE.MathUtils.clamp(this.parameters.stereoSpreadMs / 100, 0, 1),
            offset: number = 0.35 + spread * this.dimensions.width * 0.3;

        return target.set(side === 0 ? -offset : offset, Math.min(EMITTER_HEIGHT, this.dimensions.height * 0.45), 0);
    }

    private applyDimensions() {

        const { width, height, depth } = this.dimensions;

        this.roomEdges.scale.set(width, height, depth);
        this.roomEdges.position.set(0, height / 2, 0);

        this.floorGrid.scale.set(width, 1, depth);

        const halfWidth: number = width / 2,
            halfDepth: number = depth / 2;

        // -x, +x, floor, ceiling, -z, +z
        const placements: [THREE.Vector3, THREE.Euler, number, number][] = [
            [new THREE.Vector3(-halfWidth, height / 2, 0), new THREE.Euler(0, Math.PI / 2, 0), depth, height],
            [new THREE.Vector3(halfWidth, height / 2, 0), new THREE.Euler(0, -Math.PI / 2, 0), depth, height],
            [new THREE.Vector3(0, 0.001, 0), new THREE.Euler(-Math.PI / 2, 0, 0), width, depth],
            [new THREE.Vector3(0, height, 0), new THREE.Euler(Math.PI / 2, 0, 0), width, depth],
            [new THREE.Vector3(0, height / 2, -halfDepth), new THREE.Euler(0, 0, 0), width, height],
            [new THREE.Vector3(0, height / 2, halfDepth), new THREE.Euler(0, Math.PI, 0), width, height]
        ];

        placements.forEach(([position, rotation, scaleX, scaleY], i) => {
            this.walls[i].position.copy(position);
            this.walls[i].rotation.copy(rotation);
            this.walls[i].scale.set(scaleX, scaleY, 1);
        });

        const position = new THREE.Vector3();

        this.emitters.forEach((emitter, side) => {
            emitter.position.copy(this.emitterPosition(side, position));
            this.emitterRings[side].position.copy(emitter.position);
        });
    }

    /**
     * Emits particles from one side. The pool is a ring buffer, so when it is full the oldest
     * (and therefore faintest) particles are reused first.
     */
    private emit(side: number, count: number, energy: number, brightness: number) {

        const origin = this.emitterPosition(side, new THREE.Vector3()),
            direction = new THREE.Vector3();

        for (let n = 0; n < count; n++) {

            const i: number = this.nextParticle,
                p: number = i * 3;

            this.nextParticle = (i + 1) % PARTICLE_COUNT;

            direction.randomDirection().multiplyScalar(PARTICLE_SPEED * (0.9 + Math.random() * 0.2));

            this.positions[p] = origin.x;
            this.positions[p + 1] = origin.y;
            this.positions[p + 2] = origin.z;
            this.velocities[p] = direction.x;
            this.velocities[p + 1] = direction.y;
            this.velocities[p + 2] = direction.z;

            this.brightness[i] = brightness;
            this.birthEnergy[i] = energy;
            this.ages[i] = 0;
        }
    }

    private startRing(side: number, strength: number) {
        this.ringAges[side] = 0;
        this.ringStrengths[side] = THREE.MathUtils.clamp(strength, 0, 1);
    }

    /**
     * Reads the signal and emits particles: a steady stream that follows the level of each
     * channel, plus an extra burst on every transient. Without signal, preview impulses play.
     */
    private updateEmission(deltaTime: number, decay: number) {

        const frame: ReverbSignalFrame | null = this.signalReader?.() ?? null,
            birthBrightness: number = 0.3 + 0.7 * THREE.MathUtils.clamp(frame?.brightness ?? 0, 0, 1),
            fastFollow: number = 1 - Math.exp(-deltaTime * 30),
            slowFollow: number = 1 - Math.exp(-deltaTime * 3);

        let active: boolean = false;

        for (let side = 0; side < 2; side++) {

            const rms: number = frame?.levels[side] ?? frame?.levels[0] ?? 0,
                // -60 dBFS maps to 0, -6 dBFS to 1.
                level: number = THREE.MathUtils.clamp((20 * Math.log10(Math.max(rms, 1e-6)) + 60) / 54, 0, 1);

            this.fastEnvelopes[side] += (level - this.fastEnvelopes[side]) * fastFollow;
            this.slowEnvelopes[side] += (level - this.slowEnvelopes[side]) * slowFollow;
            this.onsetCooldowns[side] -= deltaTime;

            if (level > SILENCE_LEVEL) active = true;

            // Squared, so quiet passages emit a sparse trickle and loud passages a dense stream.
            this.emissionCarry[side] += level * level * EMISSION_RATE * deltaTime;

            const count: number = Math.floor(this.emissionCarry[side]);

            this.emissionCarry[side] -= count;
            this.emit(side, count, level, birthBrightness);

            const rise: number = this.fastEnvelopes[side] - this.slowEnvelopes[side];

            if (rise > ONSET_THRESHOLD && this.onsetCooldowns[side] <= 0) {
                this.emit(side, Math.round(ONSET_PARTICLES * Math.min(1, rise * 3)), this.fastEnvelopes[side], birthBrightness);
                this.startRing(side, this.fastEnvelopes[side]);
                this.onsetCooldowns[side] = ONSET_COOLDOWN;
            }

            // The emitters pump along with their channel, like a speaker cone.
            this.emitters[side].scale.setScalar(1 + this.fastEnvelopes[side] * 1.2);
        }

        this.silentFor = active ? 0 : this.silentFor + deltaTime;

        if (this.hasSignal) {
            this.previewTimer = Infinity;
            return;
        }

        // A new preview impulse once the previous tail has (almost) died out.
        this.previewTimer += deltaTime;

        if (this.previewTimer > Math.min(6, Math.max(1.3, decay * 1.1 + 0.35))) {

            for (let side = 0; side < 2; side++) {
                this.emit(side, PREVIEW_PARTICLES, 0.45, 1);
                this.startRing(side, 0.6);
            }

            this.previewTimer = 0;
        }
    }

    private updateCamera() {

        const largest: RoomDimensions = dimensionsForSize(1);

        // Partly fitted to the current room and partly to the largest room, so a small room
        // still looks small, while a large room stays in view.
        const fit = (d: RoomDimensions) => Math.max(d.width, d.depth, d.height * 1.6) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
        const distance: number = (fit(this.dimensions) * 0.65 + fit(largest) * 0.35) * 1.15;

        this.controls.target.set(0, this.dimensions.height * 0.35, 0);

        const offset = this.camera.position.clone().sub(this.controls.target).setLength(distance);
        this.camera.position.copy(this.controls.target).add(offset);
    }

    private render = () => {

        this.frameId = window.requestAnimationFrame(this.render);

        const deltaTime: number = Math.min(this.clock.getDelta(), 0.05),
            { roomSize, damping, mix } = this.parameters,
            decay: number = estimateReverbDecay(roomSize, damping);

        // Smoothly follow the room size, so turning the knob morphs the room.
        const target: RoomDimensions = dimensionsForSize(roomSize),
            follow: number = 1 - Math.exp(-deltaTime * 8);

        this.dimensions = {
            width: THREE.MathUtils.lerp(this.dimensions.width, target.width, follow),
            height: THREE.MathUtils.lerp(this.dimensions.height, target.height, follow),
            depth: THREE.MathUtils.lerp(this.dimensions.depth, target.depth, follow)
        };

        this.applyDimensions();
        this.updateCamera();

        this.updateEmission(deltaTime, decay);

        // The mix sets how loud the wet signal is.
        const wet: number = 0.15 + 0.85 * mix,
            brightnessLoss: number = 1 - damping * 0.45,
            halfWidth: number = this.dimensions.width / 2,
            halfDepth: number = this.dimensions.depth / 2,
            height: number = this.dimensions.height,
            color = new THREE.Color();

        for (let i = 0; i < PARTICLE_COUNT; i++) {

            const p: number = i * 3,
                s: number = i * 6;

            if (this.ages[i] === Infinity) continue;

            this.ages[i] += deltaTime;

            // Every particle falls 60 dB over the decay time, from the level it was emitted at.
            const energy: number = this.birthEnergy[i] * Math.exp(-6.91 * this.ages[i] / decay) * wet;

            if (energy < MIN_PARTICLE_ENERGY) {
                this.ages[i] = Infinity;
                this.particleColors.fill(0, p, p + 3);
                this.streakColors.fill(0, s, s + 6);
                continue;
            }

            let x = this.positions[p] + this.velocities[p] * deltaTime,
                y = this.positions[p + 1] + this.velocities[p + 1] * deltaTime,
                z = this.positions[p + 2] + this.velocities[p + 2] * deltaTime;

            let bounced: number = -1;

            if (x < -halfWidth) { x = -halfWidth; this.velocities[p] *= -1; bounced = 0; }
            else if (x > halfWidth) { x = halfWidth; this.velocities[p] *= -1; bounced = 1; }

            if (y < 0) { y = 0; this.velocities[p + 1] *= -1; bounced = 2; }
            else if (y > height) { y = height; this.velocities[p + 1] *= -1; bounced = 3; }

            if (z < -halfDepth) { z = -halfDepth; this.velocities[p + 2] *= -1; bounced = 4; }
            else if (z > halfDepth) { z = halfDepth; this.velocities[p + 2] *= -1; bounced = 5; }

            if (bounced !== -1) {
                // Every reflection absorbs high frequencies, more with more damping.
                this.brightness[i] *= brightnessLoss;
                this.wallHits[bounced] += energy * 0.004;
            }

            this.positions[p] = x;
            this.positions[p + 1] = y;
            this.positions[p + 2] = z;

            color.copy(this.lowColor).lerp(this.highColor, this.brightness[i]).multiplyScalar(energy);

            this.particleColors[p] = color.r;
            this.particleColors[p + 1] = color.g;
            this.particleColors[p + 2] = color.b;

            // A short streak behind each particle: bright at the head, black (invisible) at the tail.
            this.streakPositions[s] = x;
            this.streakPositions[s + 1] = y;
            this.streakPositions[s + 2] = z;
            this.streakPositions[s + 3] = x - this.velocities[p] * STREAK_LENGTH;
            this.streakPositions[s + 4] = y - this.velocities[p + 1] * STREAK_LENGTH;
            this.streakPositions[s + 5] = z - this.velocities[p + 2] * STREAK_LENGTH;

            this.streakColors[s] = color.r * 0.6;
            this.streakColors[s + 1] = color.g * 0.6;
            this.streakColors[s + 2] = color.b * 0.6;
            this.streakColors[s + 3] = 0;
            this.streakColors[s + 4] = 0;
            this.streakColors[s + 5] = 0;
        }

        this.points.geometry.attributes.position.needsUpdate = true;
        this.points.geometry.attributes.color.needsUpdate = true;
        this.streaks.geometry.attributes.position.needsUpdate = true;
        this.streaks.geometry.attributes.color.needsUpdate = true;

        const wallFade: number = Math.exp(-deltaTime * 5);

        for (let i = 0; i < WALL_COUNT; i++) {
            this.wallHits[i] *= wallFade;
            (this.walls[i].material as THREE.MeshBasicMaterial).opacity = Math.min(0.35, this.wallHits[i]);
        }

        // The direct (dry) signal: a ring that expands from an emitter on every transient.
        this.emitterRings.forEach((ring, side) => {

            this.ringAges[side] += deltaTime;

            const progress: number = Math.min(1, this.ringAges[side] / 0.5);

            ring.scale.setScalar(1 + progress * 5);
            ring.lookAt(this.camera.position);
            (ring.material as THREE.MeshBasicMaterial).opacity = (1 - progress) * this.ringStrengths[side] * (0.3 + 0.7 * (1 - mix));
        });

        // The room outline glows along with the overall level.
        const overallLevel: number = Math.max(this.fastEnvelopes[0], this.fastEnvelopes[1]);
        (this.roomEdges.material as THREE.LineBasicMaterial).opacity = 0.4 + 0.45 * overallLevel;

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    };
}
