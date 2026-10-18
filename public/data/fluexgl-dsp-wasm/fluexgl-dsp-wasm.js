import {TextDecoder} from "text-decoding";void 0===globalThis.crypto&&(globalThis.crypto={}),"function"!=typeof globalThis.crypto.getRandomValues&&(globalThis.crypto.getRandomValues=function(o){for(let t=0;t<o.length;t++)o[t]=Math.floor(256*Math.random());return o}); let wasm_bindgen;
(function() {
    const __exports = {};
    let script_src;
    if (typeof document !== 'undefined' && document.currentScript !== null) {
        script_src = new URL(document.currentScript.src, location.href).toString();
    }
    let wasm = undefined;

    let cachedUint8ArrayMemory0 = null;

    function getUint8ArrayMemory0() {
        if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
            cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
        }
        return cachedUint8ArrayMemory0;
    }

    function getArrayU8FromWasm0(ptr, len) {
        ptr = ptr >>> 0;
        return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
    }

    let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

    cachedTextDecoder.decode();

    function decodeText(ptr, len) {
        return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
    }

    function getStringFromWasm0(ptr, len) {
        ptr = ptr >>> 0;
        return decodeText(ptr, len);
    }

    let cachedFloat32ArrayMemory0 = null;

    function getFloat32ArrayMemory0() {
        if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
            cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
        }
        return cachedFloat32ArrayMemory0;
    }

    let WASM_VECTOR_LEN = 0;

    function passArrayF32ToWasm0(arg, malloc) {
        const ptr = malloc(arg.length * 4, 4) >>> 0;
        getFloat32ArrayMemory0().set(arg, ptr / 4);
        WASM_VECTOR_LEN = arg.length;
        return ptr;
    }

    const AdvancedDelayFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_advanceddelay_free(ptr >>> 0, 1));
    /**
     * A stereo delay engine used by the MonoDelay, StereoDelay, PingPongDelay and
     * AdvancedDelay processors. The behaviour depends on the mode:
     *
     * - Stereo (0): left and right are delayed independently. `cross_feedback`
     *   blends the feedback of each side into the other.
     * - Mono (1): the input is summed to mono and fed through a single delay line.
     *   The echoes are identical on both channels.
     * - Ping-pong (2): the input is summed to mono and enters the left line. Every
     *   repeat crosses over to the other side, so echoes bounce left and right.
     *
     * The feedback path contains an optional low cut (highpass), high cut
     * (lowpass) and soft saturation, so repeats can get darker and warmer over time.
     * The delay time can be modulated by a sine LFO for chorus-like or tape wow effects.
     */
    class AdvancedDelay {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            AdvancedDelayFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_advanceddelay_free(ptr, 0);
        }
        /**
         * @returns {number}
         */
        get_low_cut() {
            const ret = wasm.advanceddelay_get_low_cut(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} low_cut_hz
         */
        set_low_cut(low_cut_hz) {
            wasm.advanceddelay_set_low_cut(this.__wbg_ptr, low_cut_hz);
        }
        /**
         * @returns {number}
         */
        get_feedback() {
            const ret = wasm.advanceddelay_get_feedback(this.__wbg_ptr);
            return ret;
        }
        /**
         * @returns {number}
         */
        get_high_cut() {
            const ret = wasm.advanceddelay_get_high_cut(this.__wbg_ptr);
            return ret;
        }
        /**
         * @returns {number}
         */
        get_mod_rate() {
            const ret = wasm.advanceddelay_get_mod_rate(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} feedback
         */
        set_feedback(feedback) {
            wasm.advanceddelay_set_feedback(this.__wbg_ptr, feedback);
        }
        /**
         * @param {number} high_cut_hz
         */
        set_high_cut(high_cut_hz) {
            wasm.advanceddelay_set_high_cut(this.__wbg_ptr, high_cut_hz);
        }
        /**
         * @param {number} mod_rate_hz
         */
        set_mod_rate(mod_rate_hz) {
            wasm.advanceddelay_set_mod_rate(this.__wbg_ptr, mod_rate_hz);
        }
        /**
         * @returns {number}
         */
        get_mod_depth() {
            const ret = wasm.advanceddelay_get_mod_depth(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} mod_depth_ms
         */
        set_mod_depth(mod_depth_ms) {
            wasm.advanceddelay_set_mod_depth(this.__wbg_ptr, mod_depth_ms);
        }
        /**
         * @returns {number}
         */
        get_delay_left_ms() {
            const ret = wasm.advanceddelay_get_delay_left_ms(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} delay_ms
         */
        set_delay_left_ms(delay_ms) {
            wasm.advanceddelay_set_delay_left_ms(this.__wbg_ptr, delay_ms);
        }
        /**
         * @returns {number}
         */
        get_cross_feedback() {
            const ret = wasm.advanceddelay_get_cross_feedback(this.__wbg_ptr);
            return ret;
        }
        /**
         * @returns {number}
         */
        get_delay_right_ms() {
            const ret = wasm.advanceddelay_get_delay_right_ms(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} cross_feedback
         */
        set_cross_feedback(cross_feedback) {
            wasm.advanceddelay_set_cross_feedback(this.__wbg_ptr, cross_feedback);
        }
        /**
         * @param {number} delay_ms
         */
        set_delay_right_ms(delay_ms) {
            wasm.advanceddelay_set_delay_right_ms(this.__wbg_ptr, delay_ms);
        }
        /**
         * @param {number} sample_rate
         * @param {number} mode
         * @param {number} delay_left_ms
         * @param {number} delay_right_ms
         * @param {number} feedback
         * @param {number} cross_feedback
         * @param {number} mix
         * @param {number} low_cut_hz
         * @param {number} high_cut_hz
         * @param {number} mod_rate_hz
         * @param {number} mod_depth_ms
         * @param {number} drive
         */
        constructor(sample_rate, mode, delay_left_ms, delay_right_ms, feedback, cross_feedback, mix, low_cut_hz, high_cut_hz, mod_rate_hz, mod_depth_ms, drive) {
            const ret = wasm.advanceddelay_new(sample_rate, mode, delay_left_ms, delay_right_ms, feedback, cross_feedback, mix, low_cut_hz, high_cut_hz, mod_rate_hz, mod_depth_ms, drive);
            this.__wbg_ptr = ret >>> 0;
            AdvancedDelayFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        reset() {
            wasm.advanceddelay_reset(this.__wbg_ptr);
        }
        /**
         * @returns {number}
         */
        get_mix() {
            const ret = wasm.advanceddelay_get_mix(this.__wbg_ptr);
            return ret;
        }
        /**
         * Processes a stereo block in place. Both buffers must have the same length;
         * for a mono input, pass a copy of the same channel as `right`.
         * @param {Float32Array} left
         * @param {Float32Array} right
         */
        process(left, right) {
            var ptr0 = passArrayF32ToWasm0(left, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            var ptr1 = passArrayF32ToWasm0(right, wasm.__wbindgen_malloc);
            var len1 = WASM_VECTOR_LEN;
            wasm.advanceddelay_process(this.__wbg_ptr, ptr0, len0, left, ptr1, len1, right);
        }
        /**
         * @param {number} mix
         */
        set_mix(mix) {
            wasm.advanceddelay_set_mix(this.__wbg_ptr, mix);
        }
        /**
         * @returns {number}
         */
        get_mode() {
            const ret = wasm.advanceddelay_get_mode(this.__wbg_ptr);
            return ret >>> 0;
        }
        /**
         * @param {number} mode
         */
        set_mode(mode) {
            wasm.advanceddelay_set_mode(this.__wbg_ptr, mode);
        }
        /**
         * @returns {number}
         */
        get_drive() {
            const ret = wasm.advanceddelay_get_drive(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} drive
         */
        set_drive(drive) {
            wasm.advanceddelay_set_drive(this.__wbg_ptr, drive);
        }
    }
    if (Symbol.dispose) AdvancedDelay.prototype[Symbol.dispose] = AdvancedDelay.prototype.free;

    __exports.AdvancedDelay = AdvancedDelay;

    const BandPassFilterFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_bandpassfilter_free(ptr >>> 0, 1));

    class BandPassFilter {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            BandPassFilterFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_bandpassfilter_free(ptr, 0);
        }
        /**
         * @param {number} cutoff
         */
        set_cutoff(cutoff) {
            wasm.bandpassfilter_set_cutoff(this.__wbg_ptr, cutoff);
        }
        /**
         * @param {number} min_freq
         */
        set_min_freq(min_freq) {
            wasm.bandpassfilter_set_min_freq(this.__wbg_ptr, min_freq);
        }
        /**
         * @param {number} sample_rate
         */
        set_sample_rate(sample_rate) {
            wasm.bandpassfilter_set_sample_rate(this.__wbg_ptr, sample_rate);
        }
        /**
         * @param {number} sample_rate
         * @param {number} cutoff
         * @param {number} q
         */
        constructor(sample_rate, cutoff, q) {
            const ret = wasm.bandpassfilter_new(sample_rate, cutoff, q);
            this.__wbg_ptr = ret >>> 0;
            BandPassFilterFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        reset() {
            wasm.bandpassfilter_reset(this.__wbg_ptr);
        }
        /**
         * @param {number} q
         */
        set_q(q) {
            wasm.bandpassfilter_set_q(this.__wbg_ptr, q);
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.bandpassfilter_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
    }
    if (Symbol.dispose) BandPassFilter.prototype[Symbol.dispose] = BandPassFilter.prototype.free;

    __exports.BandPassFilter = BandPassFilter;

    const ChorusFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_chorus_free(ptr >>> 0, 1));

    class Chorus {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            ChorusFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_chorus_free(ptr, 0);
        }
        /**
         * @returns {number}
         */
        get_rate_hz() {
            const ret = wasm.chorus_get_rate_hz(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} rate_hz
         */
        set_rate_hz(rate_hz) {
            wasm.chorus_set_rate_hz(this.__wbg_ptr, rate_hz);
        }
        /**
         * @returns {number}
         */
        get_depth_ms() {
            const ret = wasm.chorus_get_depth_ms(this.__wbg_ptr);
            return ret;
        }
        /**
         * @returns {number}
         */
        get_feedback() {
            const ret = wasm.chorus_get_feedback(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} depth_ms
         */
        set_depth_ms(depth_ms) {
            wasm.chorus_set_depth_ms(this.__wbg_ptr, depth_ms);
        }
        /**
         * @param {number} feedback
         */
        set_feedback(feedback) {
            wasm.chorus_set_feedback(this.__wbg_ptr, feedback);
        }
        /**
         * @param {number} phase
         */
        set_phase_offset(phase) {
            wasm.chorus_set_phase_offset(this.__wbg_ptr, phase);
        }
        /**
         * @returns {number}
         */
        get_base_delay_ms() {
            const ret = wasm.chorus_get_base_delay_ms(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} base_delay_ms
         */
        set_base_delay_ms(base_delay_ms) {
            wasm.chorus_set_base_delay_ms(this.__wbg_ptr, base_delay_ms);
        }
        /**
         * @param {number} sample_rate
         * @param {number} base_delay_ms
         * @param {number} depth_ms
         * @param {number} rate_hz
         * @param {number} mix
         * @param {number} feedback
         */
        constructor(sample_rate, base_delay_ms, depth_ms, rate_hz, mix, feedback) {
            const ret = wasm.chorus_new(sample_rate, base_delay_ms, depth_ms, rate_hz, mix, feedback);
            this.__wbg_ptr = ret >>> 0;
            ChorusFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        /**
         * @returns {number}
         */
        get_mix() {
            const ret = wasm.chorus_get_mix(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.chorus_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
        /**
         * @param {number} mix
         */
        set_mix(mix) {
            wasm.chorus_set_mix(this.__wbg_ptr, mix);
        }
    }
    if (Symbol.dispose) Chorus.prototype[Symbol.dispose] = Chorus.prototype.free;

    __exports.Chorus = Chorus;

    const DelayFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_delay_free(ptr >>> 0, 1));

    class Delay {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            DelayFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_delay_free(ptr, 0);
        }
        /**
         * @returns {number}
         */
        get_delay_ms() {
            const ret = wasm.delay_get_delay_ms(this.__wbg_ptr);
            return ret;
        }
        /**
         * @returns {number}
         */
        get_feedback() {
            const ret = wasm.delay_get_feedback(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} delay_ms
         */
        set_delay_ms(delay_ms) {
            wasm.delay_set_delay_ms(this.__wbg_ptr, delay_ms);
        }
        /**
         * @param {number} feedback
         */
        set_feedback(feedback) {
            wasm.delay_set_feedback(this.__wbg_ptr, feedback);
        }
        /**
         * @param {number} sample_rate
         */
        set_sample_rate(sample_rate) {
            wasm.delay_set_sample_rate(this.__wbg_ptr, sample_rate);
        }
        /**
         * @param {number} sample_rate
         * @param {number} delay_ms
         * @param {number} feedback
         * @param {number} mix
         */
        constructor(sample_rate, delay_ms, feedback, mix) {
            const ret = wasm.delay_new(sample_rate, delay_ms, feedback, mix);
            this.__wbg_ptr = ret >>> 0;
            DelayFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        reset() {
            wasm.delay_reset(this.__wbg_ptr);
        }
        /**
         * @returns {number}
         */
        get_mix() {
            const ret = wasm.delay_get_mix(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.delay_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
        /**
         * @param {number} mix
         */
        set_mix(mix) {
            wasm.delay_set_mix(this.__wbg_ptr, mix);
        }
    }
    if (Symbol.dispose) Delay.prototype[Symbol.dispose] = Delay.prototype.free;

    __exports.Delay = Delay;

    const EqualizerFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_equalizer_free(ptr >>> 0, 1));
    /**
     * A parametric equalizer with up to eight bands, processed in series.
     *
     * Band types: 0 = peaking, 1 = low shelf, 2 = high shelf, 3 = lowpass,
     * 4 = highpass, 5 = notch, 6 = bandpass. The gain only applies to the
     * peaking and shelf types.
     */
    class Equalizer {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            EqualizerFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_equalizer_free(ptr, 0);
        }
        /**
         * @returns {number}
         */
        get_band_count() {
            const ret = wasm.equalizer_get_band_count(this.__wbg_ptr);
            return ret >>> 0;
        }
        /**
         * @returns {number}
         */
        get_output_gain() {
            const ret = wasm.equalizer_get_output_gain(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} gain_db
         */
        set_output_gain(gain_db) {
            wasm.equalizer_set_output_gain(this.__wbg_ptr, gain_db);
        }
        /**
         * @param {number} sample_rate
         */
        constructor(sample_rate) {
            const ret = wasm.equalizer_new(sample_rate);
            this.__wbg_ptr = ret >>> 0;
            EqualizerFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        reset() {
            wasm.equalizer_reset(this.__wbg_ptr);
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.equalizer_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
        /**
         * Configures a band. Indices outside 0..8 are ignored. The filter state of the
         * band is kept, so changing a band while audio plays does not click.
         * @param {number} index
         * @param {number} band_type
         * @param {number} frequency
         * @param {number} gain_db
         * @param {number} q
         * @param {boolean} enabled
         */
        set_band(index, band_type, frequency, gain_db, q, enabled) {
            wasm.equalizer_set_band(this.__wbg_ptr, index, band_type, frequency, gain_db, q, enabled);
        }
    }
    if (Symbol.dispose) Equalizer.prototype[Symbol.dispose] = Equalizer.prototype.free;

    __exports.Equalizer = Equalizer;

    const FlangerFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_flanger_free(ptr >>> 0, 1));

    class Flanger {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            FlangerFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_flanger_free(ptr, 0);
        }
        /**
         * @returns {number}
         */
        get_rate_hz() {
            const ret = wasm.chorus_get_rate_hz(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} rate_hz
         */
        set_rate_hz(rate_hz) {
            wasm.chorus_set_rate_hz(this.__wbg_ptr, rate_hz);
        }
        /**
         * @returns {number}
         */
        get_depth_ms() {
            const ret = wasm.chorus_get_depth_ms(this.__wbg_ptr);
            return ret;
        }
        /**
         * @returns {number}
         */
        get_feedback() {
            const ret = wasm.chorus_get_feedback(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} depth_ms
         */
        set_depth_ms(depth_ms) {
            wasm.flanger_set_depth_ms(this.__wbg_ptr, depth_ms);
        }
        /**
         * @param {number} feedback
         */
        set_feedback(feedback) {
            wasm.chorus_set_feedback(this.__wbg_ptr, feedback);
        }
        /**
         * @param {number} phase
         */
        set_phase_offset(phase) {
            wasm.chorus_set_phase_offset(this.__wbg_ptr, phase);
        }
        /**
         * @returns {number}
         */
        get_base_delay_ms() {
            const ret = wasm.chorus_get_base_delay_ms(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} base_delay_ms
         */
        set_base_delay_ms(base_delay_ms) {
            wasm.flanger_set_base_delay_ms(this.__wbg_ptr, base_delay_ms);
        }
        /**
         * @param {number} sample_rate
         * @param {number} base_delay_ms
         * @param {number} depth_ms
         * @param {number} rate_hz
         * @param {number} mix
         * @param {number} feedback
         */
        constructor(sample_rate, base_delay_ms, depth_ms, rate_hz, mix, feedback) {
            const ret = wasm.flanger_new(sample_rate, base_delay_ms, depth_ms, rate_hz, mix, feedback);
            this.__wbg_ptr = ret >>> 0;
            FlangerFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        reset() {
            wasm.flanger_reset(this.__wbg_ptr);
        }
        /**
         * @returns {number}
         */
        get_mix() {
            const ret = wasm.chorus_get_mix(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.flanger_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
        /**
         * @param {number} mix
         */
        set_mix(mix) {
            wasm.chorus_set_mix(this.__wbg_ptr, mix);
        }
    }
    if (Symbol.dispose) Flanger.prototype[Symbol.dispose] = Flanger.prototype.free;

    __exports.Flanger = Flanger;

    const HardClipFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_hardclip_free(ptr >>> 0, 1));

    class HardClip {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            HardClipFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_hardclip_free(ptr, 0);
        }
        /**
         * @param {number} drive
         * @param {number} gain
         */
        constructor(drive, gain) {
            const ret = wasm.hardclip_new(drive, gain);
            this.__wbg_ptr = ret >>> 0;
            HardClipFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.hardclip_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
        /**
         * @returns {number}
         */
        get_gain() {
            const ret = wasm.hardclip_get_gain(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} gain
         */
        set_gain(gain) {
            wasm.hardclip_set_gain(this.__wbg_ptr, gain);
        }
        /**
         * @returns {number}
         */
        get_drive() {
            const ret = wasm.hardclip_get_drive(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} drive
         */
        set_drive(drive) {
            wasm.hardclip_set_drive(this.__wbg_ptr, drive);
        }
    }
    if (Symbol.dispose) HardClip.prototype[Symbol.dispose] = HardClip.prototype.free;

    __exports.HardClip = HardClip;

    const HighPassFilterFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_highpassfilter_free(ptr >>> 0, 1));

    class HighPassFilter {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            HighPassFilterFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_highpassfilter_free(ptr, 0);
        }
        /**
         * @param {number} cutoff
         */
        set_cutoff(cutoff) {
            wasm.highpassfilter_set_cutoff(this.__wbg_ptr, cutoff);
        }
        /**
         * @param {number} max_freq
         */
        set_max_freq(max_freq) {
            wasm.highpassfilter_set_max_freq(this.__wbg_ptr, max_freq);
        }
        /**
         * @param {number} sample_rate
         */
        set_sample_rate(sample_rate) {
            wasm.highpassfilter_set_sample_rate(this.__wbg_ptr, sample_rate);
        }
        /**
         * @param {number} sample_rate
         * @param {number} cutoff
         * @param {number} q
         */
        constructor(sample_rate, cutoff, q) {
            const ret = wasm.highpassfilter_new(sample_rate, cutoff, q);
            this.__wbg_ptr = ret >>> 0;
            HighPassFilterFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        reset() {
            wasm.bandpassfilter_reset(this.__wbg_ptr);
        }
        /**
         * @param {number} q
         */
        set_q(q) {
            wasm.highpassfilter_set_q(this.__wbg_ptr, q);
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.highpassfilter_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
    }
    if (Symbol.dispose) HighPassFilter.prototype[Symbol.dispose] = HighPassFilter.prototype.free;

    __exports.HighPassFilter = HighPassFilter;

    const LowPassFilterFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_lowpassfilter_free(ptr >>> 0, 1));

    class LowPassFilter {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            LowPassFilterFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_lowpassfilter_free(ptr, 0);
        }
        /**
         * @param {number} cutoff
         */
        set_cutoff(cutoff) {
            wasm.lowpassfilter_set_cutoff(this.__wbg_ptr, cutoff);
        }
        /**
         * @param {number} min_freq
         */
        set_min_freq(min_freq) {
            wasm.lowpassfilter_set_min_freq(this.__wbg_ptr, min_freq);
        }
        /**
         * @param {number} sample_rate
         */
        set_sample_rate(sample_rate) {
            wasm.lowpassfilter_set_sample_rate(this.__wbg_ptr, sample_rate);
        }
        /**
         * @param {number} sample_rate
         * @param {number} cutoff
         * @param {number} q
         */
        constructor(sample_rate, cutoff, q) {
            const ret = wasm.lowpassfilter_new(sample_rate, cutoff, q);
            this.__wbg_ptr = ret >>> 0;
            LowPassFilterFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        reset() {
            wasm.bandpassfilter_reset(this.__wbg_ptr);
        }
        /**
         * @param {number} q
         */
        set_q(q) {
            wasm.lowpassfilter_set_q(this.__wbg_ptr, q);
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.lowpassfilter_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
    }
    if (Symbol.dispose) LowPassFilter.prototype[Symbol.dispose] = LowPassFilter.prototype.free;

    __exports.LowPassFilter = LowPassFilter;

    const NotchFilterFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_notchfilter_free(ptr >>> 0, 1));

    class NotchFilter {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            NotchFilterFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_notchfilter_free(ptr, 0);
        }
        /**
         * @param {number} cutoff
         */
        set_cutoff(cutoff) {
            wasm.notchfilter_set_cutoff(this.__wbg_ptr, cutoff);
        }
        /**
         * @param {number} min_freq
         */
        set_min_freq(min_freq) {
            wasm.notchfilter_set_min_freq(this.__wbg_ptr, min_freq);
        }
        /**
         * @param {number} sample_rate
         */
        set_sample_rate(sample_rate) {
            wasm.notchfilter_set_sample_rate(this.__wbg_ptr, sample_rate);
        }
        /**
         * @param {number} sample_rate
         * @param {number} cutoff
         * @param {number} q
         */
        constructor(sample_rate, cutoff, q) {
            const ret = wasm.notchfilter_new(sample_rate, cutoff, q);
            this.__wbg_ptr = ret >>> 0;
            NotchFilterFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        reset() {
            wasm.bandpassfilter_reset(this.__wbg_ptr);
        }
        /**
         * @param {number} q
         */
        set_q(q) {
            wasm.notchfilter_set_q(this.__wbg_ptr, q);
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.notchfilter_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
    }
    if (Symbol.dispose) NotchFilter.prototype[Symbol.dispose] = NotchFilter.prototype.free;

    __exports.NotchFilter = NotchFilter;

    const PhaserFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_phaser_free(ptr >>> 0, 1));

    class Phaser {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            PhaserFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_phaser_free(ptr, 0);
        }
        /**
         * @returns {number}
         */
        get_rate_hz() {
            const ret = wasm.phaser_get_rate_hz(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} rate_hz
         */
        set_rate_hz(rate_hz) {
            wasm.phaser_set_rate_hz(this.__wbg_ptr, rate_hz);
        }
        /**
         * @returns {number}
         */
        get_feedback() {
            const ret = wasm.phaser_get_feedback(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} feedback
         */
        set_feedback(feedback) {
            wasm.phaser_set_feedback(this.__wbg_ptr, feedback);
        }
        /**
         * @returns {number}
         */
        get_max_freq_hz() {
            const ret = wasm.phaser_get_max_freq_hz(this.__wbg_ptr);
            return ret;
        }
        /**
         * @returns {number}
         */
        get_min_freq_hz() {
            const ret = wasm.phaser_get_min_freq_hz(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} max_freq_hz
         */
        set_max_freq_hz(max_freq_hz) {
            wasm.phaser_set_max_freq_hz(this.__wbg_ptr, max_freq_hz);
        }
        /**
         * @param {number} min_freq_hz
         */
        set_min_freq_hz(min_freq_hz) {
            wasm.phaser_set_min_freq_hz(this.__wbg_ptr, min_freq_hz);
        }
        /**
         * @param {number} sample_rate
         */
        set_sample_rate(sample_rate) {
            wasm.phaser_set_sample_rate(this.__wbg_ptr, sample_rate);
        }
        /**
         * @param {number} sample_rate
         * @param {number} rate_hz
         * @param {number} min_freq_hz
         * @param {number} max_freq_hz
         * @param {number} feedback
         * @param {number} mix
         */
        constructor(sample_rate, rate_hz, min_freq_hz, max_freq_hz, feedback, mix) {
            const ret = wasm.phaser_new(sample_rate, rate_hz, min_freq_hz, max_freq_hz, feedback, mix);
            this.__wbg_ptr = ret >>> 0;
            PhaserFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        reset() {
            wasm.phaser_reset(this.__wbg_ptr);
        }
        /**
         * @returns {number}
         */
        get_mix() {
            const ret = wasm.phaser_get_mix(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.phaser_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
        /**
         * @param {number} mix
         */
        set_mix(mix) {
            wasm.phaser_set_mix(this.__wbg_ptr, mix);
        }
    }
    if (Symbol.dispose) Phaser.prototype[Symbol.dispose] = Phaser.prototype.free;

    __exports.Phaser = Phaser;

    const ReverbFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_reverb_free(ptr >>> 0, 1));

    class Reverb {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            ReverbFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_reverb_free(ptr, 0);
        }
        /**
         * @returns {number}
         */
        get_damping() {
            const ret = wasm.reverb_get_damping(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} damping
         */
        set_damping(damping) {
            wasm.reverb_set_damping(this.__wbg_ptr, damping);
        }
        /**
         * @returns {number}
         */
        get_room_size() {
            const ret = wasm.reverb_get_room_size(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} room_size
         */
        set_room_size(room_size) {
            wasm.reverb_set_room_size(this.__wbg_ptr, room_size);
        }
        /**
         * @returns {number}
         */
        get_pre_delay_ms() {
            const ret = wasm.reverb_get_pre_delay_ms(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} pre_delay_ms
         */
        set_pre_delay_ms(pre_delay_ms) {
            wasm.reverb_set_pre_delay_ms(this.__wbg_ptr, pre_delay_ms);
        }
        /**
         * @returns {number}
         */
        get_stereo_spread_ms() {
            const ret = wasm.reverb_get_stereo_spread_ms(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} stereo_spread_ms
         */
        set_stereo_spread_ms(stereo_spread_ms) {
            wasm.reverb_set_stereo_spread_ms(this.__wbg_ptr, stereo_spread_ms);
        }
        /**
         * @param {number} sample_rate
         * @param {number} room_size
         * @param {number} damping
         * @param {number} dry_level
         * @param {number} wet_level
         * @param {number} pre_delay_ms
         * @param {number} stereo_spread_ms
         */
        constructor(sample_rate, room_size, damping, dry_level, wet_level, pre_delay_ms, stereo_spread_ms) {
            const ret = wasm.reverb_new(sample_rate, room_size, damping, dry_level, wet_level, pre_delay_ms, stereo_spread_ms);
            this.__wbg_ptr = ret >>> 0;
            ReverbFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        reset() {
            wasm.reverb_reset(this.__wbg_ptr);
        }
        /**
         * @returns {number}
         */
        get_dry() {
            const ret = wasm.reverb_get_dry(this.__wbg_ptr);
            return ret;
        }
        /**
         * @returns {number}
         */
        get_wet() {
            const ret = wasm.reverb_get_wet(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.reverb_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
        /**
         * @param {number} dry_level
         */
        set_dry(dry_level) {
            wasm.reverb_set_dry(this.__wbg_ptr, dry_level);
        }
        /**
         * @param {number} wet_level
         */
        set_wet(wet_level) {
            wasm.reverb_set_wet(this.__wbg_ptr, wet_level);
        }
    }
    if (Symbol.dispose) Reverb.prototype[Symbol.dispose] = Reverb.prototype.free;

    __exports.Reverb = Reverb;

    const SaturationFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_saturation_free(ptr >>> 0, 1));
    /**
     * Saturation with first-order antiderivative anti-aliasing (ADAA).
     *
     * Instead of evaluating the waveshaping curve f(x) directly, ADAA outputs
     * (F(x[n]) - F(x[n-1])) / (x[n] - x[n-1]), where F is the antiderivative of f.
     * This strongly reduces aliasing at a fraction of the cost of oversampling.
     *
     * Curves (`mode`):
     * - 0 = soft: tanh. Smooth, symmetric, odd harmonics.
     * - 1 = tube: biased tanh. Asymmetric, adds even harmonics. A DC blocker removes the offset.
     * - 2 = tape: x / (1 + |x|). Gentler knee, compresses more gradually.
     *
     * `drive` (dB) pushes the signal into the curve. `tone` is a lowpass after the curve
     * (Hz, 0 = off). `mix` blends the dry and saturated signal. `output_gain` (dB) is
     * applied to the saturated signal. The saturated signal is also scaled by
     * 1 / sqrt(drive), which keeps the perceived loudness roughly constant.
     */
    class Saturation {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            SaturationFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_saturation_free(ptr, 0);
        }
        /**
         * @returns {number}
         */
        get_output_gain() {
            const ret = wasm.saturation_get_output_gain(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} output_gain_db
         */
        set_output_gain(output_gain_db) {
            wasm.saturation_set_output_gain(this.__wbg_ptr, output_gain_db);
        }
        /**
         * @param {number} sample_rate
         * @param {number} drive_db
         * @param {number} mode
         * @param {number} tone_hz
         * @param {number} mix
         * @param {number} output_gain_db
         */
        constructor(sample_rate, drive_db, mode, tone_hz, mix, output_gain_db) {
            const ret = wasm.saturation_new(sample_rate, drive_db, mode, tone_hz, mix, output_gain_db);
            this.__wbg_ptr = ret >>> 0;
            SaturationFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        reset() {
            wasm.saturation_reset(this.__wbg_ptr);
        }
        /**
         * @returns {number}
         */
        get_mix() {
            const ret = wasm.saturation_get_mix(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.saturation_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
        /**
         * @param {number} mix
         */
        set_mix(mix) {
            wasm.saturation_set_mix(this.__wbg_ptr, mix);
        }
        /**
         * @returns {number}
         */
        get_mode() {
            const ret = wasm.saturation_get_mode(this.__wbg_ptr);
            return ret >>> 0;
        }
        /**
         * @returns {number}
         */
        get_tone() {
            const ret = wasm.saturation_get_tone(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} mode
         */
        set_mode(mode) {
            wasm.saturation_set_mode(this.__wbg_ptr, mode);
        }
        /**
         * @param {number} tone_hz
         */
        set_tone(tone_hz) {
            wasm.saturation_set_tone(this.__wbg_ptr, tone_hz);
        }
        /**
         * @returns {number}
         */
        get_drive() {
            const ret = wasm.saturation_get_drive(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} drive_db
         */
        set_drive(drive_db) {
            wasm.saturation_set_drive(this.__wbg_ptr, drive_db);
        }
    }
    if (Symbol.dispose) Saturation.prototype[Symbol.dispose] = Saturation.prototype.free;

    __exports.Saturation = Saturation;

    const SoftClipFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_softclip_free(ptr >>> 0, 1));

    class SoftClip {

        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            SoftClipFinalization.unregister(this);
            return ptr;
        }

        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_softclip_free(ptr, 0);
        }
        /**
         * @param {number} drive
         * @param {number} gain
         */
        constructor(drive, gain) {
            const ret = wasm.hardclip_new(drive, gain);
            this.__wbg_ptr = ret >>> 0;
            SoftClipFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        /**
         * @param {Float32Array} buffer
         */
        process(buffer) {
            var ptr0 = passArrayF32ToWasm0(buffer, wasm.__wbindgen_malloc);
            var len0 = WASM_VECTOR_LEN;
            wasm.softclip_process(this.__wbg_ptr, ptr0, len0, buffer);
        }
        /**
         * @returns {number}
         */
        get_gain() {
            const ret = wasm.hardclip_get_gain(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} gain
         */
        set_gain(gain) {
            wasm.hardclip_set_gain(this.__wbg_ptr, gain);
        }
        /**
         * @returns {number}
         */
        get_drive() {
            const ret = wasm.hardclip_get_drive(this.__wbg_ptr);
            return ret;
        }
        /**
         * @param {number} drive
         */
        set_drive(drive) {
            wasm.hardclip_set_drive(this.__wbg_ptr, drive);
        }
    }
    if (Symbol.dispose) SoftClip.prototype[Symbol.dispose] = SoftClip.prototype.free;

    __exports.SoftClip = SoftClip;

    const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

    async function __wbg_load(module, imports) {
        if (typeof Response === 'function' && module instanceof Response) {
            if (typeof WebAssembly.instantiateStreaming === 'function') {
                try {
                    return await WebAssembly.instantiateStreaming(module, imports);

                } catch (e) {
                    const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                    if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                    } else {
                        throw e;
                    }
                }
            }

            const bytes = await module.arrayBuffer();
            return await WebAssembly.instantiate(bytes, imports);

        } else {
            const instance = await WebAssembly.instantiate(module, imports);

            if (instance instanceof WebAssembly.Instance) {
                return { instance, module };

            } else {
                return instance;
            }
        }
    }

    function __wbg_get_imports() {
        const imports = {};
        imports.wbg = {};
        imports.wbg.__wbg___wbindgen_copy_to_typed_array_33fbd71146904370 = function(arg0, arg1, arg2) {
            new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
        };
        imports.wbg.__wbg___wbindgen_throw_b855445ff6a94295 = function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        };
        imports.wbg.__wbindgen_init_externref_table = function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
            ;
        };

        return imports;
    }

    function __wbg_finalize_init(instance, module) {
        wasm = instance.exports;
        __wbg_init.__wbindgen_wasm_module = module;
        cachedFloat32ArrayMemory0 = null;
        cachedUint8ArrayMemory0 = null;


        wasm.__wbindgen_start();
        return wasm;
    }

    function initSync(module) {
        if (wasm !== undefined) return wasm;


        if (typeof module !== 'undefined') {
            if (Object.getPrototypeOf(module) === Object.prototype) {
                ({module} = module)
            } else {
                console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
            }
        }

        const imports = __wbg_get_imports();

        if (!(module instanceof WebAssembly.Module)) {
            module = new WebAssembly.Module(module);
        }

        const instance = new WebAssembly.Instance(module, imports);

        return __wbg_finalize_init(instance, module);
    }

    async function __wbg_init(module_or_path) {
        if (wasm !== undefined) return wasm;


        if (typeof module_or_path !== 'undefined') {
            if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
                ({module_or_path} = module_or_path)
            } else {
                console.warn('using deprecated parameters for the initialization function; pass a single object instead')
            }
        }

        if (typeof module_or_path === 'undefined' && typeof script_src !== 'undefined') {
            module_or_path = script_src.replace(/\.js$/, '_bg.wasm');
        }
        const imports = __wbg_get_imports();

        if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
            module_or_path = fetch(module_or_path);
        }

        const { instance, module } = await __wbg_load(await module_or_path, imports);

        return __wbg_finalize_init(instance, module);
    }

    wasm_bindgen = Object.assign(__wbg_init, { initSync }, __exports);

})();
 
 if(typeof AudioWorkletProcessor !== "undefined") { AudioWorkletProcessor.wasm = wasm_bindgen; }