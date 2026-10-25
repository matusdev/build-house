/* 3D-сцена: рендерер, камера по скроллу, свет, участок с фундаментом, сцена-«окно» и её раскрытие на весь экран */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { HOUSE, LAYOUTS, PLOT, PLOT_DECOR, SECTION_THEME, PALETTE, SHOTS, LIGHTS, SKY } from './data';
import { clamp, lerp, easeInOut, sstep } from './math';
import { Tex, Mat } from './textures';
import { House, part, box, worldUV } from './house';
import { Landscape, inPlot, pathStones, stoneMesh, pineGeo, birchGeo, bushGeo, rockGeo } from './landscape';

export class World {
	constructor(canvas, probe, stage) {
		this.canvas = canvas;
		this.probe = probe;
		this.stage = stage;
		this.p = 0;
		this.intro = 0;
		this.dropHint = 0;
		this.zoom = 1;    // желаемый масштаб сцены (1 — исходный ракурс)
		this.zoomCur = 1; // текущий, плавно догоняет желаемый
		this.mouse = { x: 0, y: 0, tx: 0, ty: 0 };
		this.optsLeft = null;
		this.lastClip = '';
		this.bgCss = '';

		const r = this.renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, powerPreference: 'high-performance' });
		r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
		r.outputColorSpace = THREE.SRGBColorSpace;
		r.toneMapping = THREE.NeutralToneMapping;
		r.shadowMap.enabled = true;
		r.shadowMap.type = THREE.PCFShadowMap;

		const scene = this.scene = new THREE.Scene();
		this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 1500);
		const pm = new THREE.PMREMGenerator(r);
		this.env = scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
		pm.dispose();
		// стеклу — собственная карта отражений: иначе её яркость перебивает scene.environmentIntensity
		Mat.get('glass').envMap = this.env;
		scene.fog = new THREE.Fog(SKY.horizon, 1000, 1400);

		this.hemi = new THREE.HemisphereLight('#ffffff', '#b5ad9f', 1.2);
		this.sun = new THREE.DirectionalLight('#fff3e3', 2.6);
		this.sun.castShadow = true;
		const sh = this.sun.shadow;
		sh.mapSize.set(2048, 2048);
		sh.bias = -0.0004;
		sh.normalBias = 0.03;
		sh.radius = 4;
		sh.camera.near = 1;
		sh.camera.far = 200;
		scene.add(this.hemi, this.sun, this.sun.target);

		this.col = {
			bgL: new THREE.Color(PALETTE.bgLight), bgD: new THREE.Color(PALETTE.bgDark),
			stL: new THREE.Color(PALETTE.stageLight), stD: new THREE.Color(PALETTE.stageDark),
			ghostL: new THREE.Color('#24221f'), ghostD: new THREE.Color('#f4f0e8'),
			puffL: new THREE.Color('#cbc1b0'), puffD: new THREE.Color('#5e5850'), puff: new THREE.Color(),
			bg: new THREE.Color(), stage: new THREE.Color(),
			light: this.preset(LIGHTS.light), dark: this.preset(LIGHTS.dark), final: this.preset(LIGHTS.final)
		};

		this.buildSky();
		this.buildPlot();
		this.house = new House(scene);
		this.land = new Landscape(scene);
		this.buildPuffs();

		const self = this;
		let landed = 0;
		this.house.onLand = function (p, step) {
			const at = new THREE.Vector3(p.position.x, HOUSE.base + 0.05, p.position.z);
			if (step === 'frame') {
				if (++landed % 12 === 0) self.puff(at, 2, 0.7);
			} else if (step === 'walls') {
				self.puff(at, 6, 1.3);
			}
		};

		this.camPos = new THREE.Vector3(40, 30, 50);
		this.camTarget = new THREE.Vector3();
		this.ray = new THREE.Raycaster();
		this.v = new THREE.Vector3();
		this.sunDir = new THREE.Vector3();
		this.resize();
	}

	preset(L) {
		return { sky: new THREE.Color(L.sky), ground: new THREE.Color(L.ground), sun: new THREE.Color(L.sunColor), dir: new THREE.Vector3().fromArray(L.dir) };
	}

	buildSky() {
		this.skyU = {
			uBg: { value: new THREE.Color(PALETTE.stageDark) },
			uTop: { value: new THREE.Color(SKY.top) },
			uHorizon: { value: new THREE.Color(SKY.horizon) },
			uGround: { value: new THREE.Color(SKY.ground) },
			uSun: { value: new THREE.Color(SKY.sun) },
			uSunDir: { value: new THREE.Vector3().fromArray(LIGHTS.final.dir).normalize() },
			uMix: { value: 0 }
		};
		const mat = new THREE.ShaderMaterial({
			uniforms: this.skyU,
			side: THREE.BackSide,
			depthWrite: false,
			fog: false,
			toneMapped: false,
			vertexShader: [
				'varying vec3 vDir;',
				'void main() {',
				'  vDir = position;',
				'  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
				'  gl_Position = p.xyww;',
				'}'
			].join('\n'),
			fragmentShader: [
				'uniform vec3 uBg, uTop, uHorizon, uGround, uSun, uSunDir;',
				'uniform float uMix;',
				'varying vec3 vDir;',
				'void main() {',
				'  vec3 d = normalize(vDir);',
				'  vec3 sky = mix(uHorizon, uTop, pow(smoothstep(-0.02, 0.55, d.y), 0.8));',
				'  sky = mix(sky, uGround, smoothstep(0.0, -0.12, d.y));',
				'  float s = max(dot(d, uSunDir), 0.0);',
				'  sky += uSun * (pow(s, 6.0) * 0.22 + pow(s, 500.0) * 0.7);',
				'  gl_FragColor = vec4(mix(uBg, sky, uMix), 1.0);',
				'  #include <colorspace_fragment>',
				'}'
			].join('\n')
		});
		this.sky = new THREE.Mesh(new THREE.SphereGeometry(600, 32, 16), mat);
		this.sky.renderOrder = -10;
		this.sky.frustumCulled = false;
		this.scene.add(this.sky);
	}

	buildPlot() {
		const S = PLOT.size, Dp = PLOT.depth;
		const root = this.root = new THREE.Group();

		// «диорама» участка со скруглёнными краями: дёрн сверху, срез грунта по бокам, сад за домом
		const plot = this.plot = new THREE.Group();
		plot.position.set(PLOT.x, 0, PLOT.z);
		plot.add(this.slab(S, Dp, PLOT.radius));
		const decorMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 });
		const geos = { pine: pineGeo(true), fir: pineGeo(false), birch: birchGeo(), bush: bushGeo(), rock: rockGeo() };
		PLOT_DECOR.forEach(function (it) {
			const m = part(geos[it[2]], decorMat, it[0], 0, it[1]);
			m.scale.setScalar(it[3]);
			m.rotation.y = it[4];
			plot.add(m);
		});
		root.add(plot);

		// площадка под дом — в координатах дома
		const g = this.site = new THREE.Group();
		this.foundMat = Mat.get('concrete').clone();
		this.foundMat.emissive = new THREE.Color('#c08a52');
		this.found = part(new THREE.BoxGeometry(1, 1, 1), this.foundMat);
		this.gravel = part(new THREE.BoxGeometry(1, 1, 1), Mat.get('gravel'));
		g.add(this.found, this.gravel);
		this.path = new THREE.Group();
		this.pathKey = '';
		g.add(this.path);
		root.add(g);

		// разбивочные колышки со шнуром
		this.stakes = new THREE.Group();
		this.stakeList = [];
		for (let i = 0; i < 4; i++) {
			const s = new THREE.Group();
			s.add(part(box(0.06, 0.8, 0.06), Mat.get('stake'), 0, 0.3, 0));
			s.add(part(box(0.065, 0.12, 0.065), Mat.get('stake-tip'), 0, 0.66, 0));
			this.stakes.add(s);
			this.stakeList.push(s);
		}
		this.string = new THREE.LineLoop(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: '#d2643f', transparent: true, opacity: 0.85 }));
		this.stakes.add(this.string);
		g.add(this.stakes);

		// контур будущего дома пунктиром
		this.ghost = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 0.32, gapSize: 0.22, transparent: true, opacity: 0, depthWrite: false }));
		this.ghostOpacity = 0;
		g.add(this.ghost);

		// мягкая тень под «диорамой»
		this.catcher = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.ShadowMaterial({ opacity: 0.16, depthWrite: false }));
		this.catcher.rotation.x = -Math.PI / 2;
		this.catcher.position.set(PLOT.x, -Dp - 0.01, PLOT.z);
		this.catcher.receiveShadow = true;
		this.contact = new THREE.Mesh(new THREE.PlaneGeometry(S * 1.9, S * 1.9), new THREE.MeshBasicMaterial({
			map: Tex.radial([[0, 'rgba(0,0,0,0.5)'], [0.5, 'rgba(0,0,0,0.22)'], [1, 'rgba(0,0,0,0)']]),
			transparent: true, depthWrite: false, fog: false
		}));
		this.contact.rotation.x = -Math.PI / 2;
		this.contact.position.set(PLOT.x, -Dp - 0.03, PLOT.z);
		root.add(this.catcher, this.contact);
		this.scene.add(root);

		this.fs = { w: 0, d: 0 };
		this.setFoundation(LAYOUTS.barn, false);
		this.setGhost(LAYOUTS.barn);
	}

	// плита участка: скруглённый прямоугольник, выдавленный вниз на глубину грунта
	slab(S, Dp, rad) {
		const h = S / 2, s = new THREE.Shape();
		s.moveTo(-h + rad, -h);
		s.lineTo(h - rad, -h);
		s.absarc(h - rad, -h + rad, rad, -Math.PI / 2, 0, false);
		s.lineTo(h, h - rad);
		s.absarc(h - rad, h - rad, rad, 0, Math.PI / 2, false);
		s.lineTo(-h + rad, h);
		s.absarc(-h + rad, h - rad, rad, Math.PI / 2, Math.PI, false);
		s.lineTo(-h, -h + rad);
		s.absarc(-h + rad, -h + rad, rad, Math.PI, Math.PI * 1.5, false);
		const geo = new THREE.ExtrudeGeometry(s, { depth: Dp, bevelEnabled: false, curveSegments: 12 });
		geo.rotateX(-Math.PI / 2);
		geo.translate(0, -Dp, 0);
		// дёрн — UV в метрах, боковины — по обходу периметра и глубине
		const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv, gs = Mat.get('grass').userData.uv;
		for (let i = 0; i < p.count; i++) {
			if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, p.getX(i) / gs, p.getZ(i) / gs);
			else uv.setXY(i, (Math.atan2(p.getZ(i), p.getX(i)) / (Math.PI * 2) + 0.5) * 4, (p.getY(i) + Dp) / Dp);
		}
		return part(geo, [Mat.get('grass'), Mat.get('soil')]);
	}

	// плиты дорожки на участке появляются вместе с дверью
	updatePath() {
		const door = this.house.parts.door, key = door ? this.house.d.id : '';
		if (key === this.pathKey) return;
		this.pathKey = key;
		const old = this.path.children.slice(), group = this.path;
		old.forEach(function (m) {
			gsap.to(m.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.3, onComplete: function () { group.remove(m); m.geometry.dispose(); } });
		});
		if (!key) return;
		pathStones(this.house.d).filter(function (s) { return inPlot(s.x, s.z); }).forEach(function (s, i) {
			const m = stoneMesh(s);
			m.scale.setScalar(0.001);
			group.add(m);
			gsap.to(m.scale, { x: 1, y: 1, z: 1, duration: 0.6, delay: 1 + i * 0.12, ease: 'back.out(2)' });
		});
	}

	applyFoundation(w, dd) {
		const B = HOUSE.base;
		this.found.geometry.dispose();
		this.found.geometry = worldUV(new THREE.BoxGeometry(w, B, dd), this.foundMat.userData.uv);
		this.found.position.y = B / 2;
		const gw = w + 1.6, gd = dd + 1.6;
		this.gravel.geometry.dispose();
		this.gravel.geometry = worldUV(new THREE.BoxGeometry(gw, 0.06, gd), Mat.get('gravel').userData.uv);
		this.gravel.position.y = 0.025;

		const cx = gw / 2 + 0.55, cz = gd / 2 + 0.55, pts = [];
		[[1, 1], [1, -1], [-1, -1], [-1, 1]].forEach(function (c, i) {
			this.stakeList[i].position.set(c[0] * cx, 0, c[1] * cz);
			pts.push(c[0] * cx, 0.5, c[1] * cz);
		}, this);
		this.string.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
	}

	setFoundation(L, animate) {
		const self = this, tw = L.W + 0.3, td = L.D + 0.3;
		gsap.killTweensOf(this.fs);
		if (!animate) {
			this.fs.w = tw;
			this.fs.d = td;
			this.applyFoundation(tw, td);
			return;
		}
		gsap.to(this.fs, { w: tw, d: td, duration: 0.9, ease: 'power3.inOut', onUpdate: function () { self.applyFoundation(self.fs.w, self.fs.d); } });
	}

	setGhost(L) {
		const B = HOUSE.base, w = L.W / 2, d = L.D / 2, y0 = B, y1 = B + L.H, y2 = B + L.H + L.R;
		const c = [[w, d], [w, -d], [-w, -d], [-w, d]], pos = [];
		for (let i = 0; i < 4; i++) {
			const a = c[i], b = c[(i + 1) % 4];
			pos.push(a[0], y0, a[1], b[0], y0, b[1]);
			pos.push(a[0], y1, a[1], b[0], y1, b[1]);
			pos.push(a[0], y0, a[1], a[0], y1, a[1]);
		}
		[d, -d].forEach(function (z) { pos.push(w, y1, z, 0, y2, z, -w, y1, z, 0, y2, z); });
		pos.push(0, y2, d, 0, y2, -d);
		this.ghost.geometry.dispose();
		this.ghost.geometry = new THREE.BufferGeometry();
		this.ghost.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
		this.ghost.computeLineDistances();
	}

	// наведение на карточку планировки — пунктир показывает размер будущего дома
	previewLayout(id) {
		if (this.house.sel.frame) return;
		this.setGhost(LAYOUTS[id || 'barn']);
		if (id) this.setFoundation(LAYOUTS[id], true);
		else this.setFoundation(LAYOUTS.barn, true);
	}

	hideStakes() {
		gsap.to(this.stakes.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.6, delay: 0.3, ease: 'power3.in', onComplete: () => { this.stakes.visible = false; } });
	}

	resetPlot() {
		gsap.killTweensOf(this.stakes.scale);
		this.stakes.visible = true;
		this.stakes.scale.set(1, 1, 1);
		this.setFoundation(LAYOUTS.barn, true);
		this.setGhost(LAYOUTS.barn);
	}

	buildPuffs() {
		const tex = Tex.radial([[0, 'rgba(255,255,255,0.8)'], [0.5, 'rgba(255,255,255,0.28)'], [1, 'rgba(255,255,255,0)']]);
		this.puffs = [];
		this.puffIdx = 0;
		for (let i = 0; i < 48; i++) {
			const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#d6ccbc', transparent: true, depthWrite: false, opacity: 0 }));
			s.visible = false;
			s.userData = { life: 1, v: new THREE.Vector3(), size: 1 };
			this.scene.add(s);
			this.puffs.push(s);
		}
	}

	puff(pos, n, size) {
		for (let i = 0; i < n; i++) {
			const s = this.puffs[this.puffIdx++ % this.puffs.length], a = Math.random() * Math.PI * 2;
			s.visible = true;
			s.position.copy(pos);
			s.userData.life = 0;
			s.userData.size = size * (0.7 + Math.random() * 0.6);
			s.userData.v.set(Math.cos(a), 0.3 + Math.random() * 0.4, Math.sin(a)).multiplyScalar(1 + Math.random() * 1.4);
		}
	}

	updatePuffs(dt) {
		const col = this.col.puff.lerpColors(this.col.puffL, this.col.puffD, this.tv);
		this.puffs.forEach(function (s) {
			const u = s.userData;
			if (u.life >= 1) return;
			u.life = Math.min(1, u.life + dt / 1.1);
			s.position.addScaledVector(u.v, dt * (1 - u.life) * 1.6);
			s.scale.setScalar(u.size * (0.4 + u.life * 1.2));
			s.material.color.copy(col);
			s.material.opacity = (1 - u.life) * 0.24;
			if (u.life >= 1) s.visible = false;
		});
	}

	setOptsLeft(x) {
		this.optsLeft = x;
	}

	resize() {
		// ширина без полосы прокрутки — иначе обрезка «окна» уезжала и появлялась светлая полоса справа
		const w = document.documentElement.clientWidth, h = window.innerHeight;
		this.w = w;
		this.h = h;
		this.mobile = w <= 900;
		this.renderer.setSize(w, h, false);
		this.camera.aspect = w / h;

		const r = this.probe.getBoundingClientRect();
		this.cfg = {
			left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height,
			radius: parseFloat(getComputedStyle(this.probe).borderTopLeftRadius) || 0
		};
		this.optW = !this.mobile && this.optsLeft ? Math.max(0, r.right - this.optsLeft + 16) : 0;

		// подгоняем дистанцию камеры под реальный размер «окна» (эталон — 1440×900)
		const aspect = w / h, visW = (this.cfg.width - this.optW) / w, visH = this.cfg.height / h;
		// на телефоне чуть отодвигаем камеру — дом не упирается в края маленького «окна»
		this.fit = Math.max(0.648 / (aspect * visW), 0.813 / visH) * (this.mobile ? 1.12 : 1);
		this.fitFinal = clamp(0.75 / aspect, 1, 1.6);
		this.lastClip = '';
	}

	shot(i) {
		const s = SHOTS[clamp(i, 0, SHOTS.length - 1)], d = this.house.d, k = s.plot ? 1 : d.k;
		let t;
		if (s.door) t = new THREE.Vector3(d.W / 2 + 0.3, d.B + 1.3, d.doorZ - 0.4);
		else if (s.chimney) t = new THREE.Vector3(-d.W * 0.12, d.ridge - 0.8, -d.D * 0.1);
		else t = new THREE.Vector3(s.t[0] * k, s.t[1] * k, s.t[2] * k);
		return { t: t, d: s.d * k * (s.final ? this.fitFinal : this.fit), az: s.az, el: s.el };
	}

	screenToWorld(x, y) {
		const ndc = new THREE.Vector2(x / this.w * 2 - 1, -(y / this.h) * 2 + 1);
		this.ray.setFromCamera(ndc, this.camera);
		return this.ray.ray.at(this.camera.position.distanceTo(this.camTarget) * 0.5, new THREE.Vector3());
	}

	project(v) {
		const p = v.clone().project(this.camera);
		return { x: (p.x + 1) / 2 * this.w, y: (1 - p.y) / 2 * this.h };
	}

	update(dt, time) {
		const p = this.p, i0 = Math.floor(p), f = p - i0;
		const fT = clamp(p - 6, 0, 1), fe = easeInOut(fT), foot = clamp(p - 7, 0, 1);
		const c = this.col;
		this.fT = fT;

		// тема секции: 0 — светлая, 1 — тёмная
		const th0 = SECTION_THEME[clamp(i0, 0, 8)], th1 = SECTION_THEME[clamp(i0 + 1, 0, 8)];
		const tv = lerp(th0, th1, sstep(0.25, 0.75, f));
		this.tv = tv;
		c.stage.lerpColors(c.stL, c.stD, tv);
		c.bg.lerpColors(c.bgL, c.bgD, tv);
		this.bgCss = '#' + c.bg.getHexString();
		this.skyU.uBg.value.copy(c.stage);
		this.skyU.uMix.value = sstep(0.05, 0.75, fT);

		// свет: студийный (светлый/тёмный) → закатный финал
		const A = LIGHTS.light, Dk = LIGHTS.dark, F = LIGHTS.final;
		this.hemi.intensity = lerp(lerp(A.hemi, Dk.hemi, tv), F.hemi, fe);
		this.hemi.color.lerpColors(c.light.sky, c.dark.sky, tv).lerp(c.final.sky, fe);
		this.hemi.groundColor.lerpColors(c.light.ground, c.dark.ground, tv).lerp(c.final.ground, fe);
		this.sun.intensity = lerp(lerp(A.sun, Dk.sun, tv), F.sun, fe);
		this.sun.color.lerpColors(c.light.sun, c.dark.sun, tv).lerp(c.final.sun, fe);
		this.sunDir.lerpVectors(c.light.dir, c.dark.dir, tv).lerp(c.final.dir, fe).normalize();
		this.sun.position.copy(this.sunDir).multiplyScalar(70);
		const sb = lerp(17, 46, fe), sc = this.sun.shadow.camera;
		if (sc.right !== sb) {
			sc.left = sc.bottom = -sb;
			sc.right = sc.top = sb;
			sc.updateProjectionMatrix();
		}
		this.scene.environmentIntensity = lerp(lerp(A.env, Dk.env, tv), F.env, fe);
		this.scene.fog.near = lerp(1000, 70, fe);
		this.scene.fog.far = lerp(1400, 560, fe);
		this.renderer.toneMappingExposure = 1 - foot * 0.3;

		// камера: интерполяция ракурсов соседних секций
		const a = this.shot(i0), b = this.shot(i0 + 1), e = easeInOut(f);
		const target = a.t.lerp(b.t, e);
		const m = this.mouse, introE = easeInOut(this.intro);
		m.x += (m.tx - m.x) * Math.min(1, dt * 2);
		m.y += (m.ty - m.y) * Math.min(1, dt * 2);
		// приближение действует на шагах конфигуратора и сходит на нет к финалу
		this.zoomCur += (this.zoom - this.zoomCur) * Math.min(1, dt * 6);
		let dist = lerp(a.d, b.d, e) * (1 + (1 - introE) * 0.55) / lerp(this.zoomCur, 1, fe);
		let az = lerp(a.az, b.az, e) + m.x * 1.5 + Math.sin(time * 0.07) * 7 * fe - (1 - introE) * 25;
		let el = lerp(a.el, b.el, e) - m.y + (1 - introE) * 14;
		az = THREE.MathUtils.degToRad(az);
		el = THREE.MathUtils.degToRad(el);
		this.v.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist).add(target);
		const k = 1 - Math.exp(-dt * 5);
		this.camPos.lerp(this.v, k);
		this.camTarget.lerp(target, k);
		this.camera.position.copy(this.camPos);
		this.camera.lookAt(this.camTarget);

		// «окно» сцены: в финале раскрывается на весь экран
		const cf = this.cfg, o = 1 - fe;
		const top = cf.top * o, left = cf.left * o, right = (this.w - cf.right) * o, bottom = (this.h - cf.bottom) * o, rad = cf.radius * o;
		const clip = 'inset(' + top.toFixed(1) + 'px ' + right.toFixed(1) + 'px ' + bottom.toFixed(1) + 'px ' + left.toFixed(1) + 'px round ' + rad.toFixed(1) + 'px)';
		if (clip !== this.lastClip) {
			this.lastClip = clip;
			this.canvas.style.clipPath = clip;
			this.stage.style.cssText = 'top:' + top + 'px;left:' + left + 'px;width:' + (this.w - left - right) + 'px;height:' + (this.h - top - bottom) + 'px;border-radius:' + rad + 'px;opacity:' + (1 - sstep(0, 0.35, fT)) + ';visibility:' + (fT > 0.34 ? 'hidden' : 'visible');
		}
		const cx = lerp(cf.left + (cf.width - this.optW) / 2, this.w * (this.mobile ? 0.5 : 0.64), fe);
		const cy = lerp(cf.top + cf.height / 2, this.h * (this.mobile ? 0.3 : 0.56), fe);
		this.camera.setViewOffset(this.w, this.h, -(cx - this.w / 2), -(cy - this.h / 2), this.w, this.h);

		// появление участка, пунктир, дорожка, подсветка при перетаскивании
		this.root.position.y = -(1 - introE) * 5;
		this.updatePath();
		const ghostOn = !this.house.sel.frame && p < 2.2 ? 1 : 0;
		this.ghostOpacity += (ghostOn * (0.5 + Math.sin(time * 2.2) * 0.12) - this.ghostOpacity) * Math.min(1, dt * 4);
		this.ghost.material.opacity = this.ghostOpacity;
		this.ghost.visible = this.ghostOpacity > 0.01;
		this.ghost.material.color.lerpColors(c.ghostL, c.ghostD, tv);
		this.foundMat.emissiveIntensity = this.dropHint * (0.35 + Math.sin(time * 7) * 0.15);
		this.catcher.visible = this.contact.visible = fe < 0.98;
		Mat.get('glass').emissiveIntensity = fe * fe * 0.04;

		this.land.update(fT, time, this.house);
		this.updatePuffs(dt);
	}

	render() {
		this.sky.position.copy(this.camera.position);
		this.renderer.render(this.scene, this.camera);
	}

	// кадр готового дома для «паспорта» в футере; вызывать сразу после render() в том же кадре
	snapshot() {
		const W = 720, H = 480, c = document.createElement('canvas');
		c.width = W;
		c.height = H;
		const dpr = this.renderer.getPixelRatio(), p = this.project(new THREE.Vector3(0, HOUSE.base + 2.6, 0));
		// на телефоне берём почти всю ширину экрана, иначе кадр получался узкой полосой крупным планом
		const ch = this.mobile ? this.w * 0.96 * H / W : Math.min(this.h * 0.62, this.w * 0.45 * H / W), cw = ch * W / H;
		const sx = clamp(p.x - cw / 2, 0, this.w - cw), sy = clamp(p.y - ch * 0.5, 0, this.h - ch);
		c.getContext('2d').drawImage(this.renderer.domElement, sx * dpr, sy * dpr, cw * dpr, ch * dpr, 0, 0, W, H);
		return c.toDataURL('image/jpeg', 0.86);
	}
}
