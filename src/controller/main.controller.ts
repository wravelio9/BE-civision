import { Request, Response, NextFunction } from "express"
import Service, { UploadError } from "../service/main.service.js"

class Controller {

    // Controller @ POST "/upload"
    // Menerima gambar (field "files"), deteksi gerobak via Roboflow, kirim JSON hasil ke FE.
    static async upload (req:Request, res:Response, next:NextFunction) {
        try {
            const files = (req.files as Express.Multer.File[]) || [];

            if (files.length === 0) {
                return res.status(400).json({ success: false, error: "Tidak ada file yang diupload. Gunakan field 'files'." });
            }

            const data = await Service.upload(files);

            // 200 jika minimal satu gambar berhasil, 502 jika semua gagal di Roboflow.
            const status = data.succeeded > 0 ? 200 : 502;
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

        } catch (err) {
            next(err)
        }
    }
}

export default Controller
