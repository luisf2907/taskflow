-- Migration 002: Features expandidas (Etiquetas, Membros, Checklists, Comentários, Anexos, Peso, Data de Entrega)

-- =============================================
-- 1. ETIQUETAS CUSTOMIZÁVEIS POR QUADRO
-- =============================================
CREATE TABLE etiquetas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quadro_id UUID REFERENCES quadros(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT '#3B82F6',
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cartao_etiquetas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE NOT NULL,
  etiqueta_id UUID REFERENCES etiquetas(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(cartao_id, etiqueta_id)
);

-- =============================================
-- 2. MEMBROS POR QUADRO
-- =============================================
CREATE TABLE membros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quadro_id UUID REFERENCES quadros(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  email TEXT,
  cor_avatar TEXT NOT NULL DEFAULT '#3B82F6',
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cartao_membros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE NOT NULL,
  membro_id UUID REFERENCES membros(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(cartao_id, membro_id)
);

-- =============================================
-- 3. CHECKLISTS
-- =============================================
CREATE TABLE checklists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL DEFAULT 'Checklist',
  posicao INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE checklist_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID REFERENCES checklists(id) ON DELETE CASCADE NOT NULL,
  texto TEXT NOT NULL,
  concluido BOOLEAN DEFAULT false,
  posicao INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 4. COMENTÁRIOS / ATIVIDADE
-- =============================================
CREATE TABLE comentarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE NOT NULL,
  membro_id UUID REFERENCES membros(id) ON DELETE SET NULL,
  texto TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 5. ANEXOS
-- =============================================
CREATE TABLE anexos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cartao_id UUID REFERENCES cartoes(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  url TEXT NOT NULL,
  tipo TEXT,
  tamanho INTEGER,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- 6. NOVOS CAMPOS NA TABELA CARTÕES
-- =============================================
ALTER TABLE cartoes ADD COLUMN data_entrega TIMESTAMPTZ;
ALTER TABLE cartoes ADD COLUMN peso INTEGER;

-- =============================================
-- 7. ÍNDICES
-- =============================================
CREATE INDEX idx_etiquetas_quadro ON etiquetas(quadro_id);
CREATE INDEX idx_cartao_etiquetas_cartao ON cartao_etiquetas(cartao_id);
CREATE INDEX idx_cartao_etiquetas_etiqueta ON cartao_etiquetas(etiqueta_id);
CREATE INDEX idx_membros_quadro ON membros(quadro_id);
CREATE INDEX idx_cartao_membros_cartao ON cartao_membros(cartao_id);
CREATE INDEX idx_cartao_membros_membro ON cartao_membros(membro_id);
CREATE INDEX idx_checklists_cartao ON checklists(cartao_id);
CREATE INDEX idx_checklist_itens_checklist ON checklist_itens(checklist_id);
CREATE INDEX idx_comentarios_cartao ON comentarios(cartao_id);
CREATE INDEX idx_anexos_cartao ON anexos(cartao_id);
CREATE INDEX idx_cartoes_data_entrega ON cartoes(data_entrega) WHERE data_entrega IS NOT NULL;

-- =============================================
-- 8. RLS (permissivo por enquanto)
-- =============================================
ALTER TABLE etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartao_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartao_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total etiquetas" ON etiquetas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total cartao_etiquetas" ON cartao_etiquetas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total membros" ON membros FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total cartao_membros" ON cartao_membros FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total checklists" ON checklists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total checklist_itens" ON checklist_itens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total comentarios" ON comentarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total anexos" ON anexos FOR ALL USING (true) WITH CHECK (true);
