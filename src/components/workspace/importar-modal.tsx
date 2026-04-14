"use client";

import { Modal } from "@/components/ui/modal";
import { useState, useRef } from "react";
import { Upload, FileJson, FileSpreadsheet, ArrowLeft, Check, Loader2, Columns3, Tag, ListChecks, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { ImportData } from "@/lib/import-types";
import { mutate as globalMutate } from "swr";

type Fonte = "trello" | "jira" | null;
type Fase = "escolher" | "upload" | "preview";

interface ImportarModalProps {
  aberto: boolean;
  onFechar: () => void;
  workspaceId: string;
}

export function ImportarModal({ aberto, onFechar, workspaceId }: ImportarModalProps) {
  const [fonte, setFonte] = useState<Fonte>(null);
  const [fase, setFase] = useState<Fase>("escolher");
  const [dados, setDados] = useState<ImportData | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFonte(null);
    setFase("escolher");
    setDados(null);
    setErro(null);
    setImportando(false);
    setSucesso(false);
    setDragOver(false);
  }

  function handleFechar() {
    reset();
    onFechar();
  }

  function escolherFonte(f: Fonte) {
    setFonte(f);
    setFase("upload");
    setErro(null);
  }

  function processarArquivo(file: File) {
    setErro(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const conteudo = e.target?.result as string;
      try {
        // Lazy load do parser apenas no momento do upload
        const parsed = fonte === "trello"
          ? (await import("@/lib/import-trello")).parseTrelloJSON(conteudo)
          : (await import("@/lib/import-jira")).parseJiraCSV(conteudo);

        const totalCards = parsed.colunas.reduce((acc, c) => acc + c.cards.length, 0);
        if (totalCards === 0) {
          setErro("Nenhum card encontrado no arquivo.");
          return;
        }

        setDados(parsed);
        setFase("preview");
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao processar arquivo.");
      }
    };
    reader.onerror = () => setErro("Erro ao ler o arquivo.");
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processarArquivo(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processarArquivo(file);
  }

  async function handleImportar() {
    if (!dados || importando) return;
    setImportando(true);
    setErro(null);

    try {
      // 1. Criar sprint (quadro)
      const { data: quadro, error: errQuadro } = await supabase
        .from("quadros")
        .insert({
          nome: dados.nomeBoard,
          workspace_id: workspaceId,
          status_sprint: "planejada",
          cor: "#3B82F6",
        })
        .select("id")
        .single();

      if (errQuadro || !quadro) throw new Error("Erro ao criar sprint.");

      // 2. Criar colunas (batch)
      const { data: colunasCriadas, error: errColunas } = await supabase
        .from("colunas")
        .insert(
          dados.colunas.map((col, i) => ({
            quadro_id: quadro.id,
            nome: col.nome,
            posicao: i,
          }))
        )
        .select("id, nome");

      if (errColunas || !colunasCriadas) throw new Error("Erro ao criar colunas.");

      const colunaIdMap = new Map(colunasCriadas.map((c) => [c.nome, c.id]));

      // 3. Criar/reusar etiquetas (upsert batch)
      const etiquetaIdMap = new Map<string, string>();
      if (dados.etiquetas.length > 0) {
        // Buscar existentes
        const nomes = dados.etiquetas.map((e) => e.nome);
        const { data: existentes } = await supabase
          .from("etiquetas")
          .select("id, nome")
          .eq("workspace_id", workspaceId)
          .in("nome", nomes);

        for (const e of existentes || []) etiquetaIdMap.set(e.nome, e.id);

        // Criar faltantes
        const novas = dados.etiquetas.filter((e) => !etiquetaIdMap.has(e.nome));
        if (novas.length > 0) {
          const { data: criadas } = await supabase
            .from("etiquetas")
            .insert(novas.map((e) => ({ nome: e.nome, cor: e.cor, workspace_id: workspaceId })))
            .select("id, nome");

          for (const e of criadas || []) etiquetaIdMap.set(e.nome, e.id);
        }
      }

      // 4. Criar cards por coluna (batch por coluna)
      for (const col of dados.colunas) {
        const colunaId = colunaIdMap.get(col.nome);
        if (!colunaId || col.cards.length === 0) continue;

        const { data: cardsCriados, error: errCards } = await supabase
          .from("cartoes")
          .insert(
            col.cards.map((card, i) => ({
              coluna_id: colunaId,
              workspace_id: workspaceId,
              titulo: card.titulo.slice(0, 500),
              descricao: card.descricao?.slice(0, 5000) || null,
              peso: card.peso,
              posicao: i,
            }))
          )
          .select("id");

        if (errCards || !cardsCriados) continue;

        // 5. Vincular etiquetas (batch)
        const vinculos: { cartao_id: string; etiqueta_id: string }[] = [];
        for (let i = 0; i < col.cards.length; i++) {
          const card = col.cards[i];
          const cardId = cardsCriados[i]?.id;
          if (!cardId) continue;

          for (const nome of card.etiquetas) {
            const etId = etiquetaIdMap.get(nome);
            if (etId) vinculos.push({ cartao_id: cardId, etiqueta_id: etId });
          }
        }
        if (vinculos.length > 0) {
          await supabase.from("cartao_etiquetas").insert(vinculos);
        }

        // 6. Criar checklists + itens (batch)
        for (let i = 0; i < col.cards.length; i++) {
          const card = col.cards[i];
          const cardId = cardsCriados[i]?.id;
          if (!cardId || card.checklists.length === 0) continue;

          const { data: clsCriados } = await supabase
            .from("checklists")
            .insert(
              card.checklists.map((cl, ci) => ({
                cartao_id: cardId,
                titulo: cl.titulo,
                posicao: ci,
              }))
            )
            .select("id");

          if (clsCriados) {
            const todosItens = card.checklists.flatMap((cl, ci) =>
              cl.itens.map((item, ii) => ({
                checklist_id: clsCriados[ci]?.id,
                texto: item.texto,
                concluido: item.concluido,
                posicao: ii,
              }))
            ).filter((item) => item.checklist_id);

            if (todosItens.length > 0) {
              await supabase.from("checklist_itens").insert(todosItens);
            }
          }
        }
      }

      // 7. Revalidar caches
      globalMutate("quadros");
      globalMutate(`backlog-${workspaceId}`);

      setSucesso(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro na importacao.");
    } finally {
      setImportando(false);
    }
  }

  const totalCards = dados?.colunas.reduce((acc, c) => acc + c.cards.length, 0) || 0;
  const totalChecklists = dados?.colunas.reduce(
    (acc, c) => acc + c.cards.reduce((a2, card) => a2 + card.checklists.length, 0), 0
  ) || 0;

  if (!aberto) return null;

  return (
    <Modal aberto={aberto} onFechar={handleFechar} titulo="Importar dados" className="max-w-lg">
      {sucesso ? (
        /* SUCESSO */
        <div className="text-center py-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: "var(--tf-success-bg)" }}
          >
            <Check size={32} style={{ color: "var(--tf-success)" }} strokeWidth={3} />
          </div>
          <h2 className="text-[18px] font-bold mb-1" style={{ color: "var(--tf-text)" }}>
            Importacao concluida!
          </h2>
          <p className="text-[13px] mb-4" style={{ color: "var(--tf-text-secondary)" }}>
            {totalCards} cards importados em {dados?.colunas.length} colunas.
          </p>
          <button
            onClick={handleFechar}
            className="px-5 py-2.5 text-[13px] font-bold text-white rounded-[10px]"
            style={{ background: "var(--tf-accent)" }}
          >
            Fechar
          </button>
        </div>
      ) : fase === "escolher" ? (
        /* FASE 1: ESCOLHER FONTE */
        <div className="space-y-3">
          <p className="text-[13px]" style={{ color: "var(--tf-text-secondary)" }}>
            Escolha de onde importar seus dados:
          </p>

          <button
            onClick={() => escolherFonte("trello")}
            className="w-full flex items-center gap-4 p-4 rounded-[12px] border text-left transition-all hover:-translate-y-0.5"
            style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
          >
            <div className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "#0079BF20" }}>
              <FileJson size={24} style={{ color: "#0079BF" }} />
            </div>
            <div>
              <p className="text-[14px] font-bold" style={{ color: "var(--tf-text)" }}>Trello</p>
              <p className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>
                Importe boards, listas, cards, labels e checklists via JSON
              </p>
            </div>
          </button>

          <button
            onClick={() => escolherFonte("jira")}
            className="w-full flex items-center gap-4 p-4 rounded-[12px] border text-left transition-all hover:-translate-y-0.5"
            style={{ background: "var(--tf-surface)", borderColor: "var(--tf-border)" }}
          >
            <div className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "#0052CC20" }}>
              <FileSpreadsheet size={24} style={{ color: "#0052CC" }} />
            </div>
            <div>
              <p className="text-[14px] font-bold" style={{ color: "var(--tf-text)" }}>Jira</p>
              <p className="text-[12px]" style={{ color: "var(--tf-text-tertiary)" }}>
                Importe issues, status, prioridades e labels via CSV
              </p>
            </div>
          </button>
        </div>
      ) : fase === "upload" ? (
        /* FASE 2: UPLOAD */
        <div className="space-y-4">
          <button
            onClick={() => { setFase("escolher"); setErro(null); }}
            className="flex items-center gap-1 text-[13px] font-semibold"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            <ArrowLeft size={14} /> Voltar
          </button>

          <div className="text-center">
            <p className="text-[14px] font-bold" style={{ color: "var(--tf-text)" }}>
              {fonte === "trello" ? "Upload do JSON do Trello" : "Upload do CSV do Jira"}
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--tf-text-tertiary)" }}>
              {fonte === "trello"
                ? "No Trello: Menu → Mais → Imprimir e Exportar → Exportar como JSON"
                : "No Jira: Filtros → Exibir todos → Export → CSV (todos os campos)"}
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center py-10 rounded-[14px] border-2 border-dashed cursor-pointer transition-all"
            style={{
              borderColor: dragOver ? "var(--tf-accent)" : "var(--tf-border)",
              background: dragOver ? "var(--tf-accent-light)" : "var(--tf-bg-secondary)",
            }}
          >
            <Upload size={28} style={{ color: "var(--tf-text-tertiary)", opacity: 0.6 }} />
            <p className="text-[13px] font-semibold mt-3" style={{ color: "var(--tf-text)" }}>
              Arraste o arquivo aqui
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--tf-text-tertiary)" }}>
              ou clique para selecionar ({fonte === "trello" ? ".json" : ".csv"})
            </p>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept={fonte === "trello" ? ".json" : ".csv"}
            onChange={handleFileChange}
            className="hidden"
          />

          {erro && (
            <div className="flex items-start gap-2 text-[13px] px-3 py-2.5 rounded-[10px]" style={{ background: "var(--tf-danger-bg)", color: "var(--tf-danger)" }}>
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {erro}
            </div>
          )}
        </div>
      ) : (
        /* FASE 3: PREVIEW */
        <div className="space-y-4">
          <button
            onClick={() => { setFase("upload"); setDados(null); setErro(null); }}
            className="flex items-center gap-1 text-[13px] font-semibold"
            style={{ color: "var(--tf-text-tertiary)" }}
          >
            <ArrowLeft size={14} /> Voltar
          </button>

          {/* Resumo */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Columns3, label: "Colunas", value: dados?.colunas.length || 0 },
              { icon: ListChecks, label: "Cards", value: totalCards },
              { icon: Tag, label: "Etiquetas", value: dados?.etiquetas.length || 0 },
              { icon: Check, label: "Checklists", value: totalChecklists },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center py-3 rounded-[10px]"
                style={{ background: "var(--tf-bg-secondary)" }}
              >
                <stat.icon size={16} style={{ color: "var(--tf-accent)" }} />
                <span className="text-[18px] font-black mt-1" style={{ color: "var(--tf-text)" }}>{stat.value}</span>
                <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--tf-text-tertiary)" }}>{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Preview por coluna */}
          <div className="max-h-[40vh] overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: "thin" }}>
            {dados?.colunas.map((col) => (
              <div key={col.nome}>
                <p className="text-[12px] font-bold uppercase tracking-wide mb-1.5" style={{ color: "var(--tf-text-tertiary)" }}>
                  {col.nome} ({col.cards.length})
                </p>
                <div className="space-y-1">
                  {col.cards.slice(0, 5).map((card, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-[8px]"
                      style={{ background: "var(--tf-surface)", border: "1px solid var(--tf-border-subtle)" }}
                    >
                      <span className="text-[13px] font-medium truncate flex-1" style={{ color: "var(--tf-text)" }}>
                        {card.titulo}
                      </span>
                      {card.etiquetas.length > 0 && (
                        <span className="text-[10px] shrink-0" style={{ color: "var(--tf-text-tertiary)" }}>
                          {card.etiquetas.length} tag{card.etiquetas.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  ))}
                  {col.cards.length > 5 && (
                    <p className="text-[11px] text-center py-1" style={{ color: "var(--tf-text-tertiary)" }}>
                      +{col.cards.length - 5} cards
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {erro && (
            <div className="flex items-start gap-2 text-[13px] px-3 py-2.5 rounded-[10px]" style={{ background: "var(--tf-danger-bg)", color: "var(--tf-danger)" }}>
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              {erro}
            </div>
          )}

          <button
            onClick={handleImportar}
            disabled={importando}
            className="w-full flex items-center justify-center gap-2 py-3 text-[14px] font-bold text-white rounded-[12px] transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: "var(--tf-accent)" }}
          >
            {importando ? (
              <><Loader2 size={16} className="animate-spin" /> Importando...</>
            ) : (
              <><Upload size={16} /> Importar {totalCards} cards</>
            )}
          </button>
        </div>
      )}
    </Modal>
  );
}
