/* SVG-иконки сайта */

export type IconName =
	| 'logo'
	| 'arrow-down'
	| 'arrow-right'
	| 'arrow-left'
	| 'arrow-up'
	| 'plus'
	| 'minus'
	| 'lock'
	| 'leaf'
	| 'clock'
	| 'shield'
	| 'compass'
	| 'hand';

export default function Icon({ name }: { name: IconName }) {
	switch (name) {
		case 'logo':
			// рамка ровно по контуру домика — значок встаёт точно по краю колонки и по центру текста
			return (
				<svg viewBox="2.5 2.5 19 19" fill="currentColor" aria-hidden="true">
					<path d="M2.5 21.5V9.3L12 2.5l9.5 6.8v12.2h-6.8v-7.6h-5.4v7.6z" />
				</svg>
			);
		case 'arrow-down':
			return (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
					<path d="M12 4v16M5.5 13.5L12 20l6.5-6.5" />
				</svg>
			);
		case 'arrow-right':
			return (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
					<path d="M4 12h16M13.5 5.5L20 12l-6.5 6.5" />
				</svg>
			);
		case 'arrow-left':
			return (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
					<path d="M20 12H4M10.5 5.5L4 12l6.5 6.5" />
				</svg>
			);
		case 'arrow-up':
			return (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
					<path d="M12 20V4M5.5 10.5L12 4l6.5 6.5" />
				</svg>
			);
		case 'plus':
			return (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
					<path d="M12 5v14M5 12h14" />
				</svg>
			);
		case 'minus':
			return (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
					<path d="M5 12h14" />
				</svg>
			);
		case 'lock':
			return (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
					<rect x="5" y="10.5" width="14" height="9.5" rx="1.5" />
					<path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
				</svg>
			);
		case 'leaf':
			return (
				<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
					<circle cx="16" cy="16" r="15" />
					<path d="M10 22c0-7.5 4.5-12 12.5-12.5C22.5 17.5 18 22 10 22zM10 22l6.5-6.5" />
				</svg>
			);
		case 'clock':
			return (
				<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
					<circle cx="16" cy="16" r="15" />
					<circle cx="16" cy="16" r="8" />
					<path d="M16 11.5V16l3 2" />
				</svg>
			);
		case 'shield':
			return (
				<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
					<path d="M16 3.5l10 3.8v7.2c0 6.2-4.2 10.9-10 12.7C10.2 25.4 6 20.7 6 14.5V7.3z" />
					<path d="M11.5 15.5l3 3 6-6" />
				</svg>
			);
		case 'compass':
			return (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" aria-hidden="true">
					<circle cx="12" cy="12" r="10.5" />
					<path d="M12 4.5l2.6 7.5H9.4z" fill="currentColor" />
					<path d="M12 19.5L9.4 12h5.2z" />
				</svg>
			);
		case 'hand':
			return (
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
					<path d="M8.5 12V5.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V11m0-.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.6a5.5 5.5 0 0 1-4.4-2.2L4.3 15.2a1.6 1.6 0 0 1 2.4-2.1L8.5 15" />
				</svg>
			);
	}
}
