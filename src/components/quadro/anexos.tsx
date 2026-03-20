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
  if (!tipo) return <File size={16} />;
  if (tipo.startsWith("image/")) return <FileImage size={16} />;
  if (tipo.includes("pdf") || tipo.includes("text")) return <FileText size={16} />;
  return <File size={16} />;
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--trello-text)]">
          <Paperclip size={16} />
          Anexos
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--trello-hover)] text-[var(--trello-text)] rounded-[3px] hover:bg-[var(--trello-border)] disabled:opacity-50 transition-smooth"
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

      <div className="space-y-1.5">
        {anexos.map((anexo) => (
          <div
            key={anexo.id}
            className="flex items-center gap-2.5 p-2 rounded-[3px] group hover:bg-[var(--trello-hover)] transition-smooth"
            style={{ background: "var(--trello-surface)" }}
          >
            <div className="text-[var(--trello-text-subtle)] shrink-0">
              {iconeArquivo(anexo.tipo)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--trello-text)] truncate">
                {anexo.nome}
              </p>
              <p className="text-xs text-[var(--trello-text-subtle)]">
                {formatarTamanho(anexo.tamanho)}
                {" · "}
                {new Date(anexo.criado_em).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
              </p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <a
                href={anexo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded-[3px] text-[var(--trello-text-subtle)] hover:text-[#0C66E4] transition-smooth"
                title="Download"
              >
                <Download size={14} />
              </a>
              <button
                onClick={() => onExcluir(anexo.id)}
                className="p-1 rounded-[3px] text-[var(--trello-text-subtle)] hover:text-[#C9372C] transition-smooth"
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {anexos.length === 0 && !enviando && (
          <p className="text-xs text-[var(--trello-text-subtle)] italic text-center py-3">
            Nenhum anexo
          </p>
        )}
      </div>
    </div>
  );
}
