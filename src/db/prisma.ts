// Helper koneksi Prisma v7 dengan adapter MariaDB (kompatibel MySQL).
// URL koneksi dibaca dari DATABASE_URL (.env).
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/client.js";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);

const prisma = new PrismaClient({ adapter });

export default prisma;