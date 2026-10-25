import { t } from '@/content/i18n';
import { steps } from '@/content/steps';
import Icon from './Icon';
import Langs from './Langs';

export default function Header() {
	return (
		<header className="header">
			<a className="logo" href="#" data-goto="0" aria-label="WOODPANELS">
				<Icon name="logo" />
				<span className="logo__text">WOODPANELS</span>
			</a>
			{/* шаги появляются в навигации по мере того, как открываются */}
			<nav className="crumbs" id="crumbs">
				<a className="crumb" href="#" data-goto="0" data-crumb="0">
					<span className="crumb__w">
						<span className="crumb__t" data-i18n="plot">{t('plot')}</span>
					</span>
				</a>
				{steps.map((s, i) => (
					<a key={s.key} className="crumb" href="#" data-goto={i + 1} data-crumb={i + 1}>
						<span className="crumb__w">
							<span className="crumb__t" data-i18n={s.key + '_label'}>{t(s.key + '_label')}</span>
						</span>
					</a>
				))}
				<a className="crumb" href="#" data-goto="7" data-crumb="7">
					<span className="crumb__w">
						<span className="crumb__t" data-i18n="final">{t('final')}</span>
					</span>
				</a>
			</nav>
			<Langs mod="header" />
			<button className="burger" type="button" data-menu aria-label={t('menu')}>
				<span />
				<span />
			</button>
		</header>
	);
}
