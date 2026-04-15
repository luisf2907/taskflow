"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Kanban } from "lucide-react";

interface MarkdownPreviewProps {
  conteudo: string;
}

/**
 * Renderiza Markdown com estilos do wiki usando react-markdown.
 * Reutiliza a configuração de componentes do repo-file-viewer.
 */
export function MarkdownPreview({ conteudo }: MarkdownPreviewProps) {
  // Pre-process: substituir card embeds por placeholders renderizáveis
  const processado = conteudo.replace(
    /<!--\s*card:([a-f0-9-]+)\s*-->/g,
    '\n[card-embed:$1]\n',
  );

  return (
    <div className="wiki-content px-8 py-6 leading-[1.65]" style={{ color: "var(--tf-text)" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
          h1: ({ children }) => (
            <h1
              className="text-[1.875em] font-bold mt-[1.2em] mb-[0.3em] leading-[1.3]"
              style={{ color: "var(--tf-text)" }}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className="text-[1.5em] font-semibold mt-[1.1em] mb-[0.2em] leading-[1.35]"
              style={{ color: "var(--tf-text)" }}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className="text-[1.2em] font-semibold mt-[1em] mb-[0.15em] leading-[1.4]"
              style={{ color: "var(--tf-text)" }}
            >
              {children}
            </h3>
          ),
          p: ({ children }) => {
            // Check for card embed placeholder
            const text = typeof children === "string" ? children : "";
            const cardMatch = text.match(/^\[card-embed:([a-f0-9-]+)\]$/);
            if (cardMatch) {
              return (
                <div
                  className="flex items-center gap-3 px-4 py-3 my-2 rounded-[var(--tf-radius-sm)] border"
                  style={{
                    background: "var(--tf-surface)",
                    borderColor: "var(--tf-border)",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-[var(--tf-radius-xs)] flex items-center justify-center shrink-0"
                    style={{ background: "var(--tf-accent-light)" }}
                  >
                    <Kanban size={16} style={{ color: "var(--tf-accent-text)" }} />
                  </div>
                  <span className="text-[13px] font-medium" style={{ color: "var(--tf-text-secondary)" }}>
                    Card embed: {cardMatch[1].substring(0, 8)}...
                  </span>
                </div>
              );
            }
            return (
              <p className="mt-[2px] mb-[2px]" style={{ color: "var(--tf-text)" }}>
                {children}
              </p>
            );
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: "var(--tf-accent)", textUnderlineOffset: "2px" }}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="pl-6 list-disc mt-[2px] mb-[2px]">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="pl-6 list-decimal mt-[2px] mb-[2px]">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="mt-[1px] mb-[1px]" style={{ color: "var(--tf-text)" }}>
              {children}
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote
              className="pl-4 my-1"
              style={{
                borderLeft: "3px solid var(--tf-accent)",
                color: "var(--tf-text-secondary)",
              }}
            >
              {children}
            </blockquote>
          ),
          code: ({ className, children }) => {
            const isInline = !className;
            if (isInline) {
              return (
                <code
                  className="px-[0.4em] py-[0.15em] rounded-[4px] text-[0.875em] font-mono"
                  style={{ background: "var(--tf-bg-secondary)", color: "var(--tf-accent-text)" }}
                >
                  {children}
                </code>
              );
            }
            return (
              <code className="block font-mono text-[0.85em] leading-[1.6]" style={{ color: "var(--tf-text)" }}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre
              className="rounded-[var(--tf-radius-xs)] px-5 py-4 my-[6px] overflow-auto font-mono text-[0.85em] leading-[1.6]"
              style={{
                background: "var(--tf-bg-secondary)",
                border: "1px solid var(--tf-border)",
              }}
            >
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-auto my-[6px]">
              <table
                className="w-full border-collapse overflow-hidden rounded-[var(--tf-radius-xs)]"
                style={{ border: "1px solid var(--tf-border)" }}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead style={{ background: "var(--tf-bg-secondary)" }}>{children}</thead>
          ),
          th: ({ children }) => (
            <th
              className="px-3 py-2 text-left font-semibold text-[0.9em]"
              style={{ border: "1px solid var(--tf-border)", color: "var(--tf-text)" }}
            >
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td
              className="px-3 py-2"
              style={{ border: "1px solid var(--tf-border)", color: "var(--tf-text)" }}
            >
              {children}
            </td>
          ),
          hr: () => (
            <hr className="my-5 border-none" style={{ borderTop: "1px solid var(--tf-border)" }} />
          ),
          img: ({ src, alt }) => (
            <img src={src} alt={alt || ""} className="max-w-full rounded-[var(--tf-radius-xs)] my-2" />
          ),
          input: ({ type, checked, ...props }) => {
            if (type === "checkbox") {
              return (
                <input
                  type="checkbox"
                  checked={checked}
                  readOnly
                  className="mr-2"
                  style={{ accentColor: "var(--tf-accent)" }}
                />
              );
            }
            return <input type={type} {...props} />;
          },
        }}
      >
        {processado}
      </ReactMarkdown>
    </div>
  );
}
