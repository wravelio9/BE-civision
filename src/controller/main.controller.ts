import { Request, Response, NextFunction } from "express"
import Service, { UploadError } from "../service/main.service.js"

class Controller {

    // Controller @ POST "/upload"
    // Menerima gambar (field "files"), simpan ke storage + record MediaFile.
    // Deteksi gerobak dilakukan di frontend (ONNX), bukan di sini.
    static async upload (req:Request, res:Response, next:NextFunction) {
        try {
            const files = (req.files as Express.Multer.File[]) || [];
            if (files.length === 0) {
                return res.status(400).json({ success: false, error: "Tidak ada file yang diupload. Gunakan field 'files'." });
            }

            const data = await Service.upload(files);
            const status = data.succeeded > 0 ? 201 : 400;
            return res.status(status).json({ success: data.succeeded > 0, data });
        } catch (err:any) {
            if (err instanceof UploadError) {
                return res.status(err.status).json({ success: false, error: err.message });
            }
            next(err);
        }
    }

    // Controller @ GET "/report"
    static async report (req:Request, res:Response, next:NextFunction) {
        try {
            return res.json({ ok: true });
        } catch (err) {
            next(err)
        }
    }
}

export default Controller