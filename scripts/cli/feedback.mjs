// ═══════════════════════════════════════════════════════════════════════
// Triagem de feedback e premiacao de contribuicao
// ═══════════════════════════════════════════════════════════════════════
//
// A migration 058 decidiu nao ter tela admin de feedback ("volume baixo e
// leitura esporadica"). Isso continua valendo pra LER — mas premiar alguem
// e diferente: escreve em duas tabelas, tem que ser idempotente e dispara um
// modal na cara de uma pessoa real. SQL na mao erra isso em lote.
//
// A RLS de `feedbacks` nao tem policy de UPDATE e a de `conquistas` nao tem
// de INSERT, ambas de proposito: quem escreve aqui e o service_role deste
// CLI. Se o browser pudesse inserir conquista, qualquer um se premiava pelo
// console.
//
//   node --env-file=.env.local scripts/cli.mjs feedback:list
//   node --env-file=.env.local scripts/cli.mjs feedback:list --status novo
//   node --env-file=.env.local scripts/cli.mjs feedback:premiar \
//     --id abc-123,def-456 --versao 1.1.0 --yes
//
import { getAdminClient, log, parseArgs, requireArgs } from "./lib.mjs";

const STATUS_VALIDOS = ["novo", "analisado", "implementado", "descartado"];

/** Lista feedbacks pra voce escolher quais viraram melhoria. */
export async function feedbackList(argv) {
  const args = parseArgs(argv);
  const status = args.status;
  const limite = Number(args.limite ?? 30);

  if (status && !STATUS_VALIDOS.includes(status)) {
    log.err(`--status invalido: "${status}". Use: ${STATUS_VALIDOS.join(", ")}`);
    process.exit(1);
  }

  const admin = getAdminClient();
  let query = admin
    .from("feedbacks")
    .select("id, criado_em, tipo, status, versao, pagina, mensagem, usuario_id")
    .order("criado_em", { ascending: false })
    .limit(limite);
  if (status) query = query.eq("status", status);

  const { data: feedbacks, error } = await query;
  if (error) {
    log.err(`Falha ao listar: ${error.message}`);
    process.exit(2);
  }
  if (!feedbacks || feedbacks.length === 0) {
    log.info("Nenhum feedback encontrado.");
    return;
  }

  // Uma consulta pros emails, em vez de um join — PostgREST exige FK
  // declarada entre feedbacks e perfis pra embutir, e a FK aponta pra
  // auth.users.
  const emails = await mapaDeEmails(admin, feedbacks.map((f) => f.usuario_id));

  for (const f of feedbacks) {
    const data = new Date(f.criado_em).toLocaleString("pt-BR");
    log.info(`${f.id}`);
    log.dim(
      `  ${data} · ${f.tipo} · ${f.status}${f.versao ? ` (v${f.versao})` : ""}` +
        ` · ${emails.get(f.usuario_id) ?? "?"}${f.pagina ? ` · ${f.pagina}` : ""}`,
    );
    log.dim(`  ${f.mensagem.replace(/\s+/g, " ").slice(0, 160)}`);
  }
  log.ok(`${feedbacks.length} feedback(s).`);
}

/**
 * Marca feedbacks como implementados e cria a insignia de quem sugeriu.
 *
 * Exige --yes porque nao da pra "desfazer com elegancia": a conquista entra
 * na fila de avisos e a pessoa ve o modal no proximo login. Sem a flag, o
 * comando so mostra o que faria.
 */
export async function feedbackPremiar(argv) {
  const args = parseArgs(argv);
  requireArgs(args, ["id", "versao"]);

  const ids = String(args.id)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const versao = String(args.versao);
  const confirm = args.yes === true;

  if (ids.length === 0) {
    log.err("--id nao tem nenhum uuid.");
    process.exit(1);
  }

  const admin = getAdminClient();
  const { data: feedbacks, error } = await admin
    .from("feedbacks")
    .select("id, usuario_id, tipo, status, mensagem")
    .in("id", ids);

  if (error) {
    log.err(`Falha ao buscar feedbacks: ${error.message}`);
    process.exit(2);
  }

  // Id que nao existe e quase sempre erro de copiar/colar. Abortar tudo e
  // melhor que premiar metade da lista e deixar voce descobrir depois.
  const achados = new Set((feedbacks ?? []).map((f) => f.id));
  const faltando = ids.filter((id) => !achados.has(id));
  if (faltando.length > 0) {
    log.err(`Feedback(s) nao encontrado(s): ${faltando.join(", ")}`);
    process.exit(2);
  }

  const { data: jaPremiados } = await admin
    .from("conquistas")
    .select("feedback_id")
    .in("feedback_id", ids);
  const jaTem = new Set((jaPremiados ?? []).map((c) => c.feedback_id));

  const emails = await mapaDeEmails(admin, feedbacks.map((f) => f.usuario_id));
  const pendentes = feedbacks.filter((f) => !jaTem.has(f.id));

  log.info(`Versao: ${versao}`);
  for (const f of feedbacks) {
    const quem = emails.get(f.usuario_id) ?? f.usuario_id;
    if (jaTem.has(f.id)) {
      log.warn(`  ${f.id} — ${quem} — JA PREMIADO, sera ignorado`);
    } else {
      log.info(`  ${f.id} — ${quem}`);
      log.dim(`    "${f.mensagem.replace(/\s+/g, " ").slice(0, 120)}"`);
    }
  }

  if (pendentes.length === 0) {
    log.ok("Nada a fazer — todos ja tinham insignia.");
    return;
  }

  if (!confirm) {
    log.warn("");
    log.warn(
      `Isso vai marcar ${pendentes.length} feedback(s) como implementados e dar`,
    );
    log.warn("a insignia 'Voz que virou produto' pra quem sugeriu. Cada pessoa");
    log.warn("ve um modal de agradecimento no proximo login.");
    log.warn("");
    log.warn("Re-execute com --yes pra confirmar.");
    process.exit(1);
  }

  let premiados = 0;
  for (const f of pendentes) {
    const { error: erroFeedback } = await admin
      .from("feedbacks")
      .update({ status: "implementado", versao })
      .eq("id", f.id);
    if (erroFeedback) {
      log.err(`  ${f.id}: falha ao atualizar status — ${erroFeedback.message}`);
      continue;
    }

    const { error: erroConquista } = await admin.from("conquistas").insert({
      usuario_id: f.usuario_id,
      tipo: "feedback_implementado",
      feedback_id: f.id,
      versao,
    });
    if (erroConquista) {
      // 23505 = indice unico conquistas_feedback_uniq. Acontece em corrida
      // com outra execucao; o feedback ja ficou marcado, entao esta correto.
      if (erroConquista.code === "23505") {
        log.warn(`  ${f.id}: insignia ja existia (corrida) — ok`);
        continue;
      }
      log.err(`  ${f.id}: falha ao criar insignia — ${erroConquista.message}`);
      continue;
    }
    premiados++;
  }

  log.ok(`${premiados} insignia(s) concedida(s) na versao ${versao}.`);
  log.dim("Cada pessoa ve o agradecimento no proximo login.");
}

/** usuario_id -> email, em uma consulta so. */
async function mapaDeEmails(admin, usuarioIds) {
  const unicos = [...new Set(usuarioIds.filter(Boolean))];
  if (unicos.length === 0) return new Map();
  const { data } = await admin.from("perfis").select("id, email").in("id", unicos);
  return new Map((data ?? []).map((p) => [p.id, p.email]));
}
