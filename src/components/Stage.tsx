import { t } from '@/content/i18n';
import Icon from './Icon';

/* Холст сцены, «окно» под ней (по нему меряется обрезка) и подписи с кнопками масштаба поверх */
export default function Stage() {
	return (
		<>
			<canvas className="scene" id="scene" aria-hidden="true" />
			<div className="stage-probe" aria-hidden="true" />
			<div className="stage" id="stage" aria-hidden="true">
				<span className="stage__label stage__label--tl">
					<span className="label" data-i18n="plot">{t('plot')}</span>
					<span data-i18n="plot_meta">{t('plot_meta')}</span>
				</span>
				<span className="stage__label stage__label--br">
					<span className="label" data-i18n="coords">{t('coords')}</span>
				</span>
				<span className="stage__compass">
					<Icon name="compass" />
					<span>N</span>
				</span>
				<span className="stage__drop">
					<Icon name="hand" />
					<span data-i18n="drop">{t('drop')}</span>
				</span>
				{/* масштаб сцены: кнопки, щипок тачпада / Ctrl+колесо, щипок пальцами, двойной клик */}
				<span className="stage__zoom">
					<button className="stage__zoom-btn" type="button" data-zoom="-1" data-i18n-aria="zoom_out" aria-label={t('zoom_out')} disabled>
						<Icon name="minus" />
					</button>
					<button className="stage__zoom-btn" type="button" data-zoom="1" data-i18n-aria="zoom_in" aria-label={t('zoom_in')}>
						<Icon name="plus" />
					</button>
				</span>
			</div>
			<div className="scrollbar" aria-hidden="true">
				<i />
			</div>
		</>
	);
}
