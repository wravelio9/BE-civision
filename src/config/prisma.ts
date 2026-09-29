// Helper koneksi Prisma v7 dengan adapter PostgreSQL (Supabase).
// URL koneksi dibaca dari DATABASE_URL (.env).
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });

const prisma = new PrismaClient({ adapter });

export default prisma;