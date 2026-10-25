import { LANGS, LANG_NAMES } from '@/content/i18n';

export default function Langs({ mod }: { mod: 'header' | 'menu' | 'footer' }) {
	return (
		<div className={'langs langs--' + mod}>
			{LANGS.map((code) => (
				<button key={code} className={'langs__btn' + (code === 'ru' ? ' is-active' : '')} type="button" data-lang={code}>
					{LANG_NAMES[code]}
				</button>
			))}
		</div>
	);
}
