/**
 * Strip HTML wrapping from message content.
 *
 * Why: the Evo CRM webhook delivers outbound messages wrapped in rich-text
 * editor tags (`<p>…</p>`, `<br>`, etc.) because the agent UI uses TipTap.
 * Inbound messages from WhatsApp arrive plain. We strip the wrapper at
 * render time so both directions look identical.
 *
 * The matcher is intentionally narrow — only formatting tags we've seen
 * from Evo. Random user text like "<3" or "<= 5" stays intact.
 */
const FORMAT_TAGS_RE =
  /<\/?(p|div|span|br|strong|em|b|i|u|h[1-6]|ul|ol|li|blockquote)(\s[^>]*)?\/?>/gi;

const ENTITY_MAP: Record<string, string> = {
  "&nbsp;": " ",
  "&lt;": "<",
  "&gt;": ">",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

export function stripMessageHtml(text: string | null | undefined): string {
  if (!text) return "";
  let out = text.replace(FORMAT_TAGS_RE, "");
  for (const [entity, char] of Object.entries(ENTITY_MAP)) {
    out = out.split(entity).join(char);
  }
  return out.trim();
}
