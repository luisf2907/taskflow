import "@testing-library/jest-dom/vitest";

// Valores de fachada para o env.ts. Qualquer teste que importe algo da
// arvore do cliente Supabase (mesmo indiretamente — wiki-markdown chega la
// pelo card-embed) explode na validacao Zod antes do primeiro `it`.
// So preenche o que estiver vazio, para nao mascarar um valor real.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= "chave-de-teste";
