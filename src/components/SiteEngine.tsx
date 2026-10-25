'use client';

import { useEffect } from 'react';

// Движок (three.js, gsap, lenis) работает с готовой серверной разметкой напрямую, поэтому React её больше не перерисовывает.
// Грузится отдельным чанком после гидрации и стартует один раз — StrictMode в dev вызывает эффект дважды
let started = false;

export default function SiteEngine() {
	useEffect(() => {
		if (started) return;
		started = true;
		import('@/engine/ui').then(({ Site }) => Site.init());
	}, []);
	return null;
}
