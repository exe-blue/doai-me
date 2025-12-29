import { HeroSection } from '@/components/landing/HeroSection';
import { ActivitiesSection } from '@/components/landing/ActivitiesSection';
import { ChannelsShowcase } from '@/components/landing/ChannelsShowcase';
import { DeviceVisualization } from '@/components/landing/DeviceVisualization';
import { BattleLogPreview } from '@/components/landing/BattleLogPreview';
import { Footer } from '@/components/landing/Footer';

export default function Home() {
  return (
    <main className="relative">
      <HeroSection />
      <ActivitiesSection />
      <ChannelsShowcase />
      <DeviceVisualization />
      <BattleLogPreview />
      <Footer />
    </main>
  );
}
