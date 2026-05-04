export interface MusicParams {
	bucketB1: number;
	bucketB2: number;
	bucketB3: number;
	bucketB4: number;
	sepAccentThreshold: number;
	accentCooldownMs: number;
	accentRateCap: number;
	padDurMs: number;
	accentDurMs: number;
	flashMs: number;
}

export const DEFAULT_MUSIC_PARAMS: MusicParams = {
	bucketB1: 1,
	bucketB2: 3,
	bucketB3: 6,
	bucketB4: 12,
	sepAccentThreshold: 0.04,
	accentCooldownMs: 350,
	accentRateCap: 6,
	padDurMs: 600,
	accentDurMs: 90,
	flashMs: 320,
};

export function bucketOf(count: number, p: MusicParams): number {
	if (count >= p.bucketB4) return 4;
	if (count >= p.bucketB3) return 3;
	if (count >= p.bucketB2) return 2;
	if (count >= p.bucketB1) return 1;
	return 0;
}
