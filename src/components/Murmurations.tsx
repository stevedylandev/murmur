import { useEffect, useRef, useState } from 'react';
import {
	boidParams,
	createSim,
	DEFAULT_BOID_PARAMS,
	drawBoid,
	flockCoherence,
	type BoidParams,
	type Sim,
} from '../sim/boids';
import { cellAt, drawGrid } from '../sim/grid';
import { cellToMidi, COLS, ROWS, type ScaleName } from '../audio/scales';
import {
	createEngine,
	DEFAULT_SYNTH_PARAMS,
	type AudioEngine,
	type MidiOutputInfo,
	type SynthParams,
} from '../audio/engine';
import {
	bucketOf,
	DEFAULT_MUSIC_PARAMS,
	type MusicParams,
} from '../music';
import Controls from './Controls';

const DEFAULT_COUNT = 240;

export default function Murmurations() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const simRef = useRef<Sim | null>(null);
	const engineRef = useRef<AudioEngine | null>(null);
	const flashesRef = useRef<Map<number, number>>(new Map());
	const cellBucketsRef = useRef<Int8Array>(new Int8Array(COLS * ROWS));
	const accentRateRef = useRef(0);
	const rafRef = useRef<number | null>(null);
	const sizeRef = useRef({ W: 0, H: 0 });

	const [started, setStarted] = useState(false);
	const [scale, setScale] = useState<ScaleName>('pentatonicMaj');
	const [rootPc, setRootPc] = useState(0);
	const [octaveBase, setOctaveBase] = useState(3);
	const [engineKind, setEngineKind] = useState<'midi' | 'synth' | null>(null);
	const [outputs, setOutputs] = useState<MidiOutputInfo[]>([]);
	const [currentOutputId, setCurrentOutputId] = useState<string | null>(null);
	const [volume, setVolume] = useState(0.25);
	const [synthParams, setSynthParams] = useState<SynthParams>({
		...DEFAULT_SYNTH_PARAMS,
	});
	const [musicParams, setMusicParams] = useState<MusicParams>({
		...DEFAULT_MUSIC_PARAMS,
	});
	const [boidState, setBoidState] = useState<BoidParams>({
		...DEFAULT_BOID_PARAMS,
	});
	const [boidCount, setBoidCount] = useState(DEFAULT_COUNT);

	const settingsRef = useRef({ scale, rootPc, octaveBase });
	useEffect(() => {
		settingsRef.current = { scale, rootPc, octaveBase };
	}, [scale, rootPc, octaveBase]);

	const musicRef = useRef(musicParams);
	useEffect(() => {
		musicRef.current = musicParams;
	}, [musicParams]);

	useEffect(() => {
		const canvas = canvasRef.current!;
		const ctx = canvas.getContext('2d')!;
		const DPR = Math.min(window.devicePixelRatio || 1, 2);

		function viewport() {
			const vv = window.visualViewport;
			return {
				w: vv ? vv.width : window.innerWidth,
				h: vv ? vv.height : window.innerHeight,
			};
		}

		function resize() {
			const { w, h } = viewport();
			sizeRef.current = { W: w, H: h };
			canvas.width = w * DPR;
			canvas.height = h * DPR;
			canvas.style.width = w + 'px';
			canvas.style.height = h + 'px';
			ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
			ctx.lineCap = 'round';
			if (simRef.current) simRef.current.resize(w, h);
		}

		resize();
		const { W, H } = sizeRef.current;
		simRef.current = createSim(W, H);

		window.addEventListener('resize', resize);
		window.addEventListener('orientationchange', resize);
		const vv = window.visualViewport;
		if (vv) vv.addEventListener('resize', resize);

		function loop() {
			const { W, H } = sizeRef.current;
			const sim = simRef.current!;
			const engine = engineRef.current;
			const settings = settingsRef.current;
			const now = performance.now();

			ctx.fillStyle = 'rgba(18, 17, 19, 0.55)';
			ctx.fillRect(0, 0, W, H);

			sim.step();

			ctx.strokeStyle = 'rgba(245, 243, 238, 0.78)';
			ctx.lineWidth = 1.4;

			const cellCounts = new Int32Array(COLS * ROWS);
			const cellBoids: number[][] = [];
			for (let i = 0; i < COLS * ROWS; i++) cellBoids.push([]);

			for (let i = 0; i < sim.state.boids.length; i++) {
				const b = sim.state.boids[i];
				drawBoid(ctx, b);
				const idx = cellAt(b.x, b.y, W, H);
				cellCounts[idx]++;
				cellBoids[idx].push(i);
				b.lastCell = idx;
			}

			if (engine) {
				const mp = musicRef.current;
				const buckets = cellBucketsRef.current;
				for (let idx = 0; idx < COLS * ROWS; idx++) {
					const newBucket = bucketOf(cellCounts[idx], mp);
					const prev = buckets[idx];
					if (newBucket > prev) {
						const row = Math.floor(idx / COLS);
						const col = idx % COLS;
						const baseNote = cellToMidi(
							col,
							row,
							settings.rootPc,
							settings.octaveBase,
							settings.scale,
						);
						const vel = Math.min(120, 55 + newBucket * 18);
						const dur = mp.padDurMs + newBucket * 200;
						engine.noteOn(baseNote, vel, dur);
						if (newBucket >= 3) {
							engine.noteOn(baseNote + 7, vel - 10, dur);
						}
						if (newBucket >= 4) {
							engine.noteOn(baseNote + 12, vel - 15, dur);
						}
						flashesRef.current.set(idx, now + mp.flashMs + newBucket * 60);
					}
					buckets[idx] = newBucket;
				}

				accentRateRef.current = Math.max(0, accentRateRef.current - 1);
				if (accentRateRef.current < mp.accentRateCap) {
					for (let i = 0; i < sim.state.boids.length; i++) {
						const b = sim.state.boids[i];
						if (
							b.lastSepMag > mp.sepAccentThreshold &&
							now - b.lastAccentAt > mp.accentCooldownMs
						) {
							b.lastAccentAt = now;
							accentRateRef.current += 1;
							const row = Math.floor(b.lastCell / COLS);
							const col = b.lastCell % COLS;
							const note =
								cellToMidi(
									col,
									row,
									settings.rootPc,
									settings.octaveBase,
									settings.scale,
								) + 12;
							const vel = Math.min(
								95,
								45 + Math.round(b.lastSepMag * 400),
							);
							engine.noteOn(note, vel, mp.accentDurMs, {
								attack: 0.005,
								release: 0.18,
								bypassRateLimit: true,
							});
							flashesRef.current.set(b.lastCell, now + 120);
							if (accentRateRef.current >= mp.accentRateCap) break;
						}
					}
				}

				const coh = flockCoherence(sim.state.boids);
				engine.setModulation?.(coh);
			}

			drawGrid(ctx, W, H, flashesRef.current, now, musicRef.current.flashMs);

			rafRef.current = requestAnimationFrame(loop);
		}
		rafRef.current = requestAnimationFrame(loop);

		return () => {
			if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
			window.removeEventListener('resize', resize);
			window.removeEventListener('orientationchange', resize);
			if (vv) vv.removeEventListener('resize', resize);
			engineRef.current?.dispose();
			engineRef.current = null;
		};
	}, []);

	async function start() {
		if (engineRef.current) {
			setStarted(true);
			return;
		}
		const engine = await createEngine(true);
		engineRef.current = engine;
		setEngineKind(engine.kind);
		if (engine.listOutputs) {
			const outs = engine.listOutputs();
			setOutputs(outs);
			setCurrentOutputId(engine.currentOutputId?.() ?? null);
		}
		if (engine.setVolume) engine.setVolume(volume);
		if (engine.setSynthParams) engine.setSynthParams(synthParams);
		setStarted(true);
	}

	function setSynthParam<K extends keyof SynthParams>(k: K, v: SynthParams[K]) {
		setSynthParams((prev) => {
			const next = { ...prev, [k]: v };
			engineRef.current?.setSynthParams?.({ [k]: v } as Partial<SynthParams>);
			return next;
		});
	}

	function setMusicParam<K extends keyof MusicParams>(k: K, v: MusicParams[K]) {
		setMusicParams((prev) => ({ ...prev, [k]: v }));
	}

	function setBoidParam<K extends keyof BoidParams>(k: K, v: BoidParams[K]) {
		boidParams[k] = v;
		setBoidState((prev) => ({ ...prev, [k]: v }));
	}

	function respawn(count: number) {
		setBoidCount(count);
		simRef.current?.spawn(count);
		cellBucketsRef.current.fill(0);
		flashesRef.current.clear();
	}

	function resetScale() {
		setScale('pentatonicMaj');
		setRootPc(0);
		setOctaveBase(3);
	}

	function resetFlock() {
		Object.assign(boidParams, DEFAULT_BOID_PARAMS);
		setBoidState({ ...DEFAULT_BOID_PARAMS });
		respawn(DEFAULT_COUNT);
	}

	function resetTriggers() {
		setMusicParams({ ...DEFAULT_MUSIC_PARAMS });
	}

	function resetSynth() {
		setSynthParams({ ...DEFAULT_SYNTH_PARAMS });
		engineRef.current?.setSynthParams?.({ ...DEFAULT_SYNTH_PARAMS });
		setVolume(0.25);
		engineRef.current?.setVolume?.(0.25);
	}

	function stop() {
		engineRef.current?.dispose();
		engineRef.current = null;
		setEngineKind(null);
		setOutputs([]);
		setCurrentOutputId(null);
		setStarted(false);
	}

	function selectOutput(id: string) {
		engineRef.current?.selectOutput?.(id);
		setCurrentOutputId(id);
	}

	function handleVolume(v: number) {
		setVolume(v);
		engineRef.current?.setVolume?.(v);
	}

	return (
		<>
			<canvas ref={canvasRef} className="murmurations-canvas" />
			<Controls
				started={started}
				onStart={start}
				onStop={stop}
				scale={scale}
				setScale={setScale}
				rootPc={rootPc}
				setRootPc={setRootPc}
				octaveBase={octaveBase}
				setOctaveBase={setOctaveBase}
				engineKind={engineKind}
				outputs={outputs}
				currentOutputId={currentOutputId}
				selectOutput={selectOutput}
				volume={volume}
				setVolume={handleVolume}
				synthParams={synthParams}
				setSynthParam={setSynthParam}
				musicParams={musicParams}
				setMusicParam={setMusicParam}
				boidParams={boidState}
				setBoidParam={setBoidParam}
				boidCount={boidCount}
				respawn={respawn}
				resetScale={resetScale}
				resetFlock={resetFlock}
				resetTriggers={resetTriggers}
				resetSynth={resetSynth}
			/>
		</>
	);
}
