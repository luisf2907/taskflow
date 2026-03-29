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
  twitter: {
    card: "summary_large_image" as const,
    title: "Taskflow — Gestão de tarefas para times que entregam",
    description: "Kanban boards, sprints e integração com GitHub num só lugar.",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Taskflow",
  applicationCategory: "ProjectManagement",
  operatingSystem: "Web",
  description: "Kanban boards, sprints e integração com GitHub num só lugar.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
  },
};

export default function LandingPage() {
  return (
    <main style={{ background: "var(--tf-bg)" }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
