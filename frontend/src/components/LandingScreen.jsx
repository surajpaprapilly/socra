import Hero from './landing/Hero';
import PainSection from './landing/PainSection';
import HowItWorks from './landing/HowItWorks';
import ClosingCTA from './landing/ClosingCTA';
import SectionDivider from './landing/SectionDivider';

export default function LandingScreen() {
  return (
    <div className="min-h-screen bg-background text-textDefault overflow-x-hidden">
      <Hero />
      <SectionDivider />
      <PainSection />
      <SectionDivider />
      <HowItWorks />
      <ClosingCTA />
    </div>
  );
}
