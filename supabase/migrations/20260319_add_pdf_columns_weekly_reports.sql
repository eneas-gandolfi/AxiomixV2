-- Adicionar colunas para armazenamento de PDF no relatório semanal
ALTER TABLE weekly_reports ADD COLUMN pdf_storage_path text;
ALTER TABLE weekly_reports ADD COLUMN pdf_public_url text;
