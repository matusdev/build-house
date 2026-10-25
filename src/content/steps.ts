/* Шаги конфигуратора. Цены 2026 года в гривнах, «под ключ» с материалами и монтажом в Карпатах;
   единица — за весь вариант (fix) или за м² (m2: стены, остекление, кровля)
     каркас — клеёный брус + перекрытия, ~8 200–8 700 ₴ за м² площади дома
     стены — утеплённая панель 200 мм + фасад: смерека / лиственница / шу-суги-бан
     окна — ПВХ 3-стекла / алюминиевое панорамное / подъёмно-раздвижной портал HST
     кровля — покрытие с мембраной и обрешёткой; дымоход — с проходом через кровлю */

export type Step = {
	key: string;
	num: string;
	theme: 'light' | 'dark';
	unit: 'fix' | 'm2';
	options: [id: string, price: number][];
};

export const steps: Step[] = [
	{ key: 'frame', num: '02', theme: 'light', unit: 'fix', options: [['compact', 415000], ['barn', 645000], ['family', 860000]] },
	{ key: 'walls', num: '03', theme: 'light', unit: 'm2', options: [['larch', 4200], ['charred', 5600], ['pine', 3400]] },
	{ key: 'windows', num: '04', theme: 'dark', unit: 'm2', options: [['standard', 8500], ['panoramic', 19500], ['sliding', 27000]] },
	{ key: 'door', num: '05', theme: 'light', unit: 'fix', options: [['oak', 52000], ['steel', 38000], ['glass', 74000]] },
	{ key: 'roof', num: '06', theme: 'dark', unit: 'm2', options: [['seam', 1950], ['shingle', 1450], ['green', 4300]] },
	{ key: 'chimney', num: '07', theme: 'light', unit: 'fix', options: [['steel', 34000], ['brick', 86000], ['concrete', 62000]] }
];
