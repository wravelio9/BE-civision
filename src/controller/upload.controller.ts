import { Request, Response, NextFunction } from "express"
import Service, { UploadError } from "../service/upload.service.js"

class Controller {

    // Controller @ POST "/upload"
    // Menerima gambar (field "files"), simpan ke storage + record MediaFile.
    // Deteksi gerobak dilakukan di frontend (ONNX), bukan di sini.
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
            let status = data.succeeded;

            if(data.succeeded > 0) status = 201;
            else status = 400;

            return res.status(status).json({ status, data });
        } catch (err:any) {
            if (err instanceof UploadError) {
                return res.status(err.status).json({ 
                    success: false, 
                    error: err.message 
                });
            }
            next(err);
        }
    }
}

export default Controller