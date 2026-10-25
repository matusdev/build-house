/* Языки ru / uk / en: словарь общий с серверным рендером (content/i18n), переключение — без перезагрузки и без потери конфигурации */

import { I18N, LANGS, LOCALES, t, formatMoney } from '@/content/i18n';
import { Split } from './split';

export const I18n = {
	lang: 'ru',
	dict: I18N,
	listeners: [],

	init: function () {
		let saved = null;
		try {
			saved = localStorage.getItem('wp-lang');
		} catch (e) { /* приватный режим — язык просто не запоминается */ }
		const query = new URLSearchParams(location.search).get('lang');
		this.lang = [query, saved].filter(function (l) { return LANGS.includes(l); })[0] || 'ru';
	},

	t: function (key) {
		return t(key, this.lang);
	},

	locale: function () {
		return LOCALES[this.lang] || 'ru-RU';
	},

	set: function (lang) {
		if (!this.dict[lang] || lang === this.lang) return;
		this.lang = lang;
		try {
			localStorage.setItem('wp-lang', lang);
		} catch (e) { /* см. init */ }
		this.apply();
		this.listeners.forEach(function (fn) { fn(lang); });
	},

	apply: function () {
		const self = this;
		document.documentElement.lang = this.lang;
		document.title = this.t('title');
		const meta = document.querySelector('meta[name="description"]');
		if (meta) meta.setAttribute('content', this.t('desc'));
		Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
			const s = self.t(el.getAttribute('data-i18n'));
			if (el.hasAttribute('data-chars')) Split.chars(el, s);
			else if (el.hasAttribute('data-words')) Split.words(el, s);
			else el.textContent = s;
		});
		Array.prototype.forEach.call(document.querySelectorAll('[data-i18n-aria]'), function (el) {
			el.setAttribute('aria-label', self.t(el.getAttribute('data-i18n-aria')));
		});
		Array.prototype.forEach.call(document.querySelectorAll('.langs__btn'), function (b) {
			b.classList.toggle('is-active', b.getAttribute('data-lang') === self.lang);
		});
	}
};

// «от 1 250 000 ₴» / «from ₴1,250,000»; step — до скольких округлять
export function money(n, unit, step) {
	return formatMoney(n, unit, I18n.lang, step || 1000);
}
