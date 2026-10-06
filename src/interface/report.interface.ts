// Interface/tipe untuk src/service/report.service.ts

export interface ReportData {
  id: string;
  location: string;
  coordinate: { lat: number; lng: number };
  date: string;
  timestamp: string;
  mediaName: string | null;
  zoneName: string | null;
  status: string;
  confidence: number;
  evidencePath: string | null;
  targetAgency: string;
}
