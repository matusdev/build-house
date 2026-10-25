import { EMAIL, PHONE } from '@/content/contacts';
import { t } from '@/content/i18n';
import Icon from './Icon';
import Langs from './Langs';

export default function Footer() {
	return (
		<footer className="footer" id="contacts" hidden>
			<div className="footer__main">
				<div className="footer__cta">
					<span className="label" data-i18n="foot_label">{t('foot_label')}</span>
					<h2 className="footer__title" data-chars data-i18n="foot_title">{t('foot_title')}</h2>
					<p className="footer__lead" data-i18n="foot_lead">{t('foot_lead')}</p>
					<form className="footer__form" id="lead-form">
						<label className="field">
							<input type="text" name="name" autoComplete="name" placeholder=" " required />
							<span className="field__label" data-i18n="f_name">{t('f_name')}</span>
						</label>
						<label className="field">
							<input type="tel" name="phone" autoComplete="tel" placeholder=" " required />
							<span className="field__label" data-i18n="f_phone">{t('f_phone')}</span>
						</label>
						<button className="footer__send" type="submit">
							<span data-i18n="f_send">{t('f_send')}</span>
							<span className="footer__send-circle">
								<Icon name="arrow-right" />
							</span>
						</button>
					</form>
					<p className="footer__note" data-i18n="f_note">{t('f_note')}</p>
					<p className="footer__thanks" data-i18n="f_thanks">{t('f_thanks')}</p>
				</div>

				{/* «паспорт» собранного дома: кадр из 3D-сцены и выбранная комплектация */}
				<article className="passport">
					<div className="passport__head">
						<span className="label" data-i18n="passport">{t('passport')}</span>
						<span className="passport__id" id="passport-id">WP-0000</span>
					</div>
					<div className="passport__body">
						<div className="passport__img">
							{/* eslint-disable-next-line @next/next/no-img-element -- кадр снимается с WebGL-холста в data-URL */}
							<img id="passport-img" alt="" />
						</div>
						<ul className="passport__specs" id="passport-specs" />
					</div>
					<div className="passport__foot">
						<span className="passport__note" data-i18n="passport_note">{t('passport_note')}</span>
						<span className="passport__sum" id="passport-sum">—</span>
					</div>
				</article>
			</div>

			<div className="footer__bar">
				<a className="logo" href="#" data-top aria-label="WOODPANELS">
					<Icon name="logo" />
					<span className="logo__text">WOODPANELS</span>
				</a>
				<div className="footer__contacts">
					<a href={PHONE.href}>{PHONE.text}</a>
					<a href={'mailto:' + EMAIL}>{EMAIL}</a>
					<span className="footer__clock" id="clock" />
				</div>
				<Langs mod="footer" />
				<div className="footer__legal">
					<span>© 2026</span>
					<a href="#" data-i18n="privacy">{t('privacy')}</a>
				</div>
				<button className="footer__top" type="button" data-top>
					<span data-i18n="top">{t('top')}</span>
					<Icon name="arrow-up" />
				</button>
			</div>
		</footer>
	);
}
