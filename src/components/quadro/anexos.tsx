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
  if (!tipo) return <File size={13} strokeWidth={1.75} />;
  if (tipo.startsWith("image/")) return <FileImage size={13} strokeWidth={1.75} />;
  if (tipo.includes("pdf") || tipo.includes("text"))
    return <FileText size={13} strokeWidth={1.75} />;
  return <File size={13} strokeWidth={1.75} />;
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
          <Paperclip
            size={13}
            strokeWidth={1.75}
            style={{ color: "var(--tf-text-tertiary)" }}
          />
          <h3 className="label-mono" style={{ color: "var(--tf-text-secondary)" }}>
            Anexos
          </h3>
          {anexos.length > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 text-[0.625rem] font-medium"
              style={{
                background: "var(--tf-bg-secondary)",
                color: "var(--tf-text-tertiary)",
                border: "1px solid var(--tf-border)",
                borderRadius: "var(--tf-radius-xs)",
                fontFamily: "var(--tf-font-mono)",
              }}
            >
              {anexos.length}
            </span>
          )}
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 text-[0.6875rem] font-medium transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)] disabled:opacity-40"
          style={{
            color: "var(--tf-text-secondary)",
            border: "1px dashed var(--tf-border-strong)",
            borderRadius: "var(--tf-radius-xs)",
            fontFamily: "var(--tf-font-mono)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
          aria-label="Anexar arquivo"
        >
          <Upload size={11} strokeWidth={1.75} />
          {enviando ? "Enviando…" : "Anexar"}
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

      {/* Upload progress */}
      {enviando && (
        <div
          className="mb-2 p-2.5 flex items-center gap-2.5"
          style={{
            background: "var(--tf-bg-secondary)",
            border: "1px solid var(--tf-border)",
            borderRadius: "var(--tf-radius-sm)",
          }}
        >
          <div
            className="w-3 h-3 border-2 border-t-transparent rounded-full animate-spin shrink-0"
            style={{
              borderColor: "var(--tf-accent)",
              borderTopColor: "transparent",
            }}
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-[0.75rem] font-medium"
              style={{ color: "var(--tf-text)", letterSpacing: "-0.005em" }}
            >
              Enviando arquivo…
            </p>
            <div
              className="mt-1.5 h-[3px] overflow-hidden"
              style={{ background: "var(--tf-border)", borderRadius: "1px" }}
            >
              <div
                className="h-full animate-pulse"
                style={{ background: "var(--tf-accent)", width: "60%" }}
              />
            </div>
          </div>
        </div>
      )}

      {anexos.length > 0 ? (
        <div className="space-y-0.5">
          {anexos.map((anexo) => (
            <div
              key={anexo.id}
              className="flex items-center gap-2.5 p-2 group transition-colors hover:bg-[var(--tf-bg-secondary)]"
              style={{ borderRadius: "var(--tf-radius-sm)" }}
            >
              <div
                className="w-7 h-7 flex items-center justify-center shrink-0"
                style={{
                  background: "var(--tf-surface)",
                  color: "var(--tf-text-tertiary)",
                  border: "1px solid var(--tf-border)",
                  borderRadius: "var(--tf-radius-xs)",
                }}
              >
                {iconeArquivo(anexo.tipo)}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className="text-[0.75rem] font-medium truncate"
                  style={{ color: "var(--tf-text)", letterSpacing: "-0.005em" }}
                >
                  {anexo.nome}
                </p>
                <p
                  className="text-[0.625rem]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    fontFamily: "var(--tf-font-mono)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {formatarTamanho(anexo.tamanho)}
                  {" · "}
                  {new Date(anexo.criado_em).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </p>
              </div>
              <div
                className="flex gap-0.5 opacity-0 group-hover:opacity-100"
                style={{ transition: "opacity 0.15s ease" }}
              >
                <a
                  href={anexo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 transition-colors hover:bg-[var(--tf-surface-hover)] hover:text-[var(--tf-accent)]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    borderRadius: "var(--tf-radius-xs)",
                  }}
                  title="Download"
                >
                  <Download size={12} strokeWidth={1.75} />
                </a>
                <button
                  onClick={() => onExcluir(anexo.id)}
                  className="p-1.5 transition-colors hover:bg-[var(--tf-danger-bg)] hover:text-[var(--tf-danger)]"
                  style={{
                    color: "var(--tf-text-tertiary)",
                    borderRadius: "var(--tf-radius-xs)",
                  }}
                  title="Excluir"
                >
                  <Trash2 size={12} strokeWidth={1.75} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : !enviando ? (
        <div className="text-center py-5">
          <Paperclip
            size={16}
            strokeWidth={1.5}
            className="mx-auto mb-1.5"
            style={{ color: "var(--tf-border-strong)" }}
          />
          <p
            className="text-[0.6875rem]"
            style={{
              color: "var(--tf-text-tertiary)",
              fontFamily: "var(--tf-font-mono)",
              letterSpacing: "0.02em",
            }}
          >
            Nenhum anexo
          </p>
        </div>
      ) : null}
    </div>
  );
}
