import { EMAIL, PHONE } from '@/content/contacts';
import { t } from '@/content/i18n';
import { steps } from '@/content/steps';
import Langs from './Langs';

export default function Menu() {
	return (
		<div className="menu" id="menu" data-lenis-prevent>
			<div className="menu__inner">
				<nav className="menu__nav">
					<a className="menu__link" href="#" data-goto="0" data-crumb="0">
						<span className="menu__row">
							<span className="menu__num">01</span>
							<span className="menu__name" data-i18n="plot">{t('plot')}</span>
						</span>
					</a>
					{steps.map((s, i) => (
						<a key={s.key} className="menu__link" href="#" data-goto={i + 1} data-crumb={i + 1}>
							<span className="menu__row">
								<span className="menu__num">{s.num}</span>
								<span className="menu__name" data-i18n={s.key + '_label'}>{t(s.key + '_label')}</span>
							</span>
						</a>
					))}
					<a className="menu__link" href="#" data-goto="7" data-crumb="7">
						<span className="menu__row">
							<span className="menu__num">08</span>
							<span className="menu__name" data-i18n="final">{t('final')}</span>
						</span>
					</a>
					<p className="menu__more" data-i18n="menu_more">{t('menu_more')}</p>
				</nav>
				<div className="menu__side">
					<Langs mod="menu" />
					<div className="menu__group">
						<span className="label" data-i18n="call">{t('call')}</span>
						<a className="menu__big" href={PHONE.href}>{PHONE.text}</a>
					</div>
					<div className="menu__group">
						<span className="label" data-i18n="write">{t('write')}</span>
						<a className="menu__big" href={'mailto:' + EMAIL}>{EMAIL}</a>
					</div>
					<div className="menu__group">
						<span className="label" data-i18n="prod">{t('prod')}</span>
						<span className="menu__text" data-i18n="prod_text">{t('prod_text')}</span>
						<span className="menu__text" data-i18n="hours">{t('hours')}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
