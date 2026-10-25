/* ============================================================
   ДАННЫЕ САЙТА
   Всё, что ты будешь менять, лежит здесь.
   Тексты в index.html тоже можно править напрямую.
   ============================================================ */

// Твоё имя — оно подставляется в шапку, приветствие и подвал.
const PROFILE = {
  name: "Sexsowa",
};

// Куда писать: почта и ссылки на соцсети.
// Ненужные строки просто удали.
const CONTACTS = {
  email: "n4448233@gmail.com",
  socials: [
    { label: "GitHub", url: "https://github.com/n4448233-cmyk" },
    { label: "Telegram", url: "https://t.me/sexsowa" },
  ],
};

/* ------------------------------------------------------------
   ПРОЕКТЫ

   Чтобы добавить проект — скопируй любой объект { ... },
   вставь его в список и поменяй поля:

     title       — название
     description — что это и зачем, 1–3 предложения
     category    — раздел: "Сайты" / "Плагины" / "Моды" / "Игры" / "Программы"
     tags        — список технологий, что использовал
     images      — список скриншотов (пути к файлам в img/projects/).
                   Их можно листать в карточке, клик открывает
                   большой просмотр. Одна картинка — без стрелок,
                   пустой список — заглушка с номером.
     demo        — ссылка на работающую версию (если есть)
     source      — ссылка на код (если есть)
     featured    — true у первого проекта делает его крупным
   ------------------------------------------------------------ */

// Вкладки над карточками. Порядок здесь = порядок на сайте.
// Хочешь свой раздел — добавь название в список и указывай его
// в поле category у проектов.
const CATEGORIES = ["Все", "Сайты", "Плагины", "Моды", "Игры", "Программы"];

const PROJECTS = [
  {
    title: "«ПИНГ» — сайт компьютерного клуба",
    description:
      "Тёмный неоновый лендинг для киберклуба: живая карта мест с бронированием и кодом брони, тарифы с переключателем времени суток, анимированные бенчмарки FPS, обратный отсчёт до турнира, глитч-заголовок, частицы на canvas и три неоновые темы по кнопке.",
    category: "Сайты",
    tags: ["HTML", "CSS", "JavaScript", "Canvas", "анимации", "адаптив"],
    images: [
      "img/projects/ping-1.png",
      "img/projects/ping-2.png",
      "img/projects/ping-3.png",
      "img/projects/ping-4.png",
      "img/projects/ping-5.png",
    ],
    demo: "projects/ping/index.html",
    source: "",
    featured: true,
  },
  {
    title: "«CustomGround» — плагин кастомного фона для Discord",
    description:
      "Плагин для BetterDiscord: своё фото или гифка на фон клиента, редактор положения с живым предпросмотром (тянуть, зумить — как с аватаркой), слайдеры затемнения и блюра, своя вотермарка. Гифки остаются анимированными, а подгонка переживает изменение размера окна. Ниже — веб-демо, которое ведёт себя как настоящий плагин.",
    category: "Плагины",
    tags: ["JavaScript", "BetterDiscord API", "CSS", "Electron", "FileReader"],
    images: [
      "img/projects/customground-1.png",
      "img/projects/customground-2.png",
    ],
    demo: "projects/customground/index.html",
    source: "projects/customground/CustomBackground.plugin.js",
  },
  {
    title: "«Углёк» — сайт кофейной обжарки",
    description:
      "Лендинг для локальной обжарки: каталог с фильтром по обжарке, конструктор блендов, живой счётчик до ближайшей обжарки, анимированный график профиля и подписка. Настоящие фотографии пачек и зерна (Unsplash / Wikimedia Commons), адаптив от телефона до десктопа.",
    category: "Сайты",
    tags: ["HTML", "CSS", "JavaScript", "SVG", "адаптив"],
    images: [
      "img/projects/uglek-1.png",
      "img/projects/uglek-2.png",
      "img/projects/uglek-3.png",
      "img/projects/uglek-4.png",
      "img/projects/uglek-5.png",
    ],
    demo: "projects/uglek/index.html",
    source: "",
  },
  {
    title: "«Плакатня» — генератор постеров",
    description:
      "Ночная мастерская афиш без единой фотографии: тёмный интерфейс с зерном плёнки, светом за курсором и бегущей строкой, а постеры собираются кодом. Четыре стиля (Баухаус, Свисс, Брутализм, Неон), палитры, сеяный рандом (один сид — один и тот же плакат), выгрузка в SVG или PNG и ссылка через хеш, чтобы показать конкретный плакат.",
    category: "Программы",
    tags: ["JavaScript", "SVG", "Canvas", "генеративный дизайн", "без библиотек"],
    images: [
      "img/projects/plakat-1.png",
      "img/projects/plakat-2.png",
      "img/projects/plakat-3.png",
      "img/projects/plakat-4.png",
    ],
    demo: "projects/plakat/index.html",
    source: "",
  },
  {
    title: "МОЗГОБУМ! — тапалка",
    description:
      "Честно: самая сырая вещь здесь. Прямо набросок для Яндекс Игр, собранный минут за десять — тапай по мозгам, не трогай тучки, 60 секунд на раунд. Счёт, комбо и оффлайн-режим работают, остальное допиливается.",
    category: "Игры",
    tags: ["JavaScript", "Canvas", "Yandex Games SDK"],
    images: [
      "img/projects/mozgobum-1.png",
      "img/projects/mozgobum-2.png",
    ],
    demo: "projects/mozgobum/index.html",
    source: "",
  },
  {
    title: "Сайт-визитка для мастерской",
    description:
      "Одностраничный сайт для столярной мастерской: каталог работ, форма заявки, адаптив под телефон. Сделал быстро и без конструкторов — заказчик доволен.",
    category: "Сайты",
    tags: ["HTML", "CSS", "JavaScript"],
    images: [
      "img/projects/vizitka-1.svg",
      "img/projects/vizitka-2.svg",
      "img/projects/vizitka-3.svg",
    ],
    demo: "https://example.com",
    source: "https://github.com/username/project",
  },
  {
    title: "Трекер привычек",
    description:
      "Небольшое приложение, где можно отмечать привычки за день и смотреть прогресс за месяц. Данные хранятся в браузере, без регистрации.",
    category: "Программы",
    tags: ["JavaScript", "localStorage"],
    images: ["img/projects/tracker-1.svg", "img/projects/tracker-2.svg"],
    demo: "https://example.com",
    source: "",
  },
  {
    title: "Парсер цен на маркетплейсах",
    description:
      "Скрипт, который собирает цены на заданные товары и раз в день пишет отчёт в таблицу. Экономит пару часов в неделю.",
    category: "Программы",
    tags: ["Python", "requests", "CSV"],
    images: ["img/projects/parser-1.svg"],
    demo: "",
    source: "https://github.com/username/project",
  },
  {
    title: "Этот сайт",
    description:
      "Собран вручную на HTML, CSS и ванильном JS — без фреймворков и сборщиков. Хостится бесплатно на GitHub Pages.",
    category: "Сайты",
    tags: ["HTML", "CSS", "JS"],
    images: [],
    demo: "",
    source: "https://github.com/username/portfolio",
  },
];
