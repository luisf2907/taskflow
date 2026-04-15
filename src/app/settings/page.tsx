"use client";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useQuadros } from "@/hooks/use-quadros";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Loader2 } from "lucide-react";

import { ProfileSection } from "./_sections/perfil";
import { GithubSection } from "./_sections/github";
import { FotoGithubBanner } from "./_sections/foto-github-banner";
import { AparenciaSection } from "./_sections/aparencia";
import { NotifSection } from "./_sections/notificacoes";
import { SegurancaSection } from "./_sections/seguranca";
import { ApiKeysSection } from "./_sections/api-keys";
import { VoiceSection } from "./_sections/voz";

export default function SettingsPage() {
  const {
    user,
    perfil,
    temGithub,
    logout,
    carregando,
    refresh,
    refreshGithub,
  } = useAuth();
  const { quadros } = useQuadros();
  const { sidebarAberta, toggleSidebar, iniciado } = useSidebar();
  const { workspaces } = useWorkspaces();

  if (carregando) {
    return (
      <div
        className="h-full flex items-center justify-center"
        style={{ background: "var(--tf-bg)" }}
      >
        <Loader2
          size={24}
          className="animate-spin"
          style={{ color: "var(--tf-accent)" }}
        />
      </div>
    );
  }

  return (
    <div
      className="h-full flex overflow-hidden"
      style={{ background: "var(--tf-bg)" }}
    >
      {iniciado && (
        <Sidebar
          quadros={quadros}
          onNovoQuadro={() => {}}
          aberta={sidebarAberta}
          onToggle={toggleSidebar}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden px-2 lg:px-4">
        <Header onMenuMobile={toggleSidebar} />

        <div
          className="flex-1 mb-4 overflow-hidden flex flex-col scroll-clip-lg"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-xl)",
          }}
        >
        <main
          id="main-content"
          className="flex-1 overflow-y-auto"
        >
          <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
            {/* Page title */}
            <div>
              <p
                className="label-mono mb-1"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                Preferências
              </p>
              <h1
                className="text-[1.5rem] font-semibold"
                style={{
                  color: "var(--tf-text)",
                  letterSpacing: "-0.02em",
                }}
              >
                Configurações
              </h1>
              <p
                className="text-[0.8125rem] mt-1.5"
                style={{
                  color: "var(--tf-text-secondary)",
                  letterSpacing: "-0.005em",
                }}
              >
                Gerencie seu perfil, conexões e preferências.
              </p>
            </div>

            <ProfileSection
              perfil={perfil}
              userEmail={user?.email}
              onUpdate={refresh}
            />

            <GithubSection
              temGithub={temGithub}
              perfil={perfil}
              refresh={refresh}
              refreshGithub={refreshGithub}
            />

            <FotoGithubBanner
              user={user}
              temGithub={temGithub}
              perfil={perfil}
              onUpdate={refresh}
            />

            <AparenciaSection />

            <NotifSection
              userId={user?.id}
              perfilPrefs={perfil?.notif_preferences}
            />

            <VoiceSection perfil={perfil} onUpdate={refresh} />

            <SegurancaSection onLogout={logout} />

            <ApiKeysSection workspaces={workspaces} userId={user?.id} />

            {/* Bottom spacer */}
            <div className="h-8" />
          </div>
        </main>
        </div>
      </div>
    </div>
  );
}
