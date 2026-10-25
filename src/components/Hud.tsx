import { t } from '@/content/i18n';
import Icon from './Icon';

/* Нижняя панель: номер экрана, стрелки и стоимость дома */
export default function Hud() {
	return (
		<div className="hud" id="hud">
			<div className="hud__left">
				<div className="hud__count">
					<span className="hud__num" id="hud-num">01</span>
					<span className="hud__line" />
					<span className="hud__of">/ 08</span>
				</div>
				<div className="hud__arrows">
					<button className="hud__arrow" type="button" data-prev aria-label={t('back')}>
						<Icon name="arrow-left" />
					</button>
					<button className="hud__arrow" type="button" data-next aria-label={t('next')}>
						<Icon name="arrow-right" />
					</button>
				</div>
			</div>
			<div className="hud__price">
				<span className="label" data-i18n="cost">{t('cost')}</span>
				<span className="hud__sum" id="hud-sum">—</span>
			</div>
		</div>
	);
}
