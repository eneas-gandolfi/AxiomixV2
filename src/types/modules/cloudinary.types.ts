/**
 * Arquivo: src/types/modules/cloudinary.types.ts
 * Proposito: Tipos compartilhados para integracao com Cloudinary.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

export type CloudinaryResourceType = "image" | "video" | "raw";

export type CloudinaryUploadResult = {
  publicId: string;
  secureUrl: string;
  format: string;
  resourceType: CloudinaryResourceType;
  width: number;
  height: number;
  bytes: number;
  duration?: number;
  thumbnailUrl?: string;
};

export type MediaLibraryItem = {
  id: string;
  companyId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  publicUrl: string;
  cloudinaryPublicId: string | null;
  cloudinaryFormat: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  resourceType: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  createdAt: string;
};
