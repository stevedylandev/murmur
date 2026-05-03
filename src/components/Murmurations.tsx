import { useEffect, useRef, useState } from 'react';
import { createSim, drawBoid, MAX_SPEED, type Sim } from '../sim/boids';
import { cellAt, drawGrid } from '../sim/grid';
import { cellToMidi, type ScaleName } from '../audio/scales';
import {
	createEngine,
	DEFAULT_SYNTH_PARAMS,
	type AudioEngine,
	type MidiOutputInfo,
	type SynthParams,
} from '../audio/engine';
import Controls from './Controls';

const FLASH_MS = 280;
const NOTE_DUR_MS = 200;

export default function Murmurations() {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const simRef = useRef<Sim | null>(null);
	const engineRef = useRef<AudioEngine | null>(null);
	const flashesRef = useRef<Map<number, number>>(new Map());
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

	const settingsRef = useRef({ scale, rootPc, octaveBase });
	useEffect(() => {
		settingsRef.current = { scale, rootPc, octaveBase };
	}, [scale, rootPc, octaveBase]);

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
			for (let i = 0; i < sim.state.boids.length; i++) {
				const b = sim.state.boids[i];
				drawBoid(ctx, b);

				const idx = cellAt(b.x, b.y, W, H);
				if (b.lastCell !== -1 && idx !== b.lastCell) {
					if (engine) {
						const row = Math.floor(idx / 7);
						const col = idx % 7;
						const note = cellToMidi(
							col,
							row,
							settings.rootPc,
							settings.octaveBase,
							settings.scale,
						);
						const sp = Math.hypot(b.vx, b.vy);
						const vel = Math.max(
							40,
							Math.min(120, Math.round(40 + (sp / MAX_SPEED) * 70)),
						);
						engine.noteOn(note, vel, NOTE_DUR_MS);
						flashesRef.current.set(idx, now + FLASH_MS);
					}
				}
				b.lastCell = idx;
			}

			drawGrid(ctx, W, H, flashesRef.current, now, FLASH_MS);

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
			/>
		</>
	);
}
