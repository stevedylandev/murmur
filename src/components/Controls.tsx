import { useState } from 'react';
import type { MidiOutputInfo, SynthParams } from '../audio/engine';
import { NOTE_NAMES, type ScaleName } from '../audio/scales';
import type { BoidParams } from '../sim/boids';
import type { MusicParams } from '../music';

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
	musicParams: MusicParams;
	setMusicParam: <K extends keyof MusicParams>(k: K, v: MusicParams[K]) => void;
	boidParams: BoidParams;
	setBoidParam: <K extends keyof BoidParams>(k: K, v: BoidParams[K]) => void;
	boidCount: number;
	respawn: (count: number) => void;
	resetScale: () => void;
	resetFlock: () => void;
	resetTriggers: () => void;
	resetSynth: () => void;
}

const SCALE_OPTIONS: { value: ScaleName; label: string }[] = [
	{ value: 'major', label: 'Major' },
	{ value: 'minor', label: 'Minor' },
	{ value: 'pentatonicMaj', label: 'Pentatonic Maj' },
	{ value: 'pentatonicMin', label: 'Pentatonic Min' },
	{ value: 'dorian', label: 'Dorian' },
];

interface SliderProps {
	label: string;
	min: number;
	max: number;
	step: number;
	value: number;
	onChange: (v: number) => void;
}

function Slider({ label, min, max, step, value, onChange }: SliderProps) {
	return (
		<label>
			<span>{label}</span>
			<input
				type="range"
				min={min}
				max={max}
				step={step}
				value={value}
				onChange={(e) => onChange(Number(e.target.value))}
			/>
			<span className="val">{value}</span>
		</label>
	);
}

export default function Controls(props: Props) {
	const [open, setOpen] = useState(true);

	if (!open) {
		return (
			<button
				type="button"
				className="controls-toggle"
				onClick={() => setOpen(true)}
				aria-label="Open controls"
			>
				≡
			</button>
		);
	}

	return (
		<div className="controls">
			<div className="controls-header">
				<button type="button" onClick={props.started ? props.onStop : props.onStart}>
					{props.started ? 'Stop' : 'Start'}
				</button>
				<button
					type="button"
					className="close"
					onClick={() => setOpen(false)}
					aria-label="Close controls"
				>
					×
				</button>
			</div>

			<details open>
				<summary>Scale</summary>
				<label>
					<span>Scale</span>
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
					<span>Root</span>
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
					<span>Octave</span>
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
				<button type="button" className="reset" onClick={props.resetScale}>
					Reset defaults
				</button>
			</details>

			<details>
				<summary>Flock</summary>
				<label>
					<span>Count</span>
					<input
						type="range"
						min={40}
						max={600}
						step={10}
						value={props.boidCount}
						onChange={(e) => props.respawn(Number(e.target.value))}
					/>
					<span className="val">{props.boidCount}</span>
				</label>
				<Slider
					label="Topological K"
					min={1}
					max={15}
					step={1}
					value={props.boidParams.topologicalK}
					onChange={(v) => props.setBoidParam('topologicalK', v)}
				/>
				<Slider
					label="Perception"
					min={20}
					max={150}
					step={5}
					value={props.boidParams.perception}
					onChange={(v) => props.setBoidParam('perception', v)}
				/>
				<Slider
					label="Sep range"
					min={4}
					max={40}
					step={1}
					value={props.boidParams.sepRange}
					onChange={(v) => props.setBoidParam('sepRange', v)}
				/>
				<Slider
					label="Max speed"
					min={1}
					max={6}
					step={0.1}
					value={props.boidParams.maxSpeed}
					onChange={(v) => props.setBoidParam('maxSpeed', v)}
				/>
				<Slider
					label="Min speed"
					min={0.5}
					max={5}
					step={0.1}
					value={props.boidParams.minSpeed}
					onChange={(v) => props.setBoidParam('minSpeed', v)}
				/>
				<Slider
					label="Max force"
					min={0.02}
					max={0.4}
					step={0.01}
					value={props.boidParams.maxForce}
					onChange={(v) => props.setBoidParam('maxForce', v)}
				/>
				<Slider
					label="Separation"
					min={0}
					max={4}
					step={0.05}
					value={props.boidParams.wSep}
					onChange={(v) => props.setBoidParam('wSep', v)}
				/>
				<Slider
					label="Alignment"
					min={0}
					max={4}
					step={0.05}
					value={props.boidParams.wAlign}
					onChange={(v) => props.setBoidParam('wAlign', v)}
				/>
				<Slider
					label="Cohesion"
					min={0}
					max={4}
					step={0.05}
					value={props.boidParams.wCoh}
					onChange={(v) => props.setBoidParam('wCoh', v)}
				/>
				<Slider
					label="Attractor"
					min={0}
					max={0.5}
					step={0.01}
					value={props.boidParams.wAttract}
					onChange={(v) => props.setBoidParam('wAttract', v)}
				/>
				<Slider
					label="Noise"
					min={0}
					max={0.2}
					step={0.005}
					value={props.boidParams.wNoise}
					onChange={(v) => props.setBoidParam('wNoise', v)}
				/>
				<button type="button" onClick={() => props.respawn(props.boidCount)}>
					Respawn
				</button>
				<button type="button" className="reset" onClick={props.resetFlock}>
					Reset defaults
				</button>
			</details>

			<details>
				<summary>Triggers</summary>
				<Slider
					label="Bucket 1"
					min={1}
					max={10}
					step={1}
					value={props.musicParams.bucketB1}
					onChange={(v) => props.setMusicParam('bucketB1', v)}
				/>
				<Slider
					label="Bucket 2"
					min={2}
					max={20}
					step={1}
					value={props.musicParams.bucketB2}
					onChange={(v) => props.setMusicParam('bucketB2', v)}
				/>
				<Slider
					label="Bucket 3 (5th)"
					min={3}
					max={30}
					step={1}
					value={props.musicParams.bucketB3}
					onChange={(v) => props.setMusicParam('bucketB3', v)}
				/>
				<Slider
					label="Bucket 4 (oct)"
					min={4}
					max={50}
					step={1}
					value={props.musicParams.bucketB4}
					onChange={(v) => props.setMusicParam('bucketB4', v)}
				/>
				<Slider
					label="Accent thresh"
					min={0.005}
					max={0.2}
					step={0.005}
					value={props.musicParams.sepAccentThreshold}
					onChange={(v) => props.setMusicParam('sepAccentThreshold', v)}
				/>
				<Slider
					label="Accent cooldown"
					min={50}
					max={1500}
					step={25}
					value={props.musicParams.accentCooldownMs}
					onChange={(v) => props.setMusicParam('accentCooldownMs', v)}
				/>
				<Slider
					label="Accent rate cap"
					min={1}
					max={20}
					step={1}
					value={props.musicParams.accentRateCap}
					onChange={(v) => props.setMusicParam('accentRateCap', v)}
				/>
				<Slider
					label="Pad dur (ms)"
					min={150}
					max={2000}
					step={50}
					value={props.musicParams.padDurMs}
					onChange={(v) => props.setMusicParam('padDurMs', v)}
				/>
				<Slider
					label="Accent dur (ms)"
					min={30}
					max={500}
					step={10}
					value={props.musicParams.accentDurMs}
					onChange={(v) => props.setMusicParam('accentDurMs', v)}
				/>
				<Slider
					label="Flash (ms)"
					min={80}
					max={800}
					step={20}
					value={props.musicParams.flashMs}
					onChange={(v) => props.setMusicParam('flashMs', v)}
				/>
				<button type="button" className="reset" onClick={props.resetTriggers}>
					Reset defaults
				</button>
			</details>

			{props.engineKind === 'midi' && props.outputs.length > 0 && (
				<details open>
					<summary>MIDI</summary>
					<label>
						<span>Device</span>
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
				</details>
			)}

			{props.engineKind === 'synth' && (
				<details>
					<summary>Synth (no MIDI)</summary>
					<Slider
						label="Volume"
						min={0}
						max={1}
						step={0.01}
						value={props.volume}
						onChange={props.setVolume}
					/>
					<Slider
						label="Attack"
						min={0.05}
						max={2}
						step={0.05}
						value={props.synthParams.attack}
						onChange={(v) => props.setSynthParam('attack', v)}
					/>
					<Slider
						label="Release"
						min={0.2}
						max={3}
						step={0.05}
						value={props.synthParams.release}
						onChange={(v) => props.setSynthParam('release', v)}
					/>
					<Slider
						label="Cutoff"
						min={300}
						max={5000}
						step={50}
						value={props.synthParams.cutoff}
						onChange={(v) => props.setSynthParam('cutoff', v)}
					/>
					<Slider
						label="Detune"
						min={0}
						max={25}
						step={1}
						value={props.synthParams.detune}
						onChange={(v) => props.setSynthParam('detune', v)}
					/>
					<Slider
						label="Chorus"
						min={0}
						max={1}
						step={0.01}
						value={props.synthParams.chorus}
						onChange={(v) => props.setSynthParam('chorus', v)}
					/>
					<Slider
						label="Polyphony"
						min={2}
						max={12}
						step={1}
						value={props.synthParams.polyphony}
						onChange={(v) => props.setSynthParam('polyphony', v)}
					/>
					<button type="button" className="reset" onClick={props.resetSynth}>
						Reset defaults
					</button>
				</details>
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
