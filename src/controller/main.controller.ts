import { Request, Response, NextFunction } from "express"
import fs from "node:fs/promises"
import path from "node:path"
import crypto from "node:crypto"
import { validateUpload } from "../core/upload.validation.js"
import MediaService from "../service/media.service.js"

const STORAGE_DIR = path.resolve(process.cwd(), "storage", "media")

class Controller {

    // Controller @ POST "/upload"
    // Menerima 1 berkas (field "media") via multer (memoryStorage),
    // memvalidasi format/ukuran, menyimpan ke storage/media, lalu
    // membuat record MediaFile di database.
    static async upload(req: Request, res: Response, next: NextFunction) {
        try {
            const file = req.file
            if (!file) {
                return res.status(400).json({
                    ok: false,
                    errorCode: "no_file",
                    message: "Tidak ada berkas yang diunggah (field 'media' wajib).",
                })
            }

            // Validasi (Requirement 1)
            const result = validateUpload({
                originalName: file.originalname,
                mimeType: file.mimetype,
                sizeBytes: file.size,
            })
            if (!result.ok || !result.mediaType) {
                return res.status(400).json({
                    ok: false,
                    errorCode: result.errorCode,
                    message: result.message,
                })
            }

            // Simpan berkas fisik ke storage/media/{id}{ext}
            await fs.mkdir(STORAGE_DIR, { recursive: true })
            const id = crypto.randomUUID()
            const ext = path.extname(file.originalname) || ""
            const storagePath = path.join("storage", "media", `${id}${ext}`)
            await fs.writeFile(path.resolve(process.cwd(), storagePath), file.buffer)

            // Buat record MediaFile di database
            const media = await MediaService.createMediaFile({
                originalName: file.originalname,
                mediaType: result.mediaType,
                sizeBytes: file.size,
                storagePath,
            })

            return res.status(201).json({
                ok: true,
                message: "Unggahan berhasil.",
                media: {
                    id: media.id,
                    originalName: media.originalName,
                    mediaType: media.mediaType,
                    sizeBytes: media.sizeBytes,
                    storagePath: media.storagePath,
                    uploadedAt: media.uploadedAt,
                },
            })
        } catch (err) {
            next(err)
        }
    }

    // Controller @ GET "/report"
    static async report(req: Request, res: Response, next: NextFunction) {
        try {
            return res.json({ ok: true, reports: [] })
        } catch (err) {
            next(err)
        }
    }
}

export default Controller