import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enCommon from './locales/en/common.json'
import viCommon from './locales/vi/common.json'
import enAuth from './locales/en/auth.json'
import viAuth from './locales/vi/auth.json'
import enProfile from './locales/en/profile.json'
import viProfile from './locales/vi/profile.json'

export const defaultNS = 'common'

export const resources = {
  en: { common: enCommon, auth: enAuth, profile: enProfile },
  vi: { common: viCommon, auth: viAuth, profile: viProfile },
} as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'vi',
    defaultNS,
    ns: ['common', 'auth', 'profile'],
    interpolation: {
      escapeValue: false, // React đã tự escape XSS rồi
    },
    detection: {
      // Ưu tiên: query string ?lng=, sau đó localStorage, sau đó navigator
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  })

export default i18n
