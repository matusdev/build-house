import Icon from './Icon';

/* Шторка для дальних переходов (вместо прокрутки через все секции) и прелоадер */
export default function Overlays() {
	return (
		<>
			<div className="curtain" aria-hidden="true">
				<div className="curtain__inner">
					<span className="curtain__num" />
					<span className="curtain__title" />
				</div>
			</div>
			<div className="loader">
				<div className="loader__brand">
					<Icon name="logo" />
					<span>WOODPANELS</span>
				</div>
				<div className="loader__num">000</div>
				<div className="loader__bar">
					<i />
				</div>
			</div>
		</>
	);
}
