/* Процедурные текстуры (canvas) и общий кэш материалов — никаких внешних картинок */

import * as THREE from 'three';

export const Tex = (function () {
	function rng(seed) {
		let a = seed >>> 0;
		return function () {
			a = (a + 0x6D2B79F5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	function canvas(w, h) {
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		return c;
	}

	function texture(c, srgb) {
		const t = new THREE.CanvasTexture(c);
		t.wrapS = t.wrapT = THREE.RepeatWrapping;
		t.anisotropy = 8;
		if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
		return t;
	}

	function rgb(hex) {
		const n = parseInt(hex.slice(1), 16);
		return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
	}

	function css(c, a) {
		return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + (a === undefined ? 1 : a) + ')';
	}

	function shade(c, k) {
		return [Math.min(255, c[0] * k), Math.min(255, c[1] * k), Math.min(255, c[2] * k)];
	}

	// пятно с переносом через край — текстура остаётся бесшовной
	function blot(g, S, x, y, r, style) {
		g.fillStyle = style;
		for (let ox = -1; ox <= 1; ox++) {
			for (let oy = -1; oy <= 1; oy++) {
				const px = x + ox * S, py = y + oy * S;
				if (px + r < 0 || px - r > S || py + r < 0 || py - r > S) continue;
				g.beginPath();
				g.arc(px, py, r, 0, Math.PI * 2);
				g.fill();
			}
		}
	}

	// вертикальная доска: { base, count, vary, seed, knots, burnt, groove }
	function boards(o) {
		const S = 512, rand = rng(o.seed || 7);
		const base = rgb(o.base), dark = shade(base, 0.6), light = shade(base, 1.3);
		const c = canvas(S, S), g = c.getContext('2d');
		const b = canvas(S, S), gb = b.getContext('2d');
		gb.fillStyle = '#c8c8c8';
		gb.fillRect(0, 0, S, S);
		const bw = S / o.count;

		for (let i = 0; i < o.count; i++) {
			const x0 = i * bw;
			g.fillStyle = css(shade(base, 1 + (rand() - 0.5) * o.vary));
			g.fillRect(x0, 0, bw, S);

			for (let k = 0; k < 36; k++) {
				const gx = x0 + 3 + rand() * (bw - 6), amp = 0.6 + rand() * 2.4, ph = rand() * 6.28, f = 1 + Math.floor(rand() * 3);
				const dk = rand() > 0.45;
				g.strokeStyle = dk ? css(dark, 0.05 + rand() * 0.16) : css(light, 0.05 + rand() * 0.12);
				gb.strokeStyle = dk ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)';
				g.lineWidth = gb.lineWidth = 0.4 + rand() * 1.4;
				g.beginPath();
				gb.beginPath();
				for (let y = 0; y <= S; y += 16) {
					const px = gx + Math.sin(y / S * Math.PI * 2 * f + ph) * amp;
					if (y === 0) { g.moveTo(px, y); gb.moveTo(px, y); } else { g.lineTo(px, y); gb.lineTo(px, y); }
				}
				g.stroke();
				gb.stroke();
			}

			if (o.knots && rand() > 0.5) {
				const kx = x0 + bw * (0.3 + rand() * 0.4), ky = 20 + rand() * (S - 40);
				g.fillStyle = css(dark, 0.5);
				g.beginPath();
				g.ellipse(kx, ky, 2 + rand() * 3, 5 + rand() * 6, 0, 0, 6.28);
				g.fill();
			}

			if (o.burnt) {
				for (let k = 0; k < 110; k++) {
					const lit = rand() > 0.55;
					g.fillStyle = lit ? css(light, 0.06 + rand() * 0.1) : 'rgba(6,6,6,' + (0.15 + rand() * 0.2) + ')';
					const w = 3 + rand() * bw * 0.4, h = 1 + rand() * 2.5;
					const x = x0 + rand() * (bw - w), y = rand() * S;
					g.fillRect(x, y, w, h);
					gb.fillStyle = lit ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.35)';
					gb.fillRect(x, y, w, h);
				}
			}

			g.fillStyle = css(o.groove ? rgb(o.groove) : shade(base, 0.35), 0.95);
			g.fillRect(x0, 0, 3, S);
			g.fillStyle = css(light, 0.22);
			g.fillRect(x0 + 3, 0, 1, S);
			gb.fillStyle = '#000';
			gb.fillRect(x0, 0, 3, S);
		}
		return { map: texture(c), bump: texture(b, false) };
	}

	// базовый цвет + россыпь пятен: spots = [[hex, alpha, count, rMin, rMax]]
	function speckle(o) {
		const S = o.size || 512, rand = rng(o.seed || 3);
		const c = canvas(S, S), g = c.getContext('2d');
		g.fillStyle = o.base;
		g.fillRect(0, 0, S, S);
		o.spots.forEach(function (sp) {
			const col = rgb(sp[0]);
			for (let i = 0; i < sp[2]; i++) {
				blot(g, S, rand() * S, rand() * S, sp[3] + rand() * (sp[4] - sp[3]), css(shade(col, 0.85 + rand() * 0.3), sp[1] * (0.4 + rand() * 0.6)));
			}
		});
		return c;
	}

	function concrete(base) {
		const c = speckle({
			base: base || '#bdbbb6', seed: 11, spots: [
				['#8e8b86', 0.07, 30, 30, 90], ['#dcdad5', 0.08, 24, 30, 80],
				['#706d68', 0.35, 1100, 0.5, 1.6], ['#ecebe7', 0.3, 600, 0.5, 1.4]
			]
		});
		return { map: texture(c), bump: texture(c, false) };
	}

	function gravel() {
		const c = speckle({
			base: '#a29e96', seed: 5, spots: [
				['#6c6861', 0.9, 1600, 1.5, 4], ['#cbc7bf', 0.9, 1600, 1.5, 4],
				['#867f74', 0.9, 900, 1, 3.5], ['#e6e2da', 0.7, 400, 1, 2.5]
			]
		});
		return { map: texture(c), bump: texture(c, false) };
	}

	function grass(o) {
		const S = 512, rand = rng(o.seed || 17);
		const c = canvas(S, S), g = c.getContext('2d');
		g.fillStyle = o.base;
		g.fillRect(0, 0, S, S);
		const cols = o.colors.map(rgb);
		for (let i = 0; i < 46; i++) blot(g, S, rand() * S, rand() * S, 20 + rand() * 60, css(cols[i % cols.length], 0.09));
		g.lineCap = 'round';
		for (let i = 0; i < 10000; i++) {
			const x = rand() * S, y = rand() * S, l = 2 + rand() * 5, a = -Math.PI / 2 + (rand() - 0.5) * 1.3;
			g.strokeStyle = css(shade(cols[Math.floor(rand() * cols.length)], 0.8 + rand() * 0.4), 0.55);
			g.lineWidth = 0.6 + rand() * 0.9;
			g.beginPath();
			g.moveTo(x, y);
			g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
			g.stroke();
		}
		return texture(c);
	}

	// срез грунта для боковин участка: дёрн, гумус, глина, песок
	function soil() {
		const W = 1024, H = 128, rand = rng(21);
		const c = canvas(W, H), g = c.getContext('2d');
		const layers = [[0, '#6c7748'], [0.075, '#3a2f26'], [0.4, '#6a533f'], [0.72, '#9c8668']];
		layers.forEach(function (l, i) {
			g.fillStyle = l[1];
			g.beginPath();
			g.moveTo(0, H);
			for (let x = 0; x <= W; x += 8) {
				const wob = i === 0 ? 0 : Math.sin(x / W * Math.PI * 6 + i) * 2.5 + Math.sin(x / W * Math.PI * 14 + i * 2) * 1.5;
				g.lineTo(x, l[0] * H + wob);
			}
			g.lineTo(W, H);
			g.closePath();
			g.fill();
		});
		for (let i = 0; i < 1800; i++) {
			const y = H * 0.1 + rand() * H * 0.9, x = rand() * W;
			const lit = y > H * 0.5 ? rand() > 0.35 : rand() > 0.7;
			g.fillStyle = lit ? 'rgba(220,205,180,' + (0.2 + rand() * 0.4) + ')' : 'rgba(20,14,10,' + (0.2 + rand() * 0.3) + ')';
			g.beginPath();
			g.ellipse(x, y, 0.6 + rand() * 2.2, 0.5 + rand() * 1.5, rand() * 3, 0, 6.28);
			g.fill();
		}
		g.lineCap = 'round';
		for (let i = 0; i < 900; i++) {
			const x = rand() * W;
			g.strokeStyle = 'rgba(' + (90 + rand() * 40) + ',' + (110 + rand() * 30) + ',60,0.8)';
			g.lineWidth = 0.8;
			g.beginPath();
			g.moveTo(x, H * 0.075);
			g.lineTo(x + (rand() - 0.5) * 3, -1 + rand() * 4);
			g.stroke();
		}
		const t = texture(c);
		t.wrapT = THREE.ClampToEdgeWrapping;
		return t;
	}

	function shingles() {
		const S = 512, rand = rng(9), base = rgb('#3d3531');
		const c = canvas(S, S), g = c.getContext('2d');
		const b = canvas(S, S), gb = b.getContext('2d');
		g.fillStyle = css(shade(base, 0.6));
		g.fillRect(0, 0, S, S);
		gb.fillStyle = '#000';
		gb.fillRect(0, 0, S, S);
		const rh = 64, tw = 64;
		for (let r = 0; r < S / rh; r++) {
			const y = r * rh, off = (r % 2) * tw / 2;
			for (let t = -1; t <= S / tw; t++) {
				const x = t * tw + off, col = shade(base, 0.82 + rand() * 0.36);
				const grd = g.createLinearGradient(0, y, 0, y + rh);
				grd.addColorStop(0, css(shade(col, 1.12)));
				grd.addColorStop(1, css(shade(col, 0.82)));
				g.fillStyle = grd;
				g.fillRect(x + 2, y, tw - 4, rh - 5);
				gb.fillStyle = '#9a9a9a';
				gb.fillRect(x + 2, y, tw - 4, rh - 5);
				for (let k = 0; k < 60; k++) {
					g.fillStyle = rand() > 0.5 ? 'rgba(255,240,220,0.08)' : 'rgba(0,0,0,0.12)';
					g.fillRect(x + 2 + rand() * (tw - 6), y + rand() * (rh - 6), 1.5, 1.5);
				}
			}
		}
		return { map: texture(c), bump: texture(b, false) };
	}

	function sedum() {
		const c = speckle({
			base: '#55673a', seed: 31, spots: [
				['#6f8b45', 0.8, 2600, 1, 3.4], ['#3e5230', 0.8, 2200, 1, 3.2], ['#8fa354', 0.7, 1200, 0.8, 2.2],
				['#9a5a3e', 0.6, 380, 0.8, 2], ['#d2c15c', 0.8, 260, 0.6, 1.4]
			]
		});
		return { map: texture(c), bump: texture(c, false) };
	}

	function brick() {
		const S = 512, rand = rng(13);
		const c = canvas(S, S), g = c.getContext('2d');
		const b = canvas(S, S), gb = b.getContext('2d');
		g.fillStyle = '#a39c92';
		g.fillRect(0, 0, S, S);
		gb.fillStyle = '#000';
		gb.fillRect(0, 0, S, S);
		const cols = ['#5a3a2f', '#6b4334', '#4b3029', '#764b39', '#62402f'].map(rgb);
		const rh = 32, bl = 128;
		for (let r = 0; r < S / rh; r++) {
			const off = (r % 2) * bl / 2;
			for (let t = -1; t <= S / bl; t++) {
				const x = t * bl + off + 3, y = r * rh + 3;
				g.fillStyle = css(shade(cols[Math.floor(rand() * cols.length)], 0.9 + rand() * 0.2));
				g.fillRect(x, y, bl - 6, rh - 6);
				gb.fillStyle = '#b0b0b0';
				gb.fillRect(x, y, bl - 6, rh - 6);
				for (let k = 0; k < 40; k++) {
					g.fillStyle = rand() > 0.5 ? 'rgba(0,0,0,0.15)' : 'rgba(255,220,190,0.08)';
					g.fillRect(x + rand() * (bl - 8), y + rand() * (rh - 8), 2, 2);
				}
			}
		}
		return { map: texture(c), bump: texture(b, false) };
	}

	function radial(stops) {
		const S = 128, c = canvas(S, S), g = c.getContext('2d');
		const grd = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
		stops.forEach(function (s) { grd.addColorStop(s[0], s[1]); });
		g.fillStyle = grd;
		g.fillRect(0, 0, S, S);
		const t = new THREE.CanvasTexture(c);
		t.colorSpace = THREE.SRGBColorSpace;
		return t;
	}

	return {
		rng: rng,
		boards: boards,
		speckle: function (o) { return texture(speckle(o)); },
		concrete: concrete,
		gravel: gravel,
		grass: grass,
		soil: soil,
		shingles: shingles,
		sedum: sedum,
		brick: brick,
		radial: radial
	};
})();

export const Mat = (function () {
	const cache = {};

	function std(o) {
		return new THREE.MeshStandardMaterial(o);
	}

	// uv — сколько метров покрывает один повтор текстуры
	function sized(m, uv) {
		m.userData.uv = uv;
		return m;
	}

	function wood(o, uv, extra) {
		const t = Tex.boards(o);
		return sized(std(Object.assign({ map: t.map, bumpMap: t.bump, bumpScale: 1.6, roughness: 0.85 }, extra || {})), uv);
	}

	const make = {
		concrete: function () {
			const t = Tex.concrete();
			return sized(std({ map: t.map, bumpMap: t.bump, bumpScale: 0.8, roughness: 0.92 }), 2.5);
		},
		'concrete-dark': function () {
			const t = Tex.concrete('#8f8d89');
			return sized(std({ map: t.map, bumpMap: t.bump, bumpScale: 0.5, roughness: 0.8 }), 1.6);
		},
		gravel: function () {
			const t = Tex.gravel();
			return sized(std({ map: t.map, bumpMap: t.bump, bumpScale: 2, roughness: 1 }), 1.2);
		},
		grass: function () {
			return sized(std({ map: Tex.grass({ base: '#76804f', colors: ['#5f6b3c', '#8a9258', '#6f7a46', '#9c9a62'] }), roughness: 1 }), 4);
		},
		soil: function () {
			return std({ map: Tex.soil(), roughness: 1 });
		},
		'plot-bottom': function () {
			return std({ color: '#2b241e', roughness: 1 });
		},
		timber0: function () { return std({ color: '#dcbc8c', roughness: 0.78 }); },
		timber1: function () { return std({ color: '#cfaa77', roughness: 0.8 }); },
		timber2: function () { return std({ color: '#e4c89c', roughness: 0.76 }); },
		'wall-larch': function () {
			return wood({ base: '#ad7a4e', count: 8, vary: 0.24, knots: true, seed: 4 }, 1.25);
		},
		'wall-charred': function () {
			return wood({ base: '#2a2725', count: 7, vary: 0.3, burnt: true, groove: '#0b0b0b', seed: 8 }, 1.25, { roughness: 0.92, bumpScale: 2.4 });
		},
		'wall-pine': function () {
			return wood({ base: '#d6bf98', count: 8, vary: 0.16, knots: true, groove: '#9b7d57', seed: 12 }, 1.25);
		},
		'door-oak': function () {
			return wood({ base: '#83582f', count: 9, vary: 0.12, seed: 15 }, 1.1, { roughness: 0.7 });
		},
		deck: function () {
			return wood({ base: '#9a7350', count: 6, vary: 0.2, seed: 19 }, 1.2);
		},
		soffit: function () {
			return wood({ base: '#cfb089', count: 8, vary: 0.12, seed: 23 }, 1.25);
		},
		glass: function () {
			return std({ color: '#1d272e', metalness: 0.85, roughness: 0.05, envMapIntensity: 1.1, emissive: '#ffc690', emissiveIntensity: 0 });
		},
		black: function () {
			return std({ color: '#1f1f1f', roughness: 0.5, metalness: 0.35 });
		},
		steel: function () {
			return std({ color: '#a9a8a4', roughness: 0.3, metalness: 0.9 });
		},
		'door-steel': function () {
			return std({ color: '#272727', roughness: 0.62, metalness: 0.55 });
		},
		'roof-seam': function () {
			return sized(std({ color: '#2c2d2f', roughness: 0.42, metalness: 0.6 }), 2);
		},
		'roof-shingle': function () {
			const t = Tex.shingles();
			return sized(std({ map: t.map, bumpMap: t.bump, bumpScale: 2.5, roughness: 0.95 }), 1.4);
		},
		'roof-green': function () {
			const t = Tex.sedum();
			return sized(std({ map: t.map, bumpMap: t.bump, bumpScale: 3, roughness: 1 }), 1.8);
		},
		fascia: function () {
			return std({ color: '#252525', roughness: 0.6, metalness: 0.3 });
		},
		brick: function () {
			const t = Tex.brick();
			return sized(std({ map: t.map, bumpMap: t.bump, bumpScale: 1.5, roughness: 0.9 }), 1);
		},
		insulation: function () {
			return sized(std({
				map: Tex.speckle({ base: '#c7ab63', seed: 41, spots: [['#e0c983', 0.6, 2000, 0.6, 2], ['#94783c', 0.5, 1500, 0.6, 2]] }),
				roughness: 1
			}), 0.8);
		},
		osb: function () {
			return sized(std({
				map: Tex.speckle({ base: '#c9a46f', seed: 43, spots: [['#a87d45', 0.7, 500, 2, 7], ['#e0c08b', 0.6, 500, 2, 7], ['#8a6438', 0.6, 300, 1, 4]] }),
				roughness: 0.85
			}), 1);
		},
		membrane: function () {
			return std({ color: '#3a3f44', roughness: 0.7 });
		},
		stake: function () {
			return std({ color: '#c8a678', roughness: 0.8 });
		},
		'stake-tip': function () {
			return std({ color: '#c4482f', roughness: 0.6 });
		}
	};

	return {
		get: function (name) {
			return cache[name] || (cache[name] = make[name]());
		}
	};
})();
