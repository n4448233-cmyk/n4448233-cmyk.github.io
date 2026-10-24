/* ============ i18n: RU / EN ============ */
const I18N = {
  ru: {
    tagline:  "лопай мозгоедов!",
    play:     "ИГРАТЬ",
    again:    "ЕЩЁ!",
    menu:     "в меню",
    resume:   "ДАЛЬШЕ",
    paused:   "ПАУЗА",
    timeUp:   "ВРЕМЯ!",
    score:    "ОЧКИ",
    best:     "РЕКОРД",
    newBest:  "НОВЫЙ РЕКОРД!",
    hint:     "тапай и води пальцем • тучки не трогай!",
    frenzy:   "МОЗГОВЗРЫВ!",
    plusTime: "+5 сек",
    minusTime:"-3 сек",
    oops:     "ОЙ!",
  },
  en: {
    tagline:  "pop the brain-munchers!",
    play:     "PLAY",
    again:    "AGAIN!",
    menu:     "menu",
    resume:   "GO ON",
    paused:   "PAUSED",
    timeUp:   "TIME!",
    score:    "SCORE",
    best:     "BEST",
    newBest:  "NEW BEST!",
    hint:     "tap and swipe • don't touch the clouds!",
    frenzy:   "BRAIN BLAST!",
    plusTime: "+5 sec",
    minusTime:"-3 sec",
    oops:     "OOPS!",
  },
};

const Lang = {
  code: 'ru',
  apply(code) {
    this.code = I18N[code] ? code : 'ru';
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const txt = I18N[this.code][key];
      if (txt != null) el.textContent = txt;
    });
  },
  t(key) {
    return I18N[this.code][key] != null ? I18N[this.code][key] : I18N.ru[key];
  },
};
