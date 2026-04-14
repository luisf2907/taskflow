import { StarterKit } from "@tiptap/starter-kit";
import { Image as ImageExt } from "@tiptap/extension-image";
import { TextAlign } from "@tiptap/extension-text-align";
import { Highlight } from "@tiptap/extension-highlight";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { common, createLowlight } from "lowlight";
import { CardEmbed } from "./card-embed";

const lowlight = createLowlight(common);

/**
 * Extensoes de schema da wiki (sem extensoes de UI como Placeholder, FileHandler, SlashCommand).
 * Usadas tanto pelo editor TipTap quanto pela camada de conversao Markdown.
 */
export function getWikiSchemaExtensions() {
  return [
    StarterKit.configure({
      codeBlock: false,
      link: { openOnClick: false, HTMLAttributes: { class: "wiki-link" } },
      dropcursor: { color: "var(--tf-accent)", width: 2 },
    }),
    ImageExt.configure({ inline: false, allowBase64: false }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Highlight.configure({ multicolor: false }),
    TaskList,
    TaskItem.configure({ nested: true }),
    CodeBlockLowlight.configure({ lowlight }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    CardEmbed,
  ];
}
