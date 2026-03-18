/**
 * Arquivo: src/lib/cloudinary/config.ts
 * Propósito: Configurar cliente Cloudinary server-side para upload e transformações.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import "server-only";

import { v2 as cloudinary } from "cloudinary";

let configured = false;

export function getCloudinary() {
  if (!configured) {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName) {
      throw new Error("CLOUDINARY_CLOUD_NAME não configurada.");
    }
    if (!apiKey) {
      throw new Error("CLOUDINARY_API_KEY não configurada.");
    }
    if (!apiSecret) {
      throw new Error("CLOUDINARY_API_SECRET não configurada.");
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    configured = true;
  }

  return cloudinary;
}

export function buildCloudinaryFolder(companyId: string) {
  return `axiomix/${companyId}`;
}
