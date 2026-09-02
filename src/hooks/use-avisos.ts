"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import {
  EntradaChangelog,
  VERSAO_ATUAL,
  novidadesDesde,
} from "@/lib/changelog";
import { Conquista } from "@/types";

/**
 * Um aviso pendente pra mostrar no primeiro login apos algum evento.
 *
 * "Ganhou uma insignia" e "saiu uma versao nova" sao a mesma mecanica —
 * mostrar uma vez e marcar como visto. Fossem dois componentes independentes,
 * os dois montariam no mesmo login e brigariam pela tela. Aqui viram uma fila
 * com uma ordem definida.
 */
export type Aviso =
  | { tipo: "conquista"; conquista: Conquista }
  | { tipo: "novidades"; entradas: EntradaChangelog[] };

/**
 * Fila de avisos do usuario logado.
 *
 * Ordem: conquistas primeiro, novidades depois. A comemoracao e pessoal e a
 * release costuma conter justamente a melhoria que a pessoa sugeriu — ler
 * "sua ideia entrou" antes de "o que mudou" faz a segunda tela significar
 * mais.
 *
 * Nao ha cache em localStorage de proposito. O onboarding usa um porque
 * roda no dashboard e o perfil pode nao ter chegado ainda; aqui o hook so
 * decide qualquer coisa DEPOIS que o perfil carregou, entao nao existe
 * momento de flash pra proteger — e um segundo lugar guardando "ja viu" so
 * criaria chance de divergir do banco.
 */
export function useAvisos() {
  const { user, perfil } = useAuth();

  // `onboarding_done` falso: a pessoa esta no wizard de primeiro uso.
  // Empilhar o changelog por cima seria dois modais na primeira sessao.
  const pronto = Boolean(user && perfil && perfil.onboarding_done === true);

  const { data: conquistas = [], mutate: recarregarConquistas } = useSWR(
    pronto ? `conquistas-nao-vistas-${user!.id}` : null,
    async () => {
      const { data } = await supabase
        .from("conquistas")
        .select("id, usuario_id, tipo, feedback_id, versao, vista, criado_em")
        .eq("usuario_id", user!.id)
        .eq("vista", false)
        .order("criado_em", { ascending: true });
      return (data ?? []) as Conquista[];
    },
  );

  const versaoVista = perfil?.ultima_versao_vista ?? null;

  // ─── Carimbo silencioso ───
  // Perfil sem versao gravada = cadastro novo, ou usuario que ja existia
  // antes da migration 059. Nos dois casos o certo e gravar a versao atual
  // SEM mostrar nada: o primeiro nunca viu as versoes antigas, e o segundo
  // nao merece receber o changelog inteiro retroativo. O modal passa a valer
  // do proximo release em diante.
  //
  // O ref evita reenviar o UPDATE a cada render enquanto o SWR do perfil nao
  // revalida.
  const carimbando = useRef(false);
  useEffect(() => {
    if (!pronto || versaoVista !== null || carimbando.current) return;
    carimbando.current = true;
    void supabase
      .from("perfis")
      .update({ ultima_versao_vista: VERSAO_ATUAL })
      .eq("id", user!.id);
  }, [pronto, versaoVista, user]);

  const fila = useMemo<Aviso[]>(() => {
    if (!pronto) return [];

    const avisos: Aviso[] = conquistas.map((conquista) => ({
      tipo: "conquista" as const,
      conquista,
    }));

    const entradas = novidadesDesde(versaoVista);
    if (entradas.length > 0) avisos.push({ tipo: "novidades", entradas });

    return avisos;
  }, [pronto, conquistas, versaoVista]);

  /**
   * Marca o aviso do topo como visto. Um por vez: se a pessoa fechar a aba no
   * meio, o que sobrou continua pendente pro proximo login.
   */
  const dispensar = useCallback(
    async (aviso: Aviso) => {
      if (!user) return;

      if (aviso.tipo === "conquista") {
        // So a coluna `vista` — as outras sao negadas por privilegio de
        // coluna no banco (ver GRANT UPDATE (vista) na migration 059).
        await supabase
          .from("conquistas")
          .update({ vista: true })
          .eq("id", aviso.conquista.id);
        await recarregarConquistas();
        return;
      }

      await supabase
        .from("perfis")
        .update({ ultima_versao_vista: VERSAO_ATUAL })
        .eq("id", user.id);
      // O perfil vem do SWR do useAuth; sem revalidar, `versaoVista` continua
      // antigo e a fila remonta o mesmo aviso.
      await mutatePerfil(user.id);
    },
    [user, recarregarConquistas],
  );

  return { aviso: fila[0] ?? null, dispensar };
}

/**
 * Revalida a chave de perfil do useAuth.
 *
 * Import dinamico do mutate global: o useAuth expoe `refresh()`, mas ele
 * tambem re-busca o usuario do Auth — chamada de rede desnecessaria so pra
 * atualizar uma coluna que acabamos de gravar.
 */
async function mutatePerfil(userId: string) {
  const { mutate } = await import("swr");
  await mutate(`perfil-${userId}`);
}
