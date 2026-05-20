import { PrismaClient } from './generated/prisma/client'
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

function getPrismaClient(): PrismaClient {
    global.prisma ??= createPrismaClient()
    return global.prisma
}

export const prisma = new Proxy({} as PrismaClient, {
    get(_target, property, receiver) {
        const client = getPrismaClient()
        const value = Reflect.get(client, property, receiver)
        return typeof value === 'function' ? value.bind(client) : value
    },
})
