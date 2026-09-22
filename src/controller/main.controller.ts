import { Request, Response, NextFunction } from "express"
import config from "../config/config.js";
import Service from "../service/main.service.js"

class Controller {

    // Controller @ POST "/upload"
    // Menerima gambar dan/atau video. Gambar -> AI /predict-image, video -> AI /predict-video.
    static async upload (req:Request, res:Response, next:NextFunction) {
        try {
            const files = (req.files as Express.Multer.File[]) || [];

            if (!files || files.length === 0) {
                return res.status(400).json({ error: "Tidak ada file yang diupload. Gunakan field 'files'." });
            }

            // conf boleh dikirim lewat query/body, kalau tidak pakai default.
            const rawConf = req.query.conf ?? req.body?.conf;
            const parsedConf = parseFloat(rawConf);
            const conf = Number.isFinite(parsedConf) ? parsedConf : config.defaultConf;

            const result = await Service.upload(files, conf);

            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (err:any) {
            // Bedakan error dari AI service vs error jaringan.
            if (err.response) {
                return res.status(err.response.status).json({
                    error: "AI service mengembalikan error",
                    detail: err.response.data,
                });
            }
            return res.status(502).json({
                error: "Gagal menghubungi AI service",
                detail: err.message,
            });
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