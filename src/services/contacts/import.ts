/**
 * Arquivo: src/services/contacts/import.ts
 * Propósito: Parsear CSV e importar contatos no Evo CRM.
 * Autor: AXIOMIX
 * Data: 2026-03-28
 */

import "server-only";

import Papa from "papaparse";
import { getEvoCrmClient } from "@/services/evo-crm/client";

export type ParsedContact = {
  name: string;
  phone: string;
  email?: string;
};

export type ImportResult = {
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
};

const KNOWN_NAME_HEADERS = ["nome", "name", "contato", "contact"];
const KNOWN_PHONE_HEADERS = ["telefone", "phone", "celular", "whatsapp", "fone", "tel"];
const KNOWN_EMAIL_HEADERS = ["email", "e-mail", "e_mail"];

function normalizeHeader(h: string): string {
  return h.toLowerCase().trim().replace(/[^a-z0-9_]/g, "");
}

function findColumn(headers: string[], candidates: string[]): string | null {
  for (const candidate of candidates) {
    const found = headers.find((h) => normalizeHeader(h) === candidate);
    if (found) return found;
  }
  return null;
}

/**
 * Parsear CSV de contatos. Suporta delimitadores , e ;
 * Retorna lista de contatos com name + phone + email.
 */
export function parseContactsCsv(text: string): {
  contacts: ParsedContact[];
  headers: string[];
  totalRows: number;
} {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const headers = result.meta.fields ?? [];
  const nameCol = findColumn(headers, KNOWN_NAME_HEADERS);
  const phoneCol = findColumn(headers, KNOWN_PHONE_HEADERS);
  const emailCol = findColumn(headers, KNOWN_EMAIL_HEADERS);

  if (!phoneCol) {
    throw new Error(
      `Coluna de telefone não encontrada. Headers disponíveis: ${headers.join(", ")}. ` +
      `Use uma dessas: ${KNOWN_PHONE_HEADERS.join(", ")}`
    );
  }

  const contacts: ParsedContact[] = [];

  for (const row of result.data) {
    const phone = (row[phoneCol] ?? "").trim();
    if (!phone) continue;

    contacts.push({
      name: nameCol ? (row[nameCol] ?? "").trim() : "",
      phone,
      email: emailCol ? (row[emailCol] ?? "").trim() : undefined,
    });
  }

  return { contacts, headers, totalRows: result.data.length };
}

/**
 * Importar contatos no Evo CRM.
 * Deduplicacao via findContactByPhone.
 * Rate limit: batch de 10 com 300ms delay.
 */
export async function importContacts(
  companyId: string,
  contacts: ParsedContact[],
  options?: { labelName?: string }
): Promise<ImportResult> {
  const evoClient = await getEvoCrmClient(companyId);
  const result: ImportResult = { created: 0, skipped: 0, failed: 0, errors: [] };

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];

    try {
      // Verificar se ja existe
      const existing = await evoClient.findContactByPhone(contact.phone);

      if (existing) {
        result.skipped++;
        continue;
      }

      // Criar contato
      const created = await evoClient.createContact({
        name: contact.name || contact.phone,
        phone: contact.phone,
      });

      // Opcionalmente adicionar label
      if (options?.labelName && created.id) {
        try {
          await evoClient.addContactLabel({
            contactId: created.id,
            label: options.labelName,
          });
        } catch {
          // Nao falhar se label nao funcionar
        }
      }

      result.created++;
    } catch (error) {
      result.failed++;
      const msg = error instanceof Error ? error.message : "Erro desconhecido";
      result.errors.push(`${contact.phone}: ${msg}`);
    }

    // Rate limit: 300ms a cada 10 contatos
    if ((i + 1) % 10 === 0 && i < contacts.length - 1) {
      await new Promise((r) => setTimeout(r, 300));
    }
  }

  return result;
}
