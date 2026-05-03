export type ScaleName =
	| 'major'
	| 'minor'
	| 'pentatonicMaj'
	| 'pentatonicMin'
	| 'dorian';

export const SCALES: Record<ScaleName, number[]> = {
	major: [0, 2, 4, 5, 7, 9, 11],
	minor: [0, 2, 3, 5, 7, 8, 10],
	pentatonicMaj: [0, 2, 4, 7, 9, 0, 2],
	pentatonicMin: [0, 3, 5, 7, 10, 0, 3],
	dorian: [0, 2, 3, 5, 7, 9, 10],
};

export const NOTE_NAMES = [
	'C',
	'C#',
	'D',
	'D#',
	'E',
	'F',
	'F#',
	'G',
	'G#',
	'A',
	'A#',
	'B',
];

export const COLS = 7;
export const ROWS = 4;

export function cellToMidi(
	col: number,
	row: number,
	rootPc: number,
	octaveBase: number,
	scale: ScaleName,
): number {
	const intervals = SCALES[scale];
	const interval = intervals[col % intervals.length];
	const octave = octaveBase + (ROWS - 1 - row);
	return 12 * (octave + 1) + rootPc + interval;
}
