/**
 * Arquivo: src/lib/ant-table-defaults.ts
 * Propósito: Configuração compartilhada para tabelas Ant Design no AXIOMIX.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import type { TableProps } from "antd";

export const AXIOMIX_PAGE_SIZE = 20;

export function axiomixPagination(overrides?: {
  current?: number;
  total?: number;
  pageSize?: number;
  onChange?: (page: number, pageSize: number) => void;
}): TableProps["pagination"] {
  return {
    pageSize: overrides?.pageSize ?? AXIOMIX_PAGE_SIZE,
    current: overrides?.current,
    total: overrides?.total,
    onChange: overrides?.onChange,
    showTotal: (total, range) =>
      `${range[0]}–${range[1]} de ${total} itens`,
    showSizeChanger: false,
    ...overrides,
  };
}

export const axiomixTableProps: Pick<TableProps, "size" | "scroll" | "style"> = {
  size: "middle",
  scroll: { x: true },
  style: { borderRadius: 12, overflow: "hidden" },
};
