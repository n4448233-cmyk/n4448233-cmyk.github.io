/* ============================================================
   ДАННЫЕ САЙТА
   Всё, что ты будешь менять, лежит здесь.
   Тексты в index.html тоже можно править напрямую.
   ============================================================ */

// Твоё имя — оно подставляется в шапку, приветствие и подвал.
const PROFILE = {
  name: "Ваше имя",
};

// Куда писать: почта и ссылки на соцсети.
// Ненужные строки просто удали.
const CONTACTS = {
  email: "you@example.com",
  socials: [
    { label: "GitHub", url: "https://github.com/username" },
    { label: "Telegram", url: "https://t.me/username" },
  ],
};

/* ------------------------------------------------------------
   ПРОЕКТЫ

   Чтобы добавить проект — скопируй любой объект { ... },
   вставь его в список и поменяй поля:

     title       — название
     description — что это и зачем, 1–3 предложения
     tags        — список технологий, что использовал
     images      — список скриншотов (пути к файлам в img/projects/).
                   Их можно листать в карточке, клик открывает
                   большой просмотр. Одна картинка — без стрелок,
                   пустой список — заглушка с номером.
     demo        — ссылка на работающую версию (если есть)
     source      — ссылка на код (если есть)
     featured    — true у первого проекта делает его крупным
   ------------------------------------------------------------ */

const PROJECTS = [
  {
    title: "Сайт-визитка для мастерской",
    description:
      "Одностраничный сайт для столярной мастерской: каталог работ, форма заявки, адаптив под телефон. Сделал быстро и без конструкторов — заказчик доволен.",
    tags: ["HTML", "CSS", "JavaScript"],
    images: [
      "img/projects/vizitka-1.svg",
      "img/projects/vizitka-2.svg",
      "img/projects/vizitka-3.svg",
    ],
    demo: "https://example.com",
    source: "https://github.com/username/project",
    featured: true,
  },
  {
    title: "Трекер привычек",
    description:
      "Небольшое приложение, где можно отмечать привычки за день и смотреть прогресс за месяц. Данные хранятся в браузере, без регистрации.",
    tags: ["JavaScript", "localStorage"],
    images: ["img/projects/tracker-1.svg", "img/projects/tracker-2.svg"],
    demo: "https://example.com",
    source: "",
  },
  {
    title: "Парсер цен на маркетплейсах",
    description:
      "Скрипт, который собирает цены на заданные товары и раз в день пишет отчёт в таблицу. Экономит пару часов в неделю.",
    tags: ["Python", "requests", "CSV"],
    images: ["img/projects/parser-1.svg"],
    demo: "",
    source: "https://github.com/username/project",
  },
  {
    title: "Этот сайт",
    description:
      "Собран вручную на HTML, CSS и ванильном JS — без фреймворков и сборщиков. Хостится бесплатно на GitHub Pages.",
    tags: ["HTML", "CSS", "JS"],
    images: [],
    demo: "",
    source: "https://github.com/username/portfolio",
  },
];
