export interface MidiOutputInfo {
	id: string;
	name: string;
}

export interface SynthParams {
	attack: number;
	release: number;
	cutoff: number;
	detune: number;
	polyphony: number;
	chorus: number;
}

export const DEFAULT_SYNTH_PARAMS: SynthParams = {
	attack: 0.6,
	release: 1.4,
	cutoff: 1800,
	detune: 9,
	polyphony: 6,
	chorus: 0.45,
};

export interface AudioEngine {
	kind: 'midi' | 'synth';
	noteOn(note: number, velocity: number, durationMs: number): void;
	setVolume?(v: number): void;
	setSynthParams?(p: Partial<SynthParams>): void;
	listOutputs?(): MidiOutputInfo[];
	selectOutput?(id: string): void;
	currentOutputId?(): string | null;
	dispose(): void;
}

interface PadVoice {
	oscs: OscillatorNode[];
	gain: GainNode;
	filter: BiquadFilterNode;
	end: number;
}

class SynthEngine implements AudioEngine {
	kind = 'synth' as const;
	private ctx: AudioContext;
	private master: GainNode;
	private padBus: GainNode;
	private wetBus: GainNode;
	private active: PadVoice[] = [];
	private params: SynthParams = { ...DEFAULT_SYNTH_PARAMS };
	private lastNoteAt = 0;
	private minNoteGapMs = 35;

	constructor() {
		this.ctx = new (window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext })
				.webkitAudioContext)();
		this.master = this.ctx.createGain();
		this.master.gain.value = 0.25;
		this.master.connect(this.ctx.destination);

		this.padBus = this.ctx.createGain();
		this.padBus.gain.value = 0.6;

		this.wetBus = this.ctx.createGain();
		this.wetBus.gain.value = this.params.chorus;

		this.buildChorus(this.padBus, this.wetBus);
		this.padBus.connect(this.master);
		this.wetBus.connect(this.master);
	}

	setSynthParams(p: Partial<SynthParams>) {
		Object.assign(this.params, p);
		if (p.chorus !== undefined) {
			this.wetBus.gain.setTargetAtTime(
				p.chorus,
				this.ctx.currentTime,
				0.05,
			);
		}
	}

	private buildChorus(input: GainNode, output: GainNode) {
		const ctx = this.ctx;
		const make = (delayMs: number, lfoHz: number, depthMs: number, phase: number) => {
			const delay = ctx.createDelay(0.1);
			delay.delayTime.value = delayMs / 1000;
			const lfo = ctx.createOscillator();
			lfo.frequency.value = lfoHz;
			const lfoGain = ctx.createGain();
			lfoGain.gain.value = depthMs / 1000;
			lfo.connect(lfoGain).connect(delay.delayTime);
			input.connect(delay).connect(output);
			lfo.start(ctx.currentTime + phase);
		};
		make(18, 0.6, 4, 0);
		make(24, 0.83, 5, 0.25);
		make(30, 0.41, 3.5, 0.5);
	}

	async resume() {
		if (this.ctx.state !== 'running') await this.ctx.resume();
	}

	setVolume(v: number) {
		this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
	}

	noteOn(note: number, velocity: number) {
		const nowMs = performance.now();
		if (nowMs - this.lastNoteAt < this.minNoteGapMs) return;
		this.lastNoteAt = nowMs;

		const { attack, release, cutoff, detune, polyphony } = this.params;

		while (this.active.length >= polyphony) {
			const oldest = this.active.shift()!;
			const t0 = this.ctx.currentTime;
			oldest.gain.gain.cancelScheduledValues(t0);
			oldest.gain.gain.setTargetAtTime(0, t0, 0.08);
			for (const o of oldest.oscs) o.stop(t0 + 0.4);
		}

		const t = this.ctx.currentTime;
		const freq = 440 * Math.pow(2, (note - 69) / 12);

		const hold = 0.15;
		const total = attack + hold + release;

		const polyScale = 1 / Math.sqrt(Math.max(1, polyphony));
		const peak = (velocity / 127) * 0.32 * polyScale;

		const filter = this.ctx.createBiquadFilter();
		filter.type = 'lowpass';
		filter.Q.value = 0.6;
		const cutoffStart = Math.min(freq * 1.8, cutoff * 0.4);
		const cutoffPeak = Math.min(cutoff * 2.2, 8000);
		filter.frequency.setValueAtTime(cutoffStart, t);
		filter.frequency.linearRampToValueAtTime(cutoffPeak, t + attack);
		filter.frequency.setTargetAtTime(
			cutoffStart * 1.2,
			t + attack + hold,
			release / 3,
		);

		const g = this.ctx.createGain();
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(peak, t + attack);
		g.gain.setValueAtTime(peak, t + attack + hold);
		g.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);

		const detuneCents = [-detune, 0, detune];
		const oscs: OscillatorNode[] = [];
		for (const cents of detuneCents) {
			const osc = this.ctx.createOscillator();
			osc.type = 'sawtooth';
			osc.frequency.value = freq;
			osc.detune.value = cents;
			osc.connect(filter);
			osc.start(t);
			osc.stop(t + total + 0.1);
			oscs.push(osc);
		}

		const subOsc = this.ctx.createOscillator();
		subOsc.type = 'sine';
		subOsc.frequency.value = freq / 2;
		const subGain = this.ctx.createGain();
		subGain.gain.value = 0.3;
		subOsc.connect(subGain).connect(filter);
		subOsc.start(t);
		subOsc.stop(t + total + 0.1);
		oscs.push(subOsc);

		filter.connect(g).connect(this.padBus);

		const entry: PadVoice = { oscs, gain: g, filter, end: t + total };
		this.active.push(entry);
		oscs[0].onended = () => {
			const i = this.active.indexOf(entry);
			if (i >= 0) this.active.splice(i, 1);
		};
	}

	dispose() {
		this.ctx.close();
	}
}

class MidiEngine implements AudioEngine {
	kind = 'midi' as const;
	private access: MIDIAccess;
	private outputId: string | null = null;
	private channel = 0;

	constructor(access: MIDIAccess) {
		this.access = access;
		const first = Array.from(access.outputs.values())[0];
		this.outputId = first ? first.id : null;
	}

	listOutputs(): MidiOutputInfo[] {
		return Array.from(this.access.outputs.values()).map((o) => ({
			id: o.id,
			name: o.name ?? o.id,
		}));
	}

	selectOutput(id: string) {
		this.outputId = id;
	}

	currentOutputId() {
		return this.outputId;
	}

	private send(bytes: number[]) {
		if (!this.outputId) return;
		const out = this.access.outputs.get(this.outputId);
		if (out) out.send(bytes);
	}

	noteOn(note: number, velocity: number, durationMs: number) {
		const v = Math.max(1, Math.min(127, Math.round(velocity)));
		const n = Math.max(0, Math.min(127, Math.round(note)));
		this.send([0x90 | this.channel, n, v]);
		setTimeout(() => {
			this.send([0x80 | this.channel, n, 0]);
		}, durationMs);
	}

	dispose() {}
}

export async function createEngine(
	preferMidi: boolean,
): Promise<AudioEngine> {
	if (preferMidi && 'requestMIDIAccess' in navigator) {
		try {
			const access = await navigator.requestMIDIAccess({ sysex: false });
			if (access.outputs.size > 0) {
				return new MidiEngine(access);
			}
		} catch {
			// fall through to synth
		}
	}
	const synth = new SynthEngine();
	await synth.resume();
	return synth;
}
