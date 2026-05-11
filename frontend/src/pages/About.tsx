import { AboutHero } from '../components/about/AboutHero';
import { Manifesto } from '../components/about/Manifesto';
import { ScrollStory } from '../components/about/ScrollStory';

export const About = () => {
  return (
    <div className="bg-cream">
      <AboutHero />
      <Manifesto />
      <ScrollStory />
    </div>
  );
};
