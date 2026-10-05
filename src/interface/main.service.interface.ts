// Interface/tipe untuk src/service/main.service.ts

export interface SavedMedia {
  id: string;
  originalName: string;
  mediaType: "photo" | "video";
  sizeBytes: number;
  storagePath: string;
}
