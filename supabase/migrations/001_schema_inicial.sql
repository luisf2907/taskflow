-- Schema inicial do Trello Clone
-- Execute este SQL no SQL Editor do Supabase

-- Quadros (boards)
CREATE TABLE quadros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#3B82F6',
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Colunas (lists)
CREATE TABLE colunas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quadro_id UUID REFERENCES quadros(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  posicao INTEGER NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

-- Cartões (cards)
CREATE TABLE cartoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  coluna_id UUID REFERENCES colunas(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  posicao INTEGER NOT NULL DEFAULT 0,
  etiquetas TEXT[] DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_colunas_quadro ON colunas(quadro_id);
CREATE INDEX idx_cartoes_coluna ON cartoes(coluna_id);
CREATE INDEX idx_colunas_posicao ON colunas(quadro_id, posicao);
CREATE INDEX idx_cartoes_posicao ON cartoes(coluna_id, posicao);

-- RLS (Row Level Security) - desabilitado por enquanto pra simplificar
-- Quando adicionar auth, habilitar RLS e criar policies
ALTER TABLE quadros ENABLE ROW LEVEL SECURITY;
ALTER TABLE colunas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cartoes ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (acesso total por enquanto)
CREATE POLICY "Acesso total quadros" ON quadros FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total colunas" ON colunas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total cartoes" ON cartoes FOR ALL USING (true) WITH CHECK (true);
