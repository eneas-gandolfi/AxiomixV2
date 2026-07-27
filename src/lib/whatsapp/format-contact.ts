/**
 * Arquivo: src/lib/whatsapp/format-contact.ts
 * Propósito: Helpers puros de exibição de contato (telefone e inicial de
 *            avatar), compartilhados entre o detalhe da conversa e o painel
 *            de contato do drawer.
 * Autor: AXIOMIX
 * Data: 2026-07-27
 */

export function formatPhone(remoteJid: string) {
  const phone = remoteJid.replace(/@s\.whatsapp\.net|@c\.us/g, "");
  if (phone.startsWith("55") && phone.length >= 12) {
    const ddd = phone.substring(2, 4);
    const numero = phone.substring(4);
    if (numero.length === 9) {
      return `+55 ${ddd} 9 ${numero.substring(1, 5)}-${numero.substring(5)}`;
    }
    if (numero.length === 8) {
      return `+55 ${ddd} ${numero.substring(0, 4)}-${numero.substring(4)}`;
    }
  }
  return phone;
}

export function avatarInitial(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts[0][0].toUpperCase();
}
