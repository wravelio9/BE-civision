import axios from "axios";
import FormData from "form-data"

const AI_SERVICE_URL = "http://localhost:8000"

class Service {
    static async upload (files:any) {
        const form = new FormData();

        for (const file of files) {
            form.append("files", file.buffer, {
                filename: file.originalname,
                contentType: file.mimetype,
            });
            }

            // Teruskan ke AI service. conf opsional (default 0.5 di sisi AI).
            const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict`, form, {
            params: { conf: 0.5 },
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 120000, // beri waktu lebih untuk batch besar
            });

            // aiResponse.data berisi { success, conf, results: [...], errors: [...] }
            // Setiap item results: { filename, detections, count, annotated_image_url }
            return { message: "Berhasil diproses", data: aiResponse.data };
    }

    static async report () {
        
    }
}

export default Service