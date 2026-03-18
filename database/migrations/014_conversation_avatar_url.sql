-- Migration: 014_conversation_avatar_url
-- Propósito: Armazenar a URL da foto de perfil do contato (WhatsApp) vinda do Sofia CRM.

alter table public.conversations
add column if not exists contact_avatar_url text;
