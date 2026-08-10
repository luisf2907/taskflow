"use client";

import { avatarDimensionado } from "@/lib/avatar-url";

import { useAuth } from "@/hooks/use-auth";
import { abrirModalPro } from "@/lib/pro";
import { CadeadoPro } from "@/components/pro/selo-pro";
import { useTema } from "@/hooks/use-tema";
import { HelpCircle, LogOut, Menu, Moon, Sun, User, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Tooltip } from "@/components/ui/tooltip";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { features } from "@/lib/features";

// Botão icônico quadrado do header — altura 32px, densidade Linear-style.
function HeaderIconButton({
  onClick,
  children,
  ariaLabel,
  className,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`w-10 h-10 md:w-8 md:h-8 flex items-center justify-center transition-colors outline-none ${className ?? ""}`}
      style={{
        borderRadius: "var(--tf-radius-sm)",
        color: "var(--tf-text-secondary)",
        background: "transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--tf-surface-hover)";
        e.currentTarget.style.color = "var(--tf-text)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--tf-text-secondary)";
      }}
    >
      {children}
    </button>
  );
}

export function Header({ onMenuMobile }: { onMenuMobile?: () => void } = {}) {
  const { tema, alternar } = useTema();
  const { user, perfil, logout, ehPro } = useAuth();
  // ATENCAO: isto NAO pode ser decidido durante o render.
  //
  // Era um useMemo lendo navigator.userAgent. useMemo roda no render, e no
  // servidor `navigator` nao existe — o HTML saia sempre com "Ctrl K". Num
  // Mac o primeiro render do cliente ja dava "⌘K", divergia do HTML
  // recebido e estourava o React #418 ("the server rendered text didn't
  // match the client") em TODA pagina, porque o header e global.
  //
  // Com estado + efeito o primeiro render do cliente e igual ao do
  // servidor, e a correcao acontece depois de hidratar.
  const [isMac, setIsMac] = useState(false);
  useEffect(() => {
    // set-state-in-effect intencional e necessario: e justamente o atraso
    // de um render que faz o HTML do servidor bater com o do cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.userAgent));
  }, []);

  const avatar = avatarDimensionado(perfil?.avatar_url, 24);
  const nome = perfil?.nome ?? user?.email?.split("@")[0] ?? "";
  const iniciais = nome
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header
      className="h-12 md:h-11 px-2 md:px-4 gap-2 md:gap-0 flex items-center justify-between shrink-0 mb-3 z-30 relative"
      style={{
        background: "var(--tf-surface)",
        border: "1px solid var(--tf-border)",
        borderRadius: "var(--tf-radius-xl)",
        // Era `mt-3.5` puro. Desde que o layout passou a declarar
        // viewportFit: "cover", a pagina se estende POR BAIXO da barra de
        // status e da Dynamic Island — sem somar o inset aqui, o cabecalho
        // ficaria parcialmente encoberto no iPhone.
        //
        // Este e o elemento mais alto das 11 telas do app, entao resolver
        // aqui cobre todas. No desktop env() e 0 e a margem continua
        // exatamente 14px, como antes.
        marginTop: "calc(0.875rem + env(safe-area-inset-top, 0px))",
      }}
    >
      {/* Mobile menu */}
      {onMenuMobile && (
        <button
          onClick={onMenuMobile}
          className="lg:hidden w-10 h-10 mr-1 flex items-center justify-center transition-colors hover:bg-[var(--tf-surface-hover)]"
          style={{
            color: "var(--tf-text-tertiary)",
            borderRadius: "var(--tf-radius-xs)",
          }}
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>
      )}

      {/* Search trigger (Cmd+K)
          `hidden lg:flex`: abaixo de 1024px a busca vive na ILHA ao lado da
          barra de navegacao — ver bottom-nav.tsx. Duas entradas para a mesma
          coisa seria ruido, e no header ela roubava metade da largura numa
          tela de 360px. O breakpoint casa com o que mostra a barra
          (useIsTabletOrBelow, max-width: 1023px). Desktop inalterado. */}
      <button
        className="hidden lg:flex items-center gap-2 h-9 md:h-7 px-2.5 pr-1.5 transition-colors hover:bg-[var(--tf-surface-hover)] outline-none flex-1 max-w-[320px]"
        style={{
          background: "var(--tf-bg-secondary)",
          border: "1px solid var(--tf-border)",
          borderRadius: "var(--tf-radius-sm)",
          color: "var(--tf-text-tertiary)",
        }}
        onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
        aria-label={`Buscar ou executar (${isMac ? "Cmd+K" : "Ctrl+K"})`}
      >
        <Search size={13} strokeWidth={1.75} />
        <span
          className="flex-1 text-left text-[0.75rem]"
          style={{ color: "var(--tf-text-tertiary)" }}
        >
          Buscar ou executar
        </span>
        <kbd
          className="hidden sm:inline-flex items-center h-5 px-1.5 text-[0.625rem]"
          style={{
            background: "var(--tf-surface)",
            color: "var(--tf-text-tertiary)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.04em",
          }}
        >
          {isMac ? "⌘K" : "Ctrl K"}
        </kbd>
      </button>

      {/* Right side: Tools & Profile */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {features.ai && (
          <Tooltip
            content={ehPro ? "Perguntar à IA" : "Perguntar à IA — recurso PRO"}
            position="bottom"
          >
            <div className="relative">
              <HeaderIconButton
                onClick={() =>
                  ehPro
                    ? window.dispatchEvent(new Event("open-ask-ai"))
                    : abrirModalPro()
                }
                ariaLabel={
                  ehPro ? "Perguntar à IA" : "Perguntar à IA (recurso PRO)"
                }
              >
                <Sparkles size={15} strokeWidth={1.75} />
              </HeaderIconButton>
              {!ehPro && <CadeadoPro />}
            </div>
          </Tooltip>
        )}

        <NotificationBell />

        <Tooltip content="Central de Ajuda" position="bottom">
          <HeaderIconButton
            onClick={() => window.dispatchEvent(new Event("open-help-modal"))}
            ariaLabel="Central de Ajuda"
            className="hidden sm:flex"
          >
            <HelpCircle size={15} strokeWidth={1.75} />
          </HeaderIconButton>
        </Tooltip>

        <Tooltip
          content={tema === "claro" ? "Modo escuro" : "Modo claro"}
          position="bottom"
        >
          <HeaderIconButton
            onClick={alternar}
            ariaLabel={tema === "claro" ? "Alternar para modo escuro" : "Alternar para modo claro"}
          >
            {tema === "claro" ? (
              <Moon size={15} strokeWidth={1.75} />
            ) : (
              <Sun size={15} strokeWidth={1.75} />
            )}
          </HeaderIconButton>
        </Tooltip>

        <div
          className="w-px h-5 mx-1"
          style={{ background: "var(--tf-border)" }}
          aria-hidden
        />

        {/* Profile */}
        {user ? (
          <Dropdown
            rotulo={`Conta de ${nome || "usuário"}`}
            propsGatilho={{
              className:
                "flex items-center gap-1.5 h-8 pl-1 pr-2 transition-colors hover:bg-[var(--tf-surface-hover)]",
              style: { borderRadius: "var(--tf-radius-sm)" },
            }}
            gatilho={
              <>
                {avatar ? (
                  // alt vazio: o nome ja esta no aria-label do gatilho e no
                  // <span> ao lado. Repetir faria o leitor de tela dizer o
                  // nome tres vezes seguidas.
                  <img
                    src={avatar}
                    alt=""
                    className="w-6 h-6 shrink-0"
                    style={{ borderRadius: "var(--tf-radius-xs)" }}
                  />
                ) : (
                  <div
                    aria-hidden="true"
                    className="w-6 h-6 flex items-center justify-center text-[0.6875rem] font-semibold shrink-0"
                    style={{
                      background: "var(--tf-accent)",
                      color: "var(--tf-on-accent)",
                      borderRadius: "var(--tf-radius-xs)",
                      fontFamily: "var(--tf-font-mono)",
                    }}
                  >
                    {iniciais || <User size={12} />}
                  </div>
                )}
                <span
                  className="hidden sm:inline text-[0.8125rem] font-medium"
                  style={{ color: "var(--tf-text)", letterSpacing: "-0.005em" }}
                >
                  {nome || "Conta"}
                </span>
              </>
            }
            className="!w-52 !max-w-[calc(100vw-16px)] !mt-2"
          >
            <div
              className="px-2.5 py-2 mb-1 mx-1"
              style={{
                background: "var(--tf-bg-secondary)",
                borderRadius: "var(--tf-radius-xs)",
                border: "1px solid var(--tf-border)",
              }}
            >
              <p
                className="text-[0.8125rem] font-medium truncate"
                style={{ color: "var(--tf-text)", letterSpacing: "-0.005em" }}
              >
                {nome}
              </p>
              <p
                className="text-[0.6875rem] truncate mt-0.5"
                style={{
                  color: "var(--tf-text-tertiary)",
                  fontFamily: "var(--tf-font-mono)",
                }}
              >
                {user.email}
              </p>
            </div>

            <DropdownItem onClick={() => {}}>
              <Link
                href="/settings"
                className="flex items-center gap-2.5 w-full"
                style={{ color: "var(--tf-text)" }}
              >
                <User size={13} strokeWidth={1.75} />
                <span>Configurações</span>
              </Link>
            </DropdownItem>

            <DropdownItem onClick={logout} perigo>
              <LogOut size={13} strokeWidth={1.75} />
              <span>Sair</span>
            </DropdownItem>
          </Dropdown>
        ) : (
          <div
            className="flex items-center gap-2 h-8 px-1.5 animate-pulse"
            style={{
              border: "1px solid var(--tf-border)",
              borderRadius: "var(--tf-radius-sm)",
            }}
          >
            <div
              className="w-6 h-6 shrink-0"
              style={{
                background: "var(--tf-bg-secondary)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            />
            <div
              className="hidden sm:block w-14 h-3"
              style={{
                background: "var(--tf-bg-secondary)",
                borderRadius: "var(--tf-radius-xs)",
              }}
            />
          </div>
        )}
      </div>
    </header>
  );
}
