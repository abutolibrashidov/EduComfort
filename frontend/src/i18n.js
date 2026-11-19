import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en } from "./locales/en";
import { uz } from "./locales/uz";
import { ru } from "./locales/ru";
import { uzPub } from "./locales/public/uz";
import { ruPub } from "./locales/public/ru";
import { enPub } from "./locales/public/en";

const resources = {
    en: {
        translation: { ...en, pub: enPub }
    },
    uz: {
        translation: { ...uz, pub: uzPub }
    },
    ru: {
        translation: { ...ru, pub: ruPub }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: localStorage.getItem('language') || "uz", // Load from localStorage or default to uz
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;
