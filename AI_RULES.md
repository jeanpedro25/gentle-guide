# AI Rules & Tech Stack - Profeta Bet

Este documento define a stack tecnológica e as regras de desenvolvimento para o projeto Profeta Bet.

## 🚀 Tech Stack

- **React (Vite)**: Framework principal para construção da interface single-page (SPA).
- **TypeScript**: Linguagem obrigatória para garantir segurança de tipos e manutenibilidade.
- **Tailwind CSS**: Framework de estilização utilitário para todo o design visual.
- **shadcn/ui**: Biblioteca de componentes baseada em Radix UI para elementos de interface consistentes.
- **Supabase**: Backend-as-a-Service (BaaS) utilizado para Autenticação, Banco de Dados (PostgreSQL) e Edge Functions.
- **TanStack Query (React Query)**: Gerenciamento de estado do servidor, cache e sincronização de dados.
- **React Router DOM**: Gerenciamento de rotas e navegação interna.
- **Framer Motion**: Biblioteca principal para animações e transições fluidas.
- **Lucide React**: Conjunto padrão de ícones para toda a aplicação.
- **Zod + React Hook Form**: Padrão para validação de esquemas e manipulação de formulários.

## 📏 Regras de Uso de Bibliotecas

### 1. Componentes de UI
- **Sempre** utilize os componentes do **shadcn/ui** localizados em `src/components/ui/`.
- Não crie componentes base (botões, inputs, cards) do zero se houver uma versão no shadcn.
- Para novos componentes de negócio, siga o padrão de separação em `src/components/oracle/` ou `src/components/jogueAgora/`.

### 2. Estilização
- Utilize exclusivamente **Tailwind CSS**. Evite arquivos `.css` externos ou CSS-in-JS.
- Siga as variáveis de cores definidas em `src/index.css` (ex: `primary`, `oracle-win`, `oracle-loss`).

### 3. Gerenciamento de Dados
- **TanStack Query** deve ser usado para todas as chamadas de API e interações com o banco de dados.
- Utilize os hooks customizados em `src/hooks/` (ex: `usePredictions`, `useBets`) em vez de chamadas diretas do Supabase nos componentes sempre que possível.

### 4. Backend e Integrações
- Todas as operações de banco de dados e autenticação devem passar pelo cliente do Supabase em `@/integrations/supabase/client`.
- Lógicas complexas ou que exigem chaves de API privadas devem ser executadas via **Supabase Edge Functions**.

### 5. Ícones e Animações
- Use **Lucide React** para todos os ícones.
- Use **Framer Motion** para animações de entrada/saída e estados complexos.
- Use as classes do `tailwindcss-animate` para transições simples de hover ou foco.

### 6. Formulários
- Utilize **React Hook Form** em conjunto com **Zod** para validação de inputs, garantindo que os erros sejam exibidos de forma amigável ao usuário.

### 7. Notificações
- Utilize o componente `toast` (Sonner) para feedbacks de sucesso, erro ou avisos do sistema.