/* Превью вариантов для карточек: рендерим те же 3D-объекты отдельным маленьким рендерером */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Mat } from './textures';
import { houseDims, buildFrame, part, box, disposeObj, windowObj, panoObj, doorObj, roofSlab, chimneyObj } from './house';

export const Thumbs = {
	object: function (step, id) {
		if (step === 'frame') {
			// одинаковый радиус кадра — разница в размерах планировок видна на превью
			const d = houseDims(id), g = new THREE.Group();
			buildFrame(d).forEach(function (m) { g.add(m); });
			g.add(part(box(d.W + 0.3, d.B, d.D + 0.3, 2.5), Mat.get('concrete'), 0, d.B / 2, 0));
			return { obj: g, dir: [1, 0.8, 1.25], center: [0, 3.2, 0], radius: 8.6 };
		}
		if (step === 'walls') {
			// «пирог» стеновой панели: обшивка, мембрана, утеплитель, OSB
			const g = new THREE.Group(), mat = Mat.get('wall-' + id), w = 1.2, h = 1.6;
			g.add(part(box(w, h, 0.012, 1), Mat.get('osb'), 0.24, 0.16, -0.12));
			g.add(part(box(w, h, 0.15, 0.8), Mat.get('insulation'), 0.16, 0.1, -0.03));
			g.add(part(box(w, h, 0.01), Mat.get('membrane'), 0.08, 0.05, 0.055));
			g.add(part(box(w, h, 0.035, mat.userData.uv), mat, 0, 0, 0.09));
			g.rotation.y = -0.25;
			return { obj: g, dir: [1, 0.45, 1.5] };
		}
		if (step === 'windows') {
			if (id === 'panoramic') {
				const g = panoObj(houseDims('compact'));
				return { obj: g, dir: [0.55, 0.12, 1.5] };
			}
			const o = id === 'sliding' ? { w: 2.7, h: 2.3, y: 0, kind: 'portal' } : { w: 1.25, h: 1.5, y: 1 };
			return { obj: windowObj(o), dir: [0.6, 0.15, 1.5] };
		}
		if (step === 'door') {
			return { obj: doorObj(id), dir: [0.65, 0.1, 1.5] };
		}
		if (step === 'roof') {
			const g = roofSlab(1.9, 0.2, 1.5, id);
			g.rotation.z = -0.45;
			return { obj: g, dir: [0.7, 1.1, 1.4] };
		}
		const g = chimneyObj(id, 1.5);
		return { obj: g, dir: [1, 0.35, 1.4] };
	},

	render: function (items) {
		const size = 150;
		const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
		r.setPixelRatio(2);
		r.setSize(size, size, false);
		r.outputColorSpace = THREE.SRGBColorSpace;
		r.toneMapping = THREE.NeutralToneMapping;
		r.setClearColor(0x000000, 0);

		const scene = new THREE.Scene(), pm = new THREE.PMREMGenerator(r);
		const env = pm.fromScene(new RoomEnvironment(), 0.04);
		scene.environment = env.texture;
		scene.environmentIntensity = 0.75;
		// PMREM-текстура привязана к своему WebGL-контексту — на время превью подменяем
		const glass = Mat.get('glass'), mainEnv = glass.envMap;
		glass.envMap = env.texture;
		scene.add(new THREE.HemisphereLight('#ffffff', '#a59d90', 1.5));
		const sun = new THREE.DirectionalLight('#fff4e6', 2.4);
		sun.position.set(-3, 6, 5);
		scene.add(sun);

		const cam = new THREE.PerspectiveCamera(26, 1, 0.05, 200);
		const half = THREE.MathUtils.degToRad(13);
		const box3 = new THREE.Box3(), sphere = new THREE.Sphere(), dir = new THREE.Vector3();

		items.forEach(function (it) {
			const t = Thumbs.object(it.step, it.id);
			scene.add(t.obj);
			t.obj.updateMatrixWorld(true);
			box3.setFromObject(t.obj).getBoundingSphere(sphere);
			if (t.center) sphere.center.fromArray(t.center);
			if (t.radius) sphere.radius = t.radius;
			dir.fromArray(t.dir).normalize();
			cam.position.copy(sphere.center).addScaledVector(dir, sphere.radius / Math.sin(half) * 0.98);
			cam.lookAt(sphere.center);
			r.render(scene, cam);
			it.img.src = r.domElement.toDataURL('image/png');
			scene.remove(t.obj);
			disposeObj(t.obj);
		});

		glass.envMap = mainEnv;
		env.dispose();
		pm.dispose();
		r.dispose();
		r.forceContextLoss();
	}
};
