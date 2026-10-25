/* Финальный пейзаж: рельеф, лес, трава на ветру, дорожка и дым из трубы.
   Всё «прорастает» от дома наружу по мере роста радиуса uReveal */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PLOT, PLOT_DECOR } from './data';
import { sstep } from './math';
import { Tex, Mat } from './textures';
import { part, worldUV } from './house';

const Noise = (function () {
	function hash(x, y) {
		const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
		return s - Math.floor(s);
	}
	function value(x, y) {
		const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
		const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
		const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
		return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
	}
	function fbm(x, y, oct) {
		let s = 0, a = 0.5, f = 1;
		for (let i = 0; i < (oct || 4); i++) {
			s += a * value(x * f, y * f);
			f *= 2.03;
			a *= 0.5;
		}
		return s;
	}
	return { value: value, fbm: fbm };
})();

// рельеф: ровный луг у дома, холмы, а на горизонте — карпатские хребты
function terrainHeight(x, z) {
	const r = Math.sqrt(x * x + z * z);
	const near = sstep(18, 70, r) * (Noise.fbm(x * 0.035, z * 0.035) - 0.3) * 5;
	// холмы ниже уровня камеры (~8 м), иначе закрывают небо; горы — далеко и выше
	const hills = sstep(90, 210, r) * Noise.fbm(x * 0.012 + 7.3, z * 0.012 - 2.1, 5) * 8;
	const ridge = 1 - Math.abs(Noise.fbm(x * 0.0045 + 3.1, z * 0.0045 - 7.7, 5) * 2 - 1);
	const mountains = sstep(220, 400, r) * Math.pow(ridge, 1.5) * 26;
	return 0.012 + near + hills + mountains;
}

// точка внутри участка (с запасом от края)
export function inPlot(x, z) {
	const h = PLOT.size / 2 - 0.6;
	return Math.abs(x - PLOT.x) < h && Math.abs(z - PLOT.z) < h;
}

// плиты дорожки от крыльца: часть лежит на участке, остальное достраивается в финале
export function pathStones(d) {
	const out = [], x0 = d.W / 2 + 2.3, z0 = d.doorZ;
	let prev = null, acc = 0;
	for (let t = 0; t <= 1; t += 0.002) {
		const x = x0 + t * 16, z = z0 + t * t * 11;
		if (prev) acc += Math.hypot(x - prev[0], z - prev[1]);
		if (!prev || acc >= 0.92) {
			acc = 0;
			out.push({ x: x, z: z, rot: -Math.atan2(2 * t * 11, 16), r: Math.hypot(x, z) });
		}
		prev = [x, z];
	}
	return out;
}

export function stoneMesh(s) {
	const mat = Mat.get('concrete');
	const m = part(worldUV(new THREE.BoxGeometry(0.55, 0.07, 1.05), mat.userData.uv), mat, s.x, 0.04, s.z);
	m.rotation.y = s.rot;
	m.castShadow = false;
	return m;
}

function colorize(geo, hex) {
	const g = geo.index ? geo.toNonIndexed() : geo;
	const c = new THREE.Color(hex), n = g.attributes.position.count, arr = new Float32Array(n * 3);
	for (let i = 0; i < n; i++) {
		arr[i * 3] = c.r;
		arr[i * 3 + 1] = c.g;
		arr[i * 3 + 2] = c.b;
	}
	g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
	return g;
}

export function pineGeo(narrow) {
	const parts = [];
	const trunk = narrow ? 2.0 : 1.3;
	parts.push(colorize(new THREE.CylinderGeometry(0.1, 0.18, trunk + 1, 6).translate(0, (trunk + 1) / 2, 0), '#4a3828'));
	let y = trunk, r = narrow ? 1.25 : 1.95, h = narrow ? 2.7 : 2.9;
	const tiers = narrow ? 5 : 4;
	for (let i = 0; i < tiers; i++) {
		parts.push(colorize(new THREE.ConeGeometry(r, h, 7).translate(0, y + h / 2, 0), i % 2 ? '#2d4531' : '#36523a'));
		y += h * 0.5;
		r *= 0.76;
		h *= 0.9;
	}
	return mergeGeometries(parts);
}

export function birchGeo() {
	const parts = [colorize(new THREE.CylinderGeometry(0.07, 0.12, 4.4, 6).translate(0, 2.2, 0), '#d8d2c4')];
	[[0, 4.6, 0, 1.5], [0.7, 3.9, 0.3, 1.1], [-0.6, 3.7, -0.3, 1.0], [0.1, 5.5, 0.1, 1.0]].forEach(function (b) {
		parts.push(colorize(new THREE.IcosahedronGeometry(b[3], 0).translate(b[0], b[1], b[2]), '#7f9450'));
	});
	return mergeGeometries(parts);
}

export function bushGeo() {
	const parts = [];
	[[0, 0.45, 0, 0.7], [0.55, 0.35, 0.2, 0.5], [-0.45, 0.32, -0.15, 0.5]].forEach(function (b) {
		parts.push(colorize(new THREE.IcosahedronGeometry(b[3], 1).translate(b[0], b[1], b[2]), '#4f6a3a'));
	});
	return mergeGeometries(parts);
}

export function rockGeo() {
	return colorize(new THREE.DodecahedronGeometry(0.6, 0).scale(1, 0.55, 0.8).translate(0, 0.15, 0), '#8f8c86');
}

function tuftGeo(rand) {
	const pos = [], col = [], nor = [];
	const base = new THREE.Color('#46552b'), tip = new THREE.Color('#a9ab68');
	for (let b = 0; b < 5; b++) {
		const a = b / 5 * Math.PI * 2 + rand() * 0.6, h = 0.3 + rand() * 0.32, w = 0.035, lean = 0.06 + rand() * 0.14;
		const dx = Math.cos(a), dz = Math.sin(a), px = -dz * w, pz = dx * w;
		pos.push(px, 0, pz, -px, 0, -pz, dx * lean, h, dz * lean);
		col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b);
		nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
	}
	const g = new THREE.BufferGeometry();
	g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
	g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
	return g;
}

// радиальное «прорастание» земли: фрагменты дальше uReveal отбрасываются
function revealShader(mat, U) {
	mat.onBeforeCompile = function (sh) {
		sh.uniforms.uReveal = U.uReveal;
		sh.vertexShader = sh.vertexShader
			.replace('#include <common>', '#include <common>\nvarying vec3 vRevealPos;')
			.replace('#include <project_vertex>', '#include <project_vertex>\nvRevealPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
		sh.fragmentShader = sh.fragmentShader
			.replace('#include <common>', '#include <common>\nvarying vec3 vRevealPos;\nuniform float uReveal;')
			.replace('#include <clipping_planes_fragment>', [
				'#include <clipping_planes_fragment>',
				'float rAng = atan(vRevealPos.z, vRevealPos.x);',
				'float rEdge = uReveal + sin(rAng * 7.0) * 1.4 + sin(rAng * 13.0 + 1.3) * 0.8;',
				'if (length(vRevealPos.xz) > rEdge) discard;'
			].join('\n'));
	};
}

export class Landscape {
	constructor(scene) {
		this.group = new THREE.Group();
		this.group.visible = false;
		scene.add(this.group);
		this.U = { uReveal: { value: 0 }, uTime: { value: 0 } };
		this.rand = Tex.rng(2024);
		this.dummy = new THREE.Object3D();
		this.lastReveal = -1;
		this.pathFor = null;
		this.camDir = new THREE.Vector2(Math.sin(THREE.MathUtils.degToRad(34)), Math.cos(THREE.MathUtils.degToRad(34)));

		this.buildGround();
		// занятые точки в сетке 6×6 м — быстрая проверка дистанции между деревьями
		this.grid = {};
		PLOT_DECOR.forEach(function (it) { this.take(it[0] + PLOT.x, it[1] + PLOT.z); }, this);
		this.scatters = [
			this.scatter(pineGeo(true), 110, { rMin: 15, rMax: 85, corridor: 62, spacing: 3.4, s: [0.9, 1.6], back: 0.5 }),
			this.scatter(pineGeo(false), 60, { rMin: 15, rMax: 90, corridor: 62, spacing: 4, s: [0.8, 1.35], back: 0.6 }),
			this.scatter(birchGeo(), 34, { rMin: 14, rMax: 60, corridor: 50, spacing: 3.2, s: [0.85, 1.25], back: 0.3 }),
			this.scatter(bushGeo(), 40, { rMin: 9, rMax: 34, corridor: 0, spacing: 1.8, s: [0.7, 1.4], back: 0, house: true }),
			this.scatter(rockGeo(), 22, { rMin: 9, rMax: 40, corridor: 0, spacing: 1.5, s: [0.5, 1.6], back: 0, house: true })
		];
		this.buildGrass();
		this.buildSmoke();
		this.path = new THREE.Group();
		this.group.add(this.path);
	}

	buildGround() {
		const geo = new THREE.PlaneGeometry(1000, 1000, 260, 260);
		geo.rotateX(-Math.PI / 2);
		const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3);
		const c1 = new THREE.Color('#7c8a49'), c2 = new THREE.Color('#9fa462'), c3 = new THREE.Color('#b6a86b'), c4 = new THREE.Color('#5b6c3b');
		const forest = new THREE.Color('#3d5236'), t = new THREE.Color();
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i), z = pos.getZ(i), y = terrainHeight(x, z);
			pos.setY(i, y);
			const n = Noise.fbm(x * 0.05 + 3, z * 0.05);
			t.copy(c1).lerp(c2, sstep(0.38, 0.72, n));
			t.lerp(c3, sstep(0.6, 0.78, Noise.fbm(x * 0.02 - 4, z * 0.02 + 9)) * 0.55);
			t.lerp(c4, sstep(0.45, 0.22, n) * 0.6);
			t.lerp(forest, sstep(6, 22, y) * 0.8); // склоны темнеют от леса
			colors[i * 3] = t.r;
			colors[i * 3 + 1] = t.g;
			colors[i * 3 + 2] = t.b;
		}
		geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		geo.computeVertexNormals();
		const detail = Tex.grass({ base: '#d2d2c6', colors: ['#b9b9aa', '#ebebe1', '#c6c6b8', '#a9a99a'], seed: 5 });
		detail.repeat.set(250, 250);
		const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: detail, roughness: 1 });
		revealShader(mat, this.U);
		const ground = new THREE.Mesh(geo, mat);
		ground.receiveShadow = true;
		this.group.add(ground);
	}

	take(x, z) {
		const k = Math.floor(x / 6) + ':' + Math.floor(z / 6);
		(this.grid[k] || (this.grid[k] = [])).push([x, z]);
	}

	free(x, z, sp) {
		const gx = Math.floor(x / 6), gz = Math.floor(z / 6);
		for (let i = -1; i <= 1; i++) {
			for (let j = -1; j <= 1; j++) {
				const cell = this.grid[(gx + i) + ':' + (gz + j)];
				if (!cell) continue;
				for (let n = 0; n < cell.length; n++) {
					const q = cell[n];
					if ((q[0] - x) * (q[0] - x) + (q[1] - z) * (q[1] - z) < sp * sp) return false;
				}
			}
		}
		return true;
	}

	// раскладка экземпляров с отбраковкой: дом, дорожка, коридор обзора камеры, минимальная дистанция
	scatter(geo, count, o) {
		const rand = this.rand, items = [];
		let tries = 0;
		while (items.length < count && tries < count * 60) {
			tries++;
			const r = o.rMin + Math.pow(rand(), 0.8) * (o.rMax - o.rMin), a = rand() * Math.PI * 2;
			const x = Math.cos(a) * r, z = Math.sin(a) * r;
			if (Math.abs(x) < 7.5 && Math.abs(z) < 9.5) continue;
			if (x > 3 && x < 24 && z > 0 && z < 18) continue; // место под дорожку
			if (o.back && z > 0 && rand() < o.back) continue;           // лес гуще за домом
			if (o.corridor) {
				// коридор обзора: широкий у дома, узкий вдали, до самой камеры на мобильном
				const dot = (x * this.camDir.x + z * this.camDir.y) / r;
				if ((r < o.corridor && dot > 0.8) || (r < 120 && dot > 0.93)) continue;
			}
			if (!this.free(x, z, o.spacing)) continue;
			this.take(x, z);
			items.push({ x: x, z: z, y: terrainHeight(x, z) - 0.05, r: r, rot: rand() * 6.28, s: o.s[0] + rand() * (o.s[1] - o.s[0]) });
		}
		const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
		const mesh = new THREE.InstancedMesh(geo, mat, items.length);
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		mesh.frustumCulled = false;
		const tint = new THREE.Color();
		items.forEach(function (it, i) {
			tint.setHSL(0, 0, 0.82 + rand() * 0.36);
			mesh.setColorAt(i, tint);
		});
		this.group.add(mesh);
		return { mesh: mesh, items: items };
	}

	buildGrass() {
		const rand = this.rand, count = 8000;
		const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.95 });
		const U = this.U;
		mat.onBeforeCompile = function (sh) {
			sh.uniforms.uTime = U.uTime;
			sh.uniforms.uReveal = U.uReveal;
			sh.vertexShader = 'uniform float uTime;\nuniform float uReveal;\n' + sh.vertexShader.replace('#include <begin_vertex>', [
				'#include <begin_vertex>',
				'vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);',
				'float grow = smoothstep(length(ip), length(ip) + 5.0, uReveal);',
				'float sway = sin(uTime * 1.6 + ip.x * 0.35 + ip.y * 0.22) * 0.65 + sin(uTime * 2.7 + ip.y * 0.5) * 0.3;',
				'transformed.x += sway * 0.5 * position.y * position.y;',
				'transformed.z += sway * 0.22 * position.y * position.y;',
				'transformed *= grow;'
			].join('\n'));
		};
		const mesh = new THREE.InstancedMesh(tuftGeo(rand), mat, count);
		mesh.frustumCulled = false;
		mesh.receiveShadow = true;
		const d = this.dummy;
		let n = 0;
		while (n < count) {
			const r = 5 + Math.pow(rand(), 1.7) * 42, a = rand() * Math.PI * 2;
			const x = Math.cos(a) * r, z = Math.sin(a) * r;
			if (Math.abs(x) < 6 && Math.abs(z) < 8.2) continue;
			if (x > 5 && Math.abs(z - 3.9 - Math.pow((x - 5.8) / 16, 2) * 11) < 0.9) continue; // не на плитах дорожки
			d.position.set(x, terrainHeight(x, z) - 0.02, z);
			d.rotation.set(0, rand() * 6.28, 0);
			d.scale.setScalar(0.4 + rand() * 0.55);
			d.updateMatrix();
			mesh.setMatrixAt(n++, d.matrix);
		}
		this.group.add(mesh);
	}

	buildSmoke() {
		const tex = Tex.radial([[0, 'rgba(255,255,255,0.85)'], [0.45, 'rgba(255,255,255,0.32)'], [1, 'rgba(255,255,255,0)']]);
		this.smoke = [];
		for (let i = 0; i < 26; i++) {
			const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#ece6dc', transparent: true, depthWrite: false, opacity: 0 }));
			s.userData.off = i / 26;
			this.smoke.push(s);
			this.group.add(s);
		}
	}

	// продолжение дорожки за пределами участка
	buildPath(d) {
		while (this.path.children.length) this.path.children.pop().geometry.dispose();
		pathStones(d).forEach(function (s) {
			if (inPlot(s.x, s.z)) return;
			const m = stoneMesh(s);
			m.userData.r = s.r;
			this.path.add(m);
		}, this);
		this.pathFor = d;
	}

	grow(reveal) {
		const d = this.dummy;
		this.scatters.forEach(function (sc) {
			sc.items.forEach(function (it, i) {
				const g = Math.max(0, Math.min(1, (reveal - it.r + 1) / 9));
				const e = g === 0 ? 0.0001 : 1 + 2.2 * Math.pow(g - 1, 3) + 1.2 * Math.pow(g - 1, 2); // easeOutBack
				d.position.set(it.x, it.y, it.z);
				d.rotation.set(0, it.rot, 0);
				d.scale.setScalar(Math.max(0.0001, it.s * e));
				d.updateMatrix();
				sc.mesh.setMatrixAt(i, d.matrix);
			});
			sc.mesh.instanceMatrix.needsUpdate = true;
		});
		this.path.children.forEach(function (m) {
			const g = Math.max(0.0001, Math.min(1, (reveal - m.userData.r + 1) / 3));
			m.scale.setScalar(g);
		});
	}

	update(fT, time, house) {
		const show = fT > 0.001;
		this.group.visible = show;
		if (!show) return;
		if (this.pathFor !== house.d) this.buildPath(house.d);
		this.U.uTime.value = time;
		const reveal = Math.pow(fT, 1.5) * 760;
		this.U.uReveal.value = reveal;
		if (Math.abs(reveal - this.lastReveal) > 0.01) {
			this.grow(reveal);
			this.lastReveal = reveal;
		}

		const top = house.chimneyTop, amount = top ? sstep(0.55, 1, fT) : 0;
		this.smoke.forEach(function (s) {
			if (!amount) {
				s.visible = false;
				return;
			}
			const off = s.userData.off, life = (time * 0.11 + off) % 1;
			s.visible = true;
			s.position.set(
				top.x + life * 2.6 + Math.sin(life * 6 + off * 20) * 0.25,
				top.y + life * 4.4,
				top.z - life * 1.4 + Math.cos(life * 5 + off * 13) * 0.2
			);
			s.scale.setScalar(0.35 + life * 2.6);
			s.material.opacity = amount * Math.pow(Math.sin(Math.PI * life), 1.3) * 0.36;
		});
	}
}
