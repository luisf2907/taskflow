import { LegalLayout, Section } from "@/components/landing/legal-layout";

export const metadata = {
  title: "Politica de Privacidade | Taskflow",
  description: "Politica de Privacidade da plataforma Taskflow. LGPD compliant.",
};

export default function PrivacidadePage() {
  return (
    <LegalLayout titulo="Politica de Privacidade" atualizado="06 de abril de 2026">
      <Section titulo="1. Introducao">
        <p>
          Esta Politica de Privacidade descreve como o Taskflow (&quot;nos&quot;, &quot;nosso&quot;)
          coleta, utiliza, armazena e protege seus dados pessoais em conformidade com a Lei Geral
          de Protecao de Dados (Lei n. 13.709/2018 - LGPD). Ao utilizar a Plataforma, voce
          consente com as praticas descritas neste documento.
        </p>
      </Section>

      <Section titulo="2. Dados Coletados">
        <p>Coletamos os seguintes tipos de dados:</p>

        <p className="font-semibold mt-2" style={{ color: "var(--tf-text)" }}>Dados de cadastro</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Nome, email e senha (criptografada)</li>
          <li>Foto de perfil (quando conectado via GitHub)</li>
          <li>Username do GitHub (quando conectado)</li>
        </ul>

        <p className="font-semibold mt-2" style={{ color: "var(--tf-text)" }}>Dados do GitHub</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Token OAuth e/ou Personal Access Token (armazenados de forma segura)</li>
          <li>Repositorios, branches e pull requests acessados pela integracao</li>
        </ul>

        <p className="font-semibold mt-2" style={{ color: "var(--tf-text)" }}>Dados de projeto</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Workspaces, quadros/sprints, colunas e cards</li>
          <li>Checklists, comentarios, etiquetas e anexos</li>
          <li>Configuracoes de automacoes</li>
        </ul>

        <p className="font-semibold mt-2" style={{ color: "var(--tf-text)" }}>Dados de uso</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Logs de atividade (acoes realizadas na Plataforma)</li>
          <li>Dados de erro e performance (coletados pelo Sentry)</li>
          <li>Endereco IP e informacoes do navegador (para rate limiting e seguranca)</li>
        </ul>

        <p className="font-semibold mt-2" style={{ color: "var(--tf-text)" }}>Dados processados por IA</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Texto de cards enviado ao Google Gemini para geracao e aprimoramento</li>
        </ul>
      </Section>

      <Section titulo="3. Como Usamos os Dados">
        <p>Utilizamos seus dados para:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Prover e manter as funcionalidades da Plataforma</li>
          <li>Autenticar seu acesso e gerenciar sua conta</li>
          <li>Integrar com GitHub conforme suas autorizacoes</li>
          <li>Gerar sugestoes e melhorias via inteligencia artificial</li>
          <li>Enviar notificacoes por email (conforme suas preferencias)</li>
          <li>Monitorar erros e melhorar a performance da Plataforma</li>
          <li>Prevenir fraudes e usos abusivos</li>
        </ul>
        <p>
          <strong>Base legal (LGPD):</strong> Tratamos seus dados com base no consentimento
          (art. 7, I), execucao de contrato (art. 7, V) e interesse legitimo (art. 7, IX),
          conforme aplicavel a cada finalidade.
        </p>
      </Section>

      <Section titulo="4. Armazenamento">
        <p>
          Seus dados sao armazenados no Supabase, uma plataforma de banco de dados hospedada
          na Amazon Web Services (AWS). Os servidores utilizados estao localizados nos Estados
          Unidos. A transferencia internacional de dados e realizada com base em clausulas
          contratuais padrao e garantias adequadas conforme a LGPD.
        </p>
      </Section>

      <Section titulo="5. Compartilhamento com Terceiros">
        <p>Seus dados podem ser compartilhados com os seguintes servicos de terceiros:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Supabase</strong> — Banco de dados, autenticacao e armazenamento</li>
          <li><strong>GitHub</strong> — Integracao de repositorios, branches e pull requests</li>
          <li><strong>Google (Gemini API)</strong> — Processamento de texto para IA de cards</li>
          <li><strong>Sentry</strong> — Monitoramento de erros e performance</li>
          <li><strong>Resend</strong> — Envio de emails transacionais</li>
          <li><strong>Vercel</strong> — Hospedagem e deploy da aplicacao</li>
        </ul>
        <p>
          Nao vendemos, alugamos ou compartilhamos seus dados pessoais com terceiros para
          fins de marketing. O compartilhamento e limitado ao necessario para a operacao
          da Plataforma.
        </p>
      </Section>

      <Section titulo="6. Seus Direitos (LGPD)">
        <p>Conforme a LGPD, voce tem direito a:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>Acesso:</strong> Solicitar copia dos seus dados pessoais</li>
          <li><strong>Correcao:</strong> Solicitar a correcao de dados incompletos ou imprecisos</li>
          <li><strong>Exclusao:</strong> Solicitar a exclusao dos seus dados pessoais</li>
          <li><strong>Portabilidade:</strong> Solicitar a transferencia dos seus dados a outro fornecedor</li>
          <li><strong>Revogacao:</strong> Revogar o consentimento a qualquer momento</li>
          <li><strong>Informacao:</strong> Ser informado sobre o compartilhamento de dados com terceiros</li>
          <li><strong>Oposicao:</strong> Opor-se ao tratamento baseado em interesse legitimo</li>
        </ul>
        <p>
          Para exercer seus direitos, entre em contato pelo email{" "}
          <a href="mailto:privacidade@taskflow.app" style={{ color: "var(--tf-accent)" }}>
            privacidade@taskflow.app
          </a>
          . Responderemos em ate 15 dias uteis.
        </p>
      </Section>

      <Section titulo="7. Cookies e Tecnologias">
        <p>O Taskflow utiliza:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li><strong>localStorage:</strong> Preferencia de tema (claro/escuro) e estado da sidebar</li>
          <li><strong>Cookies de autenticacao:</strong> Tokens de sessao gerenciados pelo Supabase Auth</li>
        </ul>
        <p>
          Nao utilizamos cookies de rastreamento, analytics de terceiros ou tecnologias de
          fingerprinting. Nao exibimos anuncios.
        </p>
      </Section>

      <Section titulo="8. Seguranca">
        <p>Adotamos as seguintes medidas para proteger seus dados:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Row Level Security (RLS) no banco de dados — isolamento por workspace</li>
          <li>Criptografia de senhas via Supabase Auth (bcrypt)</li>
          <li>Tokens GitHub armazenados de forma segura no banco de dados</li>
          <li>HTTPS em todas as comunicacoes</li>
          <li>Rate limiting em endpoints criticos</li>
          <li>Validacao e sanitizacao de todas as entradas de usuario</li>
          <li>Content Security Policy (CSP) e headers de seguranca</li>
        </ul>
      </Section>

      <Section titulo="9. Retencao de Dados">
        <p>
          Seus dados sao mantidos enquanto sua conta estiver ativa. Ao solicitar a exclusao
          da conta, seus dados pessoais serao removidos em ate 30 dias. Dados anonimizados
          para fins estatisticos podem ser retidos por tempo indeterminado. Logs de erro
          (Sentry) sao retidos por 90 dias.
        </p>
      </Section>

      <Section titulo="10. Menores de Idade">
        <p>
          O Taskflow nao e destinado a menores de 16 anos. Nao coletamos intencionalmente
          dados de menores. Se tomarmos conhecimento de que dados de um menor foram coletados,
          tomaremos medidas para exclui-los.
        </p>
      </Section>

      <Section titulo="11. Alteracoes nesta Politica">
        <p>
          Esta Politica pode ser atualizada periodicamente. Alteracoes significativas serao
          comunicadas por email ou notificacao na Plataforma com pelo menos 15 dias de
          antecedencia. A data de atualizacao no topo deste documento indica a versao vigente.
        </p>
      </Section>

      <Section titulo="12. Encarregado de Dados (DPO)">
        <p>
          Para questoes relacionadas a protecao de dados pessoais, entre em contato com
          nosso Encarregado de Dados:{" "}
          <a href="mailto:privacidade@taskflow.app" style={{ color: "var(--tf-accent)" }}>
            privacidade@taskflow.app
          </a>
        </p>
      </Section>
    </LegalLayout>
  );
}
