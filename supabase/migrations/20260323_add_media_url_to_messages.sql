-- Migration: 20260323_add_media_url_to_messages
-- Adiciona coluna media_url na tabela messages para suportar análise de mídia (imagem, áudio, documento)

alter table public.messages
  add column if not exists media_url text;

comment on column public.messages.media_url is 'URL da mídia (imagem, áudio, documento) para processamento pela IA';
