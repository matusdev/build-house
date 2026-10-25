/* Параметры дома, камеры и света. Размеры — в метрах */

export const HOUSE = {
	base: 0.45,   // высота фундамента над землёй
	wall: 0.22,   // толщина стеновой панели
	eave: 0.5,    // вынос карниза
	gable: 0.45,  // вынос кровли над фронтоном
	roof: 0.2     // толщина кровельного пирога
};

export const LAYOUTS = {
	compact: { W: 6, D: 8, H: 2.8, R: 2.9 },
	barn: { W: 7, D: 11, H: 3.0, R: 3.5 },
	family: { W: 8, D: 13, H: 3.2, R: 4.1 }
};

export const STEPS = ['frame', 'walls', 'windows', 'door', 'roof', 'chimney'];

// участок смещён назад-влево: дом стоит ближе к улице, за ним — сад с деревьями
export const PLOT = { size: 20, depth: 1.3, radius: 3.4, x: -1.5, z: -2 };

// декор участка в его локальных координатах: [x, z, вид, масштаб, поворот]
export const PLOT_DECOR = [
	[-7.4, -6.6, 'pine', 1.15, 0.3], [-4.6, -8.1, 'pine', 0.95, 1.7], [-8.2, -2.4, 'fir', 0.9, 2.4], [6.4, -7.6, 'birch', 1.0, 0.8],
	[-7.6, 3.4, 'bush', 1.0, 0.2], [-6.6, 5.6, 'bush', 0.8, 1.1], [-3.6, -8.6, 'bush', 0.9, 2.2], [7.6, -4.2, 'bush', 0.85, 0.6],
	[8.2, -1, 'rock', 1.0, 0.4], [7.6, 0.2, 'rock', 0.55, 2.1], [-8.4, 6.6, 'rock', 0.8, 1.3]
];

// 1 — тёмная секция, 0 — светлая (последний элемент — футер)
export const SECTION_THEME = [1, 0, 0, 1, 0, 1, 0, 1, 1];

export const PALETTE = {
	bgLight: '#ebe8e2',
	bgDark: '#121211',
	stageLight: '#dfdbd3',
	stageDark: '#1b1b1a'
};

// Ракурсы камеры по секциям: цель, дистанция, азимут и высота в градусах
export const SHOTS = [
	{ t: [-0.8, 2.6, -1], d: 57, az: 38, el: 29, plot: true }, // 01 участок (цель выше — деревья сада не упираются в верх «окна»)
	{ t: [0, 2.6, 0], d: 50, az: 42, el: 25 },             // 02 каркас
	{ t: [0, 2.6, 0], d: 47, az: 31, el: 16 },             // 03 стены
	{ t: [0, 3.0, 1.2], d: 40, az: 14, el: 8 },            // 04 окна
	{ door: true, d: 29, az: 68, el: 9 },                  // 05 двери
	{ t: [0, 3.2, 0], d: 46, az: 36, el: 34 },             // 06 кровля
	{ chimney: true, d: 40, az: 26, el: 21 },              // 07 дымоход
	{ t: [0, 4.6, 0], d: 46, az: 34, el: 4, final: true }, // 08 готовый дом
	{ t: [0, 8.5, 0], d: 54, az: 40, el: 10, final: true } // футер
];

export const LIGHTS = {
	light: { hemi: 1.25, sky: '#ffffff', ground: '#b5ad9f', sun: 2.6, sunColor: '#fff3e3', dir: [-0.42, 0.82, 0.58], env: 0.55 },
	dark: { hemi: 0.7, sky: '#ffffff', ground: '#6d665c', sun: 3.3, sunColor: '#ffe7cc', dir: [-0.5, 0.72, 0.62], env: 0.45 },
	final: { hemi: 1.0, sky: '#d4e1ee', ground: '#5d6a3d', sun: 3.4, sunColor: '#ffcf9f', dir: [-0.62, 0.36, 0.58], env: 0.4 }
};

export const SKY = {
	top: '#8fa6bd',
	horizon: '#f0d9bb',
	ground: '#8e8d6a',
	sun: '#ffd8a6'
};
