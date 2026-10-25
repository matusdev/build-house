import { t } from '@/content/i18n';
import Icon from './Icon';

export default function Hero() {
	return (
		<section className="hero section" data-index="0" data-theme="dark" data-title="plot">
			<div className="hero__text">
				<div className="num">
					<span className="num__digits" data-chars>01</span>
					<span className="num__line" />
				</div>
				<h1 className="hero__title" data-chars data-i18n="hero_title">{t('hero_title')}</h1>
				<p className="hero__desc" data-words data-i18n="hero_desc">{t('hero_desc')}</p>
				<button className="cue" type="button" data-next>
					<span className="cue__circle">
						<Icon name="arrow-down" />
					</span>
					<span className="cue__text" data-i18n="cue">{t('cue')}</span>
				</button>
			</div>
			<div className="hero__facts">
				<div className="fact">
					<span className="fact__num">6</span>
					<span className="fact__text" data-i18n="fact1">{t('fact1')}</span>
				</div>
				<div className="fact">
					<span className="fact__num">12</span>
					<span className="fact__text" data-i18n="fact2">{t('fact2')}</span>
				</div>
			</div>
		</section>
	);
}
