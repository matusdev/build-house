/* Параметрический дом: каркас, стены, окна, двери, кровля и дымоход строятся по размерам планировки */

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { gsap } from 'gsap';
import { HOUSE, LAYOUTS, STEPS } from './data';
import { Mat } from './textures';

export function houseDims(id) {
	const L = LAYOUTS[id];
	const d = {
		id: id, W: L.W, D: L.D, H: L.H, R: L.R,
		B: HOUSE.base, T: HOUSE.wall, eave: HOUSE.eave, gable: HOUSE.gable, th: HOUSE.roof
	};
	d.A = Math.atan2(d.R, d.W / 2);
	d.cos = Math.cos(d.A);
	d.sin = Math.sin(d.A);
	d.ridge = d.B + d.H + d.R;
	d.doorZ = d.D / 2 - 1.6;
	d.k = (d.W + d.D) / 18;
	return d;
}

// высота нижней плоскости кровли над точкой x
function roofLineY(d, x) {
	return d.B + d.H + d.R * (1 - Math.abs(x) / (d.W / 2));
}

// UV в метрах по доминирующей оси нормали — текстуры не растягиваются на панелях разной длины
export function worldUV(geo, size) {
	const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
	for (let i = 0; i < p.count; i++) {
		const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
		let u, v;
		if (ay > ax && ay > az) { u = p.getZ(i); v = p.getX(i); }
		else if (ax > az) { u = p.getZ(i); v = p.getY(i); }
		else { u = p.getX(i); v = p.getY(i); }
		uv.setXY(i, u / size, v / size);
	}
	uv.needsUpdate = true;
	return geo;
}

export function part(geo, mat, x, y, z) {
	const m = new THREE.Mesh(geo, mat);
	m.position.set(x || 0, y || 0, z || 0);
	m.castShadow = true;
	m.receiveShadow = true;
	return m;
}

export function box(w, h, depth, uv) {
	const g = new THREE.BoxGeometry(w, h, depth);
	return uv ? worldUV(g, uv) : g;
}

let unitBox = null;
function member(sx, sy, sz, x, y, z, rz, mat) {
	if (!unitBox) {
		unitBox = new THREE.BoxGeometry(1, 1, 1);
		unitBox.userData.shared = true;
	}
	const m = part(unitBox, mat, x, y, z);
	m.scale.set(sx, sy, sz);
	if (rz) m.rotation.z = rz;
	return m;
}

export function disposeObj(obj) {
	obj.traverse(function (o) {
		if (o.isMesh && o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
	});
}

/* ---------- Каркас ---------- */

export function buildFrame(d) {
	const out = [];
	const mats = [Mat.get('timber0'), Mat.get('timber1'), Mat.get('timber2')];
	const tm = function () { return mats[out.length % 3]; };
	const B = d.B, pl = 0.1, sw = 0.15, st = 0.05;
	const xi = d.W / 2 - d.T / 2, zi = d.D / 2 - d.T / 2;

	// нижняя обвязка (поперечные брусья не заходят в продольные — без совпадающих граней)
	[1, -1].forEach(function (s) { out.push(member(sw, pl, d.D - 0.02, s * xi, B + pl / 2, 0, 0, tm())); });
	[1, -1].forEach(function (s) { out.push(member(d.W - d.T - 0.17, pl, sw, 0, B + pl / 2, s * zi, 0, tm())); });

	// стойки продольных стен
	const sideLen = d.D - d.T, ns = Math.round(sideLen / 0.6), hs = d.H - 2 * pl;
	for (let i = 0; i <= ns; i++) {
		const z = -sideLen / 2 + i * sideLen / ns;
		[1, -1].forEach(function (s) { out.push(member(sw, hs, st, s * xi, B + pl + hs / 2, z, 0, tm())); });
	}

	// верхняя обвязка — чуть ниже верха стеновой панели, иначе грани совпадают и мерцают
	[1, -1].forEach(function (s) { out.push(member(sw, pl, d.D - 0.02, s * xi, B + d.H - pl / 2 - 0.015, 0, 0, tm())); });

	// стойки фронтонов — до линии ската
	const gLen = d.W - d.T, ng = Math.round(gLen / 0.6);
	for (let i = 1; i < ng; i++) {
		const x = -gLen / 2 + i * gLen / ng;
		const h = roofLineY(d, x) - 0.22 / d.cos - (B + pl);
		if (h < 0.15) continue;
		[1, -1].forEach(function (s) { out.push(member(st, h, sw, x, B + pl + h / 2, s * zi, 0, tm())); });
	}

	// конёк
	out.push(member(0.1, 0.24, d.D + 2 * d.gable, 0, d.ridge - 0.2 / d.cos - 0.1, 0, 0, tm()));

	// стропила: рядовые — внутри фронтонов (не в толще стены), крайние — под свесом
	const rh = 0.2, L = (d.W / 2 + d.eave) / d.cos;
	const cx = d.cos * L / 2 - d.sin * rh / 2;
	const cy = d.ridge - d.sin * L / 2 - d.cos * rh / 2;
	const span = d.D - 2 * d.T - 0.1, nr = Math.round(span / 0.9);
	const zs = [-(d.D / 2 + d.gable - 0.04), d.D / 2 + d.gable - 0.04];
	for (let i = 0; i <= nr; i++) zs.push(-span / 2 + i * span / nr);
	zs.sort(function (a, b) { return a - b; });

	zs.forEach(function (z, i) {
		// пара стропил разной толщины: у конька они пересекаются, и одинаковые боковые грани мерцали бы
		out.push(member(L, rh, 0.06, cx, cy, z, -d.A, tm()));
		out.push(member(L, rh, 0.056, -cx, cy, z, d.A, tm()));
		if (i % 2 === 1 && Math.abs(z) < d.D / 2) {
			const yt = d.B + d.H + d.R * 0.5;
			const half = (d.W / 2) * (1 - (yt - d.B - d.H) / d.R) - 0.04;
			out.push(member(half * 2, 0.16, 0.05, 0, yt, z + 0.06, 0, tm()));
		}
	});
	return out;
}

/* ---------- Стены ---------- */

function buildWalls(d, type) {
	const mat = Mat.get('wall-' + type), uv = mat.userData.uv;
	const out = [];

	const shape = new THREE.Shape();
	shape.moveTo(-d.W / 2, 0);
	shape.lineTo(d.W / 2, 0);
	shape.lineTo(d.W / 2, d.H);
	shape.lineTo(0, d.H + d.R);
	shape.lineTo(-d.W / 2, d.H);
	shape.closePath();

	function gable(s) {
		const g = new THREE.ExtrudeGeometry(shape, { depth: d.T, bevelEnabled: false });
		g.translate(0, -(d.H + d.R) / 2, -d.T / 2);
		worldUV(g, uv);
		return part(g, mat, 0, d.B + (d.H + d.R) / 2, s * (d.D / 2 - d.T / 2));
	}

	function side(s) {
		return part(box(d.T, d.H, d.D - 2 * d.T, uv), mat, s * (d.W / 2 - d.T / 2), d.B + d.H / 2, 0);
	}

	out.push(gable(-1), side(-1), side(1), gable(1));
	return out;
}

/* ---------- Окна ---------- */

function spread(a, b, n) {
	const r = [];
	for (let i = 0; i < n; i++) r.push(a + (i + 0.5) * (b - a) / n);
	return r;
}

// проёмы: face R/L — продольные стены, F/B — фронтоны; u — координата вдоль фасада, y — от пола
function openings(d, type) {
	const list = [];
	const rA = -d.D / 2 + 0.9, rB = d.doorZ - 0.95;
	const lA = -d.D / 2 + 0.9, lB = d.D / 2 - 0.9;

	if (type === 'standard') {
		const n = Math.max(1, Math.round((rB - rA) / 2.8));
		list.push({ face: 'F', u: -d.W / 4, y: 0.8, w: 1.1, h: 1.6 }, { face: 'F', u: d.W / 4, y: 0.8, w: 1.1, h: 1.6 });
		list.push({ face: 'F', u: 0, y: d.H + 0.3, w: 0.9, h: 0.9 });
		spread(rA, rB, n).forEach(function (z) { list.push({ face: 'R', u: z, y: 0.9, w: 1.3, h: 1.45 }); });
		spread(lA, lB, n + 1).forEach(function (z) { list.push({ face: 'L', u: z, y: 0.9, w: 1.3, h: 1.45 }); });
		list.push({ face: 'B', u: 0, y: 0.9, w: 1.3, h: 1.45 });
	} else if (type === 'panoramic') {
		const n = Math.max(1, Math.round((rB - rA) / 3.2));
		list.push({ face: 'F', kind: 'pano' });
		spread(rA, rB, n).forEach(function (z) { list.push({ face: 'R', u: z, y: 0.12, w: 1.1, h: 2.45 }); });
		spread(lA, lB, n + 1).forEach(function (z) { list.push({ face: 'L', u: z, y: 0.12, w: 1.1, h: 2.45 }); });
		list.push({ face: 'B', u: 0, y: 0.12, w: 1.6, h: 2.45 });
	} else {
		list.push({ face: 'F', u: -d.W / 4 - 0.1, y: 0.12, w: 1.0, h: 2.4 }, { face: 'F', u: d.W / 4 + 0.1, y: 0.12, w: 1.0, h: 2.4 });
		list.push({ face: 'F', u: 0, y: d.H + 0.25, w: 1.4, h: 1.0 });
		list.push({ face: 'R', u: (rA + rB) / 2, y: 0.05, w: Math.min(3.6, rB - rA - 0.4), h: 2.45, kind: 'portal' });
		list.push({ face: 'L', u: 0, y: 0.05, w: Math.min(4.2, d.D - 3), h: 2.45, kind: 'portal' });
		list.push({ face: 'B', u: 0, y: 0.05, w: 2.4, h: 2.45, kind: 'portal' });
	}
	return list;
}

function placeOnFace(obj, d, face, u, y) {
	const Y = d.B + y;
	if (face === 'R') { obj.position.set(d.W / 2, Y, u); obj.rotation.y = Math.PI / 2; }
	else if (face === 'L') { obj.position.set(-d.W / 2, Y, u); obj.rotation.y = -Math.PI / 2; }
	else if (face === 'F') { obj.position.set(u, Y, d.D / 2); obj.rotation.y = 0; }
	else { obj.position.set(u, Y, -d.D / 2); obj.rotation.y = Math.PI; }
	return obj;
}

// брусок рамы между точками a и b в плоскости фасада
function bar(a, b, w, depth) {
	const dx = b[0] - a[0], dy = b[1] - a[1];
	const m = part(box(Math.hypot(dx, dy) + w, w, depth), Mat.get('black'), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, depth / 2);
	m.rotation.z = Math.atan2(dy, dx);
	return m;
}

export function windowObj(o) {
	const g = new THREE.Group(), black = Mat.get('black');
	const fw = 0.075, depth = o.kind === 'portal' ? 0.13 : 0.2, w = o.w, h = o.h;
	g.add(part(box(w, fw, depth), black, 0, h / 2 - fw / 2, depth / 2));
	g.add(part(box(w, fw, depth), black, 0, -h / 2 + fw / 2, depth / 2));
	g.add(part(box(fw, h - 2 * fw, depth), black, -w / 2 + fw / 2, 0, depth / 2));
	g.add(part(box(fw, h - 2 * fw, depth), black, w / 2 - fw / 2, 0, depth / 2));
	g.add(part(box(w - 2 * fw + 0.01, h - 2 * fw + 0.01, 0.02), Mat.get('glass'), 0, 0, 0.05));

	const panes = o.kind === 'portal' ? 3 : (w > 1.25 ? 2 : 1);
	for (let i = 1; i < panes; i++) g.add(part(box(0.055, h - 2 * fw, 0.08), black, -w / 2 + i * w / panes, 0, 0.07));
	if (o.kind === 'portal') {
		// створки раздвижной системы — смещены друг относительно друга
		for (let i = 0; i < panes; i++) {
			const x = -w / 2 + (i + 0.5) * w / panes;
			g.add(part(box(w / panes - 0.12, 0.04, 0.03), black, x, -h / 2 + fw + 0.04, 0.09 + (i % 2) * 0.02));
		}
	} else if (h > 2) {
		g.add(part(box(w - 2 * fw, 0.05, 0.08), black, 0, h / 2 - 0.55, 0.07));
	}
	if (o.y > 0.3) g.add(part(box(w + 0.1, 0.035, 0.28), black, 0, -h / 2 - 0.0175, 0.14));
	return g;
}

// контур панорамного остекления фронтона (центрирован по высоте)
function panoShape(d) {
	const m = 0.5, hw = d.W / 2 - m, yb = 0.12;
	const yEdge = d.H + d.R * (m / (d.W / 2)) - m / d.cos;
	const yTop = d.H + d.R - m / d.cos;
	const cy = (yb + yTop) / 2;
	return {
		cy: cy, hw: hw, yb: yb - cy, yEdge: yEdge - cy, yTop: yTop - cy,
		pts: [[-hw, yb - cy], [hw, yb - cy], [hw, yEdge - cy], [0, yTop - cy], [-hw, yEdge - cy]]
	};
}

export function panoObj(d) {
	const s = panoShape(d), g = new THREE.Group();
	const shape = new THREE.Shape(s.pts.map(function (p) { return new THREE.Vector2(p[0], p[1]); }));
	g.add(part(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false }), Mat.get('glass'), 0, 0, 0.04));
	for (let i = 0; i < s.pts.length; i++) g.add(bar(s.pts[i], s.pts[(i + 1) % s.pts.length], 0.09, 0.17));

	const n = Math.max(2, Math.round(s.hw * 2 / 1.05));
	for (let i = 1; i < n; i++) {
		const x = -s.hw + i * (2 * s.hw / n);
		const top = s.yEdge + (s.yTop - s.yEdge) * (1 - Math.abs(x) / s.hw);
		g.add(bar([x, s.yb], [x, top], 0.05, 0.11));
	}
	const yT = d.H - 0.25 - s.cy;
	g.add(bar([-s.hw, yT], [s.hw, yT], 0.05, 0.11));
	g.userData.cy = s.cy;
	return g;
}

function buildWindows(d, type) {
	return openings(d, type).map(function (o) {
		if (o.kind === 'pano') {
			const g = panoObj(d);
			return placeOnFace(g, d, 'F', 0, g.userData.cy);
		}
		return placeOnFace(windowObj(o), d, o.face, o.u, o.y + o.h / 2);
	});
}

/* ---------- Двери ---------- */

export function doorObj(type) {
	const g = new THREE.Group(), black = Mat.get('black');
	const w = 1.1, h = 2.3, fw = 0.08, depth = 0.2;
	g.add(part(box(w, fw, depth), black, 0, h / 2 - fw / 2, depth / 2));
	g.add(part(box(fw, h - fw, depth), black, -w / 2 + fw / 2, -fw / 2, depth / 2));
	g.add(part(box(fw, h - fw, depth), black, w / 2 - fw / 2, -fw / 2, depth / 2));

	const lw = w - 2 * fw, lh = h - fw, ly = -fw / 2;
	if (type === 'glass') {
		g.add(part(box(lw, lh, 0.02), Mat.get('glass'), 0, ly, 0.06));
		g.add(part(box(lw, 0.06, 0.06), black, 0, ly + lh / 2 - 0.03, 0.07));
		g.add(part(box(lw, 0.12, 0.06), black, 0, ly - lh / 2 + 0.06, 0.07));
		g.add(part(box(0.06, lh, 0.06), black, -lw / 2 + 0.03, ly, 0.07));
		g.add(part(box(0.06, lh, 0.06), black, lw / 2 - 0.03, ly, 0.07));
		g.add(part(box(lw, 0.05, 0.06), black, 0, ly - lh / 6, 0.07));
	} else {
		const mat = Mat.get(type === 'oak' ? 'door-oak' : 'door-steel');
		g.add(part(box(lw, lh, 0.06, mat.userData.uv), mat, 0, ly, 0.06));
		if (type === 'steel') {
			for (let i = 0; i < 3; i++) g.add(part(box(0.012, lh * 0.82, 0.008), Mat.get('steel'), -lw / 2 + 0.16 + i * 0.05, ly, 0.094));
		}
	}

	const hm = type === 'oak' ? black : Mat.get('steel');
	const hx = lw / 2 - 0.16;
	g.add(part(box(0.035, 1.25, 0.035), hm, hx, ly + 0.05, 0.155));
	g.add(part(box(0.03, 0.03, 0.06), hm, hx, ly + 0.55, 0.12));
	g.add(part(box(0.03, 0.03, 0.06), hm, hx, ly - 0.45, 0.12));

	g.add(part(box(w + 0.7, 0.07, 0.85), black, 0, h / 2 + 0.25, 0.425));
	return g;
}

function porchObj(d) {
	const g = new THREE.Group(), deck = Mat.get('deck'), B = d.B, uv = deck.userData.uv;
	g.add(part(box(2.1, 0.1, 1.3, uv), deck, 0, -0.06, 0.65));
	g.add(part(box(1.9, B - 0.11, 1.1), Mat.get('concrete-dark'), 0, -0.11 - (B - 0.11) / 2, 0.55));
	g.add(part(box(2.1, B / 2, 0.42, uv), deck, 0, -B + B / 4, 1.51));
	return g;
}

function buildDoor(d, type) {
	return [
		placeOnFace(porchObj(d), d, 'R', d.doorZ, 0),
		placeOnFace(doorObj(type), d, 'R', d.doorZ, 1.15)
	];
}

/* ---------- Кровля ---------- */

export function roofSlab(L, th, len, type) {
	const top = Mat.get('roof-' + type), edge = Mat.get('fascia'), soffit = Mat.get('soffit');
	const g = new THREE.Group();
	g.add(part(worldUV(new THREE.BoxGeometry(L, th, len), top.userData.uv || 1), [edge, edge, top, soffit, edge, edge]));
	if (type === 'seam') {
		const ribs = [];
		const n = Math.floor((len - 0.3) / 0.5);
		for (let i = 0; i <= n; i++) {
			const r = new THREE.BoxGeometry(L, 0.04, 0.028);
			r.translate(0, th / 2 + 0.02, -len / 2 + 0.15 + i * (len - 0.3) / n);
			ribs.push(r);
		}
		const merged = mergeGeometries(ribs);
		ribs.forEach(function (r) { r.dispose(); });
		g.add(part(merged, top));
	}
	if (type === 'green') {
		// бортик из лиственницы по краю зелёной кровли
		const wood = Mat.get('wall-larch');
		g.add(part(box(0.05, 0.08, len, wood.userData.uv), wood, L / 2 - 0.025, th / 2 + 0.04, 0));
	}
	return g;
}

function buildRoof(d, type) {
	const out = [], th = d.th, len = d.D + 2 * d.gable;
	const L = (d.W / 2 + d.eave) / d.cos;
	const cx = d.cos * L / 2 + d.sin * th / 2;
	const cy = d.ridge - d.sin * L / 2 + d.cos * th / 2;

	[1, -1].forEach(function (s) {
		const slab = roofSlab(L, th, len, type);
		slab.position.set(s * cx, cy, 0);
		// левый скат — зеркальная копия правого (разворот на 180° вокруг вертикали)
		slab.rotation.set(0, s > 0 ? 0 : Math.PI, -d.A);
		out.push(slab);
	});

	// конёк: треугольная вставка + планка
	const ridge = new THREE.Group(), edge = Mat.get('fascia');
	const tri = new THREE.Shape();
	tri.moveTo(-d.sin * th, d.cos * th);
	tri.lineTo(d.sin * th, d.cos * th);
	tri.lineTo(0, 0);
	tri.closePath();
	const tg = new THREE.ExtrudeGeometry(tri, { depth: len, bevelEnabled: false });
	tg.translate(0, 0, -len / 2);
	ridge.add(part(tg, edge));
	const capMat = type === 'green' ? Mat.get('wall-larch') : edge;
	ridge.add(part(box(2 * d.sin * th + 0.2, 0.05, len + 0.02), capMat, 0, d.cos * th + 0.02, 0));
	ridge.position.set(0, d.ridge, 0);
	out.push(ridge);
	return out;
}

/* ---------- Дымоход ---------- */

export function chimneyObj(type, h) {
	const g = new THREE.Group();
	if (type === 'steel') {
		const steel = Mat.get('steel'), black = Mat.get('black');
		g.add(part(new THREE.CylinderGeometry(0.15, 0.15, h, 28), black, 0, h / 2, 0));
		[0.35, 0.68].forEach(function (k) { g.add(part(new THREE.CylinderGeometry(0.158, 0.158, 0.03, 28), steel, 0, h * k, 0)); });
		g.add(part(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 12), steel, 0, h + 0.08, 0));
		g.add(part(new THREE.ConeGeometry(0.3, 0.18, 28), black, 0, h + 0.25, 0));
	} else if (type === 'brick') {
		const brick = Mat.get('brick');
		g.add(part(box(0.62, h, 0.62, brick.userData.uv), brick, 0, h / 2, 0));
		g.add(part(box(0.78, 0.08, 0.78, 2), Mat.get('concrete'), 0, h + 0.04, 0));
		[-0.13, 0.13].forEach(function (x) { g.add(part(new THREE.CylinderGeometry(0.075, 0.075, 0.3, 16), Mat.get('black'), x, h + 0.23, 0)); });
	} else {
		const c = Mat.get('concrete-dark');
		g.add(part(box(0.5, h, 0.86, c.userData.uv), c, 0, h / 2, 0));
		[[-0.2, -0.38], [0.2, -0.38], [-0.2, 0.38], [0.2, 0.38]].forEach(function (p) {
			g.add(part(box(0.03, 0.22, 0.03), Mat.get('black'), p[0], h + 0.11, p[1]));
		});
		g.add(part(box(0.64, 0.035, 1.0), Mat.get('black'), 0, h + 0.235, 0));
	}
	return g;
}

function buildChimney(d, type) {
	const cx = -d.W * 0.2, cz = -d.D * 0.2;
	const roofTop = roofLineY(d, cx) + d.th / d.cos;
	const base = roofLineY(d, cx) - 0.2;
	const top = d.ridge + d.th / d.cos + 0.95;
	const g = chimneyObj(type, top - base);
	const plate = part(box(0.9, 0.03, 0.9), Mat.get('black'), 0, roofTop - base + 0.012, 0);
	plate.rotation.z = d.A;
	g.add(plate);
	g.position.set(cx, base, cz);
	g.userData.top = new THREE.Vector3(cx, top + 0.35, cz);
	return [g];
}

/* ---------- Площади для расчёта стоимости ---------- */

export const Areas = {
	walls: function (d) {
		return 2 * (d.W + d.D) * d.H + d.W * d.R;
	},
	roof: function (d) {
		return 2 * ((d.W / 2 + d.eave) / d.cos) * (d.D + 2 * d.gable);
	},
	glass: function (d, type) {
		return openings(d, type).reduce(function (s, o) {
			if (o.kind !== 'pano') return s + o.w * o.h;
			const p = panoShape(d).pts;
			let a = 0;
			for (let i = 0; i < p.length; i++) {
				const q = p[(i + 1) % p.length];
				a += p[i][0] * q[1] - q[0] * p[i][1];
			}
			return s + Math.abs(a) / 2;
		}, 0);
	}
};

/* ---------- Дом: выбор вариантов и анимация «перелёта» ---------- */

const FLY = {
	frame: { stagger: 0.013, duration: 1.0, lift: 4 },
	walls: { stagger: 0.16, duration: 1.15, lift: 5 },
	windows: { stagger: 0.06, duration: 1.0, lift: 3 },
	door: { stagger: 0.2, duration: 1.0, lift: 3 },
	roof: { stagger: 0.22, duration: 1.2, lift: 6 },
	chimney: { stagger: 0, duration: 1.25, lift: 5 }
};

export class House {
	constructor(scene) {
		this.group = new THREE.Group();
		scene.add(this.group);
		this.sel = {};
		this.parts = {};
		this.d = houseDims('barn');
		this.chimneyTop = null;
		this.onLand = null;
	}

	build(step, id) {
		const d = this.d;
		if (step === 'frame') return buildFrame(d);
		if (step === 'walls') return buildWalls(d, id);
		if (step === 'windows') return buildWindows(d, id);
		if (step === 'door') return buildDoor(d, id);
		if (step === 'roof') return buildRoof(d, id);
		const c = buildChimney(d, id);
		this.chimneyTop = c[0].userData.top;
		return c;
	}

	// возвращает примерную длительность сборки, сек
	select(step, id, origin) {
		if (this.sel[step] === id) return 0;
		this.sel[step] = id;
		const self = this;
		let delay = 0;
		if (step === 'frame') {
			// новая планировка — пересобираем всё, что уже выбрано, в порядке шагов
			this.d = houseDims(id);
			STEPS.forEach(function (s) {
				if (!self.sel[s]) return;
				self.remove(s);
				delay = self.add(s, origin, delay);
			});
		} else {
			this.remove(step);
			delay = this.add(step, origin, 0.05);
		}
		return delay;
	}

	add(step, origin, delay) {
		const pieces = this.build(step, this.sel[step]);
		const cfg = FLY[step], self = this;
		this.parts[step] = pieces;
		pieces.forEach(function (p, i) {
			self.group.add(p);
			self.fly(p, step, origin, delay + i * cfg.stagger, cfg.duration, cfg.lift);
		});
		return delay + (pieces.length - 1) * cfg.stagger + cfg.duration * 0.75;
	}

	fly(p, step, origin, delay, duration, lift) {
		const endPos = p.position.clone(), endQ = p.quaternion.clone(), endS = p.scale.clone();
		const tilt = new THREE.Euler((Math.random() - 0.5) * 1.8, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 1.8);
		const startQ = new THREE.Quaternion().setFromEuler(tilt).multiply(endQ);
		const start = origin.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4));
		const ctrl = start.clone().lerp(endPos, 0.5);
		ctrl.y = Math.max(start.y, endPos.y) + lift;
		const st = { t: 0 }, self = this;

		p.visible = false;
		p.scale.copy(endS).multiplyScalar(0.03);
		p.userData.tween = gsap.to(st, {
			t: 1,
			duration: duration,
			delay: delay,
			ease: 'power2.inOut',
			onStart: function () { p.visible = true; },
			onUpdate: function () {
				const t = st.t, u = 1 - t;
				p.position.set(
					u * u * start.x + 2 * u * t * ctrl.x + t * t * endPos.x,
					u * u * start.y + 2 * u * t * ctrl.y + t * t * endPos.y,
					u * u * start.z + 2 * u * t * ctrl.z + t * t * endPos.z
				);
				const g = 0.03 + 0.97 * (1 - Math.pow(1 - Math.min(1, t * 1.3), 3));
				p.scale.copy(endS).multiplyScalar(g);
				p.quaternion.slerpQuaternions(startQ, endQ, Math.min(1, t * 1.15));
			},
			onComplete: function () {
				p.position.copy(endPos);
				p.quaternion.copy(endQ);
				p.scale.copy(endS);
				if (self.onLand) self.onLand(p, step);
			}
		});
	}

	remove(step) {
		const old = this.parts[step], g = this.group;
		if (!old) return;
		this.parts[step] = null;
		if (step === 'chimney') this.chimneyTop = null;
		old.forEach(function (p, i) {
			if (p.userData.tween) p.userData.tween.kill();
			gsap.to(p.scale, {
				x: 0.001, y: 0.001, z: 0.001,
				duration: 0.35,
				delay: Math.min(i * 0.003, 0.25),
				ease: 'power2.in',
				onComplete: function () {
					g.remove(p);
					disposeObj(p);
				}
			});
		});
	}

	clear() {
		const self = this;
		STEPS.forEach(function (s) { self.remove(s); });
		this.sel = {};
		this.d = houseDims('barn');
	}
}
