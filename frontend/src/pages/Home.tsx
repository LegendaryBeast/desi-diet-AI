import { Hero } from '../components/home/Hero';
import { MarqueeStrip } from '../components/ui/MarqueeStrip';
import { FeaturesSection } from '../components/home/FeaturesSection';
import { StatsStrip } from '../components/home/StatsStrip';
import { DiseasesGrid } from '../components/home/DiseasesGrid';
import { CTASection } from '../components/home/CTASection';
import { HomeChatPreview } from '../components/home/HomeChatPreview';

export const Home = () => {
  return (
    <div className="bg-cream">
      <Hero />
      <MarqueeStrip />
      <HomeChatPreview />
      <FeaturesSection />
      <StatsStrip />
      <DiseasesGrid />
      <CTASection />
    </div>
  );
};
