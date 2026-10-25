/* Разбивка заголовков на буквы ([data-chars]) и описаний на слова ([data-words]) для анимации появления */

export const Split = {
	all: function () {
		Array.prototype.forEach.call(document.querySelectorAll('[data-chars]'), function (el) { Split.chars(el); });
		Array.prototype.forEach.call(document.querySelectorAll('[data-words]'), function (el) { Split.words(el); });
	},
	chars: function (el, text) {
		const words = (text || el.textContent).trim().split(/\s+/);
		let i = 0;
		el.setAttribute('aria-label', words.join(' '));
		el.innerHTML = words.map(function (w) {
			return '<span class="sc-w" aria-hidden="true">' + w.split('').map(function (ch) {
				return '<span class="sc" style="--i:' + (i++) + '">' + ch + '</span>';
			}).join('') + '</span>';
		}).join(' ');
	},
	words: function (el, text) {
		const words = (text || el.textContent).trim().split(/\s+/);
		el.innerHTML = words.map(function (w, i) {
			return '<span class="sw" style="--i:' + i + '">' + w + '</span>';
		}).join(' ');
	}
};
