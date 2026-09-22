import axios from "axios";
import FormData from "form-data"
import config from "../config/config.js";

const AI_SERVICE_URL = config.aiServiceUrl;

class Service {
    // Kirim sekumpulan gambar ke AI /predict-image dalam satu request.
    static async uploadImages(files: any[], conf: number) {
        const form = new FormData();

        for (const file of files) {
            form.append("files", file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype,
            });
        }

        // Teruskan ke AI service. conf opsional (default 0.5 di sisi AI).
        const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict-image`, form, {
            params: { conf },
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 120000, // beri waktu lebih untuk batch besar
        });

        // aiResponse.data berisi { success, conf, results: [...], errors: [...] }
        return aiResponse.data;
    }

    // Kirim satu video ke AI /predict-video.
    static async uploadVideo(buffer: any, filename: any, mimetype: any, conf: any) {
        const form = new FormData();
        // Field name harus "file" agar cocok dengan parameter di app.py (/predict-video).
        form.append("file", buffer, { filename, contentType: mimetype });

        const url = `${AI_SERVICE_URL}/predict-video`;

        const response = await axios.post(url, form, {
            params: { conf },
            headers: form.getHeaders(),
            // Video bisa besar & pemrosesan lama, beri ruang.
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 15 * 60 * 1000, // 15 menit
        });

        return response.data;
    }

    // Router: pisahkan file berdasarkan mimetype lalu teruskan ke endpoint AI yang sesuai.
    // Gambar dikirim sekaligus (batch), video dikirim satu per satu.
    static async upload(files: any[], conf: number) {
        const images = files.filter((f) => (f.mimetype || "").startsWith("image/"));
        const videos = files.filter((f) => (f.mimetype || "").startsWith("video/"));

        const result: { images?: any; videos?: any[] } = {};

        if (images.length > 0) {
            result.images = await this.uploadImages(images, conf);
        }

        if (videos.length > 0) {
            result.videos = [];
            for (const video of videos) {
                const data = await this.uploadVideo(
                    video.buffer,
                    video.originalname,
                    video.mimetype,
                    conf,
                );
                result.videos.push({ filename: video.originalname, data });
            }
        }

        return result;
    }

    static async report() {

    }
}

export default Service
