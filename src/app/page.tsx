import Final from '@/components/Final';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Hud from '@/components/Hud';
import Menu from '@/components/Menu';
import Overlays from '@/components/Overlays';
import SiteEngine from '@/components/SiteEngine';
import Stage from '@/components/Stage';
import StepSection from '@/components/StepSection';
import { steps } from '@/content/steps';

export default function Home() {
	return (
		<>
			<Stage />
			<Header />
			<Menu />
			<main className="page">
				<Hero />
				{steps.map((s, i) => (
					<StepSection key={s.key} step={s} index={i} />
				))}
				<Final />
			</main>
			<Hud />
			<Overlays />
			<SiteEngine />
		</>
	);
}
