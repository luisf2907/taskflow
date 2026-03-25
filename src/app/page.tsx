import LandingHeader from "@/components/landing/landing-header";
import HeroSection from "@/components/landing/hero-section";
import { SocialProofSection } from "@/components/landing/social-proof-section";
import { FeaturesSection } from "@/components/landing/features-section";
import HowItWorksSection from "@/components/landing/how-it-works-section";
import CtaSection from "@/components/landing/cta-section";
import LandingFooter from "@/components/landing/landing-footer";

export const metadata = {
  title: "Taskflow — Gestão de tarefas para times que entregam",
  description: "Kanban boards, sprints e integração com GitHub num só lugar. Gerencie tarefas do jeito que seu time realmente trabalha.",
  openGraph: {
    title: "Taskflow — Gestão de tarefas para times que entregam",
    description: "Kanban boards, sprints e integração com GitHub num só lugar.",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <main style={{ background: "var(--tf-bg)" }}>
      <LandingHeader />
      <HeroSection />
      <SocialProofSection />
      <FeaturesSection />
      <HowItWorksSection />
      <CtaSection />
      <LandingFooter />
    </main>
  );
}
