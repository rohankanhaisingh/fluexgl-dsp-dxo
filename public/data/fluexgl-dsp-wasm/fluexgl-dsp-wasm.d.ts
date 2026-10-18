declare namespace wasm_bindgen {
	/* tslint:disable */
	/* eslint-disable */
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
	export class AdvancedDelay {
	  free(): void;
	  [Symbol.dispose](): void;
	  get_low_cut(): number;
	  set_low_cut(low_cut_hz: number): void;
	  get_feedback(): number;
	  get_high_cut(): number;
	  get_mod_rate(): number;
	  set_feedback(feedback: number): void;
	  set_high_cut(high_cut_hz: number): void;
	  set_mod_rate(mod_rate_hz: number): void;
	  get_mod_depth(): number;
	  set_mod_depth(mod_depth_ms: number): void;
	  get_delay_left_ms(): number;
	  set_delay_left_ms(delay_ms: number): void;
	  get_cross_feedback(): number;
	  get_delay_right_ms(): number;
	  set_cross_feedback(cross_feedback: number): void;
	  set_delay_right_ms(delay_ms: number): void;
	  constructor(sample_rate: number, mode: number, delay_left_ms: number, delay_right_ms: number, feedback: number, cross_feedback: number, mix: number, low_cut_hz: number, high_cut_hz: number, mod_rate_hz: number, mod_depth_ms: number, drive: number);
	  reset(): void;
	  get_mix(): number;
	  /**
	   * Processes a stereo block in place. Both buffers must have the same length;
	   * for a mono input, pass a copy of the same channel as `right`.
	   */
	  process(left: Float32Array, right: Float32Array): void;
	  set_mix(mix: number): void;
	  get_mode(): number;
	  set_mode(mode: number): void;
	  get_drive(): number;
	  set_drive(drive: number): void;
	}
	export class BandPassFilter {
	  free(): void;
	  [Symbol.dispose](): void;
	  set_cutoff(cutoff: number): void;
	  set_min_freq(min_freq: number): void;
	  set_sample_rate(sample_rate: number): void;
	  constructor(sample_rate: number, cutoff: number, q: number);
	  reset(): void;
	  set_q(q: number): void;
	  process(buffer: Float32Array): void;
	}
	export class Chorus {
	  free(): void;
	  [Symbol.dispose](): void;
	  get_rate_hz(): number;
	  set_rate_hz(rate_hz: number): void;
	  get_depth_ms(): number;
	  get_feedback(): number;
	  set_depth_ms(depth_ms: number): void;
	  set_feedback(feedback: number): void;
	  set_phase_offset(phase: number): void;
	  get_base_delay_ms(): number;
	  set_base_delay_ms(base_delay_ms: number): void;
	  constructor(sample_rate: number, base_delay_ms: number, depth_ms: number, rate_hz: number, mix: number, feedback: number);
	  get_mix(): number;
	  process(buffer: Float32Array): void;
	  set_mix(mix: number): void;
	}
	export class Delay {
	  free(): void;
	  [Symbol.dispose](): void;
	  get_delay_ms(): number;
	  get_feedback(): number;
	  set_delay_ms(delay_ms: number): void;
	  set_feedback(feedback: number): void;
	  set_sample_rate(sample_rate: number): void;
	  constructor(sample_rate: number, delay_ms: number, feedback: number, mix: number);
	  reset(): void;
	  get_mix(): number;
	  process(buffer: Float32Array): void;
	  set_mix(mix: number): void;
	}
	/**
	 * A parametric equalizer with up to eight bands, processed in series.
	 *
	 * Band types: 0 = peaking, 1 = low shelf, 2 = high shelf, 3 = lowpass,
	 * 4 = highpass, 5 = notch, 6 = bandpass. The gain only applies to the
	 * peaking and shelf types.
	 */
	export class Equalizer {
	  free(): void;
	  [Symbol.dispose](): void;
	  get_band_count(): number;
	  get_output_gain(): number;
	  set_output_gain(gain_db: number): void;
	  constructor(sample_rate: number);
	  reset(): void;
	  process(buffer: Float32Array): void;
	  /**
	   * Configures a band. Indices outside 0..8 are ignored. The filter state of the
	   * band is kept, so changing a band while audio plays does not click.
	   */
	  set_band(index: number, band_type: number, frequency: number, gain_db: number, q: number, enabled: boolean): void;
	}
	export class Flanger {
	  free(): void;
	  [Symbol.dispose](): void;
	  get_rate_hz(): number;
	  set_rate_hz(rate_hz: number): void;
	  get_depth_ms(): number;
	  get_feedback(): number;
	  set_depth_ms(depth_ms: number): void;
	  set_feedback(feedback: number): void;
	  set_phase_offset(phase: number): void;
	  get_base_delay_ms(): number;
	  set_base_delay_ms(base_delay_ms: number): void;
	  constructor(sample_rate: number, base_delay_ms: number, depth_ms: number, rate_hz: number, mix: number, feedback: number);
	  reset(): void;
	  get_mix(): number;
	  process(buffer: Float32Array): void;
	  set_mix(mix: number): void;
	}
	export class HardClip {
	  free(): void;
	  [Symbol.dispose](): void;
	  constructor(drive: number, gain: number);
	  process(buffer: Float32Array): void;
	  get_gain(): number;
	  set_gain(gain: number): void;
	  get_drive(): number;
	  set_drive(drive: number): void;
	}
	export class HighPassFilter {
	  free(): void;
	  [Symbol.dispose](): void;
	  set_cutoff(cutoff: number): void;
	  set_max_freq(max_freq: number): void;
	  set_sample_rate(sample_rate: number): void;
	  constructor(sample_rate: number, cutoff: number, q: number);
	  reset(): void;
	  set_q(q: number): void;
	  process(buffer: Float32Array): void;
	}
	export class LowPassFilter {
	  free(): void;
	  [Symbol.dispose](): void;
	  set_cutoff(cutoff: number): void;
	  set_min_freq(min_freq: number): void;
	  set_sample_rate(sample_rate: number): void;
	  constructor(sample_rate: number, cutoff: number, q: number);
	  reset(): void;
	  set_q(q: number): void;
	  process(buffer: Float32Array): void;
	}
	export class NotchFilter {
	  free(): void;
	  [Symbol.dispose](): void;
	  set_cutoff(cutoff: number): void;
	  set_min_freq(min_freq: number): void;
	  set_sample_rate(sample_rate: number): void;
	  constructor(sample_rate: number, cutoff: number, q: number);
	  reset(): void;
	  set_q(q: number): void;
	  process(buffer: Float32Array): void;
	}
	export class Phaser {
	  free(): void;
	  [Symbol.dispose](): void;
	  get_rate_hz(): number;
	  set_rate_hz(rate_hz: number): void;
	  get_feedback(): number;
	  set_feedback(feedback: number): void;
	  get_max_freq_hz(): number;
	  get_min_freq_hz(): number;
	  set_max_freq_hz(max_freq_hz: number): void;
	  set_min_freq_hz(min_freq_hz: number): void;
	  set_sample_rate(sample_rate: number): void;
	  constructor(sample_rate: number, rate_hz: number, min_freq_hz: number, max_freq_hz: number, feedback: number, mix: number);
	  reset(): void;
	  get_mix(): number;
	  process(buffer: Float32Array): void;
	  set_mix(mix: number): void;
	}
	export class Reverb {
	  free(): void;
	  [Symbol.dispose](): void;
	  get_damping(): number;
	  set_damping(damping: number): void;
	  get_room_size(): number;
	  set_room_size(room_size: number): void;
	  get_pre_delay_ms(): number;
	  set_pre_delay_ms(pre_delay_ms: number): void;
	  get_stereo_spread_ms(): number;
	  set_stereo_spread_ms(stereo_spread_ms: number): void;
	  constructor(sample_rate: number, room_size: number, damping: number, dry_level: number, wet_level: number, pre_delay_ms: number, stereo_spread_ms: number);
	  reset(): void;
	  get_dry(): number;
	  get_wet(): number;
	  process(buffer: Float32Array): void;
	  set_dry(dry_level: number): void;
	  set_wet(wet_level: number): void;
	}
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
	export class Saturation {
	  free(): void;
	  [Symbol.dispose](): void;
	  get_output_gain(): number;
	  set_output_gain(output_gain_db: number): void;
	  constructor(sample_rate: number, drive_db: number, mode: number, tone_hz: number, mix: number, output_gain_db: number);
	  reset(): void;
	  get_mix(): number;
	  process(buffer: Float32Array): void;
	  set_mix(mix: number): void;
	  get_mode(): number;
	  get_tone(): number;
	  set_mode(mode: number): void;
	  set_tone(tone_hz: number): void;
	  get_drive(): number;
	  set_drive(drive_db: number): void;
	}
	export class SoftClip {
	  free(): void;
	  [Symbol.dispose](): void;
	  constructor(drive: number, gain: number);
	  process(buffer: Float32Array): void;
	  get_gain(): number;
	  set_gain(gain: number): void;
	  get_drive(): number;
	  set_drive(drive: number): void;
	}
	
}

declare type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

declare interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_advanceddelay_free: (a: number, b: number) => void;
  readonly __wbg_bandpassfilter_free: (a: number, b: number) => void;
  readonly __wbg_chorus_free: (a: number, b: number) => void;
  readonly __wbg_delay_free: (a: number, b: number) => void;
  readonly __wbg_equalizer_free: (a: number, b: number) => void;
  readonly __wbg_hardclip_free: (a: number, b: number) => void;
  readonly __wbg_phaser_free: (a: number, b: number) => void;
  readonly __wbg_reverb_free: (a: number, b: number) => void;
  readonly __wbg_saturation_free: (a: number, b: number) => void;
  readonly advanceddelay_get_cross_feedback: (a: number) => number;
  readonly advanceddelay_get_delay_left_ms: (a: number) => number;
  readonly advanceddelay_get_delay_right_ms: (a: number) => number;
  readonly advanceddelay_get_drive: (a: number) => number;
  readonly advanceddelay_get_feedback: (a: number) => number;
  readonly advanceddelay_get_high_cut: (a: number) => number;
  readonly advanceddelay_get_low_cut: (a: number) => number;
  readonly advanceddelay_get_mix: (a: number) => number;
  readonly advanceddelay_get_mod_depth: (a: number) => number;
  readonly advanceddelay_get_mod_rate: (a: number) => number;
  readonly advanceddelay_get_mode: (a: number) => number;
  readonly advanceddelay_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => number;
  readonly advanceddelay_process: (a: number, b: number, c: number, d: any, e: number, f: number, g: any) => void;
  readonly advanceddelay_reset: (a: number) => void;
  readonly advanceddelay_set_cross_feedback: (a: number, b: number) => void;
  readonly advanceddelay_set_delay_left_ms: (a: number, b: number) => void;
  readonly advanceddelay_set_delay_right_ms: (a: number, b: number) => void;
  readonly advanceddelay_set_drive: (a: number, b: number) => void;
  readonly advanceddelay_set_feedback: (a: number, b: number) => void;
  readonly advanceddelay_set_high_cut: (a: number, b: number) => void;
  readonly advanceddelay_set_low_cut: (a: number, b: number) => void;
  readonly advanceddelay_set_mix: (a: number, b: number) => void;
  readonly advanceddelay_set_mod_depth: (a: number, b: number) => void;
  readonly advanceddelay_set_mod_rate: (a: number, b: number) => void;
  readonly advanceddelay_set_mode: (a: number, b: number) => void;
  readonly bandpassfilter_new: (a: number, b: number, c: number) => number;
  readonly bandpassfilter_process: (a: number, b: number, c: number, d: any) => void;
  readonly bandpassfilter_reset: (a: number) => void;
  readonly bandpassfilter_set_cutoff: (a: number, b: number) => void;
  readonly bandpassfilter_set_min_freq: (a: number, b: number) => void;
  readonly bandpassfilter_set_q: (a: number, b: number) => void;
  readonly bandpassfilter_set_sample_rate: (a: number, b: number) => void;
  readonly chorus_get_base_delay_ms: (a: number) => number;
  readonly chorus_get_depth_ms: (a: number) => number;
  readonly chorus_get_feedback: (a: number) => number;
  readonly chorus_get_mix: (a: number) => number;
  readonly chorus_get_rate_hz: (a: number) => number;
  readonly chorus_new: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly chorus_process: (a: number, b: number, c: number, d: any) => void;
  readonly chorus_set_base_delay_ms: (a: number, b: number) => void;
  readonly chorus_set_depth_ms: (a: number, b: number) => void;
  readonly chorus_set_feedback: (a: number, b: number) => void;
  readonly chorus_set_mix: (a: number, b: number) => void;
  readonly chorus_set_phase_offset: (a: number, b: number) => void;
  readonly chorus_set_rate_hz: (a: number, b: number) => void;
  readonly delay_get_delay_ms: (a: number) => number;
  readonly delay_get_feedback: (a: number) => number;
  readonly delay_get_mix: (a: number) => number;
  readonly delay_new: (a: number, b: number, c: number, d: number) => number;
  readonly delay_process: (a: number, b: number, c: number, d: any) => void;
  readonly delay_reset: (a: number) => void;
  readonly delay_set_delay_ms: (a: number, b: number) => void;
  readonly delay_set_feedback: (a: number, b: number) => void;
  readonly delay_set_mix: (a: number, b: number) => void;
  readonly delay_set_sample_rate: (a: number, b: number) => void;
  readonly equalizer_get_band_count: (a: number) => number;
  readonly equalizer_get_output_gain: (a: number) => number;
  readonly equalizer_new: (a: number) => number;
  readonly equalizer_process: (a: number, b: number, c: number, d: any) => void;
  readonly equalizer_reset: (a: number) => void;
  readonly equalizer_set_band: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
  readonly equalizer_set_output_gain: (a: number, b: number) => void;
  readonly flanger_new: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly flanger_process: (a: number, b: number, c: number, d: any) => void;
  readonly flanger_reset: (a: number) => void;
  readonly flanger_set_base_delay_ms: (a: number, b: number) => void;
  readonly flanger_set_depth_ms: (a: number, b: number) => void;
  readonly hardclip_get_drive: (a: number) => number;
  readonly hardclip_get_gain: (a: number) => number;
  readonly hardclip_new: (a: number, b: number) => number;
  readonly hardclip_process: (a: number, b: number, c: number, d: any) => void;
  readonly hardclip_set_drive: (a: number, b: number) => void;
  readonly hardclip_set_gain: (a: number, b: number) => void;
  readonly highpassfilter_new: (a: number, b: number, c: number) => number;
  readonly highpassfilter_set_cutoff: (a: number, b: number) => void;
  readonly highpassfilter_set_max_freq: (a: number, b: number) => void;
  readonly highpassfilter_set_q: (a: number, b: number) => void;
  readonly highpassfilter_set_sample_rate: (a: number, b: number) => void;
  readonly lowpassfilter_new: (a: number, b: number, c: number) => number;
  readonly lowpassfilter_set_cutoff: (a: number, b: number) => void;
  readonly lowpassfilter_set_min_freq: (a: number, b: number) => void;
  readonly lowpassfilter_set_q: (a: number, b: number) => void;
  readonly lowpassfilter_set_sample_rate: (a: number, b: number) => void;
  readonly notchfilter_new: (a: number, b: number, c: number) => number;
  readonly notchfilter_set_cutoff: (a: number, b: number) => void;
  readonly notchfilter_set_min_freq: (a: number, b: number) => void;
  readonly notchfilter_set_q: (a: number, b: number) => void;
  readonly notchfilter_set_sample_rate: (a: number, b: number) => void;
  readonly phaser_get_feedback: (a: number) => number;
  readonly phaser_get_max_freq_hz: (a: number) => number;
  readonly phaser_get_min_freq_hz: (a: number) => number;
  readonly phaser_get_mix: (a: number) => number;
  readonly phaser_get_rate_hz: (a: number) => number;
  readonly phaser_new: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly phaser_process: (a: number, b: number, c: number, d: any) => void;
  readonly phaser_reset: (a: number) => void;
  readonly phaser_set_feedback: (a: number, b: number) => void;
  readonly phaser_set_max_freq_hz: (a: number, b: number) => void;
  readonly phaser_set_min_freq_hz: (a: number, b: number) => void;
  readonly phaser_set_mix: (a: number, b: number) => void;
  readonly phaser_set_rate_hz: (a: number, b: number) => void;
  readonly phaser_set_sample_rate: (a: number, b: number) => void;
  readonly reverb_get_damping: (a: number) => number;
  readonly reverb_get_dry: (a: number) => number;
  readonly reverb_get_pre_delay_ms: (a: number) => number;
  readonly reverb_get_room_size: (a: number) => number;
  readonly reverb_get_stereo_spread_ms: (a: number) => number;
  readonly reverb_get_wet: (a: number) => number;
  readonly reverb_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
  readonly reverb_process: (a: number, b: number, c: number, d: any) => void;
  readonly reverb_reset: (a: number) => void;
  readonly reverb_set_damping: (a: number, b: number) => void;
  readonly reverb_set_dry: (a: number, b: number) => void;
  readonly reverb_set_pre_delay_ms: (a: number, b: number) => void;
  readonly reverb_set_room_size: (a: number, b: number) => void;
  readonly reverb_set_stereo_spread_ms: (a: number, b: number) => void;
  readonly reverb_set_wet: (a: number, b: number) => void;
  readonly saturation_get_drive: (a: number) => number;
  readonly saturation_get_mix: (a: number) => number;
  readonly saturation_get_mode: (a: number) => number;
  readonly saturation_get_output_gain: (a: number) => number;
  readonly saturation_get_tone: (a: number) => number;
  readonly saturation_new: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly saturation_process: (a: number, b: number, c: number, d: any) => void;
  readonly saturation_reset: (a: number) => void;
  readonly saturation_set_drive: (a: number, b: number) => void;
  readonly saturation_set_mix: (a: number, b: number) => void;
  readonly saturation_set_mode: (a: number, b: number) => void;
  readonly saturation_set_output_gain: (a: number, b: number) => void;
  readonly saturation_set_tone: (a: number, b: number) => void;
  readonly softclip_process: (a: number, b: number, c: number, d: any) => void;
  readonly softclip_new: (a: number, b: number) => number;
  readonly __wbg_notchfilter_free: (a: number, b: number) => void;
  readonly __wbg_lowpassfilter_free: (a: number, b: number) => void;
  readonly __wbg_highpassfilter_free: (a: number, b: number) => void;
  readonly __wbg_flanger_free: (a: number, b: number) => void;
  readonly __wbg_softclip_free: (a: number, b: number) => void;
  readonly notchfilter_reset: (a: number) => void;
  readonly notchfilter_process: (a: number, b: number, c: number, d: any) => void;
  readonly lowpassfilter_reset: (a: number) => void;
  readonly lowpassfilter_process: (a: number, b: number, c: number, d: any) => void;
  readonly highpassfilter_reset: (a: number) => void;
  readonly highpassfilter_process: (a: number, b: number, c: number, d: any) => void;
  readonly flanger_set_rate_hz: (a: number, b: number) => void;
  readonly flanger_set_phase_offset: (a: number, b: number) => void;
  readonly flanger_set_mix: (a: number, b: number) => void;
  readonly flanger_set_feedback: (a: number, b: number) => void;
  readonly softclip_set_gain: (a: number, b: number) => void;
  readonly softclip_set_drive: (a: number, b: number) => void;
  readonly flanger_get_base_delay_ms: (a: number) => number;
  readonly flanger_get_depth_ms: (a: number) => number;
  readonly flanger_get_feedback: (a: number) => number;
  readonly flanger_get_mix: (a: number) => number;
  readonly flanger_get_rate_hz: (a: number) => number;
  readonly softclip_get_drive: (a: number) => number;
  readonly softclip_get_gain: (a: number) => number;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_start: () => void;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
declare function wasm_bindgen (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
