import { t } from '@/content/i18n';
import Footer from './Footer';
import Icon from './Icon';

/* Финал закрепляется, футер наезжает на него сверху. Итоги и суммы заполняет движок */
export default function Final() {
	return (
		<div className="final-wrap" id="final-wrap">
			<section className="final section" id="final" data-index="7" data-theme="dark" data-title="final" hidden>
				<div className="final__shade" />
				<div className="final__text">
					<div className="num">
						<span className="num__digits" data-chars>08</span>
						<span className="num__line" />
					</div>
					<h2 className="final__title" data-chars data-i18n="final_title">{t('final_title')}</h2>
					<p className="final__desc" data-words data-i18n="final_desc">{t('final_desc')}</p>
					<ul className="summary" id="summary" />
					<div className="final__total">
						<span className="label" data-i18n="total">{t('total')}</span>
						<span className="final__sum" id="final-sum">—</span>
					</div>
					<div className="final__cta">
						<a className="btn btn--solid" href="#contacts" data-goto="footer">
							<span className="btn__text" data-i18n="final_cta">{t('final_cta')}</span>
							<span className="btn__arrow">
								<Icon name="arrow-right" />
							</span>
						</a>
						<button className="btn btn--ghost" type="button" data-reset>
							<span className="btn__text" data-i18n="final_reset">{t('final_reset')}</span>
						</button>
					</div>
				</div>
				<div className="final__tag">
					<span data-i18n="final_tag">{t('final_tag')}</span>
					<i />
				</div>
				<ul className="final__features">
					<li>
						<Icon name="leaf" />
						<span data-i18n="feat_eco">{t('feat_eco')}</span>
					</li>
					<li>
						<Icon name="clock" />
						<span data-i18n="feat_fast">{t('feat_fast')}</span>
					</li>
					<li>
						<Icon name="shield" />
						<span data-i18n="feat_safe">{t('feat_safe')}</span>
					</li>
				</ul>
			</section>
			<Footer />
		</div>
	);
}
