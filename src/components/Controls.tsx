import type { MidiOutputInfo, SynthParams } from '../audio/engine';
import { NOTE_NAMES, type ScaleName } from '../audio/scales';

interface Props {
	started: boolean;
	onStart: () => void;
	onStop: () => void;
	scale: ScaleName;
	setScale: (s: ScaleName) => void;
	rootPc: number;
	setRootPc: (n: number) => void;
	octaveBase: number;
	setOctaveBase: (n: number) => void;
	engineKind: 'midi' | 'synth' | null;
	outputs: MidiOutputInfo[];
	currentOutputId: string | null;
	selectOutput: (id: string) => void;
	volume: number;
	setVolume: (v: number) => void;
	synthParams: SynthParams;
	setSynthParam: <K extends keyof SynthParams>(k: K, v: SynthParams[K]) => void;
}

const SCALE_OPTIONS: { value: ScaleName; label: string }[] = [
	{ value: 'major', label: 'Major' },
	{ value: 'minor', label: 'Minor' },
	{ value: 'pentatonicMaj', label: 'Pentatonic Maj' },
	{ value: 'pentatonicMin', label: 'Pentatonic Min' },
	{ value: 'dorian', label: 'Dorian' },
];

export default function Controls(props: Props) {
	return (
		<div className="controls">
			<button type="button" onClick={props.started ? props.onStop : props.onStart}>
				{props.started ? 'Stop' : 'Start'}
			</button>

			<label>
				Scale
				<select
					value={props.scale}
					onChange={(e) => props.setScale(e.target.value as ScaleName)}
				>
					{SCALE_OPTIONS.map((s) => (
						<option key={s.value} value={s.value}>
							{s.label}
						</option>
					))}
				</select>
			</label>

			<label>
				Root
				<select
					value={props.rootPc}
					onChange={(e) => props.setRootPc(Number(e.target.value))}
				>
					{NOTE_NAMES.map((n, i) => (
						<option key={n} value={i}>
							{n}
						</option>
					))}
				</select>
			</label>

			<label>
				Octave
				<select
					value={props.octaveBase}
					onChange={(e) => props.setOctaveBase(Number(e.target.value))}
				>
					{[1, 2, 3, 4, 5, 6].map((o) => (
						<option key={o} value={o}>
							{o}
						</option>
					))}
				</select>
			</label>

			{props.engineKind === 'midi' && props.outputs.length > 0 && (
				<label>
					MIDI
					<select
						value={props.currentOutputId ?? ''}
						onChange={(e) => props.selectOutput(e.target.value)}
					>
						{props.outputs.map((o) => (
							<option key={o.id} value={o.id}>
								{o.name}
							</option>
						))}
					</select>
				</label>
			)}

			{props.engineKind === 'synth' && (
				<>
					<div className="section">Built-in synth (no MIDI device connected)</div>
					<label>
						Volume
						<input
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={props.volume}
							onChange={(e) => props.setVolume(Number(e.target.value))}
						/>
					</label>
					<label>
						Attack
						<input
							type="range"
							min={0.05}
							max={2}
							step={0.05}
							value={props.synthParams.attack}
							onChange={(e) =>
								props.setSynthParam('attack', Number(e.target.value))
							}
						/>
					</label>
					<label>
						Release
						<input
							type="range"
							min={0.2}
							max={3}
							step={0.05}
							value={props.synthParams.release}
							onChange={(e) =>
								props.setSynthParam('release', Number(e.target.value))
							}
						/>
					</label>
					<label>
						Cutoff
						<input
							type="range"
							min={300}
							max={5000}
							step={50}
							value={props.synthParams.cutoff}
							onChange={(e) =>
								props.setSynthParam('cutoff', Number(e.target.value))
							}
						/>
					</label>
					<label>
						Detune
						<input
							type="range"
							min={0}
							max={25}
							step={1}
							value={props.synthParams.detune}
							onChange={(e) =>
								props.setSynthParam('detune', Number(e.target.value))
							}
						/>
					</label>
					<label>
						Chorus
						<input
							type="range"
							min={0}
							max={1}
							step={0.01}
							value={props.synthParams.chorus}
							onChange={(e) =>
								props.setSynthParam('chorus', Number(e.target.value))
							}
						/>
					</label>
					<label>
						Polyphony
						<input
							type="range"
							min={2}
							max={12}
							step={1}
							value={props.synthParams.polyphony}
							onChange={(e) =>
								props.setSynthParam('polyphony', Number(e.target.value))
							}
						/>
					</label>
				</>
			)}

			<div className="status">
				{props.engineKind === null
					? 'audio idle'
					: props.engineKind === 'midi'
						? 'midi out'
						: 'built-in synth'}
			</div>
		</div>
	);
}
