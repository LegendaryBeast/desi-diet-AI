import { Hero } from '../components/home/Hero';
import { FeaturesSection } from '../components/home/FeaturesSection';
import { DiseasesGrid } from '../components/home/DiseasesGrid';
import { CTASection } from '../components/home/CTASection';

export const Home = () => {
  return (
    <div className="bg-cream">
      <Hero />
      <FeaturesSection />
      <DiseasesGrid />
      <CTASection />
    </div>
  );
};
