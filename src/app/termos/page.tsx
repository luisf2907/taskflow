import { LegalLayout, Section } from "@/components/landing/legal-layout";

export const metadata = {
  title: "Termos de Uso | Taskflow",
  description: "Termos de Uso da plataforma Taskflow.",
};

export default function TermosPage() {
  return (
    <LegalLayout titulo="Termos de Uso" atualizado="06 de abril de 2026">
      <Section titulo="1. Aceitacao dos Termos">
        <p>
          Ao acessar ou utilizar o Taskflow (&quot;Plataforma&quot;), voce concorda com estes
          Termos de Uso. Se voce nao concordar com alguma disposicao, nao utilize a Plataforma.
          A utilizacao continuada apos alteracoes constitui aceitacao dos termos revisados.
        </p>
      </Section>

      <Section titulo="2. Descricao do Servico">
        <p>
          O Taskflow e uma plataforma de gestao de projetos que oferece:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Quadros Kanban com arrastar e soltar para organizacao visual de tarefas</li>
          <li>Gestao de sprints com metas, datas e acompanhamento de progresso</li>
          <li>Integracao com GitHub para branches, pull requests e webhooks</li>
          <li>Planning Poker integrado para estimativa de tarefas em equipe</li>
          <li>Geracao e aprimoramento de cards por inteligencia artificial (Google Gemini)</li>
          <li>Automacoes configuráveis baseadas em eventos</li>
          <li>Dashboard com metricas e atividades em tempo real</li>
          <li>Workspaces para organizacao de equipes e projetos</li>
        </ul>
      </Section>

      <Section titulo="3. Cadastro e Conta">
        <p>
          Para utilizar o Taskflow, e necessario criar uma conta informando nome, email e senha,
          ou autenticar-se via GitHub OAuth. Voce e responsavel por manter a confidencialidade
          de suas credenciais e por todas as atividades realizadas em sua conta.
        </p>
        <p>
          Voce se compromete a fornecer informacoes verdadeiras, completas e atualizadas.
          O Taskflow reserva-se o direito de suspender ou encerrar contas que violem estes termos.
        </p>
      </Section>

      <Section titulo="4. Uso Aceitavel">
        <p>Voce concorda em nao:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Utilizar a Plataforma para fins ilegais ou nao autorizados</li>
          <li>Tentar acessar dados de outros usuarios ou workspaces sem autorizacao</li>
          <li>Realizar engenharia reversa, descompilar ou desmontar a Plataforma</li>
          <li>Transmitir virus, malware ou qualquer codigo malicioso</li>
          <li>Sobrecarregar intencionalmente a infraestrutura da Plataforma</li>
          <li>Violar direitos de propriedade intelectual de terceiros</li>
          <li>Utilizar a Plataforma para enviar spam ou comunicacoes nao solicitadas</li>
        </ul>
      </Section>

      <Section titulo="5. Integracao com GitHub">
        <p>
          O Taskflow permite conectar sua conta GitHub via OAuth 2.0 ou Personal Access Token (PAT).
          Ao conectar, voce autoriza o Taskflow a acessar repositorios, branches, pull requests e
          webhooks conforme as permissoes concedidas. O Taskflow armazena tokens de acesso de forma
          segura e os utiliza exclusivamente para as funcionalidades da Plataforma.
        </p>
        <p>
          Voce pode revogar o acesso a qualquer momento desconectando sua conta GitHub nas
          configuracoes ou revogando o token diretamente no GitHub.
        </p>
      </Section>

      <Section titulo="6. Uso de Inteligencia Artificial">
        <p>
          O Taskflow utiliza a API do Google Gemini para gerar e aprimorar descricoes de cards.
          Ao utilizar estas funcionalidades, o texto dos seus cards e enviado aos servidores
          do Google para processamento. O Taskflow nao utiliza seus dados para treinar modelos
          de IA. Consulte a politica de privacidade do Google para mais detalhes sobre o
          tratamento de dados pela API Gemini.
        </p>
      </Section>

      <Section titulo="7. Propriedade Intelectual">
        <p>
          O Taskflow e seus componentes (design, codigo, marca) sao propriedade de seus
          desenvolvedores. Voce mantem todos os direitos sobre o conteudo que criar na
          Plataforma (cards, descricoes, checklists, comentarios, etc.). Ao utilizar a
          Plataforma, voce nos concede uma licenca limitada para armazenar e exibir seu
          conteudo conforme necessario para a prestacao do servico.
        </p>
      </Section>

      <Section titulo="8. Limitacao de Responsabilidade">
        <p>
          O Taskflow e fornecido &quot;como esta&quot; e &quot;conforme disponivel&quot;.
          Nao garantimos que o servico sera ininterrupto, seguro ou livre de erros.
          Em nenhuma circunstancia seremos responsaveis por danos indiretos, incidentais,
          especiais ou consequenciais decorrentes do uso ou incapacidade de uso da Plataforma.
        </p>
      </Section>

      <Section titulo="9. Disponibilidade (Beta)">
        <p>
          O Taskflow encontra-se atualmente em fase beta. Durante este periodo, funcionalidades
          podem ser adicionadas, modificadas ou removidas sem aviso previo. Nao ha garantia
          de nivel de servico (SLA) durante a fase beta. Recomendamos manter backups regulares
          dos seus dados.
        </p>
      </Section>

      <Section titulo="10. Modificacoes nos Termos">
        <p>
          Reservamo-nos o direito de modificar estes Termos a qualquer momento. Alteracoes
          significativas serao comunicadas por email ou notificacao na Plataforma com pelo
          menos 15 dias de antecedencia. A continuidade do uso apos o periodo de aviso
          constitui aceitacao dos novos termos.
        </p>
      </Section>

      <Section titulo="11. Legislacao Aplicavel">
        <p>
          Estes Termos sao regidos pelas leis da Republica Federativa do Brasil, incluindo
          a Lei Geral de Protecao de Dados (Lei n. 13.709/2018 - LGPD), o Marco Civil da
          Internet (Lei n. 12.965/2014) e o Codigo de Defesa do Consumidor (Lei n. 8.078/1990),
          quando aplicavel. Quaisquer disputas serao submetidas ao foro da comarca do domicilio
          do usuario.
        </p>
      </Section>

      <Section titulo="12. Contato">
        <p>
          Para duvidas sobre estes Termos de Uso, entre em contato pelo email:{" "}
          <a href="mailto:contato@taskflow.app" style={{ color: "var(--tf-accent)" }}>
            contato@taskflow.app
          </a>
        </p>
      </Section>
    </LegalLayout>
  );
}
