"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import useSWR from "swr";

import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase/client";
import {
  EntradaChangelog,
  VERSAO_ATUAL,
  novidadesDesde,
  versaoConhecida,
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
  // Varias conquistas DO MESMO TIPO viram um aviso so. Uma pessoa que teve
  // tres sugestoes implementadas no mesmo release veria, senao, tres modais
  // seguidos com titulo e texto identicos — mudando apenas a citacao.
  | { tipo: "conquistas"; conquistas: Conquista[] }
  | { tipo: "novidades"; entradas: EntradaChangelog[] };

/**
 * Fila de avisos do usuario logado.
 *
 * Ordem: novidades primeiro, conquistas depois — do geral pro pessoal.
 *
 * A release costuma conter justamente a melhoria que a pessoa sugeriu, entao
 * ela le "a descricao do cartao agora cresce" e SO DEPOIS descobre que aquilo
 * foi ideia dela. Na ordem inversa o changelog vira conferencia de uma coisa
 * ja sabida, e a sequencia termina numa lista generica logo depois de uma
 * comemoracao — anticlimax.
 *
 * Nao ha risco de a pessoa "perder" o agradecimento fechando a primeira tela e
 * indo embora: o dispensar marca UM aviso por vez, entao a conquista continua
 * com vista=false e reaparece no proximo login.
 *
 * Nao ha cache em localStorage de proposito. O onboarding usa um porque
 * roda no dashboard e o perfil pode nao ter chegado ainda; aqui o hook so
 * decide qualquer coisa DEPOIS que o perfil carregou, entao nao existe
 * momento de flash pra proteger — e um segundo lugar guardando "ja viu" so
 * criaria chance de divergir do banco.
 */
export function useAvisos() {
  const { user, perfil } = useAuth();

  // Basta ter perfil carregado.
  //
  // Aqui havia um `perfil.onboarding_done === true`, pra nao empilhar aviso
  // por cima do wizard de primeiro uso. Estava errado por dois motivos:
  //
  //   1. `onboarding_done` false NAO quer dizer "usuario novo", quer dizer
  //      "nunca terminou o wizard". Metade da base cai nisso — gente que usa
  //      o produto ha meses. Elas ficariam sem receber aviso NENHUM, pra
  //      sempre.
  //   2. O gate era redundante. O wizard so aparece com workspaces.length e
  //      quadros.length zerados (ver showOnboarding no dashboard), e pra essa
  //      conta a fila ja esta vazia por construcao: novidades sao suprimidas
  //      pela regra do NULL, e quem acabou de se cadastrar nao tem conquista.
  const pronto = Boolean(user && perfil);

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
  // Grava a versao atual SEM mostrar nada em dois casos:
  //
  //   1. versao nula — cadastro novo, ou usuario anterior a migration 059. O
  //      primeiro nunca viu as versoes antigas; o segundo nao merece o
  //      changelog inteiro retroativo.
  //   2. versao DESCONHECIDA — foi aparada do array, ou houve rollback. Sem
  //      este caso a pessoa travava: novidadesDesde devolve vazio, o modal
  //      nunca abre, o dispensar nunca roda e a coluna nunca muda — nenhum
  //      release futuro apareceria pra ela, pra sempre.
  //
  // Nos dois, o modal volta a valer do proximo release em diante.
  //
  // O ref evita reenviar o UPDATE a cada render enquanto o SWR do perfil nao
  // revalida.
  const carimbando = useRef(false);
  useEffect(() => {
    if (!pronto || carimbando.current) return;
    if (versaoConhecida(versaoVista)) return;
    carimbando.current = true;
    void (async () => {
      const { error } = await supabase
        .from("perfis")
        .update({ ultima_versao_vista: VERSAO_ATUAL })
        .eq("id", user!.id);
      if (error) {
        // Falha silenciosa aqui e cara: a pessoa fica com a versao antiga e
        // nunca mais ve release nenhum. Solta o ref pra tentar de novo no
        // proximo render em vez de desistir de vez.
        carimbando.current = false;
        console.error("[avisos] falha ao carimbar versao vista:", error);
      }
    })();
  }, [pronto, versaoVista, user]);

  const fila = useMemo<Aviso[]>(() => {
    if (!pronto) return [];

    const avisos: Aviso[] = [];

    const entradas = novidadesDesde(versaoVista);
    if (entradas.length > 0) avisos.push({ tipo: "novidades", entradas });

    // Agrupa por tipo, preservando a ordem de chegada. Tipos diferentes
    // continuam sendo avisos separados: cada insignia tem titulo e texto
    // proprios, e junta-las numa tela so nao faria sentido.
    const porTipo = new Map<string, Conquista[]>();
    for (const c of conquistas) {
      const grupo = porTipo.get(c.tipo);
      if (grupo) grupo.push(c);
      else porTipo.set(c.tipo, [c]);
    }
    for (const grupo of porTipo.values()) {
      avisos.push({ tipo: "conquistas", conquistas: grupo });
    }

    return avisos;
  }, [pronto, conquistas, versaoVista]);

  /**
   * Marca o aviso do topo como visto. Um por vez: se a pessoa fechar a aba no
   * meio, o que sobrou continua pendente pro proximo login.
   */
  const dispensar = useCallback(
    async (aviso: Aviso) => {
      if (!user) return;

      if (aviso.tipo === "conquistas") {
        // So a coluna `vista` — as outras sao negadas por privilegio de
        // coluna no banco (ver GRANT UPDATE (vista) na migration 059).
        //
        // O grupo inteiro de uma vez: foram celebradas na mesma tela, entao
        // marcar so uma faria as outras reaparecerem no proximo login.
        await supabase
          .from("conquistas")
          .update({ vista: true })
          .in(
            "id",
            aviso.conquistas.map((c) => c.id),
          );
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
