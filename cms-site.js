// ─────────────────────────────────────────────────────────
// Noble Hart — site-wide CMS features
// Loaded on every page after cms-config.js. Fetches the CMS's public
// siteData once (cached briefly) and applies:
//   1. Announcement banner (Announcements sheet)
//   2. Site settings text (Site_Settings sheet) via data-setting="key"
//   3. Maintenance mode cover (maintenance_mode = Yes)
//   4. Homepage featured slots (Featured sheet): "Homepage Hero" and
//      "Homepage Freebie"
// Every piece is optional: if the CMS is unreachable, the page keeps the
// text that is already written in its HTML.
// ─────────────────────────────────────────────────────────
(function () {
  if (typeof CMS_API_URL === "undefined" || /PASTE_YOUR/.test(CMS_API_URL)) return;

  const CACHE_KEY = "nh_site_data_v1";
  const CACHE_MS = 2 * 60 * 1000;

  // Anything still pointing at example.com is a placeholder from the
  // starter spreadsheet — never show it to visitors.
  function isReal(url) {
    return !!url && !/example\.com/i.test(String(url));
  }

  function el(tag, cls, html) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  function esc(str) {
    const d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

  function loadSiteData() {
    try {
      const cached = JSON.parse(sessionStorage.getItem(CACHE_KEY) || "null");
      if (cached && Date.now() - cached.time < CACHE_MS) return Promise.resolve(cached.data);
    } catch (e) {}

    // If a fetch for this same data is already in flight (e.g. this
    // script's own load plus a page's own script both asking at once),
    // share that one request instead of firing a second.
    if (window.__nhSiteDataPromise) return window.__nhSiteDataPromise;

    window.__nhSiteDataPromise = fetch(`${CMS_API_URL}?action=siteData`)
      .then((r) => r.json())
      .then((data) => {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data }));
        } catch (e) {}
        window.__nhSiteDataPromise = null;
        return data;
      })
      .catch((err) => {
        window.__nhSiteDataPromise = null;
        throw err;
      });
    return window.__nhSiteDataPromise;
  }

  // A per-browser random ID, persisted in localStorage, sent along with
  // every public write (comment, like, freebie download/email) so the
  // CMS can apply a basic per-visitor rate limit server-side. This is a
  // deterrent, not a security boundary — anyone can clear localStorage
  // or fabricate a new token, so don't rely on it for anything beyond
  // slowing down accidental floods and naive scripts.
  function getVisitorToken() {
    const KEY = "nh_visitor_id";
    try {
      let token = localStorage.getItem(KEY);
      if (!token) {
        token = (window.crypto && window.crypto.randomUUID)
          ? window.crypto.randomUUID()
          : "v-" + Date.now() + "-" + Math.random().toString(36).slice(2);
        localStorage.setItem(KEY, token);
      }
      return token;
    } catch (e) {
      return "no-local-storage";
    }
  }

  // reCAPTCHA v3 (invisible — no checkbox, no puzzle). This is what
  // actually closes the gap the visitor-token rate limit can't: Google
  // scores how human the request looks using signals a simple script
  // can't fake, and the CMS verifies that score server-to-server before
  // accepting the write. Entirely config-gated: with no real
  // RECAPTCHA_SITE_KEY set in cms-config.js, every call below resolves
  // to an empty token immediately, and the server-side check (Code.gs)
  // skips verification the same way — so nothing breaks before you set
  // this up, and nothing here forces you to.
  function recaptchaConfigured_() {
    return typeof RECAPTCHA_SITE_KEY !== "undefined" && !/PASTE_YOUR/.test(RECAPTCHA_SITE_KEY);
  }

  function loadRecaptchaScript_() {
    if (window.__nhRecaptchaScriptPromise) return window.__nhRecaptchaScriptPromise;
    window.__nhRecaptchaScriptPromise = new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.src = "https://www.google.com/recaptcha/api.js?render=" + RECAPTCHA_SITE_KEY;
      s.onload = resolve;
      s.onerror = function () {
        reject(new Error("reCAPTCHA failed to load"));
      };
      document.head.appendChild(s);
    });
    return window.__nhRecaptchaScriptPromise;
  }

  // action: a short label like "like" or "comment" — reCAPTCHA includes
  // it in the token, and the server checks it matches what was actually
  // requested, as one more integrity check.
  function getRecaptchaToken(action) {
    if (!recaptchaConfigured_()) return Promise.resolve("");
    return loadRecaptchaScript_()
      .then(function () {
        return new Promise(function (resolve) {
          grecaptcha.ready(function () {
            grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: action }).then(resolve).catch(function () {
              resolve("");
            });
          });
        });
      })
      .catch(function () {
        return ""; // script failed to load (e.g. offline) — degrade to no token rather than block the action
      });
  }

  // Exposed so other page scripts (blog.html, books.html, freebies.html,
  // cms-engine.js) can reuse the same cached/in-flight siteData request,
  // the same visitor token, and the same reCAPTCHA helper, instead of
  // each managing their own.
  window.NobleHartCMS = {
    loadSiteData: loadSiteData,
    esc: esc,
    isReal: isReal,
    getVisitorToken: getVisitorToken,
    getRecaptchaToken: getRecaptchaToken
  };

  // ---- 1. Announcement banner ----
  function priorityRank(p) {
    if (typeof p === "number") return p;
    const s = String(p || "").toLowerCase();
    if (s === "high") return 0;
    if (s === "low") return 2;
    const n = Number(s);
    return isNaN(n) || s === "" ? 1 : n;
  }

  function applyAnnouncement(list) {
    if (!list || !list.length) return;
    const a = list.slice().sort((x, y) => priorityRank(x.Priority) - priorityRank(y.Priority))[0];
    const dismissKey = "nh_ann_dismissed_" + a.Announcement_ID;
    try {
      if (localStorage.getItem(dismissKey)) return;
    } catch (e) {}

    const bar = el("div", "announcement-bar");
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Announcement");
    const text = el("p", "announcement-text");
    text.innerHTML = `<strong>${esc(a.Title)}</strong>${a.Message ? " " + esc(a.Message) : ""}`;
    if (isReal(a.Link_URL) && a.Link_Text) {
      const link = el("a", "announcement-link", esc(a.Link_Text) + " →");
      link.href = a.Link_URL;
      text.appendChild(document.createTextNode(" "));
      text.appendChild(link);
    }
    const close = el("button", "announcement-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss announcement");
    close.addEventListener("click", function () {
      bar.remove();
      try {
        localStorage.setItem(dismissKey, "1");
      } catch (e) {}
    });
    bar.appendChild(text);
    bar.appendChild(close);
    document.body.insertBefore(bar, document.body.firstChild);
  }

  // ---- 2. Site settings ----
  function applySettings(settings) {
    if (!settings) return;
    document.querySelectorAll("[data-setting]").forEach(function (node) {
      const value = settings[node.getAttribute("data-setting")];
      if (value !== undefined && value !== null && String(value).trim() !== "") node.textContent = value;
    });
    if (settings.site_name) {
      const t = document.title.split(" — ");
      if (t.length > 1 && t[t.length - 1] === "Noble Hart") {
        t[t.length - 1] = settings.site_name;
        document.title = t.join(" — ");
      }
    }
  }

  // ---- 3. Maintenance mode ----
  function applyMaintenance(settings) {
    if (!settings || String(settings.maintenance_mode || "").toLowerCase() !== "yes") return;
    const cover = el("div", "maintenance-cover");
    cover.innerHTML =
      "<div><h1>" + esc(settings.site_name || "Noble Hart") + "</h1><p>" +
      esc(settings.maintenance_message || "We're making a few improvements and will be back very soon.") +
      "</p></div>";
    document.body.appendChild(cover);
    document.documentElement.classList.add("maintenance-on");
  }

  // ---- 4. Homepage featured slots ----
  function findFeatured(list, placement) {
    return (list || []).find((f) => String(f.Placement || "").toLowerCase() === placement.toLowerCase());
  }

  // Fill gaps in a Featured row from the book/freebie/article it points to.
  function resolveFeatured(f, data) {
    let source = null;
    if (f.Content_Type === "Book") source = (data.books || []).find((b) => b.Book_ID === f.Content_ID);
    if (f.Content_Type === "Freebie") source = (data.freebies || []).find((x) => x.Freebie_ID === f.Content_ID);
    if (f.Content_Type === "Article") source = (data.articles || []).find((x) => x.Article_ID === f.Content_ID);
    source = source || {};
    return {
      headline: f.Headline || source.Title || "",
      sub: f.Subheadline || source.Subtitle || source.Description || source.Excerpt || "",
      image: [f.Image_URL, source.Cover_Image_URL, source.Featured_Image_URL].find(isReal) || "",
      buttonText: f.Button_Text || source.CTA_Text || "",
      buttonUrl: [f.Button_URL, source.Download_URL, source.Preview_URL, source.Amazon_URL].find(isReal) || "",
    };
  }

  // Keep the two-tone headline style: highlight the last sentence.
  function headlineHtml(text) {
    const t = String(text).trim();
    const parts = t.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [t];
    if (parts.length > 1) {
      const last = parts.pop().trim();
      return esc(parts.join("").trim()) + " <span>" + esc(last) + "</span>";
    }
    const words = t.split(/\s+/);
    if (words.length > 2) return esc(words.slice(0, -2).join(" ")) + " <span>" + esc(words.slice(-2).join(" ")) + "</span>";
    return esc(t);
  }

  function applyFeatured(data) {
    const hero = findFeatured(data.featured, "Homepage Hero");
    const heroTitle = document.getElementById("heroTitle");
    if (hero && heroTitle) {
      const r = resolveFeatured(hero, data);
      if (r.headline) heroTitle.innerHTML = headlineHtml(r.headline);
      const lead = document.getElementById("heroLead");
      if (lead && r.sub) lead.textContent = r.sub;
      const cta = document.getElementById("heroCta");
      if (cta && r.buttonText && r.buttonUrl) {
        cta.innerHTML = esc(r.buttonText) + " <span>→</span>";
        cta.href = r.buttonUrl;
      }
    }

    const freebie = findFeatured(data.featured, "Homepage Freebie");
    const strip = document.getElementById("featuredFreebie");
    if (freebie && strip) {
      const r = resolveFeatured(freebie, data);
      if (r.headline && r.buttonUrl) {
        document.getElementById("featuredFreebieTitle").textContent = r.headline;
        document.getElementById("featuredFreebieText").textContent = r.sub;
        const btn = document.getElementById("featuredFreebieBtn");
        btn.innerHTML = esc(r.buttonText || "Get the Free Resource") + " <span>→</span>";
        btn.href = r.buttonUrl;
        strip.hidden = false;
      }
    }
  }

  loadSiteData()
    .then(function (data) {
      applySettings(data.settings);
      applyMaintenance(data.settings);
      applyAnnouncement(data.announcements);
      applyFeatured(data);
    })
    .catch(function () {});
})();
