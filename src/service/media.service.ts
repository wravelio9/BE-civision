// Service Media: menyimpan record MediaFile ke database via Prisma.
import prisma from "../db/prisma.js";
import type { MediaType } from "../core/upload.validation.js";

export interface CreateMediaFileInput {
  originalName: string;
  mediaType: MediaType;
  sizeBytes: number;
  storagePath: string;
}

class MediaService {
  // Membuat record MediaFile (catatan tentang berkas yang diunggah).
  static async createMediaFile(input: CreateMediaFileInput) {
    return prisma.mediaFile.create({
      data: {
        originalName: input.originalName.slice(0, 255), // batas 255 char
        mediaType: input.mediaType,
        sizeBytes: input.sizeBytes,
        storagePath: input.storagePath,
      },
    });
  }
}

export default MediaService;