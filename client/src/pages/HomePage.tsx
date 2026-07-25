import Hero from "../components/home/Hero";
import FeatureSection from "../components/home/FeatureSection";
import HowItWorks from "../components/home/HowItWorks";
import Stats from "../components/home/Stats";
import CTA from "../components/home/CTA";

export default function HomePage() {
  return (
    <>
      <Hero />
      <FeatureSection />
      <HowItWorks />
      <Stats />
      <CTA />
    </>
  );
}