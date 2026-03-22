"use client";

import { Anexo } from "@/types";
import {
  Download,
  File,
  FileImage,
  FileText,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef } from "react";

interface AnexosProps {
  anexos: Anexo[];
  enviando: boolean;
  onUpload: (file: File) => void;
  onExcluir: (id: string) => void;
}

function iconeArquivo(tipo: string | null) {
  if (!tipo) return <File size={15} />;
  if (tipo.startsWith("image/")) return <FileImage size={15} />;
  if (tipo.includes("pdf") || tipo.includes("text")) return <FileText size={15} />;
  return <File size={15} />;
}

function formatarTamanho(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

export function Anexos({ anexos, enviando, onUpload, onExcluir }: AnexosProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Paperclip size={15} style={{ color: "var(--tf-text-tertiary)" }} />
          <h3 className="text-[13px] font-semibold" style={{ color: "var(--tf-text)" }}>
            Anexos
          </h3>
          {anexos.length > 0 && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}
            >
              {anexos.length}
            </span>
          )}
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-[8px] disabled:opacity-40 hover:bg-[var(--tf-surface-hover)]"
          style={{ color: "var(--tf-text-secondary)", border: "1px dashed var(--tf-border)", transition: "background 0.15s ease" }}
        >
          <Upload size={12} />
          {enviando ? "Enviando..." : "Anexar"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {anexos.length > 0 ? (
        <div className="space-y-1">
          {anexos.map((anexo) => (
            <div
              key={anexo.id}
              className="flex items-center gap-3 p-2.5 rounded-[8px] group hover:bg-[var(--tf-bg-secondary)]"
              style={{ transition: "background 0.15s ease" }}
            >
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0"
                style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-text-tertiary)" }}
              >
                {iconeArquivo(anexo.tipo)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium truncate" style={{ color: "var(--tf-text)" }}>
                  {anexo.nome}
                </p>
                <p className="text-[10px]" style={{ color: "var(--tf-text-tertiary)" }}>
                  {formatarTamanho(anexo.tamanho)}
                  {" · "}
                  {new Date(anexo.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                </p>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100" style={{ transition: "opacity 0.15s ease" }}>
                <a
                  href={anexo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-[4px] hover:bg-[var(--tf-surface-hover)]"
                  style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
                  title="Download"
                >
                  <Download size={13} />
                </a>
                <button
                  onClick={() => onExcluir(anexo.id)}
                  className="p-1.5 rounded-[4px] hover:bg-[var(--tf-danger-bg)]"
                  style={{ color: "var(--tf-text-tertiary)", transition: "background 0.15s ease" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--tf-danger)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--tf-text-tertiary)")}
                  title="Excluir"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !enviando ? (
        <div className="text-center py-5">
          <Paperclip size={18} className="mx-auto mb-1.5 opacity-20" style={{ color: "var(--tf-text-tertiary)" }} />
          <p className="text-[11px]" style={{ color: "var(--tf-text-tertiary)" }}>Nenhum anexo</p>
        </div>
      ) : null}
    </div>
  );
}
