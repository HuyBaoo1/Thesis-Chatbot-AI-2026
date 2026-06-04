import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"

import enChat from "./locales/en/chat.json"
import enCommon from "./locales/en/common.json"
import enDashboard from "./locales/en/dashboard.json"
import enFooter from "./locales/en/footer.json"
import enHeader from "./locales/en/header.json"
import enHeaderAdmin from "./locales/en/header-admin.json"
import enHome from "./locales/en/home.json"
import enHotQuestions from "./locales/en/hot-questions.json"
import enKnowledgeChunk from "./locales/en/knowledge-chunk.json"
import enLeads from "./locales/en/leads.json"
import enLogin from "./locales/en/login.json"
import enMajor from "./locales/en/major.json"
import enQuickProcessing from "./locales/en/quick-processing.json"
import enSidebar from "./locales/en/sidebar.json"
import enSidebarAdmin from "./locales/en/sidebar-admin.json"
import enStaff from "./locales/en/staff.json"
import enTuitionPolicy from "./locales/en/tuition-policy.json"
import enWebCrawler from "./locales/en/web-crawler.json"

import viChat from "./locales/vi/chat.json"
import viCommon from "./locales/vi/common.json"
import viDashboard from "./locales/vi/dashboard.json"
import viFooter from "./locales/vi/footer.json"
import viHeader from "./locales/vi/header.json"
import viHeaderAdmin from "./locales/vi/header-admin.json"
import viHome from "./locales/vi/home.json"
import viHotQuestions from "./locales/vi/hot-questions.json"
import viKnowledgeChunk from "./locales/vi/knowledge-chunk.json"
import viLeads from "./locales/vi/leads.json"
import viLogin from "./locales/vi/login.json"
import viMajor from "./locales/vi/major.json"
import viQuickProcessing from "./locales/vi/quick-processing.json"
import viSidebar from "./locales/vi/sidebar.json"
import viSidebarAdmin from "./locales/vi/sidebar-admin.json"
import viStaff from "./locales/vi/staff.json"
import viTuitionPolicy from "./locales/vi/tuition-policy.json"
import viWebCrawler from "./locales/vi/web-crawler.json"

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        chat: enChat,
        common: enCommon,
        dashboard: enDashboard,
        footer: enFooter,
        header: enHeader,
        "header-admin": enHeaderAdmin,
        home: enHome,
        "hot-questions": enHotQuestions,
        "knowledge-chunk": enKnowledgeChunk,
        leads: enLeads,
        login: enLogin,
        major: enMajor,
        "quick-processing": enQuickProcessing,
        sidebar: enSidebar,
        "sidebar-admin": enSidebarAdmin,
        staff: enStaff,
        "tuition-policy": enTuitionPolicy,
        "web-crawler": enWebCrawler,
      },
      vi: {
        chat: viChat,
        common: viCommon,
        dashboard: viDashboard,
        footer: viFooter,
        header: viHeader,
        "header-admin": viHeaderAdmin,
        home: viHome,
        "hot-questions": viHotQuestions,
        "knowledge-chunk": viKnowledgeChunk,
        leads: viLeads,
        login: viLogin,
        major: viMajor,
        "quick-processing": viQuickProcessing,
        sidebar: viSidebar,
        "sidebar-admin": viSidebarAdmin,
        staff: viStaff,
        "tuition-policy": viTuitionPolicy,
        "web-crawler": viWebCrawler,
      },
    },
    fallbackLng: "vi",
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
  })

export default i18n
