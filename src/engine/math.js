/* Общие помощники: ограничение, интерполяция, плавные кривые */

export function clamp(v, a, b) {
	return Math.max(a, Math.min(b, v));
}

export function lerp(a, b, t) {
	return a + (b - a) * t;
}

export function easeInOut(t) {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function sstep(a, b, x) {
	const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
	return t * t * (3 - 2 * t);
}
