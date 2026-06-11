import pkg from 'signale'
const { Signale } = pkg

const options = {
    logLevel: process.env.LOG_LEVEL ?? 'info',
}

export const logger = new Signale(options)

logger.config({
    displayFilename: true,
    displayTimestamp: true,
    displayDate: true
})
