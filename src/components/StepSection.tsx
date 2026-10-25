import type { CSSProperties } from 'react';
import { formatMoney, t } from '@/content/i18n';
import type { Step } from '@/content/steps';
import Icon from './Icon';

/* Шаг конфигуратора: текст слева, карточки вариантов справа. Все шаги, кроме первого, открываются по мере выбора */
export default function StepSection({ step: s, index: i }: { step: Step; index: number }) {
	return (
		<section
			className="step section"
			id={'step-' + s.key}
			data-index={i + 1}
			data-step={s.key}
			data-theme={s.theme}
			data-title={s.key + '_label'}
			hidden={i > 0}
		>
			<div className="step__text">
				<div className="num">
					<span className="num__digits" data-chars>{s.num}</span>
					<span className="num__line" />
				</div>
				<h2 className="step__title" data-chars data-i18n={s.key + '_title'}>{t(s.key + '_title')}</h2>
				<p className="step__desc" data-words data-i18n={s.key + '_text'}>{t(s.key + '_text')}</p>
				<div className="step__picked">
					<span className="label" data-i18n="picked">{t('picked')}</span>
					<span className="step__picked-name">—</span>
				</div>
				<button className="btn step__next" type="button" data-next disabled>
					<span className="btn__lock">
						<Icon name="lock" />
					</span>
					<span className="btn__text" data-i18n="choose">{t('choose')}</span>
					<span className="btn__arrow">
						<Icon name="arrow-down" />
					</span>
				</button>
			</div>
			<div className="step__opts">
				<div className="step__opts-head">
					<span className="label" data-i18n="options">{t('options')}</span>
					<span className="step__opts-hint" data-i18n="options_hint">{t('options_hint')}</span>
				</div>
				{s.options.map(([id, price], j) => (
					<button
						key={id}
						className="opt"
						type="button"
						aria-pressed="false"
						data-step={s.key}
						data-id={id}
						data-price={price}
						data-unit={s.unit}
						style={{ '--j': j } as CSSProperties}
					>
						<span className="opt__thumb">
							{/* eslint-disable-next-line @next/next/no-img-element -- превью рендерит three.js в data-URL на клиенте */}
							<img alt="" width="150" height="150" draggable="false" />
						</span>
						<span className="opt__body">
							<span className="opt__name" data-i18n={s.key + '_' + id}>{t(s.key + '_' + id)}</span>
							<span className="opt__meta" data-i18n={s.key + '_' + id + '_meta'}>{t(s.key + '_' + id + '_meta')}</span>
							<span className="opt__price">{formatMoney(price, s.unit, 'ru', 1)}</span>
						</span>
						<span className="opt__check" />
					</button>
				))}
			</div>
			<div className="step__lock">
				<Icon name="lock" />
				<span data-i18n="lock">{t('lock')}</span>
			</div>
		</section>
	);
}
