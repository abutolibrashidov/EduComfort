import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Translation resources
const resources = {
    uz: {
        translation: {
            // Common
            "common.save": "Saqlash",
            "common.cancel": "Bekor qilish",
            "common.delete": "O'chirish",
            "common.edit": "Tahrirlash",
            "common.add": "Qo'shish",
            "common.search": "Qidirish",
            "common.loading": "Yuklanmoqda...",
            "common.submit": "Yuborish",
            "common.back": "Orqaga",
            "common.next": "Keyingi",
            "common.previous": "Oldingi",
            "common.close": "Yopish",
            "common.confirm": "Tasdiqlash",
            "common.yes": "Ha",
            "common.no": "Yo'q",

            // Exam Runner
            "exam.title": "Imtihon",
            "exam.timeRemaining": "Qolgan vaqt",
            "exam.question": "Savol",
            "exam.of": "dan",
            "exam.submit": "Imtihonni topshirish",
            "exam.submitConfirm": "Imtihonni topshirishni xohlaysizmi?",
            "exam.submitWarning": "Topshirilgandan keyin javoblarni o'zgartira olmaysiz.",
            "exam.answeredQuestions": "Javob berilgan savollar",
            "exam.unansweredQuestions": "Javob berilmagan savollar",
            "exam.progress": "Jarayon",

            // Question Types
            "question.multipleChoice": "Ko'p tanlovli",
            "question.trueFalse": "To'g'ri/Noto'g'ri",
            "question.shortAnswer": "Qisqa javob",
            "question.essay": "Insho",
            "question.gapFilling": "Bo'shliqlarni to'ldirish",
            "question.matching": "Moslashtirish",
            "question.ordering": "Tartibga solish",
            "question.diagramLabeling": "Diagramma belgilash",

            // Gap Filling
            "gap.selectAnswer": "Tanlang...",
            "gap.typeAnswer": "Javobni kiriting",
            "gap.correctAnswers": "To'g'ri javoblar",

            // Matching
            "matching.items": "Elementlar",
            "matching.matchWith": "Moslashtiring",
            "matching.dragToMatch": "Moslashtirish uchun torting",
            "matching.correctMatches": "To'g'ri mosliklar",

            // Ordering
            "ordering.dragToOrder": "Tartibga solish uchun elementlarni torting",
            "ordering.correctOrder": "To'g'ri tartib",
            "ordering.perfect": "Ajoyib! Barcha elementlar to'g'ri tartibda.",

            // Diagram Labeling
            "diagram.clickToLabel": "Belgilash uchun bosing",
            "diagram.enterLabel": "Yorliqni kiriting",
            "diagram.correctLabels": "To'g'ri yorliqlar",

            // Feedback
            "feedback.correct": "To'g'ri!",
            "feedback.incorrect": "Noto'g'ri",
            "feedback.partiallyCorrect": "Qisman to'g'ri",

            // Navigation
            "nav.dashboard": "Bosh sahifa",
            "nav.exams": "Imtihonlar",
            "nav.courses": "Kurslar",
            "nav.materials": "Materiallar",
            "nav.profile": "Profil",
            "nav.settings": "Sozlamalar",
            "nav.logout": "Chiqish",
            "nav.myBooks": "Mening kitoblarim",

            // Books
            "books.noBooks": "Hali kitoblar tayinlanmagan",
            "books.teacherWillAssign": "O'qituvchingiz tez orada kitoblar tayinlaydi",
            "books.required": "Majburiy",
            "books.by": "muallif",
            "common.download": "Yuklab olish"
        }
    },
    en: {
        translation: {
            // Common
            "common.save": "Save",
            "common.cancel": "Cancel",
            "common.delete": "Delete",
            "common.edit": "Edit",
            "common.add": "Add",
            "common.search": "Search",
            "common.loading": "Loading...",
            "common.submit": "Submit",
            "common.back": "Back",
            "common.next": "Next",
            "common.previous": "Previous",
            "common.close": "Close",
            "common.confirm": "Confirm",
            "common.yes": "Yes",
            "common.no": "No",

            // Exam Runner
            "exam.title": "Exam",
            "exam.timeRemaining": "Time Remaining",
            "exam.question": "Question",
            "exam.of": "of",
            "exam.submit": "Submit Exam",
            "exam.submitConfirm": "Are you sure you want to submit?",
            "exam.submitWarning": "You cannot change answers after submission.",
            "exam.answeredQuestions": "Answered Questions",
            "exam.unansweredQuestions": "Unanswered Questions",
            "exam.progress": "Progress",

            // Question Types
            "question.multipleChoice": "Multiple Choice",
            "question.trueFalse": "True/False",
            "question.shortAnswer": "Short Answer",
            "question.essay": "Essay",
            "question.gapFilling": "Gap Filling",
            "question.matching": "Matching",
            "question.ordering": "Ordering",
            "question.diagramLabeling": "Diagram Labeling",

            // Gap Filling
            "gap.selectAnswer": "Select...",
            "gap.typeAnswer": "Type answer",
            "gap.correctAnswers": "Correct answers",

            // Matching
            "matching.items": "Items",
            "matching.matchWith": "Match with",
            "matching.dragToMatch": "Drag to match",
            "matching.correctMatches": "Correct matches",

            // Ordering
            "ordering.dragToOrder": "Drag items to arrange in correct order",
            "ordering.correctOrder": "Correct order",
            "ordering.perfect": "Perfect! All items are in the correct order.",

            // Diagram Labeling
            "diagram.clickToLabel": "Click to label",
            "diagram.enterLabel": "Enter label",
            "diagram.correctLabels": "Correct labels",

            // Feedback
            "feedback.correct": "Correct!",
            "feedback.incorrect": "Incorrect",
            "feedback.partiallyCorrect": "Partially Correct",

            // Navigation
            "nav.dashboard": "Dashboard",
            "nav.exams": "Exams",
            "nav.courses": "Courses",
            "nav.materials": "Materials",
            "nav.profile": "Profile",
            "nav.settings": "Settings",
            "nav.logout": "Logout"
        }
    },
    ru: {
        translation: {
            // Common
            "common.save": "Сохранить",
            "common.cancel": "Отмена",
            "common.delete": "Удалить",
            "common.edit": "Редактировать",
            "common.add": "Добавить",
            "common.search": "Поиск",
            "common.loading": "Загрузка...",
            "common.submit": "Отправить",
            "common.back": "Назад",
            "common.next": "Далее",
            "common.previous": "Предыдущий",
            "common.close": "Закрыть",
            "common.confirm": "Подтвердить",
            "common.yes": "Да",
            "common.no": "Нет",

            // Exam Runner
            "exam.title": "Экзамен",
            "exam.timeRemaining": "Осталось времени",
            "exam.question": "Вопрос",
            "exam.of": "из",
            "exam.submit": "Сдать экзамен",
            "exam.submitConfirm": "Вы уверены, что хотите сдать?",
            "exam.submitWarning": "После отправки вы не сможете изменить ответы.",
            "exam.answeredQuestions": "Отвеченные вопросы",
            "exam.unansweredQuestions": "Неотвеченные вопросы",
            "exam.progress": "Прогресс",

            // Question Types
            "question.multipleChoice": "Множественный выбор",
            "question.trueFalse": "Верно/Неверно",
            "question.shortAnswer": "Краткий ответ",
            "question.essay": "Эссе",
            "question.gapFilling": "Заполнение пропусков",
            "question.matching": "Сопоставление",
            "question.ordering": "Упорядочивание",
            "question.diagramLabeling": "Маркировка диаграммы",

            // Gap Filling
            "gap.selectAnswer": "Выберите...",
            "gap.typeAnswer": "Введите ответ",
            "gap.correctAnswers": "Правильные ответы",

            // Matching
            "matching.items": "Элементы",
            "matching.matchWith": "Сопоставить с",
            "matching.dragToMatch": "Перетащите для сопоставления",
            "matching.correctMatches": "Правильные совпадения",

            // Ordering
            "ordering.dragToOrder": "Перетащите элементы для правильного порядка",
            "ordering.correctOrder": "Правильный порядок",
            "ordering.perfect": "Отлично! Все элементы в правильном порядке.",

            // Diagram Labeling
            "diagram.clickToLabel": "Нажмите для маркировки",
            "diagram.enterLabel": "Введите метку",
            "diagram.correctLabels": "Правильные метки",

            // Feedback
            "feedback.correct": "Правильно!",
            "feedback.incorrect": "Неправильно",
            "feedback.partiallyCorrect": "Частично правильно",

            // Navigation
            "nav.dashboard": "Главная",
            "nav.exams": "Экзамены",
            "nav.courses": "Курсы",
            "nav.materials": "Материалы",
            "nav.profile": "Профиль",
            "nav.settings": "Настройки",
            "nav.logout": "Выход"
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        lng: 'uz', // Default language is Uzbek
        fallbackLng: 'uz',
        interpolation: {
            escapeValue: false
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage']
        }
    });

export default i18n;
