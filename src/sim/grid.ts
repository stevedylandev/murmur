import { COLS, ROWS } from '../audio/scales';

export function cellAt(
	x: number,
	y: number,
	W: number,
	H: number,
): number {
	const col = Math.min(COLS - 1, Math.max(0, Math.floor((x / W) * COLS)));
	const row = Math.min(ROWS - 1, Math.max(0, Math.floor((y / H) * ROWS)));
	return row * COLS + col;
}

export function cellRowCol(idx: number): { row: number; col: number } {
	return { row: Math.floor(idx / COLS), col: idx % COLS };
}

export function drawGrid(
	ctx: CanvasRenderingContext2D,
	W: number,
	H: number,
	flashes: Map<number, number>,
	now: number,
	flashMs: number,
) {
	const cw = W / COLS;
	const ch = H / ROWS;

	for (const [idx, end] of flashes) {
		const remain = end - now;
		if (remain <= 0) {
			flashes.delete(idx);
			continue;
		}
		const a = (remain / flashMs) * 0.18;
		const { row, col } = cellRowCol(idx);
		ctx.fillStyle = `rgba(245, 243, 238, ${a})`;
		ctx.fillRect(col * cw, row * ch, cw, ch);
	}

	ctx.strokeStyle = 'rgba(245, 243, 238, 0.08)';
	ctx.lineWidth = 1;
	ctx.beginPath();
	for (let c = 1; c < COLS; c++) {
		const x = c * cw;
		ctx.moveTo(x, 0);
		ctx.lineTo(x, H);
	}
	for (let r = 1; r < ROWS; r++) {
		const y = r * ch;
		ctx.moveTo(0, y);
		ctx.lineTo(W, y);
	}
	ctx.stroke();
}
