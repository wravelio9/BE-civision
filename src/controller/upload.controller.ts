import { Request, Response, NextFunction } from "express";
import Service, { UploadError } from "../service/upload.service.js";

function handleUploadError(err: unknown, res: Response, next: NextFunction) {
    if (err instanceof UploadError) {
        return res.status(err.status).json({ success: false, error: err.message });
    }
    return next(err);
}

class Controller {
    // Controller @ POST "/upload"
    // Menerima gambar (field "files"), simpan ke storage + record MediaFile.
    // Deteksi gerobak dilakukan di frontend (ONNX), bukan di sini.
    // Catatan: di Vercel body request dibatasi 4.5 MB. File besar pakai /upload/signed-url.
    static async upload (req:Request, res:Response, next:NextFunction) {
        try {
            const files = (req.files as Express.Multer.File[]) || [];
            if (files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "Tidak ada file yang diupload. Gunakan field 'files'."
                });
            }

            const data = await Service.upload(files);
            // 201 bila minimal satu file berhasil disimpan, selain itu 400.
            let status = 400;
            if (data.succeeded > 0) {
                status = 201;
            }

            return res.status(status).json({ status, data });
        } catch (err:any) {
            return handleUploadError(err, res, next);
        }
    }

    // Controller @ POST "/upload/signed-url"
    // Body JSON: { filename, contentType, sizeBytes } -> { path, token, signedUrl, ... }
    static async signedUrl (req:Request, res:Response, next:NextFunction) {
        try {
            const data = await Service.createSignedUpload(req.body);
            return res.status(201).json({ success: true, data });
        } catch (err:any) {
            return handleUploadError(err, res, next);
        }
    }

    // Controller @ POST "/upload/confirm"
    // Body JSON: { path, originalName } -> record MediaFile (pakai mediaId ke /api/analysis)
    static async confirm (req:Request, res:Response, next:NextFunction) {
        try {
            const media = await Service.confirmUpload(req.body);
            return res.status(201).json({ success: true, data: media });
        } catch (err:any) {
            return handleUploadError(err, res, next);
        }
    }
}

export default Controller;
