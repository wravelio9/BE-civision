// Service Validasi Pelanggaran (Requirement 9): ubah status validasi + tindak lanjut.
// unverified (default) -> valid / invalid. invalid = soft-delete (disembunyikan,
// baris tetap ada, TIDAK pernah hard-delete). follow-up hanya untuk yang valid.
// Akses database didelegasikan ke ViolationRepository.
import ViolationRepository from "../repository/violation.repository.js";
import type { ValidationStatus, FollowUp } from "../interface/violation.interface.js";

export class ViolationError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

class ViolationService {
  // Daftar pelanggaran AKTIF (sembunyikan yang invalid) - Requirement 9.4, 9.8.
  static async listActive(analysisId?: string) {
    return ViolationRepository.findActive(analysisId);
  }

  // Ubah status validasi (valid / invalid) - Requirement 9.2, 9.3, 9.4, 9.5.
  static async setStatus(id: string, status: ValidationStatus) {
    if (!["unverified", "valid", "invalid"].includes(status)) {
      throw new ViolationError("invalid_status", "Status validasi tidak dikenal.");
    }
    const existing = await ViolationRepository.findById(id);
    if (!existing) throw new ViolationError("not_found", "Pelanggaran tidak ditemukan.", 404);

    // Saat jadi valid, follow-up mulai dari 'belum' (Req 9.3).
    // invalid = soft-delete: cukup ubah status, baris tetap ada (Req 9.4, 9.5).
    const data: { status: ValidationStatus; followUp?: FollowUp } = { status };
    if (status === "valid") data.followUp = "belum";

    return ViolationRepository.update(id, data);
  }

  // Ubah status tindak lanjut (belum / sudah) - hanya untuk valid (Req 9.6).
  static async setFollowUp(id: string, followUp: FollowUp) {
    if (!["belum", "sudah"].includes(followUp)) {
      throw new ViolationError("invalid_followup", "Status tindak lanjut tidak dikenal.");
    }
    const existing = await ViolationRepository.findById(id);
    if (!existing) throw new ViolationError("not_found", "Pelanggaran tidak ditemukan.", 404);
    if (existing.status !== "valid") {
      throw new ViolationError(
        "not_valid",
        "Tindak lanjut hanya untuk pelanggaran berstatus valid.",
      );
    }
    return ViolationRepository.update(id, { followUp });
  }
}

export default ViolationService;
