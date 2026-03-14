/**
 * Arquivo: src/lib/integrations/crypto.ts
 * Proposito: Criptografar e descriptografar credenciais de integracoes.
 * Autor: AXIOMIX
 * Data: 2026-03-11
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const CIPHER_ALGORITHM = "aes-256-gcm";
const PAYLOAD_PREFIX = "enc:v1";

function getEncryptionKey() {
  const integrationKey = process.env.INTEGRATIONS_ENCRYPTION_KEY?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const source = integrationKey || serviceRoleKey;

  if (!source) {
    throw new Error(
      "INTEGRATIONS_ENCRYPTION_KEY (ou SUPABASE_SERVICE_ROLE_KEY) nao esta configurada."
    );
  }

  return createHash("sha256").update(source).digest();
}

export function encryptSecret(secret: string) {
  const iv = randomBytes(12);
  const key = getEncryptionKey();
  const cipher = createCipheriv(CIPHER_ALGORITHM, key, iv);
  const encryptedBuffer = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${PAYLOAD_PREFIX}:${iv.toString("base64")}:${authTag.toString("base64")}:${encryptedBuffer.toString("base64")}`;
}

export function decryptSecret(payload: string) {
  const normalized = payload.trim();
  const prefixWithSeparator = `${PAYLOAD_PREFIX}:`;

  if (!normalized.startsWith(prefixWithSeparator)) {
    throw new Error("Formato de segredo criptografado invalido.");
  }

  const encryptedPayload = normalized.slice(prefixWithSeparator.length);
  const [ivBase64, authTagBase64, encryptedBase64, ...rest] = encryptedPayload.split(":");

  if (!ivBase64 || !authTagBase64 || !encryptedBase64 || rest.length > 0) {
    throw new Error("Formato de segredo criptografado invalido.");
  }

  const key = getEncryptionKey();
  const decipher = createDecipheriv(CIPHER_ALGORITHM, key, Buffer.from(ivBase64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));
  const decryptedBuffer = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final(),
  ]);

  return decryptedBuffer.toString("utf8");
}
