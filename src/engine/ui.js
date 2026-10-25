/* Интерфейс: секции и блокировка скролла, выбор вариантов (клик и drag&drop), навигация, цены, меню, футер */

import * as THREE from 'three';
import { gsap } from 'gsap';
import Lenis from 'lenis';
import { HOUSE, LAYOUTS, STEPS } from './data';
import { clamp, easeInOut, sstep } from './math';
import { Split } from './split';
import { I18n, money } from './i18n';
import { World } from './world';
import { Thumbs } from './thumbs';
import { houseDims, Areas } from './house';

function pad2(n) {
	return (n < 10 ? '0' : '') + n;
}

export const Site = {
	init: function () {
		const self = this;
		this.root = document.documentElement;
		this.sections = Array.prototype.slice.call(document.querySelectorAll('.section'));
		this.footer = document.getElementById('contacts');
		this.wrap = document.getElementById('final-wrap');
		this.cards = Array.prototype.slice.call(document.querySelectorAll('.opt'));
		this.crumbs = Array.prototype.slice.call(document.querySelectorAll('[data-crumb]'));
		this.thumb = document.querySelector('.scrollbar i');
		this.curtain = document.querySelector('.curtain');
		this.sel = {};
		this.active = -1;
		this.ready = false;
		this.sum = { v: 0 };
		this.lastNudge = 0;
		this.bg = '';
		this.snapStale = true;
		this.hasSnap = false;
		this.sectionState = [];

		I18n.init();
		Split.all();
		if (I18n.lang !== 'ru') I18n.apply();
		I18n.listeners.push(function () { self.onLang(); });

		this.world = new World(document.getElementById('scene'), document.querySelector('.stage-probe'), document.getElementById('stage'));
		// Lenis только анимирует переходы; колесо и свайп перехватывает поэкранный пейджер,
		// сам Lenis прокручивает лишь футер, если тот выше экрана
		this.lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, virtualScroll: function (d) { return self.freeScroll(d.deltaY > 0 ? 1 : -1); } });
		gsap.ticker.add(function (time) {
			self.lenis.raf(time * 1000);
			self.frame(time);
		});
		gsap.ticker.lagSmoothing(0);

		this.bindCards();
		this.bindRows();
		this.bindZoom();
		this.bindNav();
		this.bindPager();
		this.bindMenu();
		this.bindFooter();
		window.addEventListener('pointermove', function (e) {
			self.world.mouse.tx = e.clientX / window.innerWidth * 2 - 1;
			self.world.mouse.ty = e.clientY / window.innerHeight * 2 - 1;
		});
		window.addEventListener('resize', function () { self.resize(); });
		if (document.fonts) document.fonts.ready.then(function () { self.measure(); });

		this.resize();
		this.renderCardPrices();
		this.updatePrices();
		this.updateHud();
		this.loader();
	},

	resize: function () {
		const opts = document.querySelector('#step-frame .step__opts'), w = document.documentElement.clientWidth;
		const widthChanged = w !== this.lastW;
		this.lastW = w;
		this.vh = window.innerHeight;
		this.world.setOptsLeft(opts ? opts.getBoundingClientRect().left : null);
		this.world.resize();
		this.measure();
		// выравниваемся на текущий экран только при смене ширины (поворот, окно).
		// Высота на телефоне меняется сама — прячется адресная строка, открывается клавиатура;
		// раньше это возвращало прокрутку футера к его началу (баг на Android)
		if (widthChanged && this.ready && !this.paging && this.tops) {
			const cur = this.screen();
			if (cur === 8 && this.freeScroll(1)) return;
			this.lenis.scrollTo(cur === 8 ? this.footerTarget() : this.tops[cur], { immediate: true, force: true });
		}
	},

	measure: function () {
		const wrap = this.wrap;
		// финал закреплён (sticky), поэтому его начало берём по обёртке
		this.tops = this.sections.filter(function (s) { return !s.hidden; }).map(function (s) {
			return s.id === 'final' ? wrap.offsetTop : s.offsetTop;
		});
		this.docH = document.documentElement.scrollHeight;
		this.track = this.thumb.parentNode.offsetHeight;
	},

	// непрерывный прогресс по секциям: 2.5 — середина между «Стенами» и «Окнами»
	progress: function () {
		const y = window.scrollY, t = this.tops, n = t.length;
		for (let i = n - 1; i >= 0; i--) {
			if (y < t[i]) continue;
			if (i < n - 1) return i + (y - t[i]) / (t[i + 1] - t[i]);
			return i + (i === 7 ? Math.min(1, (y - t[i]) / this.vh) : 0);
		}
		return 0;
	},

	frame: function (time) {
		const dt = Math.min(0.05, time - (this.lastTime || time));
		this.lastTime = time;
		this.p = this.progress();
		this.world.p = this.p;
		const idx = clamp(Math.round(this.p), 0, 7);
		if (idx !== this.active && this.ready) this.activate(idx, time);
		const inFooter = this.p > 7.12;
		if (inFooter !== this.inFooter) {
			this.inFooter = inFooter;
			this.root.classList.toggle('is-footer', inFooter);
		}
		this.updateSections();
		this.updateScrollbar(time);
		this.world.update(dt, time);
		if (this.world.bgCss !== this.bg) {
			this.bg = this.world.bgCss;
			document.body.style.backgroundColor = this.bg;
		}
		this.world.render();
		this.takeSnapshot(time);
	},

	// секции не уезжают целиком вместе со скроллом: дрейфуют на треть пути и растворяются —
	// соседние экраны не наползают друг на друга и на шапку
	updateSections: function () {
		const self = this, vh = this.vh;
		this.sections.forEach(function (s, i) {
			if (s.hidden) return;
			let local = self.p - i;
			if (i === 0 && local < 0) local = 0;
			if (i === 7 && local > 0) local = 0;
			const vis = 1 - sstep(0.12, 0.46, Math.abs(local));
			const key = (local * vh * 0.62).toFixed(1) + '|' + vis.toFixed(3);
			if (self.sectionState[i] === key) return;
			self.sectionState[i] = key;
			s.style.transform = local ? 'translate3d(0,' + (local * vh * 0.62).toFixed(1) + 'px,0)' : '';
			s.style.opacity = vis < 1 ? vis.toFixed(3) : '';
			s.style.visibility = vis < 0.01 ? 'hidden' : '';
			s.classList.toggle('is-faded', vis < 0.6);
		});
	},

	updateScrollbar: function (time) {
		const y = window.scrollY, max = Math.max(1, this.docH - this.vh);
		const h = Math.max(36, this.track * this.vh / this.docH), pos = (this.track - h) * clamp(y / max, 0, 1);
		if (y !== this.lastY) {
			this.lastY = y;
			this.scrolledAt = time;
			this.thumb.style.height = h.toFixed(1) + 'px';
			this.thumb.style.transform = 'translateY(' + pos.toFixed(1) + 'px)';
		}
		const on = time - (this.scrolledAt || 0) < 1;
		if (on !== this.barOn) {
			this.barOn = on;
			this.root.classList.toggle('is-scrolling', on);
		}
	},

	// кадр готового дома для паспорта — когда финал раскрылся и камера успокоилась
	takeSnapshot: function (time) {
		if (!this.snapStale || this.active !== 7 || this.world.fT < 0.999) return;
		const settled = this.p < 7.05 && time - this.activeAt > 1.4;
		if (!settled && !(this.p >= 7.05 && !this.hasSnap)) return;
		document.getElementById('passport-img').src = this.world.snapshot();
		this.snapStale = false;
		this.hasSnap = true;
	},

	activate: function (idx, time) {
		this.active = idx;
		this.activeAt = time || this.lastTime || 0;
		this.sections.forEach(function (s, i) { s.classList.toggle('is-in', i === idx); });
		this.root.setAttribute('data-theme', this.sections[idx].getAttribute('data-theme'));
		this.root.setAttribute('data-active', idx);
		this.updateHud();
	},

	section: function (step) {
		return document.getElementById('step-' + step);
	},

	card: function (step, id) {
		return document.querySelector('.opt[data-step="' + step + '"][data-id="' + id + '"]');
	},

	optName: function (step, id) {
		return I18n.t(step + '_' + id);
	},

	// позиция по раскладке, без учёта transform: секции во время скролла смещены дрейфом
	topOf: function (el) {
		let y = 0;
		for (let n = el; n; n = n.offsetParent) y += n.offsetTop;
		return y;
	},

	go: function (i) {
		const self = this;
		let s = i === 'footer' ? this.footer : this.sections[i];
		if (!s) return;
		let done = null;
		if (s.hidden) {
			// цель ещё закрыта — ведём к шагу, который ждёт выбора, и подсказываем
			const open = this.sections.filter(function (x) { return !x.hidden; });
			s = open[open.length - 1];
			i = this.sections.indexOf(s);
			done = function () { self.nudge(s); };
		}
		const y = i === 'footer' ? this.footerTarget() : this.topOf(s.id === 'final' ? this.wrap : s);
		// соседний экран — плавная прокрутка, дальний — шторка без пролёта через все секции
		if (Math.abs(y - window.scrollY) > this.vh * 1.5) this.jump(y, i, done);
		else this.scrollTo(y, done);
	},

	// шторка накрывает экран снизу, под ней мгновенный переход, затем она уходит вверх,
	// а камера сама плавно долетает до нового ракурса
	jump: function (y, i, done, during) {
		const self = this, c = this.curtain, num = c.querySelector('.curtain__num'), title = c.querySelector('.curtain__title');
		const sec = i === 'footer' ? null : this.sections[i];
		num.textContent = sec ? pad2(i + 1) : '';
		title.textContent = sec ? I18n.t(sec.getAttribute('data-title')) : I18n.t('contacts');
		c.classList.toggle('is-light', !!sec && sec.getAttribute('data-theme') === 'light');
		this.paging = true;
		clearTimeout(this.pagingTimer);
		gsap.killTweensOf([c, num, title]);
		gsap.timeline()
			.set(c, { visibility: 'visible', clipPath: 'inset(100% 0% 0% 0%)' })
			.set([num, title], { yPercent: 110 })
			.to(c, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.55, ease: 'power3.inOut' })
			.to([num, title], { yPercent: 0, duration: 0.6, ease: 'power3.out', stagger: 0.06 }, '-=0.2')
			.add(function () {
				if (during) during();
				self.lenis.scrollTo(y, { immediate: true, force: true });
			})
			.to([num, title], { yPercent: -110, duration: 0.45, ease: 'power3.in', stagger: 0.04 }, '+=0.4')
			.to(c, { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.65, ease: 'power3.inOut' }, '-=0.15')
			.add(function () {
				c.style.visibility = 'hidden';
				self.paging = false;
				self.quietUntil = performance.now() + 260;
				if (done) done();
			});
	},

	nudge: function (sec) {
		sec.classList.remove('is-nudge');
		void sec.offsetWidth;
		sec.classList.add('is-nudge');
	},

	/* ---------- выбор варианта ---------- */

	bindCards: function () {
		const self = this;
		this.cards.forEach(function (card) {
			card.addEventListener('click', function () {
				if (self.suppressClick) return;
				const r = card.querySelector('.opt__thumb').getBoundingClientRect();
				self.choose(card, { x: r.left + r.width / 2, y: r.top + r.height / 2 }, true);
			});
			card.addEventListener('pointerdown', function (e) {
				// перетаскивание на участок — только на десктопной раскладке, на мобильной мышь листает ленту
				if (e.pointerType === 'mouse' && e.button === 0 && !self.world.mobile) self.dragStart(card, e);
			});
			if (card.getAttribute('data-step') === 'frame') {
				card.addEventListener('mouseenter', function () { self.world.previewLayout(card.getAttribute('data-id')); });
				card.addEventListener('mouseleave', function () { self.world.previewLayout(null); });
			}
		});
	},

	/* ---------- масштаб сцены ---------- */

	setZoom: function (z) {
		const w = this.world;
		w.zoom = clamp(z, 1, 1.8);
		this.zoomBtns[0].disabled = w.zoom <= 1.001;
		this.zoomBtns[1].disabled = w.zoom >= 1.799;
	},

	bindZoom: function () {
		const self = this;
		let pinch = null;
		this.zoomBtns = Array.prototype.slice.call(document.querySelectorAll('[data-zoom]'));
		this.zoomBtns.forEach(function (b) {
			b.addEventListener('click', function () { self.setZoom(self.world.zoom + 0.25 * +b.getAttribute('data-zoom')); });
		});
		// щипок на тачпаде и Ctrl+колесо над сценой — масштаб сцены, а не страницы
		window.addEventListener('wheel', function (e) {
			if (!e.ctrlKey || !self.overStage(e.clientX, e.clientY)) return;
			e.preventDefault();
			self.setZoom(self.world.zoom * Math.exp(-e.deltaY * 0.01));
		}, { passive: false });
		// двойной клик по сцене — приблизить / вернуть
		window.addEventListener('dblclick', function (e) {
			if (!self.overStage(e.clientX, e.clientY) || e.target.closest('button, a, .opt')) return;
			self.setZoom(self.world.zoom > 1.2 ? 1 : 1.5);
		});
		// щипок двумя пальцами на телефоне
		const dist = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY); };
		window.addEventListener('touchstart', function (e) {
			pinch = e.touches.length === 2 && self.overStage(e.touches[0].clientX, e.touches[0].clientY) ? { d: dist(e.touches), z: self.world.zoom } : null;
		}, { passive: true });
		window.addEventListener('touchmove', function (e) {
			if (!pinch || e.touches.length !== 2) return;
			if (e.cancelable) e.preventDefault();
			self.setZoom(pinch.z * dist(e.touches) / pinch.d);
		}, { passive: false });
		window.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
	},

	// мобильная раскладка: ленту карточек можно тянуть мышью (пальцем она листается сама)
	bindRows: function () {
		const self = this;
		Array.prototype.forEach.call(document.querySelectorAll('.step__opts'), function (row) {
			row.addEventListener('pointerdown', function (e) {
				if (!self.world.mobile || e.pointerType !== 'mouse' || e.button !== 0) return;
				const sx = e.clientX, start = row.scrollLeft;
				let moved = false;

				function move(ev) {
					const dx = ev.clientX - sx;
					if (!moved && Math.abs(dx) < 6) return;
					if (!moved) {
						moved = true;
						row.classList.add('is-dragging');
					}
					row.scrollLeft = start - dx;
				}

				function up() {
					window.removeEventListener('pointermove', move);
					window.removeEventListener('pointerup', up);
					if (!moved) return;
					self.suppressClick = true;
					setTimeout(function () { self.suppressClick = false; }, 60);
					// доводим до ближайшей карточки
					const pad = parseFloat(getComputedStyle(row).paddingLeft);
					let best = 0, gap = Infinity;
					Array.prototype.forEach.call(row.querySelectorAll('.opt'), function (c) {
						const x = c.offsetLeft - row.offsetLeft - pad, d = Math.abs(x - row.scrollLeft);
						if (d < gap) {
							gap = d;
							best = x;
						}
					});
					row.scrollTo({ left: best, behavior: 'smooth' });
					setTimeout(function () { row.classList.remove('is-dragging'); }, 400);
				}

				window.addEventListener('pointermove', move);
				window.addEventListener('pointerup', up);
			});
		});
	},

	renderCardPrices: function () {
		this.cards.forEach(function (c) {
			c.querySelector('.opt__price').textContent = money(+c.getAttribute('data-price'), c.getAttribute('data-unit'), 1);
		});
	},

	renderPicked: function (step) {
		const id = this.sel[step], sec = this.section(step);
		sec.querySelector('.step__picked-name').textContent = id ? this.optName(step, id) + ' · ' + I18n.t(step + '_' + id + '_meta') : '—';
	},

	choose: function (card, origin, ghost) {
		const step = card.getAttribute('data-step'), id = card.getAttribute('data-id');
		if (this.sel[step] === id) return;
		const first = !this.sel[step];
		this.sel[step] = id;
		this.snapStale = true;

		this.cards.forEach(function (c) {
			if (c.getAttribute('data-step') !== step) return;
			c.classList.toggle('is-active', c === card);
			c.setAttribute('aria-pressed', c === card ? 'true' : 'false');
		});
		if (ghost) this.ghostFly(card, origin);

		const w = this.world;
		if (step === 'frame') {
			w.setFoundation(LAYOUTS[id], true);
			w.setGhost(LAYOUTS[id]);
			if (first) w.hideStakes();
		}
		w.house.select(step, id, w.screenToWorld(origin.x, origin.y));

		const sec = this.section(step);
		sec.classList.add('is-chosen');
		this.renderPicked(step);
		const btn = sec.querySelector('.step__next'), txt = btn.querySelector('.btn__text');
		btn.disabled = false;
		txt.setAttribute('data-i18n', 'next');
		txt.textContent = I18n.t('next');
		if (first) this.unlock(+sec.getAttribute('data-index') + 1);

		this.updatePrices();
		this.updateHud();
	},

	unlock: function (i) {
		const s = this.sections[i];
		if (!s || !s.hidden) return;
		s.hidden = false;
		if (i === 7) this.footer.hidden = false;
		this.measure();
		this.lenis.resize();
	},

	// превью карточки улетает в сторону дома, а из этой точки вылетают 3D-детали
	ghostFly: function (card, origin) {
		const img = card.querySelector('.opt__thumb img'), r = img.getBoundingClientRect();
		const g = img.cloneNode();
		g.className = 'fly-ghost';
		g.style.cssText = 'left:' + r.left + 'px;top:' + r.top + 'px;width:' + r.width + 'px;height:' + r.height + 'px';
		document.body.appendChild(g);
		const to = this.world.project(new THREE.Vector3(0, HOUSE.base + 2, 0));
		gsap.to(g, {
			x: (to.x - origin.x) * 0.3, y: (to.y - origin.y) * 0.3, scale: 0.35, opacity: 0,
			duration: 0.6, ease: 'power2.in', onComplete: function () { g.remove(); }
		});
	},

	overStage: function (x, y) {
		const c = this.world.cfg;
		return x > c.left && x < c.right - this.world.optW && y > c.top && y < c.bottom;
	},

	dragStart: function (card, e) {
		const self = this, sx = e.clientX, sy = e.clientY;
		let ghost = null;

		function move(ev) {
			if (!ghost) {
				if ((ev.clientX - sx) * (ev.clientX - sx) + (ev.clientY - sy) * (ev.clientY - sy) < 64) return;
				ghost = document.createElement('div');
				ghost.className = 'drag-ghost';
				ghost.appendChild(card.querySelector('.opt__thumb img').cloneNode());
				document.body.appendChild(ghost);
				gsap.set(ghost, { xPercent: -50, yPercent: -50, x: ev.clientX, y: ev.clientY, scale: 0.6 });
				gsap.to(ghost, { scale: 1, duration: 0.3, ease: 'back.out(2)' });
				self.root.classList.add('is-dragging');
				self.world.dropHint = 1;
			}
			gsap.set(ghost, { x: ev.clientX, y: ev.clientY });
			self.root.classList.toggle('is-drop-ok', self.overStage(ev.clientX, ev.clientY));
		}

		function up(ev) {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			if (!ghost) return;
			const g = ghost, ok = self.overStage(ev.clientX, ev.clientY);
			self.suppressClick = true;
			setTimeout(function () { self.suppressClick = false; }, 60);
			self.root.classList.remove('is-dragging', 'is-drop-ok');
			self.world.dropHint = 0;
			if (ok) {
				gsap.to(g, { scale: 0.15, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: function () { g.remove(); } });
				self.choose(card, { x: ev.clientX, y: ev.clientY }, false);
			} else {
				const r = card.querySelector('.opt__thumb').getBoundingClientRect();
				gsap.to(g, { x: r.left + r.width / 2, y: r.top + r.height / 2, scale: 0.6, opacity: 0, duration: 0.45, ease: 'power3.out', onComplete: function () { g.remove(); } });
			}
		}

		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
	},

	/* ---------- поэкранный скролл: колесо, свайп и клавиши листают ровно на один экран ---------- */

	bindPager: function () {
		const self = this;
		let acc = 0, lastWheel = 0, lastAbs = 0, armed = true, touch = null;
		this.paging = false;
		this.quietUntil = 0;

		window.addEventListener('wheel', function (e) {
			if (!self.ready || self.root.classList.contains('is-menu') || e.ctrlKey) return; // ctrlKey — щипок тачпада, это масштаб
			if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; // горизонтальная прокрутка — лентам карточек
			const dir = e.deltaY > 0 ? 1 : -1;
			if (self.freeScroll(dir)) return;
			e.preventDefault();
			const now = performance.now(), abs = Math.abs(e.deltaY), gap = now - lastWheel;
			lastWheel = now;
			// пока идёт перелистывание — всё глушим
			if (self.paging || now < self.quietUntil) {
				self.quietUntil = now + 260;
				lastAbs = abs;
				acc = 0;
				return;
			}
			// после перелистывания новый жест — это ускорение или долгая пауза,
			// а не затухающий хвост инерции тачпада
			if (!armed) {
				const fresh = abs > lastAbs * 1.4 + 2 || (gap > 1000 && abs >= 12) || (gap > 260 && abs >= lastAbs && abs >= 4);
				lastAbs = abs;
				if (!fresh) return;
				armed = true;
			}
			lastAbs = abs;
			if (gap > 220) acc = 0;
			acc += e.deltaY;
			if (Math.abs(acc) < 24) return;
			acc = 0;
			armed = false;
			self.step(dir);
		}, { passive: false });

		window.addEventListener('touchstart', function (e) {
			touch = e.touches.length === 1 ? { x: e.touches[0].clientX, y: e.touches[0].clientY, dy: 0, dir: '', free: false } : null;
		}, { passive: true });
		window.addEventListener('touchmove', function (e) {
			if (!touch || self.root.classList.contains('is-menu')) return;
			const dx = e.touches[0].clientX - touch.x, dy = e.touches[0].clientY - touch.y;
			touch.dy = dy;
			if (!touch.dir && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
				touch.dir = Math.abs(dy) > Math.abs(dx) ? 'v' : 'h';
				if (touch.dir === 'v') touch.free = self.freeScroll(dy < 0 ? 1 : -1);
			}
			// вертикальный свайп листает экраны, горизонтальный остаётся лентам карточек
			if (touch.dir === 'v' && !touch.free && e.cancelable) e.preventDefault();
		}, { passive: false });
		window.addEventListener('touchend', function () {
			if (touch && touch.dir === 'v' && !touch.free && Math.abs(touch.dy) > 40) self.step(touch.dy < 0 ? 1 : -1);
			touch = null;
		});

		window.addEventListener('keydown', function (e) {
			if (!self.ready || self.root.classList.contains('is-menu') || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
			const dir = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 }[e.key];
			if (!dir || self.freeScroll(dir)) return;
			e.preventDefault();
			self.step(dir);
		});
	},

	// текущий экран: 0–7 — секции, 8 — футер
	screen: function () {
		if (!this.footer.hidden && window.scrollY > this.tops[7] + 8) return 8;
		return clamp(Math.round(this.p), 0, 7);
	},

	step: function (dir) {
		if (this.paging) return;
		const cur = this.screen();
		if (dir > 0) {
			// дальше не пускаем, пока на шаге не выбран вариант
			if (cur >= 1 && cur <= 6 && !this.sel[STEPS[cur - 1]]) return this.nudge(this.sections[cur]);
			if (cur === 7) return this.go('footer');
			if (cur < 7) this.go(cur + 1);
			return;
		}
		if (cur > 0) this.go(cur === 8 ? 7 : cur - 1);
	},

	// футер выше экрана (телефон) — внутри него обычная прокрутка, у верхнего края — снова поэкранно
	freeScroll: function (dir) {
		if (this.footer.hidden || this.footer.offsetHeight <= this.vh + 2) return false;
		const top = this.topOf(this.footer), y = window.scrollY;
		if (y < top - 2) return false;
		return !(dir < 0 && y <= top + 2);
	},

	footerTarget: function () {
		return Math.min(this.topOf(this.footer), this.docH - this.vh);
	},

	scrollTo: function (y, done, duration) {
		const self = this;
		if (Math.abs(y - window.scrollY) < 1) {
			if (done) done();
			return;
		}
		this.paging = true;
		clearTimeout(this.pagingTimer);
		// страховка: если анимацию прервали, листание не должно «зависнуть»
		this.pagingTimer = setTimeout(function () { self.paging = false; }, (duration || 1.15) * 1000 + 400);
		this.lenis.scrollTo(y, {
			duration: duration || 1.15, easing: easeInOut, force: true, onComplete: function () {
				clearTimeout(self.pagingTimer);
				self.paging = false;
				self.quietUntil = performance.now() + 260;
				if (done) done();
			}
		});
	},

	/* ---------- навигация, цены ---------- */

	bindNav: function () {
		const self = this;
		document.addEventListener('click', function (e) {
			const lang = e.target.closest('[data-lang]');
			if (lang) {
				I18n.set(lang.getAttribute('data-lang'));
				return;
			}
			const t = e.target.closest('[data-goto], [data-next], [data-prev], [data-reset], [data-top]');
			if (!t) return;
			e.preventDefault();
			if (t.hasAttribute('data-goto')) {
				const v = t.getAttribute('data-goto');
				self.closeMenu();
				self.go(v === 'footer' ? v : +v);
			} else if (t.hasAttribute('data-next')) {
				self.step(1);
			} else if (t.hasAttribute('data-prev')) {
				self.step(-1);
			} else if (t.hasAttribute('data-reset')) {
				self.reset();
			} else {
				self.closeMenu();
				self.go(0);
			}
		});
	},

	// пункты навигации появляются только когда шаг открылся
	updateHud: function () {
		const self = this, idx = Math.max(0, this.active);
		const num = document.getElementById('hud-num'), txt = pad2(idx + 1);
		if (num.textContent !== txt) {
			num.textContent = txt;
			num.classList.remove('is-roll');
			void num.offsetWidth;
			num.classList.add('is-roll');
		}
		this.crumbs.forEach(function (c) {
			const i = +c.getAttribute('data-crumb');
			c.classList.toggle('is-open', !self.sections[i].hidden);
			c.classList.toggle('is-current', i === idx);
			c.classList.toggle('is-done', i > 0 && i < 7 && !!self.sel[STEPS[i - 1]]);
		});
		this.root.classList.toggle('is-complete', !this.sections[7].hidden);
		document.querySelector('[data-prev].hud__arrow').disabled = idx === 0;
		const next = this.sections[idx + 1];
		document.querySelector('[data-next].hud__arrow').disabled = !next || next.hidden;
	},

	priceOf: function (step) {
		const id = this.sel[step];
		if (!id) return 0;
		const card = this.card(step, id), price = +card.getAttribute('data-price');
		if (card.getAttribute('data-unit') === 'fix') return price;
		return price * this.areaOf(step);
	},

	areaOf: function (step) {
		const d = houseDims(this.sel.frame || 'barn');
		if (step === 'walls') return Areas.walls(d);
		if (step === 'roof') return Areas.roof(d);
		if (step === 'windows') return Areas.glass(d, this.sel.windows);
		return 0;
	},

	updatePrices: function () {
		const self = this;
		let total = 0, rows = '', specs = '', hash = 7;
		STEPS.forEach(function (s) {
			const id = self.sel[s];
			if (!id) return;
			const price = self.priceOf(s), area = self.areaOf(s), name = self.optName(s, id);
			const detail = area ? Math.round(area) + ' ' + I18n.t('m2') : I18n.t(s + '_' + id + '_meta');
			total += price;
			(s + id).split('').forEach(function (ch) { hash = (hash * 31 + ch.charCodeAt(0)) % 9000; });
			rows += '<li class="summary__row"><span class="summary__step">' + I18n.t(s + '_label') + '</span>' +
				'<span class="summary__name">' + name + ' · ' + detail + '</span>' +
				'<span class="summary__price">' + money(price) + '</span></li>';
			specs += '<li><span>' + I18n.t(s + '_label') + '</span><b>' + name + '</b></li>';
		});
		document.getElementById('summary').innerHTML = rows;
		document.getElementById('passport-specs').innerHTML = specs;
		document.getElementById('passport-id').textContent = 'WP-' + (1000 + hash % 9000);
		this.root.classList.toggle('has-price', total > 0);
		const out = ['hud-sum', 'final-sum', 'passport-sum'].map(function (id) { return document.getElementById(id); });
		const render = function () {
			const s = self.sum.v ? money(self.sum.v) : '—';
			out.forEach(function (el) { el.textContent = s; });
		};
		render(); // сразу — иначе при смене языка без смены суммы текст оставался прежним
		gsap.to(this.sum, { v: total, duration: 1.2, ease: 'power3.out', overwrite: true, onUpdate: render });
	},

	// смена языка: тексты уже заменены, пересчитываем то, что собирается из данных, и переигрываем появление
	onLang: function () {
		const self = this;
		this.renderCardPrices();
		STEPS.forEach(function (s) { self.renderPicked(s); });
		this.updatePrices();
		this.tick();
		const sec = this.sections[this.active];
		if (sec) {
			sec.classList.remove('is-in');
			requestAnimationFrame(function () { requestAnimationFrame(function () { sec.classList.add('is-in'); }); });
		}
		this.footer.classList.remove('is-in');
		requestAnimationFrame(function () { self.footer.classList.toggle('is-in', self.footerIn); });
	},

	// сброс под шторкой: состояние очищается, пока экран закрыт, и сразу открывается первый экран
	reset: function () {
		const self = this;
		this.jump(0, 0, null, function () {
			self.sel = {};
			self.snapStale = true;
			self.world.house.clear();
			self.world.resetPlot();
			self.setZoom(1);
			self.cards.forEach(function (c) {
				c.classList.remove('is-active');
				c.setAttribute('aria-pressed', 'false');
			});
			self.sections.forEach(function (s, i) {
				if (i >= 2) s.hidden = true;
				if (!s.classList.contains('step')) return;
				s.classList.remove('is-chosen');
				self.renderPicked(s.getAttribute('data-step'));
				const btn = s.querySelector('.step__next'), txt = btn.querySelector('.btn__text');
				btn.disabled = true;
				txt.setAttribute('data-i18n', 'choose');
				txt.textContent = I18n.t('choose');
			});
			self.footer.hidden = true;
			self.measure();
			self.lenis.resize();
			self.updatePrices();
			self.updateHud();
		});
	},

	/* ---------- меню ---------- */

	bindMenu: function () {
		const self = this;
		Array.prototype.forEach.call(document.querySelectorAll('[data-menu]'), function (b) {
			b.addEventListener('click', function (e) {
				e.preventDefault();
				const open = !self.root.classList.contains('is-menu');
				self.root.classList.toggle('is-menu', open);
				// полоса прокрутки скрыта всегда, поэтому остановка скролла ничего не сдвигает
				if (open) self.lenis.stop(); else self.lenis.start();
			});
		});
		document.addEventListener('keydown', function (e) { if (e.key === 'Escape') self.closeMenu(); });
	},

	closeMenu: function () {
		if (!this.root.classList.contains('is-menu')) return;
		this.root.classList.remove('is-menu');
		this.lenis.start();
	},

	/* ---------- футер ---------- */

	tick: function () {
		let time;
		try {
			time = new Date().toLocaleTimeString(I18n.locale(), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' });
		} catch (e) {
			time = new Date().toLocaleTimeString(I18n.locale(), { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kiev' });
		}
		document.getElementById('clock').textContent = I18n.t('city') + ', ' + time;
	},

	bindFooter: function () {
		const self = this;
		this.tick();
		setInterval(function () { self.tick(); }, 15000);

		const form = document.getElementById('lead-form');
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			form.classList.add('is-sent');
		});

		const footer = this.footer;
		if ('IntersectionObserver' in window) {
			new IntersectionObserver(function (en) {
				en.forEach(function (x) {
					self.footerIn = x.isIntersecting;
					footer.classList.toggle('is-in', x.isIntersecting);
				});
			}, { threshold: 0.15 }).observe(footer);
		}
	},

	/* ---------- прелоадер ---------- */

	loader: function () {
		const self = this, el = document.querySelector('.loader'), num = el.querySelector('.loader__num'), bar = el.querySelector('.loader__bar i');
		const st = { v: 0 };
		let thumbs = false, counted = false;

		function finish() {
			if (!thumbs || !counted) return;
			self.ready = true;
			self.root.classList.add('is-ready');
			gsap.to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, ease: 'power3.inOut', onComplete: function () { el.remove(); } });
			gsap.to(self.world, { intro: 1, duration: 2.6, delay: 0.2, ease: 'power2.out' });
			setTimeout(function () { self.activate(clamp(Math.round(self.p), 0, 7)); }, 350);
		}

		gsap.to(st, {
			v: 100, duration: 1.6, ease: 'power2.inOut',
			onUpdate: function () {
				num.textContent = pad2(Math.round(st.v)).padStart(3, '0');
				bar.style.transform = 'scaleX(' + st.v / 100 + ')';
			},
			onComplete: function () { counted = true; finish(); }
		});

		setTimeout(function () {
			try {
				Thumbs.render(self.cards.map(function (c) {
					return { step: c.getAttribute('data-step'), id: c.getAttribute('data-id'), img: c.querySelector('.opt__thumb img') };
				}));
			} catch (err) {
				console.warn('thumbs', err);
			}
			thumbs = true;
			finish();
		}, 120);
	}
};
