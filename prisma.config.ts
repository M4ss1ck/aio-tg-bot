import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    // Fallback for `prisma generate` (doesn't need actual DB connection)
    url: process.env.DATABASE_URL,
  },
})
