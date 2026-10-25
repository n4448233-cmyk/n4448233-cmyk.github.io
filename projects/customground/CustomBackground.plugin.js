/**
 * @name CustomBackground
 * @description Своё фото на фон Discord: картинка/гифка с компьютера или по ссылке, редактор положения с превью, затемнение, блюр.
 * @version 1.1.2
 * @author bales
 */

const ENGINE_URL = "https://mwittrien.github.io/BetterDiscordAddons/Themes/BasicBackground/BasicBackground.css";
const STYLE_ID = "cb-custom-background";
const WM_ID = "cb-watermark";
const WM_TEXT = "CustomGround by Sexsowa";
const MAX_DIM = 2560;      // картинки больше этого размера ужимаются при выборе файла
const MAX_GIF_BYTES = 15 * 1024 * 1024;
const MAX_FILE_BYTES = 40 * 1024 * 1024;

const DEFAULTS = {
    url: "",
    dim: 40,        // % -> --transparencyalpha
    blur: 0,        // px -> --backgroundblur
    position: "center",
    size: "cover",
    fit: null,      // {scale, x, y} из редактора — главнее position/size
    watermark: true
};

const POSITION_OPTIONS = [
    {label: "Центр", value: "center"},
    {label: "Сверху", value: "top"},
    {label: "Справа", value: "right"},
    {label: "Снизу", value: "bottom"},
    {label: "Слева", value: "left"}
];

const SIZE_OPTIONS = [
    {label: "Заполнить окно (cover)", value: "cover"},
    {label: "Вписать целиком (contain)", value: "contain"},
    {label: "Без масштаба (auto)", value: "auto"}
];

// валидная data-ссылка: только base64-алфавит, без управляющих символов и кавычек
const DATA_URL_RE = /^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/;
// чистый base64-текст (результат readFileSync(path, "base64"))
const BASE64_RE = /^[A-Za-z0-9+/=\r\n]+$/;

module.exports = class CustomBackground {
    constructor(meta) {
        this.meta = meta;
        this.api = new BdApi(meta.name);
        try {
            this.settings = Object.assign({}, DEFAULTS, this.api.Data.load("settings") || {});
        } catch (e) {
            this.settings = Object.assign({}, DEFAULTS);
        }
        this._pending = null;
        this.editorOpen = false;
    }

    start() {
        // самоочистка: если когда-то сохранились битые данные — выбрасываем их,
        // чтобы одна испорченная переменная не убивала весь CSS-блок
        let bg = "";
        try { bg = this.api.Data.load("bgData") || ""; } catch (e) {}
        if (bg && !DATA_URL_RE.test(bg)) {
            bg = "";
            try { this.api.Data.save("bgData", ""); } catch (e) {}
        }
        this.bgData = bg;
        this.settings.url = sanitizeUrl(this.settings.url);
        this.apply();
    }

    stop() {
        const el = document.getElementById(STYLE_ID);
        if (el) el.remove();
        const wm = document.getElementById(WM_ID);
        if (wm) wm.remove();
    }

    toast(text, type) {
        try {
            BdApi.UI.showToast(text, {type: type});
        } catch (e) {}
    }

    // сохранить настройки и перерисовать фон (с небольшой задержкой, чтобы слайдеры не спамили)
    schedule() {
        clearTimeout(this._pending);
        this._pending = setTimeout(() => {
            try { this.api.Data.save("settings", this.settings); } catch (e) {}
            this.apply();
        }, 150);
    }

    source() {
        if (this.bgData && DATA_URL_RE.test(this.bgData)) return this.bgData;
        return this.settings.url || null;
    }

    // srcOv/fitOv — подменяют текущие значения (для живого предпросмотра в редакторе)
    apply(srcOv, fitOv) {
        const src = srcOv !== undefined ? srcOv : this.source();
        let el = document.getElementById(STYLE_ID);

        if (!src) {
            if (el) el.remove();
            this.syncWatermark(false);
            return;
        }

        if (!el) {
            el = document.createElement("style");
            el.id = STYLE_ID;
            document.head.appendChild(el);
        }

        const fit = fitOv !== undefined ? fitOv : (this.settings.fit || null);
        const sizeCss = fit ? `${fit.scale}% auto` : this.settings.size;
        const posCss = fit ? `${fit.x}% ${fit.y}%` : this.settings.position;

        // безопасные переменные — отдельным правилом: даже если ссылка на картинку
        // вдруг окажется кривой, затемнение и заглушки продолжат работать
        const safeVars = [
            `--backgroundposition: ${posCss}`,
            `--backgroundsize: ${sizeCss}`,
            `--backgroundblur: ${this.settings.blur}`,
            `--transparencycolor: 0, 0, 0`,
            `--transparencyalpha: ${(this.settings.dim / 100).toFixed(3)}`,
            `--messagetransparency: 0`,
            `--guildchanneltransparency: 0.15`,
            `--accentcolor: 88, 101, 242`
        ];

        // движок показывает синюю плашку "тема устарела", если не объявлена переменная
        // его текущей версии. Мы не тема, поэтому глушим все варианты имён версий.
        for (let a = 1; a <= 2; a++)
            for (let b = 0; b <= 9; b++)
                for (let c = 0; c <= 9; c++)
                    safeVars.push(`--version${a}_${b}_${c}: none`);

        // глушим вотермарку движка (BasicBackground by DevilBro) во всех трёх местах
        const killWm = `
div[class^="bar_"] > div[class^="title_"]::after,
div[class*=" bar_"] > div[class*=" title_"]::after,
[class^="standardSidebarView"]::after,
[class*=" standardSidebarView"]::after,
ul[class^="sublist_"] + div::before,
ul[class^="sublist_"] + div::after {
    content: none !important;
    background: none !important;
    -webkit-mask: none !important;
}`;

        // без этого при подгонке, не докрывающей окно, фон плиткой повторяется по краям
        const noRepeat = `
body:has(#app-mount)::before,
body:has(#app-mount)::after {
    background-repeat: no-repeat !important;
}`;

        const wmCss = this.settings.watermark ? `#${WM_ID} {
    position: fixed !important;
    right: 10px !important;
    bottom: 6px !important;
    z-index: 999999 !important;
    pointer-events: none !important;
    color: rgba(255, 255, 255, 0.45) !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    letter-spacing: 0.3px !important;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8) !important;
    font-family: "gg sans", "Segoe UI", sans-serif !important;
}` : "";

        el.textContent = `@import url("${ENGINE_URL}");\n` +
            `:root{${safeVars.join(";")}}\n` +
            killWm + noRepeat + wmCss + "\n" +
            `:root{--background: url("${src}")}`;

        this.syncWatermark(!!this.settings.watermark);
    }

    syncWatermark(show) {
        let wm = document.getElementById(WM_ID);
        if (show) {
            if (!wm) {
                wm = document.createElement("div");
                wm.id = WM_ID;
                wm.textContent = WM_TEXT;
                document.body.appendChild(wm);
            }
        } else if (wm) wm.remove();
    }

    // читает файл сразу в base64: в BD 1.14 require("fs") проксируется через IPC,
    // и readFileSync(path) без кодировки возвращает utf-8 строку — бинарные файлы
    // при этом необратимо портятся. Кодировка "base64" даёт чистый ASCII-текст.
    readFileBase64(path) {
        let fs = null;
        try { fs = require("fs"); } catch (e) { return null; }
        let raw = null;
        try { raw = fs.readFileSync(path, "base64"); } catch (e) { return null; }
        if (typeof raw === "string" && BASE64_RE.test(raw)) return raw.replace(/[\r\n]/g, "");

        // запасной путь: вдруг вернулся Buffer/массив байтов
        try {
            if (raw && typeof raw === "object") {
                if (raw.type === "Buffer" && Array.isArray(raw.data)) {
                    return bytesToBase64(raw.data);
                }
                if (typeof raw.length === "number") {
                    return bytesToBase64(raw);
                }
            }
        } catch (e) {}
        return null;
    }

    fileSize(path) {
        let fs = null;
        try { fs = require("fs"); } catch (e) { return null; }
        try {
            const st = fs.lstatSync ? fs.lstatSync(path) : (fs.statSync ? fs.statSync(path) : null);
            return st && typeof st.size === "number" ? st.size : null;
        } catch (e) { return null; }
    }

    useFile(path) {
        if (!path) {
            this.bgData = "";
            try { this.api.Data.save("bgData", ""); } catch (e) {}
            this.apply();
            return;
        }
        const ext = (path.split(".").pop() || "").toLowerCase();
        const mime = ext === "png" ? "image/png"
            : ext === "webp" ? "image/webp"
            : ext === "gif" ? "image/gif"
            : "image/jpeg";
        const gif = mime === "image/gif";

        const size = this.fileSize(path);
        if (size != null && size > (gif ? MAX_GIF_BYTES : MAX_FILE_BYTES)) {
            this.toast(gif ? "Гифка слишком большая (лимит 15 МБ)" : "Файл слишком большой (лимит 40 МБ)", "error");
            return;
        }

        const base64 = this.readFileBase64(path);
        if (!base64) {
            this.toast("Не удалось прочитать картинку — попробуй ссылку URL", "error");
            return;
        }
        shrink(`data:${mime};base64,${base64}`, gif).then(result => {
            if (!DATA_URL_RE.test(result)) {
                this.toast("Картинка не подошла — попробуй другой файл или ссылку", "error");
                return;
            }
            this.openEditor(result);
        });
    }

    // ===== Редактор положения (как у аватарки) =====

    openEditor(src) {
        if (this.editorOpen) return;
        const img = new Image();
        img.onerror = () => this.toast("Картинка не загрузилась", "error");
        img.onload = () => {
            if (this.editorOpen) return;
            this.editorOpen = true;
            this.buildEditor(src, img.naturalWidth || 16, img.naturalHeight || 9);
        };
        img.src = src;
    }

    buildEditor(src, iw, ih) {
        const prevSrc = this.source();
        const prevFit = this.settings.fit ? Object.assign({}, this.settings.fit) : null;

        const overlay = document.createElement("div");
        overlay.id = "cb-editor-overlay";
        overlay.style.cssText = "position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-family:'gg sans','Segoe UI',sans-serif;";

        const panel = document.createElement("div");
        panel.style.cssText = "background:#2b2d31;border-radius:10px;padding:16px;box-shadow:0 8px 24px rgba(0,0,0,0.5);color:#dbdee1;width:min(640px,92vw);box-sizing:border-box;";
        overlay.appendChild(panel);

        const titleRow = document.createElement("div");
        titleRow.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;";
        const title = document.createElement("div");
        title.textContent = "Редактор фона";
        title.style.cssText = "font-size:16px;font-weight:700;color:#f2f3f5;";
        const closeBtn = mkButton("✕", "#4e5058");
        closeBtn.style.cssText += "width:28px;padding:4px 0;";
        titleRow.append(title, closeBtn);
        panel.appendChild(titleRow);

        const aspect = Math.min(2.2, Math.max(1.3, window.innerWidth / window.innerHeight));
        const box = document.createElement("div");
        box.style.cssText = `width:100%;aspect-ratio:${aspect};background-color:#111214;background-repeat:no-repeat;border-radius:8px;cursor:grab;touch-action:none;user-select:none;position:relative;overflow:hidden;background-image:url("${src}");`;
        panel.appendChild(box);

        const dim = document.createElement("div");
        dim.style.cssText = `position:absolute;inset:0;background:rgba(0,0,0,${(this.settings.dim / 100).toFixed(3)});pointer-events:none;`;
        box.appendChild(dim);

        const hint = document.createElement("div");
        hint.textContent = "Тяни мышкой, чтобы двигать • колесо мыши — зум. Блюр виден на реальном фоне за этим окном";
        hint.style.cssText = "font-size:12px;color:#949ba4;margin:8px 0;";
        panel.appendChild(hint);

        const zoomRow = document.createElement("div");
        zoomRow.style.cssText = "display:flex;align-items:center;gap:10px;margin-bottom:14px;";
        const zoomLabel = document.createElement("span");
        zoomLabel.style.cssText = "font-size:13px;min-width:86px;";
        const slider = document.createElement("input");
        slider.type = "range";
        slider.style.cssText = "flex:1;accent-color:#5865f2;";
        zoomRow.append(zoomLabel, slider);
        panel.appendChild(zoomRow);

        const btnRow = document.createElement("div");
        btnRow.style.cssText = "display:flex;justify-content:flex-end;gap:8px;";
        const resetBtn = mkButton("Сброс", "#4e5058");
        const cancelBtn = mkButton("Отмена", "#4e5058");
        const doneBtn = mkButton("Готово", "#5865f2");
        btnRow.append(resetBtn, cancelBtn, doneBtn);
        panel.appendChild(btnRow);

        document.body.appendChild(overlay);

        // ---- состояние редактора ----
        const st = {s: 0, offX: 0, offY: 0};
        const cw = () => box.clientWidth;
        const ch = () => box.clientHeight;
        // масштаб задаётся в % от ШИРИНЫ контейнера. «Впритык» для контейнера w×h:
        // s = 100 * max(1, (h/w) * (iw/ih)). Считаем для превью и для реального окна
        // Discord (пропорции чуть разные) и берём больше — иначе фон замостится по краям
        const coverOf = (w, h) => 100 * Math.max(1, (h / w) * (iw / ih));
        const winCover = coverOf(window.innerWidth, window.innerHeight);
        const cover = () => Math.max(coverOf(cw(), ch()), winCover);
        const dispW = () => cw() * st.s / 100;
        const dispH = () => dispW() * ih / iw;

        const clampOffsets = () => {
            st.offX = clamp(st.offX, cw() - dispW(), 0);
            st.offY = clamp(st.offY, ch() - dispH(), 0);
        };

        const toFit = () => {
            const w = dispW(), h = dispH();
            clampOffsets();
            return {
                scale: Math.round(st.s * 10) / 10,
                x: w > cw() ? Math.round(clamp(st.offX / (cw() - w) * 100, 0, 100) * 10) / 10 : 50,
                y: h > ch() ? Math.round(clamp(st.offY / (ch() - h) * 100, 0, 100) * 10) / 10 : 50
            };
        };

        const reset = () => {
            st.s = cover();
            st.offX = (cw() - dispW()) / 2;
            st.offY = (ch() - dispH()) / 2;
            slider.value = st.s;
            render();
        };

        let raf = 0;
        const render = () => {
            box.style.backgroundSize = `${st.s}% auto`;
            box.style.backgroundPosition = `${st.offX}px ${st.offY}px`;
            zoomLabel.textContent = `Зум: ${Math.round(st.s / cover() * 100)}%`;
            if (!raf) raf = requestAnimationFrame(() => {
                raf = 0;
                this.apply(src, toFit()); // живое применение на настоящий фон
            });
        };

        // управление
        slider.addEventListener("input", () => {
            st.s = Math.max(cover(), parseFloat(slider.value) || cover());
            clampOffsets();
            render();
        });

        box.addEventListener("wheel", e => {
            e.preventDefault();
            st.s = clamp(st.s * (e.deltaY < 0 ? 1.1 : 0.9), cover(), cover() * 6);
            slider.value = Math.min(st.s, parseFloat(slider.max));
            clampOffsets();
            render();
        }, {passive: false});

        let drag = null;
        box.addEventListener("pointerdown", e => {
            drag = {x: e.clientX, y: e.clientY};
            box.setPointerCapture(e.pointerId);
            box.style.cursor = "grabbing";
        });
        box.addEventListener("pointermove", e => {
            if (!drag) return;
            st.offX += e.clientX - drag.x;
            st.offY += e.clientY - drag.y;
            drag = {x: e.clientX, y: e.clientY};
            clampOffsets();
            render();
        });
        const endDrag = () => {
            drag = null;
            box.style.cursor = "grab";
        };
        box.addEventListener("pointerup", endDrag);
        box.addEventListener("pointercancel", endDrag);

        const close = () => {
            document.removeEventListener("keydown", onKey);
            overlay.remove();
            this.editorOpen = false;
        };
        const cancel = () => {
            close();
            this.apply(prevSrc, prevFit);
        };
        const done = () => {
            const fit = toFit();
            this.settings.fit = fit;
            if (DATA_URL_RE.test(src)) {
                this.bgData = src;
                try { this.api.Data.save("bgData", src); } catch (e) {}
            } else {
                this.settings.url = sanitizeUrl(src);
            }
            try { this.api.Data.save("settings", this.settings); } catch (e) {}
            this.apply();
            this.toast("Фон обновлён", "success");
            close();
        };
        const onKey = e => {
            if (e.key === "Escape") cancel();
        };
        document.addEventListener("keydown", onKey);
        closeBtn.onclick = cancel;
        cancelBtn.onclick = cancel;
        doneBtn.onclick = done;
        resetBtn.onclick = () => { this.settings.fit = null; reset(); };
        overlay.addEventListener("pointerdown", e => {
            if (e.target === overlay) cancel();
        });

        // старт: подгружаем сохранённую подгонку, если картинка та же
        const saved = this.settings.fit;
        if (saved && ((DATA_URL_RE.test(src) && src === this.bgData) || src === this.settings.url)) {
            st.s = saved.scale;
            // проценты -> пиксели текущего превью
            const w0 = cw() * saved.scale / 100, h0 = w0 * ih / iw;
            st.offX = w0 > cw() ? (cw() - w0) * saved.x / 100 : 0;
            st.offY = h0 > ch() ? (ch() - h0) * saved.y / 100 : 0;
            clampOffsets();
        } else {
            st.s = cover();
            st.offX = (cw() - dispW()) / 2;
            st.offY = (ch() - dispH()) / 2;
        }
        slider.min = Math.floor(cover());
        slider.max = Math.ceil(cover() * 4);
        slider.step = 1;
        slider.value = Math.min(st.s, parseFloat(slider.max));
        render();
    }

    getSettingsPanel() {
        const s = this.settings;
        return BdApi.UI.buildSettingsPanel({
            settings: [
                {type: "file", id: "file", name: "Картинка с компьютера", note: "Фото или гифка (JPG/PNG/WebP/GIF до 15 МБ). После выбора откроется редактор положения.", accept: "image/*", clearable: true},
                {type: "text", id: "url", name: "Или ссылка на картинку", note: "Прямая ссылка https://… — применяется сразу, редактор доступен через переключатель ниже.", value: s.url, placeholder: "https://example.com/wallpaper.jpg"},
                {type: "switch", id: "openEditor", name: "Открыть редактор положения", note: "Включи — откроется окно с превью текущего фона. Переключатель сам вернётся в «выкл»."},
                {type: "slider", id: "dim", name: "Затемнение", note: "Тёмный слой поверх картинки: чем больше, тем лучше читается текст", value: s.dim, min: 0, max: 100, step: 1, units: "%", markers: [0, 25, 50, 75, 100]},
                {type: "slider", id: "blur", name: "Блюр (размытие)", note: "Размытие фона в пикселях", value: s.blur, min: 0, max: 50, step: 1, units: "px", markers: [0, 10, 25, 50]},
                {type: "dropdown", id: "position", name: "Позиция картинки", note: "Используется, пока не задана ручная подгонка в редакторе", value: s.position, options: POSITION_OPTIONS},
                {type: "dropdown", id: "size", name: "Масштаб", note: "Используется, пока не задана ручная подгонка в редакторе", value: s.size, options: SIZE_OPTIONS},
                {type: "switch", id: "watermark", name: "Вотермарка «" + WM_TEXT + "»", note: "Небольшая подпись в правом нижнем углу", value: s.watermark !== false}
            ],
            onChange: (category, id, value) => {
                switch (id) {
                    case "file":
                        this.useFile(value);
                        return;
                    case "url":
                        this.settings.url = sanitizeUrl(value);
                        break;
                    case "dim":
                        this.settings.dim = value;
                        break;
                    case "blur":
                        this.settings.blur = value;
                        break;
                    case "position":
                        this.settings.position = value;
                        break;
                    case "size":
                        this.settings.size = value;
                        break;
                    case "watermark":
                        this.settings.watermark = !!value;
                        break;
                    case "openEditor":
                        this.settings.openEditor = false;
                        if (!value) return;
                        const src = this.source();
                        if (src) this.openEditor(src);
                        else this.toast("Сначала выбери картинку", "error");
                        try { this.api.Data.save("settings", this.settings); } catch (e) {}
                        return;
                    default:
                        return;
                }
                this.schedule();
            }
        });
    }
};

function mkButton(text, bg) {
    const b = document.createElement("button");
    b.textContent = text;
    b.style.cssText = `background:${bg};color:#fff;border:none;border-radius:4px;padding:8px 16px;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit;`;
    b.onmouseenter = () => b.style.filter = "brightness(1.15)";
    b.onmouseleave = () => b.style.filter = "";
    return b;
}

function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
}

function sanitizeUrl(v) {
    if (typeof v !== "string") return "";
    // выкидываем символы, способные сломать css-строку url("...")
    return v.trim().replace(/[\\"'<>\n\r]/g, "");
}

function bytesToBase64(bytes) {
    let out = "";
    const n = bytes.length;
    for (let i = 0; i < n; i += 8192) {
        let chunk = "";
        const end = Math.min(i + 8192, n);
        for (let j = i; j < end; j++) chunk += String.fromCharCode(bytes[j]);
        out += btoa(chunk);
    }
    return out;
}

// Ужимает огромные фото (например, 6000px со смартфона), чтобы не тормозил клиент.
// Гифки пропускаем как есть — иначе анимация сломается.
function shrink(dataUrl, skip) {
    return new Promise(resolve => {
        if (skip) return resolve(dataUrl);
        const img = new Image();
        img.onload = () => {
            const m = Math.max(img.width, img.height);
            if (m <= MAX_DIM) return resolve(dataUrl);
            const k = MAX_DIM / m;
            const canvas = document.createElement("canvas");
            canvas.width = Math.round(img.width * k);
            canvas.height = Math.round(img.height * k);
            canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL("image/jpeg", 0.9));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
    });
}
