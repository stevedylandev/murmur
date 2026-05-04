export interface BoidParams {
	topologicalK: number;
	perception: number;
	sepRange: number;
	maxSpeed: number;
	minSpeed: number;
	maxForce: number;
	wSep: number;
	wAlign: number;
	wCoh: number;
	wAttract: number;
	wNoise: number;
}

export const DEFAULT_BOID_PARAMS: BoidParams = {
	topologicalK: 7,
	perception: 70,
	sepRange: 14,
	maxSpeed: 3.4,
	minSpeed: 2.2,
	maxForce: 0.12,
	wSep: 1.8,
	wAlign: 1.4,
	wCoh: 0.9,
	wAttract: 0.06,
	wNoise: 0.015,
};

export const boidParams: BoidParams = { ...DEFAULT_BOID_PARAMS };

export class Boid {
	x: number;
	y: number;
	vx: number;
	vy: number;
	ax = 0;
	ay = 0;
	lastCell = -1;
	lastSepMag = 0;
	lastAccentAt = 0;

	constructor(W: number, H: number) {
		this.x = Math.random() * W;
		this.y = Math.random() * H;
		const a = Math.random() * Math.PI * 2;
		const s =
			boidParams.minSpeed +
			Math.random() * (boidParams.maxSpeed - boidParams.minSpeed);
		this.vx = Math.cos(a) * s;
		this.vy = Math.sin(a) * s;
	}

	edges(W: number, H: number) {
		const m = 20;
		if (this.x < -m) this.x = W + m;
		else if (this.x > W + m) this.x = -m;
		if (this.y < -m) this.y = H + m;
		else if (this.y > H + m) this.y = -m;
	}

	flock(candidates: Boid[], attractor: { x: number; y: number }) {
		const p = boidParams;
		const perception2 = p.perception * p.perception;
		const sepRange2 = p.sepRange * p.sepRange;

		const dists: { o: Boid; d2: number; dx: number; dy: number }[] = [];
		for (let i = 0; i < candidates.length; i++) {
			const o = candidates[i];
			if (o === this) continue;
			const dx = o.x - this.x;
			const dy = o.y - this.y;
			const d2 = dx * dx + dy * dy;
			if (d2 < perception2 && d2 > 0) {
				dists.push({ o, d2, dx, dy });
			}
		}
		dists.sort((a, b) => a.d2 - b.d2);
		const k = Math.min(p.topologicalK, dists.length);

		let alignX = 0,
			alignY = 0;
		let cohX = 0,
			cohY = 0;
		let sepX = 0,
			sepY = 0;
		let sepCount = 0;

		for (let i = 0; i < k; i++) {
			const { o, d2, dx, dy } = dists[i];
			alignX += o.vx;
			alignY += o.vy;
			cohX += o.x;
			cohY += o.y;

			if (d2 < sepRange2) {
				const d = Math.sqrt(d2);
				const f = 1 / (d + 0.001);
				sepX -= (dx / d) * f;
				sepY -= (dy / d) * f;
				sepCount++;
			}
		}

		let fx = 0,
			fy = 0;

		if (k > 0) {
			alignX /= k;
			alignY /= k;
			const m = Math.hypot(alignX, alignY);
			if (m > 0) {
				alignX = (alignX / m) * p.maxSpeed - this.vx;
				alignY = (alignY / m) * p.maxSpeed - this.vy;
				const sm = Math.hypot(alignX, alignY);
				if (sm > p.maxForce) {
					alignX = (alignX / sm) * p.maxForce;
					alignY = (alignY / sm) * p.maxForce;
				}
				fx += alignX * p.wAlign;
				fy += alignY * p.wAlign;
			}

			cohX = cohX / k - this.x;
			cohY = cohY / k - this.y;
			const cm = Math.hypot(cohX, cohY);
			if (cm > 0) {
				cohX = (cohX / cm) * p.maxSpeed - this.vx;
				cohY = (cohY / cm) * p.maxSpeed - this.vy;
				const sm = Math.hypot(cohX, cohY);
				if (sm > p.maxForce) {
					cohX = (cohX / sm) * p.maxForce;
					cohY = (cohY / sm) * p.maxForce;
				}
				fx += cohX * p.wCoh;
				fy += cohY * p.wCoh;
			}
		}

		if (sepCount > 0) {
			const m = Math.hypot(sepX, sepY);
			if (m > 0) {
				sepX = (sepX / m) * p.maxSpeed - this.vx;
				sepY = (sepY / m) * p.maxSpeed - this.vy;
				const sm = Math.hypot(sepX, sepY);
				if (sm > p.maxForce * 2) {
					sepX = (sepX / sm) * p.maxForce * 2;
					sepY = (sepY / sm) * p.maxForce * 2;
				}
				fx += sepX * p.wSep;
				fy += sepY * p.wSep;
				this.lastSepMag = Math.hypot(sepX, sepY);
			} else {
				this.lastSepMag = 0;
			}
		} else {
			this.lastSepMag = 0;
		}

		const adx = attractor.x - this.x;
		const ady = attractor.y - this.y;
		const ad = Math.hypot(adx, ady);
		if (ad > 0) {
			fx += (adx / ad) * p.wAttract;
			fy += (ady / ad) * p.wAttract;
		}

		fx += (Math.random() - 0.5) * p.wNoise;
		fy += (Math.random() - 0.5) * p.wNoise;

		this.ax += fx;
		this.ay += fy;
	}

	update() {
		const p = boidParams;
		this.vx += this.ax;
		this.vy += this.ay;
		const sp = Math.hypot(this.vx, this.vy);
		if (sp > p.maxSpeed) {
			this.vx = (this.vx / sp) * p.maxSpeed;
			this.vy = (this.vy / sp) * p.maxSpeed;
		} else if (sp < p.minSpeed && sp > 0) {
			this.vx = (this.vx / sp) * p.minSpeed;
			this.vy = (this.vy / sp) * p.minSpeed;
		}
		this.x += this.vx;
		this.y += this.vy;
		this.ax = 0;
		this.ay = 0;
	}
}

export function flockCoherence(boids: Boid[]): number {
	let sumX = 0,
		sumY = 0,
		sumMag = 0;
	for (let i = 0; i < boids.length; i++) {
		const b = boids[i];
		sumX += b.vx;
		sumY += b.vy;
		sumMag += Math.hypot(b.vx, b.vy);
	}
	if (sumMag === 0) return 0;
	return Math.hypot(sumX, sumY) / sumMag;
}

export function drawBoid(ctx: CanvasRenderingContext2D, b: Boid) {
	const angle = Math.atan2(b.vy, b.vx);
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	const len = 3.2;
	ctx.beginPath();
	ctx.moveTo(b.x - cos * len, b.y - sin * len);
	ctx.lineTo(b.x + cos * len * 0.6, b.y + sin * len * 0.6);
	ctx.stroke();
}

export type Sim = ReturnType<typeof createSim>;

export function createSim(W: number, H: number) {
	const state = {
		W,
		H,
		boids: [] as Boid[],
		attractor: {
			x: W / 2,
			y: H / 2,
			t: Math.random() * 1000,
		},
	};

	function defaultCount(W: number, H: number) {
		return Math.min(420, Math.floor((W * H) / 3200));
	}

	function spawn(count: number) {
		state.boids.length = 0;
		const cx0 = state.W / 2,
			cy0 = state.H / 2;
		for (let i = 0; i < count; i++) {
			const b = new Boid(state.W, state.H);
			const r = Math.random() * Math.min(state.W, state.H) * 0.25;
			const a = Math.random() * Math.PI * 2;
			b.x = cx0 + Math.cos(a) * r;
			b.y = cy0 + Math.sin(a) * r;
			state.boids.push(b);
		}
	}

	spawn(defaultCount(W, H));

	const grid = new Map<string, Boid[]>();

	function buildGrid() {
		grid.clear();
		const cellSize = boidParams.perception;
		for (let i = 0; i < state.boids.length; i++) {
			const b = state.boids[i];
			const cx = Math.floor(b.x / cellSize);
			const cy = Math.floor(b.y / cellSize);
			const k = cx + ',' + cy;
			let arr = grid.get(k);
			if (!arr) {
				arr = [];
				grid.set(k, arr);
			}
			arr.push(b);
		}
	}

	function neighbors(b: Boid): Boid[] {
		const cellSize = boidParams.perception;
		const cx = Math.floor(b.x / cellSize);
		const cy = Math.floor(b.y / cellSize);
		const out: Boid[] = [];
		for (let dx = -1; dx <= 1; dx++) {
			for (let dy = -1; dy <= 1; dy++) {
				const arr = grid.get(cx + dx + ',' + (cy + dy));
				if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
			}
		}
		return out;
	}

	function updateAttractor() {
		const a = state.attractor;
		a.t += 0.003;
		const cx = state.W / 2,
			cy = state.H / 2;
		const rx = state.W * 0.32,
			ry = state.H * 0.28;
		a.x = cx + Math.sin(a.t * 1.3) * rx + Math.cos(a.t * 0.7) * rx * 0.3;
		a.y = cy + Math.cos(a.t * 1.1) * ry + Math.sin(a.t * 1.7) * ry * 0.25;
	}

	function step() {
		updateAttractor();
		buildGrid();
		for (let i = 0; i < state.boids.length; i++) {
			state.boids[i].flock(neighbors(state.boids[i]), state.attractor);
		}
		for (let i = 0; i < state.boids.length; i++) {
			state.boids[i].update();
			state.boids[i].edges(state.W, state.H);
		}
	}

	function resize(W: number, H: number) {
		state.W = W;
		state.H = H;
	}

	return { state, step, resize, spawn };
}
