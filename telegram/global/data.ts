import { prisma } from '../../db/prisma'
import { logger } from '../../utils/logger'
import type { User } from '../global'

export const getUsers = async () => {
  logger.info('[getUsers] Starting query...')
  const users: User[] = await prisma.user.findMany({
    select: {
      tg_id: true,
      rep: true,
      nick: true,
      fecha: true,
      lang: true,
      model: true,
    },
  })
  logger.info(`[getUsers] Found ${users.length} users`)
  const userObject: Record<string, User> = users.reduce(
    (prev, curr) => ({ ...prev, [curr.tg_id]: curr }),
    {},
  )
  return userObject
}

export const updateUser = async (user: User) => {
  try {
    await prisma.user.upsert({
      where: {
        tg_id: user.tg_id
      },
      update: {
        ...user,
      },
      create: {
        ...user
      }
    })
    global.USUARIOS = await getUsers()
    return true
  } catch (error) {
    logger.error(error)
    return false
  }
}

export const saveResultsInDB = async (results: unknown, query: string) => {
  try {
    const parsedResults = JSON.stringify(results)
    await prisma.dictionary.upsert({
      where: {
        query
      },
      create: {
        query,
        response: parsedResults,
        date: new Date(),
      },
      update: {
        response: parsedResults,
        date: new Date(),
      }
    })
  } catch (error) {
    logger.error(error)
  }
}
