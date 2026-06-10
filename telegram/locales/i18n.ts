import path from 'path'
import i18next from 'i18next'
import backend from 'i18next-fs-backend'

// Resolve from cwd so paths survive Next.js standalone bundling.
const localesDir = path.join(process.cwd(), 'locales')

await i18next.use(backend).init({
    debug: process.env.NODE_ENV === 'development',
    initImmediate: false,
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['es', 'en'],
    saveMissing: true,
    backend: {
        loadPath: path.join(localesDir, '{{lng}}.json'),
        addPath: path.join(localesDir, '{{lng}}.missing.json'),
    },
})

export const i18n = i18next
