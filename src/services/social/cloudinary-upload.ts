/**
 * Arquivo: src/services/social/cloudinary-upload.ts
 * Proposito: Upload de midias para Cloudinary com metadados para o Social Publisher.
 * Autor: AXIOMIX
 * Data: 2026-03-13
 */

import "server-only";

import { Readable } from "node:stream";
import { getCloudinary, buildCloudinaryFolder } from "@/lib/cloudinary/config";
import type { CloudinaryUploadResult } from "@/types/modules/cloudinary.types";

type UploadableMediaFile = {
  fileName: string;
  fileType: string;
  fileSize: number;
  arrayBuffer: ArrayBuffer;
};

function sanitizeFileName(fileName: string) {
  const normalized = fileName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const withoutExtension = normalized.replace(/\.[^.]+$/, "");
  return withoutExtension.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function detectResourceType(fileType: string): "image" | "video" | "raw" {
  if (fileType.startsWith("image/")) return "image";
  if (fileType.startsWith("video/")) return "video";
  return "raw";
}

function uploadBuffer(
  buffer: Buffer,
  options: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const cloudinary = getCloudinary();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      if (!result) {
        reject(new Error("Upload Cloudinary retornou resultado vazio."));
        return;
      }
      resolve(result as Record<string, unknown>);
    });

    const readable = Readable.from(buffer);
    readable.pipe(stream);
  });
}

export async function uploadMediaToCloudinary(
  companyId: string,
  mediaFiles: UploadableMediaFile[]
): Promise<CloudinaryUploadResult[]> {
  const folder = buildCloudinaryFolder(companyId);
  const results: CloudinaryUploadResult[] = [];

  for (const mediaFile of mediaFiles) {
    const buffer = Buffer.from(mediaFile.arrayBuffer);
    const resourceType = detectResourceType(mediaFile.fileType);
    const safeName = sanitizeFileName(mediaFile.fileName);
    const datePrefix = new Date().toISOString().slice(0, 10);
    const publicId = `${folder}/${datePrefix}/${crypto.randomUUID()}-${safeName}`;

    const uploadOptions: Record<string, unknown> = {
      public_id: publicId,
      resource_type: resourceType,
      overwrite: false,
      unique_filename: false,
      tags: [companyId, "social-publisher"],
    };

    if (resourceType === "video") {
      uploadOptions.eager = [
        {
          format: "jpg",
          transformation: [{ width: 480, height: 480, crop: "fill", gravity: "auto" }],
        },
      ];
      uploadOptions.eager_async = true;
    }

    const result = await uploadBuffer(buffer, uploadOptions);

    const secureUrl = typeof result.secure_url === "string" ? result.secure_url : "";
    const format = typeof result.format === "string" ? result.format : "";
    const width = typeof result.width === "number" ? result.width : 0;
    const height = typeof result.height === "number" ? result.height : 0;
    const bytes = typeof result.bytes === "number" ? result.bytes : mediaFile.fileSize;
    const duration = typeof result.duration === "number" ? result.duration : undefined;
    const resultPublicId = typeof result.public_id === "string" ? result.public_id : publicId;
    const resultResourceType = typeof result.resource_type === "string"
      ? (result.resource_type as "image" | "video" | "raw")
      : resourceType;

    let thumbnailUrl: string | undefined;
    if (resourceType === "video" && Array.isArray(result.eager) && result.eager.length > 0) {
      const eager = result.eager[0] as Record<string, unknown> | undefined;
      if (eager && typeof eager.secure_url === "string") {
        thumbnailUrl = eager.secure_url;
      }
    }

    results.push({
      publicId: resultPublicId,
      secureUrl,
      format,
      resourceType: resultResourceType,
      width,
      height,
      bytes,
      duration,
      thumbnailUrl,
    });
  }

  return results;
}

export async function deleteFromCloudinary(
  publicId: string,
  resourceType: string = "image"
): Promise<void> {
  const cloudinary = getCloudinary();
  await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
}
