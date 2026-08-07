import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";

// ═══════════════════════════════════════════════════════════════════════
// Semantica do gatilho do Dropdown
// ═══════════════════════════════════════════════════════════════════════
// O gatilho ja foi uma <div role="button" tabIndex={0}> envolvendo o
// <button> que o caller passava. Davam DOIS pontos de parada no Tab para
// um controle so, e nenhum dos dois tinha nome — o leitor de tela dizia
// "botao" duas vezes e nada mais. O Lighthouse pegou isso em tres
// auditorias diferentes; o ESLint nao pegou em nenhuma, porque o JSX
// estatico estava correto e o problema so existia no resultado montado.
// ═══════════════════════════════════════════════════════════════════════

// motion/react anima com rAF e deixa o menu fora do DOM no primeiro tick;
// aqui so interessa a estrutura, entao os elementos viram divs simples.
vi.mock("motion/react", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: new Proxy(
    {},
    {
      get:
        () =>
        ({
          children,
          ...props
        }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => {
          const { initial, animate, exit, variants, ...resto } = props as Record<string, unknown>;
          void initial;
          void animate;
          void exit;
          void variants;
          return <div {...resto}>{children}</div>;
        },
    },
  ),
}));

function montar(props?: Partial<React.ComponentProps<typeof Dropdown>>) {
  return render(
    <Dropdown rotulo="Opções da coluna Backlog" gatilho={<span aria-hidden="true">···</span>} {...props}>
      <DropdownItem onClick={() => {}}>Renomear</DropdownItem>
      <DropdownItem onClick={() => {}}>Excluir</DropdownItem>
    </Dropdown>,
  );
}

describe("Dropdown — gatilho", () => {
  it("é um <button> de verdade, com o nome vindo do rotulo", () => {
    montar();
    const gatilho = screen.getByRole("button", { name: "Opções da coluna Backlog" });
    expect(gatilho.tagName).toBe("BUTTON");
    expect(gatilho).toHaveAttribute("type", "button");
  });

  it("expõe aria-haspopup e aria-expanded", () => {
    montar();
    const gatilho = screen.getByRole("button", { name: "Opções da coluna Backlog" });
    expect(gatilho).toHaveAttribute("aria-haspopup", "menu");
    expect(gatilho).toHaveAttribute("aria-expanded", "false");
  });

  it("deixa UM só ponto de parada no Tab", () => {
    const { container } = montar();
    // A <div> antiga entrava na tabulacao junto com o botao do caller.
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(0);
    expect(container.querySelectorAll('[role="button"]')).toHaveLength(0);
  });

  it("não aninha botão dentro de botão", () => {
    const { container } = montar();
    expect(container.querySelector("button button")).toBeNull();
  });

  it("aplica as props do caller no próprio botão", () => {
    montar({ propsGatilho: { className: "p-1.5", style: { color: "rgb(1, 2, 3)" } } });
    const gatilho = screen.getByRole("button", { name: "Opções da coluna Backlog" });
    expect(gatilho).toHaveClass("p-1.5");
    // A classe de reset tem que continuar la, senao o botao volta a herdar
    // o estilo do navegador.
    expect(gatilho).toHaveClass("tf-botao-nu");
    expect(gatilho.style.color).toBe("rgb(1, 2, 3)");
  });
});

describe("Dropdown — menu", () => {
  it("abre no clique e marca aria-expanded", () => {
    montar();
    const gatilho = screen.getByRole("button", { name: "Opções da coluna Backlog" });

    // detail: 1 = clique de mouse de verdade.
    fireEvent.click(gatilho, { detail: 1 });

    expect(gatilho).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getAllByRole("menuitem")).toHaveLength(2);
  });

  it("devolve o foco ao gatilho no Esc", () => {
    montar();
    const gatilho = screen.getByRole("button", { name: "Opções da coluna Backlog" });

    // detail: 0 e o clique que o navegador sintetiza quando se aperta Enter
    // ou Espaco num <button> — e assim que o gatilho distingue teclado de
    // mouse para decidir se leva o foco ao primeiro item.
    fireEvent.click(gatilho, { detail: 0 });
    expect(gatilho).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });

    expect(gatilho).toHaveAttribute("aria-expanded", "false");
    // Sem isto o foco cai no <body> e quem usa teclado perde o lugar.
    expect(gatilho).toHaveFocus();
  });

  it("a seta pra baixo abre o menu com o gatilho focado", () => {
    montar();
    const gatilho = screen.getByRole("button", { name: "Opções da coluna Backlog" });

    gatilho.focus();
    fireEvent.keyDown(gatilho, { key: "ArrowDown" });

    expect(gatilho).toHaveAttribute("aria-expanded", "true");
  });
});
