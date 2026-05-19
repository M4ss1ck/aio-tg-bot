import { PrismaClient } from './generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

declare global {
    var prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not set')
    }

    console.log('[Prisma] Initializing with PostgreSQL adapter...')

    const adapter = new PrismaPg({ connectionString })
    return new PrismaClient({ adapter })
}

export const prisma = global.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma
}
