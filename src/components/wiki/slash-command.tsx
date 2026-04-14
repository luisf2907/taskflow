"use client";

import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import { Suggestion, type SuggestionOptions, type SuggestionProps } from "@tiptap/suggestion";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
  useRef,
} from "react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code2,
  Quote,
  Image,
  Table,
  Minus,
  LayoutGrid,
} from "lucide-react";

// ==========================================
// Definição dos itens do slash command
// ==========================================
export interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (props: { editor: SuggestionProps["editor"]; range: SuggestionProps["range"] }) => void;
}

function getSlashItems(): SlashCommandItem[] {
  return [
    {
      title: "Heading 1",
      description: "Título grande",
      icon: <Heading1 size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run();
      },
    },
    {
      title: "Heading 2",
      description: "Título médio",
      icon: <Heading2 size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run();
      },
    },
    {
      title: "Heading 3",
      description: "Título pequeno",
      icon: <Heading3 size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run();
      },
    },
    {
      title: "Lista",
      description: "Lista com marcadores",
      icon: <List size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBulletList().run();
      },
    },
    {
      title: "Lista numerada",
      description: "Lista ordenada",
      icon: <ListOrdered size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleOrderedList().run();
      },
    },
    {
      title: "Checklist",
      description: "Lista de tarefas",
      icon: <CheckSquare size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleTaskList().run();
      },
    },
    {
      title: "Código",
      description: "Bloco de código",
      icon: <Code2 size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
      },
    },
    {
      title: "Citação",
      description: "Bloco de citação",
      icon: <Quote size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).toggleBlockquote().run();
      },
    },
    {
      title: "Imagem",
      description: "Inserir imagem",
      icon: <Image size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/jpeg,image/png,image/gif,image/webp";
        input.onchange = () => {
          const file = input.files?.[0];
          if (file) {
            window.dispatchEvent(
              new CustomEvent("wiki-image-upload", { detail: { file } }),
            );
          }
          input.remove();
        };
        input.click();
      },
    },
    {
      title: "Tabela",
      description: "Inserir tabela 3x3",
      icon: <Table size={18} />,
      command: ({ editor, range }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run();
      },
    },
    {
      title: "Divisor",
      description: "Linha horizontal",
      icon: <Minus size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).setHorizontalRule().run();
      },
    },
    {
      title: "Card embed",
      description: "Incorporar um card do workspace",
      icon: <LayoutGrid size={18} />,
      command: ({ editor, range }) => {
        editor.chain().focus().deleteRange(range).run();
        // Dispatch event para abrir picker de cards
        window.dispatchEvent(new CustomEvent("wiki-card-embed"));
      },
    },
  ];
}

// ==========================================
// Componente de lista do slash command
// ==========================================
interface CommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

interface CommandListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const CommandList = forwardRef<CommandListRef, CommandListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    // Scroll item selecionado para view
    useEffect(() => {
      const el = containerRef.current?.children[selectedIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (item) command(item);
      },
      [items, command],
    );

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + items.length - 1) % items.length);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    if (items.length === 0) {
      return (
        <div
          className="rounded-[12px] p-3 text-[13px]"
          style={{
            background: "var(--tf-surface)",
            border: "1px solid var(--tf-border)",
            color: "var(--tf-text-tertiary)",
            boxShadow: "var(--tf-shadow-lg)",
          }}
        >
          Nenhum resultado
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        role="listbox"
        aria-label="Comandos"
        className="rounded-[12px] overflow-hidden overflow-y-auto max-h-[320px] min-w-[240px]"
        style={{
          background: "var(--tf-surface)",
          border: "1px solid var(--tf-border)",
          boxShadow: "var(--tf-shadow-lg)",
        }}
      >
        {items.map((item, index) => (
          <button
            key={item.title}
            role="option"
            aria-selected={index === selectedIndex}
            onClick={() => selectItem(index)}
            className="flex items-center gap-3 w-full px-3 py-2 text-left transition-colors"
            style={{
              background:
                index === selectedIndex
                  ? "var(--tf-accent-light)"
                  : "transparent",
              color:
                index === selectedIndex
                  ? "var(--tf-accent-text)"
                  : "var(--tf-text)",
            }}
          >
            <span
              className="flex items-center justify-center w-8 h-8 rounded-[8px] shrink-0"
              style={{
                background: "var(--tf-bg-secondary)",
                color: "var(--tf-text-secondary)",
              }}
            >
              {item.icon}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[13px] font-medium truncate">
                {item.title}
              </span>
              <span
                className="text-[11px] truncate"
                style={{ color: "var(--tf-text-tertiary)" }}
              >
                {item.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    );
  },
);
CommandList.displayName = "CommandList";

// ==========================================
// Extensão TipTap Slash Commands
// ==========================================
const renderSuggestion = () => {
  let component: ReactRenderer | null = null;
  let popup: TippyInstance | null = null;

  return {
    onStart: (props: SuggestionProps) => {
      component = new ReactRenderer(CommandList, {
        props: { items: props.items, command: props.command },
        editor: props.editor,
      });

      const instances = tippy("body", {
        getReferenceClientRect: props.clientRect as () => DOMRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      });
      popup = instances[0];
    },

    onUpdate: (props: SuggestionProps) => {
      component?.updateProps({
        items: props.items,
        command: props.command,
      });

      if (props.clientRect && popup) {
        popup.setProps({
          getReferenceClientRect: props.clientRect as () => DOMRect,
        });
      }
    },

    onKeyDown: (props: { event: KeyboardEvent }) => {
      if (props.event.key === "Escape") {
        popup?.hide();
        return true;
      }
      return (component?.ref as CommandListRef)?.onKeyDown(props) || false;
    },

    onExit: () => {
      popup?.destroy();
      component?.destroy();
      popup = null;
      component = null;
    },
  };
};

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        command: ({
          editor,
          range,
          props,
        }: {
          editor: SuggestionProps["editor"];
          range: SuggestionProps["range"];
          props: SlashCommandItem;
        }) => {
          props.command({ editor, range });
        },
        items: ({ query }: { query: string }) => {
          return getSlashItems().filter((item) =>
            item.title.toLowerCase().includes(query.toLowerCase()),
          );
        },
        render: renderSuggestion,
      } satisfies Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
