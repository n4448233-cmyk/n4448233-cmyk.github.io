/* ============ МОЗГОБУМ! — Yandex Games SDK ============ */
const YSDK = {
  sdk: null,
  ready: false,
  lb: null,          // leaderboard
  player: null,
  best: 0,

  /* загрузка уже была в index.html тегом; ждём объект YaGames и init */
  init() {
    return new Promise((resolve) => {
      const done = (sdk) => {
        this.sdk = sdk;
        try {
          const lang = sdk.environment && sdk.environment.i18n && sdk.environment.i18n.lang;
          if (lang) Lang.apply(String(lang).slice(0, 2));
        } catch (e) {}
        Promise.resolve()
          .then(() => sdk.getPlayer({ scopes: false }))
          .then((p) => { this.player = p; })
          .then(() => sdk.getLeaderboards())
          .then((lb) => { this.lb = lb; })
          .then(() => sdk.features.LoadingAPI && sdk.features.LoadingAPI.ready())
          .catch(() => {})
          .then(() => { this.ready = true; this.loadBest(); resolve(sdk); });
      };
      if (window.YaGames) {
        window.YaGames.init().then(done).catch(() => resolve(null));
      } else {
        resolve(null); // оффлайн-режим: играем без SDK
      }
    });
  },

  loadBest() {
    let saved = null;
    try { saved = localStorage.getItem('mozgobum_best'); } catch (e) {}
    this.best = saved ? parseInt(saved, 10) || 0 : 0;
    if (this.player && this.player.getStats) {
      this.player.getStats(['best'])
        .then((s) => {
          if (s && s.best > this.best) { this.best = s.best; this.saveBestLocal(); }
        })
        .catch(() => {});
    }
  },

  saveBestLocal() {
    try { localStorage.setItem('mozgobum_best', String(this.best)); } catch (e) {}
  },

  /* сохранить рекорд: локально + SDK (stats и leaderboard) */
  submitScore(score) {
    if (score <= this.best) return;
    this.best = score;
    this.saveBestLocal();
    if (!this.sdk) return;
    if (this.player && this.player.setStats) {
      this.player.setStats({ best: score }).catch(() => {});
    }
    if (this.lb && this.lb.setLeaderboardScore) {
      this.lb.setLeaderboardScore('mozgobum', score).catch(() => {});
    }
  },

  /* реклама между раундами (не чаще раза в 60 сек) */
  _lastAd: 0,
  showAd(onClose) {
    const now = Date.now();
    if (!this.sdk || !this.sdk.adv || now - this._lastAd < 60000) {
      if (onClose) onClose();
      return;
    }
    this._lastAd = now;
    Sfx.duck(true);
    const cb = () => { Sfx.duck(false); Sfx.resume(); if (onClose) onClose(); };
    try {
      this.sdk.adv.showFullscreenAdv({ callbacks: { onClose: cb, onError: cb } });
    } catch (e) { cb(); }
  },

  gameplayStart() {
    if (this.sdk && this.sdk.features && this.sdk.features.GameplayAPI) {
      try { this.sdk.features.GameplayAPI.start(); } catch (e) {}
    }
  },
  gameplayStop() {
    if (this.sdk && this.sdk.features && this.sdk.features.GameplayAPI) {
      try { this.sdk.features.GameplayAPI.stop(); } catch (e) {}
    }
  },
};
