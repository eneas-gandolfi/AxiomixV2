/**
 * Setup global do Vitest — carregado via setupFiles em vitest.config.ts.
 * Importa matchers do @testing-library/jest-dom (toBeInTheDocument, toHaveTextContent, etc).
 * Só efetivo em testes que rodam com `@vitest-environment jsdom` no topo do arquivo.
 */

import "@testing-library/jest-dom/vitest";
