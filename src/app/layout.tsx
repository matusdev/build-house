import type { Metadata, Viewport } from 'next';
import { Onest } from 'next/font/google';
import { I18N } from '@/content/i18n';
import '@/styles/main.scss';

const onest = Onest({
	subsets: ['latin', 'cyrillic'],
	variable: '--font-onest',
	display: 'swap'
});

export const metadata: Metadata = {
	title: I18N.ru.title,
	description: I18N.ru.desc
};

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	minimumScale: 1,
	maximumScale: 1,
	userScalable: false,
	viewportFit: 'contain',
	themeColor: '#121211'
};

// data-theme, data-active и классы состояния на <html> дальше переключает движок
export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html lang="ru" data-theme="dark" data-active="0" className={onest.variable}>
			<body>{children}</body>
		</html>
	);
}
