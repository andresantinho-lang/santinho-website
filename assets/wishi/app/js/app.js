/*
 * Wishi front-end logic. No build step, no dependencies.
 * Sections: 1 taxonomy, 2 helpers, 3 filters, 4 product grid, 5 gift list, 6 click tracking,
 *           7 chat (AI + local fallback), 8 start-up.
 */
(function () {
  "use strict";

  var CFG = window.GIFT_CONFIG || {};
  var SYMBOL = CFG.currencySymbol || "€";

  /* ------------------------------------------------------------------ 1. Taxonomy */

  var BUDGET_CAP = 200; // slider maximum. At the cap the upper limit is removed ("€200+").
  var BUDGET_STEP = 5;

  var RECIPIENTS = [
    { id: "man", label: "Man", emoji: "👨" },
    { id: "woman", label: "Woman", emoji: "👩" },
    { id: "mother", label: "Mother", emoji: "🌷" },
    { id: "father", label: "Father", emoji: "🧢" },
    { id: "brother", label: "Brother", emoji: "🤜" },
    { id: "sister", label: "Sister", emoji: "🌟" },
    { id: "boyfriend", label: "Boyfriend", emoji: "💙" },
    { id: "girlfriend", label: "Girlfriend", emoji: "💗" },
    { id: "husband", label: "Husband", emoji: "🤵" },
    { id: "wife", label: "Wife", emoji: "👰" },
    { id: "friend", label: "Friend", emoji: "🤝" },
    { id: "colleague", label: "Colleague", emoji: "💼" },
    { id: "kid", label: "Kid", emoji: "🧸" },
    { id: "teenager", label: "Teenager", emoji: "🎧" },
    { id: "grandparent", label: "Grandparent", emoji: "🧓" }
  ];

  var OCCASIONS = [
    { id: "birthday", label: "Birthday", emoji: "🎂" },
    { id: "christmas", label: "Christmas", emoji: "🎄" },
    { id: "anniversary", label: "Anniversary", emoji: "💞" },
    { id: "valentines", label: "Valentine's Day", emoji: "💘" },
    { id: "graduation", label: "Graduation", emoji: "🎓" },
    { id: "thanks", label: "Thank you", emoji: "🙏" },
    { id: "housewarming", label: "Housewarming", emoji: "🏠" },
    { id: "justbecause", label: "Just because", emoji: "🎁" }
  ];

  var CATEGORIES = [
    { name: "Tech", emoji: "🔌", subs: ["Audio", "Smart home", "Accessories", "Cameras"] },
    { name: "Fashion & Accessories", emoji: "👜", subs: ["Clothing", "Bags", "Jewelry", "Watches"] },
    { name: "Beauty & Wellness", emoji: "🧴", subs: ["Skincare", "Fragrance", "Spa & relaxation"] },
    { name: "Home & Decor", emoji: "🏡", subs: ["Kitchen", "Decor", "Candles", "Furniture"] },
    { name: "Food & Drink", emoji: "🍷", subs: ["Gourmet", "Coffee & tea", "Wine & spirits", "Sweets"] },
    { name: "Books & Stationery", emoji: "📚", subs: ["Books", "Journals", "Art supplies"] },
    { name: "Experiences", emoji: "✨", subs: ["Dinner", "Travel", "Classes", "Wellness day"] },
    { name: "Sports & Outdoors", emoji: "⛰️", subs: ["Fitness", "Hiking", "Water sports"] },
    { name: "Hobbies & Games", emoji: "🎲", subs: ["Board games", "Gaming", "Music", "Crafts"] },
    { name: "Kids & Family", emoji: "🧸", subs: ["Toys", "Learning", "Baby"] }
  ];

  var INTERESTS = [
    "cooking", "travel", "music", "fitness", "reading", "gaming", "art", "nature",
    "fashion", "tech", "coffee", "wine", "pets", "photography", "wellness", "home"
  ].map(function (id) { return { id: id, label: id.charAt(0).toUpperCase() + id.slice(1) }; });

  var BUDGET_PRESETS = [
    { id: "0-20", label: "Under " + SYMBOL + "20", min: 0, max: 20 },
    { id: "20-50", label: SYMBOL + "20 to " + SYMBOL + "50", min: 20, max: 50 },
    { id: "50-100", label: SYMBOL + "50 to " + SYMBOL + "100", min: 50, max: 100 },
    { id: "100-200", label: SYMBOL + "100+", min: 100, max: BUDGET_CAP }
  ];

  var STARTERS = [
    "A gift for my girlfriend who loves cooking",
    "Last-minute gift under 30€",
    "Something for my dad, he loves music",
    "A thank-you gift for a colleague"
  ];

  /* ------------------------------------------------------------------ 2. Helpers */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmt(price) { return SYMBOL + Math.round(price); }
  function round5(n) { return Math.round(n / BUDGET_STEP) * BUDGET_STEP; }
  function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function labelOf(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i].label; } }
    return id;
  }
  function has(list, id) { return list.some(function (x) { return x.id === id; }); }

  var store = {
    get: function (key, fallback) {
      try {
        var raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage may be blocked */ }
    }
  };

  var HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
  var EXT = '<svg class="ext" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

  function thumbStyle(p) {
    if (p.image) { return "background:url('" + esc(p.image) + "') center/cover"; }
    var h = p.hue || 220;
    return "background:linear-gradient(135deg,hsl(" + h + " 85% 91%),hsl(" + ((h + 30) % 360) + " 80% 80%))";
  }

  /** The only place an outbound link is built. Adds the affiliate tag for the product's store, if one is configured. */
  function buildOutboundUrl(p) {
    try {
      var u = new URL(p.url);
      var aff = (CFG.affiliate || {})[p.store];
      if (aff && aff.value) { u.searchParams.set(aff.param, aff.value); }
      return u.toString();
    } catch (e) { return p.url; }
  }

  /* ------------------------------------------------------------------ State */

  var state = {
    products: [],
    byId: {},
    f: { recipients: new Set(), occasions: new Set(), categories: new Set(), subs: new Set(), interests: new Set(), min: 0, max: BUDGET_CAP },
    pinned: [],            // ids recommended by the chat, always shown first
    sort: "recommended",
    favs: store.get("gf_favs", []),
    shared: [],            // ids from a shared link (?list=...)
    history: [],           // chat messages [{role, content}]
    lastPickIds: [],
    aiOn: !!CFG.chatEndpoint, // portfolio embed: no AI endpoint, local matching only
    noteShown: false,
    busy: false
  };

  /* ------------------------------------------------------------------ 3. Filters */

  function buildFilterUI() {
    $("#recipient-chips").innerHTML = RECIPIENTS.map(function (r) {
      return '<button type="button" class="who-chip" data-who="' + r.id + '" aria-pressed="false">' +
        '<span class="emoji" aria-hidden="true">' + r.emoji + "</span>" + esc(r.label) + "</button>";
    }).join("");

    $("#occasion-chips").innerHTML = OCCASIONS.map(function (o) {
      return '<button type="button" class="chip" data-occ="' + o.id + '" aria-pressed="false">' + o.emoji + " " + esc(o.label) + "</button>";
    }).join("");

    $("#interest-chips").innerHTML = INTERESTS.map(function (i) {
      return '<button type="button" class="chip" data-int="' + i.id + '" aria-pressed="false">' + esc(i.label) + "</button>";
    }).join("");

    // Only show sub-categories that actually have products.
    var present = {};
    state.products.forEach(function (p) { present[p.category + "|" + p.subcategory] = true; });
    $("#category-list").innerHTML = CATEGORIES.map(function (c) {
      var subs = c.subs.filter(function (s) { return present[c.name + "|" + s]; });
      return '<div class="cat">' +
        '<button type="button" class="cat-btn" data-cat="' + esc(c.name) + '" aria-pressed="false"><span aria-hidden="true">' + c.emoji + "</span> " + esc(c.name) + "</button>" +
        '<div class="subs" data-subs="' + esc(c.name) + '" hidden>' +
        subs.map(function (s) {
          return '<button type="button" class="chip" data-sub="' + esc(c.name + "|" + s) + '" aria-pressed="false">' + esc(s) + "</button>";
        }).join("") +
        "</div></div>";
    }).join("");

    $("#budget-presets").innerHTML = BUDGET_PRESETS.map(function (b) {
      return '<button type="button" class="chip" data-preset="' + b.id + '" aria-pressed="false">' + esc(b.label) + "</button>";
    }).join("");
  }

  function budgetIsDefault() { return state.f.min === 0 && state.f.max === BUDGET_CAP; }
  function budgetText() {
    var f = state.f;
    if (f.min === 0 && f.max < BUDGET_CAP) { return "Up to " + fmt(f.max); }
    return fmt(f.min) + " to " + fmt(f.max) + (f.max >= BUDGET_CAP ? "+" : "");
  }

  function activeFilterCount() {
    var f = state.f;
    return f.recipients.size + f.occasions.size + f.categories.size + f.subs.size + f.interests.size + (budgetIsDefault() ? 0 : 1);
  }

  function syncFilterUI() {
    var f = state.f;
    $$("[data-who]").forEach(function (b) { b.setAttribute("aria-pressed", f.recipients.has(b.dataset.who)); });
    $$("[data-occ]").forEach(function (b) { b.setAttribute("aria-pressed", f.occasions.has(b.dataset.occ)); });
    $$("[data-int]").forEach(function (b) { b.setAttribute("aria-pressed", f.interests.has(b.dataset.int)); });
    $$("[data-cat]").forEach(function (b) { b.setAttribute("aria-pressed", f.categories.has(b.dataset.cat)); });
    $$("[data-subs]").forEach(function (el) { el.hidden = !f.categories.has(el.dataset.subs); });
    $$("[data-sub]").forEach(function (b) { b.setAttribute("aria-pressed", f.subs.has(b.dataset.sub)); });
    $$("[data-preset]").forEach(function (b) {
      var p = BUDGET_PRESETS.filter(function (x) { return x.id === b.dataset.preset; })[0];
      b.setAttribute("aria-pressed", p.min === f.min && p.max === f.max);
    });

    $("#budget-min").value = f.min;
    $("#budget-max").value = f.max;
    var fill = $("#range-fill");
    fill.style.left = (f.min / BUDGET_CAP) * 100 + "%";
    fill.style.right = 100 - (f.max / BUDGET_CAP) * 100 + "%";
    $("#budget-label").textContent = fmt(f.min) + " to " + fmt(f.max) + (f.max >= BUDGET_CAP ? "+" : "");

    $("#filter-count").textContent = activeFilterCount();
  }

  function toggleSet(set, value) {
    if (set.has(value)) { set.delete(value); } else { set.add(value); }
  }

  function resetFilters() {
    var f = state.f;
    f.recipients.clear(); f.occasions.clear(); f.categories.clear(); f.subs.clear(); f.interests.clear();
    f.min = 0; f.max = BUDGET_CAP;
    state.pinned = [];
    render();
  }

  function productMatches(p) {
    var f = state.f;
    if (state.pinned.indexOf(p.id) !== -1) { return true; }
    if (f.recipients.size && !p.recipients.some(function (r) { return f.recipients.has(r); })) { return false; }
    if (f.occasions.size && !p.occasions.some(function (o) { return f.occasions.has(o); })) { return false; }
    if (f.categories.size) {
      if (!f.categories.has(p.category)) { return false; }
      var chosen = Array.from(f.subs).filter(function (k) { return k.indexOf(p.category + "|") === 0; });
      if (chosen.length && !f.subs.has(p.category + "|" + p.subcategory)) { return false; }
    }
    if (f.interests.size && !p.interests.some(function (i) { return f.interests.has(i); })) { return false; }
    if (p.price < f.min) { return false; }
    if (f.max < BUDGET_CAP && p.price > f.max) { return false; }
    return true;
  }

  function recommendedScore(p) {
    var f = state.f, s = 0;
    f.recipients.forEach(function (r) { if (p.recipients.indexOf(r) !== -1) { s += 2; } });
    f.interests.forEach(function (i) { if (p.interests.indexOf(i) !== -1) { s += 2; } });
    f.occasions.forEach(function (o) { if (p.occasions.indexOf(o) !== -1) { s += 1; } });
    var pin = state.pinned.indexOf(p.id);
    if (pin !== -1) { s += 1000 - pin; }
    return s;
  }

  function sortedResults() {
    var list = state.products.filter(productMatches);
    if (state.sort === "price-asc") { list.sort(function (a, b) { return a.price - b.price || a._i - b._i; }); }
    else if (state.sort === "price-desc") { list.sort(function (a, b) { return b.price - a.price || a._i - b._i; }); }
    else { list.sort(function (a, b) { return recommendedScore(b) - recommendedScore(a) || a._i - b._i; }); }
    return list;
  }

  function renderActiveChips() {
    var f = state.f, items = [];
    f.recipients.forEach(function (id) { items.push({ type: "recipients", id: id, label: "For: " + labelOf(RECIPIENTS, id) }); });
    f.occasions.forEach(function (id) { items.push({ type: "occasions", id: id, label: labelOf(OCCASIONS, id) }); });
    f.categories.forEach(function (id) { items.push({ type: "categories", id: id, label: id }); });
    f.subs.forEach(function (key) { items.push({ type: "subs", id: key, label: key.split("|")[1] }); });
    f.interests.forEach(function (id) { items.push({ type: "interests", id: id, label: labelOf(INTERESTS, id) }); });
    if (!budgetIsDefault()) { items.push({ type: "budget", id: "budget", label: "Budget: " + budgetText() }); }
    if (state.pinned.length) { items.push({ type: "pinned", id: "pinned", label: "AI picks (" + state.pinned.length + ")" }); }

    var html = items.map(function (it) {
      return '<span class="active-chip">' + esc(it.label) +
        '<button type="button" data-remove="' + it.type + '" data-id="' + esc(it.id) + '" aria-label="Remove filter: ' + esc(it.label) + '">✕</button></span>';
    }).join("");
    if (items.length > 1) { html += '<button type="button" class="btn btn-ghost small" data-clear-all>Clear all</button>'; }
    $("#active-chips").innerHTML = html;
  }

  function removeFilter(type, id) {
    var f = state.f;
    if (type === "categories") {
      f.categories.delete(id);
      Array.from(f.subs).forEach(function (k) { if (k.indexOf(id + "|") === 0) { f.subs.delete(k); } });
    } else if (type === "budget") { f.min = 0; f.max = BUDGET_CAP; }
    else if (type === "pinned") { state.pinned = []; }
    else { f[type].delete(id); }
    render();
  }

  /* ------------------------------------------------------------------ 4. Product grid */

  function cardHtml(p) {
    var pinned = state.pinned.indexOf(p.id) !== -1;
    var fav = state.favs.indexOf(p.id) !== -1;
    return '<article class="card" data-id="' + p.id + '">' +
      '<div class="card-img" style="' + thumbStyle(p) + '">' +
      '<span aria-hidden="true">' + (p.image ? "" : p.emoji) + "</span>" +
      (pinned ? '<span class="badge">AI pick</span>' : "") +
      '<button type="button" class="fav" data-fav="' + p.id + '" aria-pressed="' + fav + '" aria-label="' + (fav ? "Remove from" : "Save to") + " gift list: " + esc(p.name) + '">' + HEART + "</button>" +
      "</div>" +
      '<div class="card-body">' +
      '<h3 class="card-name">' + esc(p.name) + "</h3>" +
      '<p class="card-desc">' + esc(p.description) + "</p>" +
      '<div class="card-tags">' + p.tags.slice(0, 3).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("") + "</div>" +
      '<div class="card-foot">' +
      '<div class="price-row"><span class="price">' + fmt(p.price) + '</span><span class="store">at ' + esc(p.store) + "</span></div>" +
      '<a class="btn" href="' + esc(buildOutboundUrl(p)) + '" target="_blank" rel="noopener sponsored nofollow" data-out="' + p.id + '">View at ' + esc(p.store) + " " + EXT + "</a>" +
      "</div></div></article>";
  }

  function renderGrid() {
    var list = sortedResults();
    $("#grid").innerHTML = list.map(cardHtml).join("");
    $("#empty").hidden = list.length > 0;
    $("#grid").hidden = list.length === 0;
    $("#result-count").innerHTML = "<strong>" + list.length + "</strong> gift idea" + (list.length === 1 ? "" : "s");
  }

  function render() {
    syncFilterUI();
    renderActiveChips();
    renderGrid();
  }

  /* ------------------------------------------------------------------ 5. Gift list */

  function updateFavButtons() {
    $$("[data-fav]").forEach(function (el) {
      var id = el.dataset.fav, on = state.favs.indexOf(id) !== -1, p = state.byId[id];
      el.setAttribute("aria-pressed", on);
      if (el.classList.contains("fav-text")) { el.textContent = on ? "Saved" : "Save"; }
      else if (p) { el.setAttribute("aria-label", (on ? "Remove from" : "Save to") + " gift list: " + p.name); }
    });
    $("#list-count").textContent = state.favs.length;
  }

  function toggleFav(id) {
    var i = state.favs.indexOf(id);
    if (i === -1) { state.favs.push(id); toast("Saved to your gift list"); }
    else { state.favs.splice(i, 1); toast("Removed from your gift list"); }
    store.set("gf_favs", state.favs);
    updateFavButtons();
    if (!$("#list-drawer").hidden) { renderDrawer(); }
  }

  function miniHtml(p, mode) {
    var action = mode === "shared"
      ? '<button type="button" data-fav="' + p.id + '" class="fav-text" aria-pressed="false">Save</button>'
      : '<button type="button" data-unsave="' + p.id + '" aria-label="Remove ' + esc(p.name) + ' from the list">Remove</button>';
    return '<div class="mini">' +
      '<div class="mini-thumb" style="' + thumbStyle(p) + '" aria-hidden="true">' + (p.image ? "" : p.emoji) + "</div>" +
      "<div><p class=\"mini-name\">" + esc(p.name) + '</p><p class="mini-meta">' + fmt(p.price) + " at " + esc(p.store) + "</p></div>" +
      '<div class="mini-actions"><a href="' + esc(buildOutboundUrl(p)) + '" target="_blank" rel="noopener sponsored nofollow" data-out="' + p.id + '">View</a>' + action + "</div></div>";
  }

  function renderDrawer() {
    var body = $("#list-body"), foot = $("#list-foot"), html = "";
    var mine = state.favs.map(function (id) { return state.byId[id]; }).filter(Boolean);
    var shared = state.shared.map(function (id) { return state.byId[id]; }).filter(Boolean);

    if (shared.length) {
      html += "<h3>Shared with you</h3>" + shared.map(function (p) { return miniHtml(p, "shared"); }).join("");
      html += '<button type="button" class="btn btn-outline small" data-save-shared>Save all to my list</button>';
      html += "<h3>My gift list</h3>";
    }
    if (mine.length) { html += mine.map(function (p) { return miniHtml(p, "mine"); }).join(""); }
    else { html += '<p class="drawer-empty">Nothing saved yet. Tap the heart on any gift to keep it here, then share the list with someone.</p>'; }
    body.innerHTML = html;

    if (mine.length) {
      var total = mine.reduce(function (s, p) { return s + p.price; }, 0);
      foot.innerHTML = '<div class="total"><span>Total of ' + mine.length + " gift" + (mine.length === 1 ? "" : "s") + "</span><span>" + fmt(total) + "</span></div>" +
        '<div class="row"><button type="button" class="btn btn-primary" data-copy-link>Copy share link</button>' +
        '<button type="button" class="btn btn-outline" data-clear-list>Clear list</button></div>';
    } else { foot.innerHTML = ""; }
    updateFavButtons();
  }

  function shareUrl() {
    var u = new URL(window.location.href);
    u.hash = "";
    u.search = "?list=" + state.favs.map(encodeURIComponent).join(","); // commas stay readable in the link
    return u.toString();
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? resolve() : reject(); } catch (e) { reject(e); }
      document.body.removeChild(ta);
    });
  }

  /* Overlay handling shared by the gift list drawer and the filter sheet. */
  var lastFocus = null;

  function showBackdrop(show) { $("#backdrop").hidden = !show; document.body.style.overflow = show ? "hidden" : ""; }

  function openDrawer() {
    lastFocus = document.activeElement;
    renderDrawer();
    var d = $("#list-drawer");
    d.hidden = false;
    showBackdrop(true);
    requestAnimationFrame(function () { d.classList.add("open"); $("#close-list").focus(); });
  }
  function closeDrawer() {
    var d = $("#list-drawer");
    if (d.hidden) { return; }
    d.classList.remove("open");
    showBackdrop(false);
    setTimeout(function () { d.hidden = true; }, 250);
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }
  function openSheet() { lastFocus = document.activeElement; $("#filters").classList.add("open"); showBackdrop(true); $("#close-filters").focus(); }
  function closeSheet() {
    var s = $("#filters");
    if (!s.classList.contains("open")) { return; }
    s.classList.remove("open"); showBackdrop(false);
    if (lastFocus && lastFocus.focus) { lastFocus.focus(); }
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }

  /* ------------------------------------------------------------------ 6. Click tracking */

  function trackClick(id) {
    var p = state.byId[id];
    if (!p) { return; }
    var d = store.get("gf_clicks", { total: 0, products: {}, stores: {}, log: [] });
    d.total += 1;
    d.products[id] = d.products[id] || { n: 0, name: p.name, store: p.store };
    d.products[id].n += 1;
    d.stores[p.store] = (d.stores[p.store] || 0) + 1;
    d.log.push({ t: Date.now(), id: id });
    if (d.log.length > 200) { d.log = d.log.slice(-200); }
    store.set("gf_clicks", d);
  }

  /* ------------------------------------------------------------------ 7. Chat */

  var log, input, sendBtn;

  function scrollLog() { log.scrollTop = log.scrollHeight; }

  function addBubble(role, text) {
    var d = document.createElement("div");
    d.className = "msg " + (role === "user" ? "msg-user" : "msg-bot");
    d.textContent = text;
    log.appendChild(d); scrollLog();
    return d;
  }
  function addNote(text) {
    var d = document.createElement("p");
    d.className = "msg-note"; d.textContent = text;
    log.appendChild(d); scrollLog();
  }
  function addTyping() {
    var d = document.createElement("div");
    d.className = "typing"; d.id = "typing"; d.setAttribute("aria-label", "The assistant is typing");
    d.innerHTML = "<span></span><span></span><span></span>";
    log.appendChild(d); scrollLog();
  }
  function removeTyping() { var t = $("#typing"); if (t) { t.remove(); } }

  function addPicks(ids, reasons, profile) {
    var wrap = document.createElement("div");
    wrap.className = "picks";
    wrap.innerHTML = ids.map(function (id) {
      var p = state.byId[id];
      var saved = state.favs.indexOf(id) !== -1;
      return '<div class="pick">' +
        '<div class="pick-thumb" style="' + thumbStyle(p) + '" aria-hidden="true">' + (p.image ? "" : p.emoji) + "</div>" +
        "<div><p class=\"pick-name\">" + esc(p.name) + "</p>" +
        '<p class="pick-meta">' + fmt(p.price) + " at " + esc(p.store) + "</p>" +
        (reasons && reasons[id] ? '<p class="pick-why">' + esc(reasons[id]) + "</p>" : "") +
        '<div class="pick-actions">' +
        '<a class="btn btn-primary" href="' + esc(buildOutboundUrl(p)) + '" target="_blank" rel="noopener sponsored nofollow" data-out="' + id + '">View at ' + esc(p.store) + " " + EXT + "</a>" +
        '<button type="button" class="btn btn-outline fav-text" data-fav="' + id + '" aria-pressed="' + saved + '">' + (saved ? "Saved" : "Save") + "</button>" +
        "</div></div></div>";
    }).join("");
    log.appendChild(wrap);

    var row = document.createElement("div");
    row.className = "apply-row";
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "btn btn-outline small"; btn.textContent = "Show these in the filters";
    btn.addEventListener("click", function () { applyPicksToFilters(ids, profile); });
    row.appendChild(btn);
    log.appendChild(row);
    scrollLog();
  }

  function applyPicksToFilters(ids, prof) {
    var f = state.f;
    prof = prof || {};
    f.recipients = new Set((prof.recipients || []).filter(function (r) { return has(RECIPIENTS, r); }));
    f.interests = new Set((prof.interests || []).filter(function (i) { return has(INTERESTS, i); }));
    f.occasions = new Set(prof.occasion && has(OCCASIONS, prof.occasion) ? [prof.occasion] : []);
    f.categories.clear(); f.subs.clear();
    f.min = clamp(round5(prof.min || 0), 0, BUDGET_CAP - BUDGET_STEP);
    f.max = prof.max ? clamp(round5(prof.max), f.min + BUDGET_STEP, BUDGET_CAP) : BUDGET_CAP;
    state.pinned = ids.slice();
    state.sort = "recommended"; $("#sort").value = "recommended";
    render();
    $("#results").scrollIntoView({ behavior: "smooth", block: "start" });
    toast("Filters applied. Your picks are first.");
  }

  /* ---- Local "smart matching" fallback (used when the AI endpoint is not available) ---- */

  var RECIPIENT_WORDS = {
    father: ["dad", "father", "daddy", "papa"],
    mother: ["mom", "mum", "mother", "mommy", "mamma", "mama"],
    boyfriend: ["boyfriend", "bf", "fiance"],
    girlfriend: ["girlfriend", "gf", "fiancee"],
    husband: ["husband", "hubby"],
    wife: ["wife", "wifey"],
    brother: ["brother", "bro"],
    sister: ["sister", "sis"],
    colleague: ["colleague", "coworker", "co-worker", "boss", "teammate"],
    grandparent: ["grandma", "grandpa", "grandmother", "grandfather", "grandparent", "grandparents", "granny", "nan", "nonna", "nonno"],
    teenager: ["teen", "teenager", "teenage"],
    kid: ["kid", "child", "son", "daughter", "toddler", "niece", "nephew", "little boy", "little girl", "baby"],
    friend: ["friend", "bestie", "best friend", "flatmate", "roommate", "neighbour", "neighbor"]
  };
  var GENDER_WORDS = {
    man: ["man", "guy", "gentleman", "he", "him", "his", "boy"],
    woman: ["woman", "lady", "she", "her", "hers", "girl"]
  };
  var EXPAND = {
    father: ["father", "man"], mother: ["mother", "woman"], boyfriend: ["boyfriend", "man"], girlfriend: ["girlfriend", "woman"],
    husband: ["husband", "man"], wife: ["wife", "woman"], brother: ["brother", "man"], sister: ["sister", "woman"]
  };
  var INTEREST_WORDS = {
    cooking: ["cook", "cooking", "cooks", "chef", "baking", "bake", "kitchen", "foodie", "food", "pasta"],
    travel: ["travel", "travelling", "traveling", "trip", "trips", "adventure", "holiday", "holidays", "wanderlust", "backpacking"],
    music: ["music", "jazz", "vinyl", "records", "record", "guitar", "piano", "concert", "concerts", "songs", "band", "singing", "ukulele"],
    fitness: ["gym", "fitness", "workout", "workouts", "running", "runs", "sport", "sports", "training", "yoga", "lifting"],
    reading: ["reading", "reads", "books", "book", "novels", "novel", "bookworm", "literature"],
    gaming: ["gaming", "gamer", "games", "game", "console", "videogames", "playstation", "xbox", "nintendo"],
    art: ["art", "painting", "paints", "draw", "drawing", "creative", "crafts", "craft", "design", "illustration", "sketching"],
    nature: ["nature", "hiking", "hike", "outdoors", "outdoor", "camping", "garden", "gardening", "plants", "fishing", "fish", "mountains", "beach", "sea"],
    fashion: ["fashion", "style", "stylish", "clothes", "jewelry", "jewellery", "outfit", "outfits"],
    tech: ["tech", "gadget", "gadgets", "electronics", "technology", "geek", "computers"],
    coffee: ["coffee", "espresso", "tea", "barista"],
    wine: ["wine", "cocktail", "cocktails", "whisky", "whiskey", "drinks", "spirits", "beer"],
    pets: ["dog", "dogs", "cat", "cats", "pet", "pets", "puppy", "kitten"],
    photography: ["photography", "photos", "photo", "camera", "photographer", "photograph"],
    wellness: ["relax", "relaxing", "spa", "wellness", "selfcare", "self-care", "stress", "pamper", "skincare"],
    home: ["home", "house", "decor", "interior", "interiors", "apartment", "flat"]
  };
  var OCCASION_PATTERNS = [
    ["birthday", /\b(birthday|bday|b-day|turns?\s+\d+|turning\s+\d+)\b/],
    ["christmas", /\b(christmas|xmas)\b/],
    ["anniversary", /\banniversar/],
    ["valentines", /\bvalentine/],
    ["graduation", /\bgraduat/],
    ["thanks", /\bthank/],
    ["housewarming", /\b(housewarming|new home|new flat|new house|moving in|moved in)\b/],
    ["justbecause", /\b(just because|no reason|surprise)\b/]
  ];
  var NEGATION = /\b(hate|hates|hated|dislike|dislikes|doesn'?t|does not|don'?t|do not|isn'?t|not|no|never|avoid|without|allergic|sick of|tired of|nothing)\b/;

  function wordRegex(words) {
    return new RegExp("\\b(?:" + words.map(function (w) { return w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }).join("|") + ")\\b", "i");
  }
  var RE = { recipients: {}, gender: {}, interests: {} };
  Object.keys(RECIPIENT_WORDS).forEach(function (k) { RE.recipients[k] = wordRegex(RECIPIENT_WORDS[k]); });
  Object.keys(GENDER_WORDS).forEach(function (k) { RE.gender[k] = wordRegex(GENDER_WORDS[k]); });
  Object.keys(INTEREST_WORDS).forEach(function (k) { RE.interests[k] = wordRegex(INTEREST_WORDS[k]); });

  function parseBudget(t) {
    var m;
    if ((m = t.match(/between\s*€?\s*(\d{1,4})\s*(?:€|eur\w*)?\s*(?:and|-|to)\s*€?\s*(\d{1,4})/))) {
      return { min: round5(Math.min(+m[1], +m[2])), max: round5(Math.max(+m[1], +m[2])) };
    }
    if ((m = t.match(/\b(?:under|below|less than|up to|max(?:imum)?|at most|no more than|budget\s*(?:of|is|:)?)\s*(?:around|about)?\s*€?\s*(\d{1,4})/))) {
      return { min: 0, max: round5(+m[1]) };
    }
    if ((m = t.match(/(?:around|about|roughly|approx\w*|circa)\s*€?\s*(\d{1,4})/))) {
      return { min: round5(+m[1] * 0.5), max: round5(+m[1] * 1.25) };
    }
    if ((m = t.match(/€\s*(\d{1,4})|(\d{1,4})\s*(?:€|eur\w*|euros?)/))) {
      var v = +(m[1] || m[2]);
      return { min: round5(v * 0.5), max: round5(v * 1.25) };
    }
    return null;
  }

  function parseMessage(raw) {
    var text = raw.toLowerCase();
    var out = { recipients: [], interests: [], avoid: [], occasion: null, budget: parseBudget(text), cheaper: false, pricier: false, personal: false };

    // Recipients: specific relationships first, gender words only if nothing specific was found.
    Object.keys(RE.recipients).forEach(function (k) { if (RE.recipients[k].test(text)) { out.recipients.push(k); } });
    if (out.recipients.indexOf("kid") !== -1 && out.recipients.indexOf("teenager") !== -1) { out.recipients.splice(out.recipients.indexOf("kid"), 1); }
    if (out.recipients.length > 1 && out.recipients.indexOf("friend") !== -1) { out.recipients.splice(out.recipients.indexOf("friend"), 1); }
    if (!out.recipients.length) {
      var man = RE.gender.man.test(text), woman = RE.gender.woman.test(text);
      if (man && !woman) { out.recipients.push("man"); }
      else if (woman && !man) { out.recipients.push("woman"); }
    }
    out.recipients = out.recipients.slice(0, 1);

    // Interests, split by clause so "loves jazz, hates gadgets" keeps the two apart.
    var clauses = text
      .replace(/\b(but|except|although)\b/g, ",")
      .replace(/\band\s+(?=(?:he|she|they)?\s*(?:hates?|dislikes?|doesn'?t|does not|isn'?t|never|not)\b)/g, ", ")
      .split(/[.;!?,\n]+/);
    clauses.forEach(function (clause) {
      var negated = NEGATION.test(clause);
      Object.keys(RE.interests).forEach(function (k) {
        if (RE.interests[k].test(clause)) { (negated ? out.avoid : out.interests).push(k); }
      });
    });

    OCCASION_PATTERNS.some(function (pair) { if (pair[1].test(text)) { out.occasion = pair[0]; return true; } return false; });
    out.cheaper = /\b(cheaper|less expensive|lower budget|more affordable|too expensive|cost less)\b/.test(text);
    out.pricier = /\b(more expensive|pricier|splurge|higher budget|spend more|something nicer)\b/.test(text);
    out.personal = /\b(personal|personalised|personalized|custom|thoughtful|unique|meaningful|sentimental)\b/.test(text);
    return out;
  }

  function buildProfile(history) {
    var prof = { recipients: [], interests: [], avoid: [], occasion: null, min: null, max: null, personal: false };
    var lastMax = state.lastPickIds.reduce(function (m, id) { return state.byId[id] ? Math.max(m, state.byId[id].price) : m; }, 0) || null;

    history.filter(function (m) { return m.role === "user"; }).forEach(function (m) {
      var p = parseMessage(m.content);
      if (p.recipients.length) { prof.recipients = p.recipients; }
      p.interests.forEach(function (i) { if (prof.interests.indexOf(i) === -1) { prof.interests.push(i); } });
      p.avoid.forEach(function (i) { if (prof.avoid.indexOf(i) === -1) { prof.avoid.push(i); } });
      prof.interests = prof.interests.filter(function (i) { return prof.avoid.indexOf(i) === -1; });
      if (p.occasion) { prof.occasion = p.occasion; }
      if (p.personal) { prof.personal = true; }
      if (p.budget) { prof.min = p.budget.min; prof.max = p.budget.max; }
      else if (p.cheaper) {
        var base = prof.max || lastMax || 100;
        prof.min = 0; prof.max = Math.max(BUDGET_STEP * 2, round5(base * 0.6));
      } else if (p.pricier) {
        var b2 = prof.max || lastMax || 60;
        prof.min = round5(b2 * 0.9); prof.max = Math.min(BUDGET_CAP, round5(b2 * 2.5));
      }
    });
    return prof;
  }

  function scoreFor(p, prof) {
    var s = 0, why = { interests: [], exact: false };
    if (prof.avoid.length && p.interests.some(function (i) { return prof.avoid.indexOf(i) !== -1; })) { return null; }
    if (prof.max != null && prof.max < BUDGET_CAP && p.price > prof.max) { return null; }
    if (prof.recipients.length) {
      var exact = prof.recipients.some(function (r) { return p.recipients.indexOf(r) !== -1; });
      var wide = prof.recipients.some(function (r) { return (EXPAND[r] || []).some(function (x) { return p.recipients.indexOf(x) !== -1; }); });
      if (exact) { s += 4; why.exact = true; } else if (wide) { s += 1.5; } else { return null; }
    }
    why.interests = prof.interests.filter(function (i) { return p.interests.indexOf(i) !== -1; });
    s += why.interests.length * 3;
    if (prof.interests.length && !why.interests.length) { s -= 1; }
    if (prof.occasion && p.occasions.indexOf(prof.occasion) !== -1) { s += 1.5; }
    if (prof.max != null) { s += 1; if (prof.min && p.price < prof.min) { s -= 1.2; } }
    if (prof.personal && p.tags.indexOf("personalised") !== -1) { s += 2; }
    return { score: s, why: why };
  }

  function joinList(items) {
    if (items.length <= 1) { return items.join(""); }
    return items.slice(0, -1).join(", ") + " and " + items[items.length - 1];
  }

  function reasonFor(p, prof, why) {
    var parts = [];
    if (why.interests.length) {
      parts.push("Fits their love of " + joinList(why.interests.map(function (i) { return labelOf(INTERESTS, i).toLowerCase(); })));
    } else if (prof.recipients.length && why.exact) {
      parts.push("A well-loved pick for a " + labelOf(RECIPIENTS, prof.recipients[0]).toLowerCase());
    }
    if (prof.max != null && prof.max < BUDGET_CAP) { parts.push("at " + fmt(p.price) + " it fits your budget"); }
    if (prof.occasion && p.occasions.indexOf(prof.occasion) !== -1 && parts.length < 2) {
      parts.push("it works well as a " + labelOf(OCCASIONS, prof.occasion).toLowerCase().replace("'s day", "'s") + " gift");
    }
    return parts.length ? parts.join(", and ") + "." : p.description;
  }

  function pickProducts(prof, n) {
    var cands = [];
    state.products.forEach(function (p) {
      var r = scoreFor(p, prof);
      if (r && r.score > 0) { cands.push({ p: p, score: r.score, why: r.why }); }
    });
    cands.sort(function (a, b) { return b.score - a.score || a.p._i - b.p._i; });
    var out = [], perCat = {};
    cands.forEach(function (c) {
      if (out.length >= n || (perCat[c.p.category] || 0) >= 2) { return; }
      perCat[c.p.category] = (perCat[c.p.category] || 0) + 1;
      out.push(c);
    });
    if (out.length < 3) {
      cands.forEach(function (c) { if (out.length < n && out.indexOf(c) === -1) { out.push(c); } });
    }
    return out;
  }

  function localAssistant(history) {
    var prof = buildProfile(history);
    var alreadyAskedBudget = history.some(function (m) { return m.role === "assistant" && /budget in mind/i.test(m.content); });

    if (!prof.recipients.length && !prof.interests.length) {
      return {
        message: "Happy to help. Who is the gift for? For example: my dad, a friend who loves cooking, my sister's 30th.",
        productIds: [], reasons: {}, profile: toProfileOut(prof)
      };
    }

    var picks = pickProducts(prof, 5);
    if (!picks.length) {
      return {
        message: "I couldn't find a strong match for that in our catalogue. Try a higher budget, or tell me one thing they enjoy.",
        productIds: [], reasons: {}, profile: toProfileOut(prof)
      };
    }

    var who = "";
    if (prof.recipients.length) {
      var r = prof.recipients[0], lbl = labelOf(RECIPIENTS, r).toLowerCase();
      who = ["man", "woman", "kid", "teenager"].indexOf(r) !== -1 ? " for a " + lbl : " for your " + lbl;
    }
    var msg = "Here are " + picks.length + " ideas" + who + (prof.occasion ? " (" + labelOf(OCCASIONS, prof.occasion).toLowerCase() + ")" : "") + ".";
    if (prof.max != null && prof.max < BUDGET_CAP) {
      msg += prof.min ? " Budget: " + fmt(prof.min) + " to " + fmt(prof.max) + "." : " Budget: up to " + fmt(prof.max) + ".";
    }
    if (prof.avoid.length) { msg += " I left out " + joinList(prof.avoid.map(function (i) { return labelOf(INTERESTS, i).toLowerCase(); })) + "."; }
    msg += ' Tap "Show these in the filters" to keep browsing similar gifts.';
    if (prof.max == null && !alreadyAskedBudget) { msg += "\n\nDo you have a budget in mind? I can narrow it down."; }

    var reasons = {};
    picks.forEach(function (c) { reasons[c.p.id] = reasonFor(c.p, prof, c.why); });
    return { message: msg, productIds: picks.map(function (c) { return c.p.id; }), reasons: reasons, profile: toProfileOut(prof) };
  }

  function toProfileOut(prof) {
    return { recipients: prof.recipients.slice(), occasion: prof.occasion, min: prof.min, max: prof.max, interests: prof.interests.slice() };
  }

  /* ---- AI endpoint ---- */

  function normalizeServerProfile(pr) {
    pr = pr || {};
    return {
      recipients: (pr.recipients || []).filter(function (r) { return has(RECIPIENTS, r); }),
      occasion: has(OCCASIONS, pr.occasion) ? pr.occasion : null,
      min: typeof pr.budgetMin === "number" ? pr.budgetMin : null,
      max: typeof pr.budgetMax === "number" ? pr.budgetMax : null,
      interests: (pr.interests || []).filter(function (i) { return has(INTERESTS, i); })
    };
  }

  function askServer() {
    var ctl = new AbortController();
    var timer = setTimeout(function () { ctl.abort(); }, 25000);
    return fetch(CFG.chatEndpoint || "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: state.history.slice(-10) }),
      signal: ctl.signal
    }).then(function (res) {
      if (!res.ok) { throw new Error("http " + res.status); }
      return res.json();
    }).then(function (data) {
      if (!data || data.fallback || typeof data.message !== "string") { throw new Error("fallback"); }
      return {
        message: data.message,
        productIds: (data.productIds || []).filter(function (id) { return state.byId[id]; }).slice(0, 6),
        reasons: data.reasons || {},
        profile: normalizeServerProfile(data.profile)
      };
    }).then(function (r) { clearTimeout(timer); return r; }, function (e) { clearTimeout(timer); throw e; });
  }

  function setBusy(on) {
    state.busy = on;
    sendBtn.disabled = on;
    input.disabled = on;
  }

  function autosize() {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 140) + "px";
  }

  function sendMessage(text) {
    text = (text || "").trim();
    if (!text || state.busy) { return Promise.resolve(); }
    setBusy(true);
    $("#starters").hidden = true;
    addBubble("user", text);
    state.history.push({ role: "user", content: text });
    input.value = ""; autosize();
    addTyping();

    var usedFallback = false;
    var work = state.aiOn ? askServer() : Promise.reject(new Error("off"));
    return work.catch(function () {
      state.aiOn = false; usedFallback = true;
      return sleep(500).then(function () { return localAssistant(state.history); });
    }).then(function (data) {
      removeTyping();
      addBubble("bot", data.message);
      state.history.push({ role: "assistant", content: data.message });
      if (data.productIds.length) {
        state.lastPickIds = data.productIds.slice();
        addPicks(data.productIds, data.reasons, data.profile);
      }
      if (usedFallback && !state.noteShown) {
        state.noteShown = true;
        addNote("Smart matching mode: the AI isn't connected yet, so I match your words against our catalogue. Picks always come from the catalogue.");
      }
    }).catch(function () {
      removeTyping();
      addBubble("bot", "Something went wrong on my side. Try again, or use the filters below.");
    }).then(function () { setBusy(false); input.focus(); });
  }

  function initChat() {
    log = $("#chat-log"); input = $("#chat-input"); sendBtn = $("#chat-send");

    $("#starters").innerHTML = STARTERS.map(function (s) {
      return '<button type="button" class="chip" data-starter="' + esc(s) + '">' + esc(s) + "</button>";
    }).join("");

    $("#chat-form").addEventListener("submit", function (e) { e.preventDefault(); sendMessage(input.value); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input.value); }
    });
    input.addEventListener("input", autosize);
  }

  /* ------------------------------------------------------------------ 8. Start-up */

  function bindEvents() {
    document.addEventListener("click", function (e) {
      var t = e.target;
      var el;

      if ((el = t.closest("[data-who]"))) { toggleSet(state.f.recipients, el.dataset.who); return render(); }
      if ((el = t.closest("[data-occ]"))) { toggleSet(state.f.occasions, el.dataset.occ); return render(); }
      if ((el = t.closest("[data-int]"))) { toggleSet(state.f.interests, el.dataset.int); return render(); }
      if ((el = t.closest("[data-cat]"))) {
        var name = el.dataset.cat;
        if (state.f.categories.has(name)) { removeFilter("categories", name); } else { state.f.categories.add(name); render(); }
        return;
      }
      if ((el = t.closest("[data-sub]"))) { toggleSet(state.f.subs, el.dataset.sub); return render(); }
      if ((el = t.closest("[data-preset]"))) {
        var preset = BUDGET_PRESETS.filter(function (x) { return x.id === el.dataset.preset; })[0];
        var same = state.f.min === preset.min && state.f.max === preset.max;
        state.f.min = same ? 0 : preset.min; state.f.max = same ? BUDGET_CAP : preset.max;
        return render();
      }
      if ((el = t.closest("[data-remove]"))) { return removeFilter(el.dataset.remove, el.dataset.id); }
      if (t.closest("[data-clear-all]") || t.closest("#reset-filters") || t.closest("#empty-reset")) { return resetFilters(); }

      if ((el = t.closest("[data-fav]"))) { return toggleFav(el.dataset.fav); }
      if ((el = t.closest("[data-unsave]"))) { return toggleFav(el.dataset.unsave); }
      if ((el = t.closest("[data-out]"))) { trackClick(el.dataset.out); return; } // let the link open normally
      if ((el = t.closest("[data-starter]"))) { return sendMessage(el.dataset.starter); }

      if (t.closest("[data-copy-link]")) {
        return copyText(shareUrl()).then(function () { toast("Link copied. Send it to anyone."); }, function () { toast("Couldn't copy. Select the address bar link instead."); });
      }
      if (t.closest("[data-clear-list]")) { state.favs = []; store.set("gf_favs", state.favs); renderDrawer(); updateFavButtons(); return; }
      if (t.closest("[data-save-shared]")) {
        state.shared.forEach(function (id) { if (state.favs.indexOf(id) === -1) { state.favs.push(id); } });
        store.set("gf_favs", state.favs); renderDrawer(); updateFavButtons(); toast("Saved to your gift list"); return;
      }

      if (t.closest("#open-list") || t.closest("#shared-open")) { return openDrawer(); }
      if (t.closest("#close-list")) { return closeDrawer(); }
      if (t.closest("#open-filters")) { return openSheet(); }
      if (t.closest("#close-filters")) { return closeSheet(); }
      if (t.id === "backdrop") { closeDrawer(); closeSheet(); }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeDrawer(); closeSheet(); }
    });

    $("#sort").addEventListener("change", function (e) { state.sort = e.target.value; renderGrid(); });

    $("#budget-min").addEventListener("input", function (e) {
      state.f.min = Math.min(+e.target.value, state.f.max - BUDGET_STEP);
      syncFilterUI(); renderActiveChips(); renderGrid();
    });
    $("#budget-max").addEventListener("input", function (e) {
      state.f.max = Math.max(+e.target.value, state.f.min + BUDGET_STEP);
      syncFilterUI(); renderActiveChips(); renderGrid();
    });
  }

  function init(products) {
    products.forEach(function (p, i) { p._i = i; state.byId[p.id] = p; });
    state.products = products;

    $$("[data-site-name]").forEach(function (el) { el.textContent = CFG.siteName || "Wishi"; });
    document.title = (CFG.siteName || "Wishi") + ": find something they've been wishing for";

    if (CFG.defaultOccasion && has(OCCASIONS, CFG.defaultOccasion)) { state.f.occasions.add(CFG.defaultOccasion); }
    state.favs = state.favs.filter(function (id) { return state.byId[id]; });

    var shared = new URLSearchParams(window.location.search).get("list");
    if (shared) {
      state.shared = shared.split(",").filter(function (id, i, arr) { return state.byId[id] && arr.indexOf(id) === i; }).slice(0, 60);
      if (state.shared.length) {
        $("#shared-count").textContent = state.shared.length;
        $("#shared-banner").hidden = false;
      }
    }

    buildFilterUI();
    initChat();
    bindEvents();
    render();
    updateFavButtons();
  }

  function start() {
    fetch("data/products.json")
      .then(function (r) { if (!r.ok) { throw new Error("http " + r.status); } return r.json(); })
      .then(init)
      .catch(function () {
        var grid = $("#grid");
        grid.innerHTML = '<p class="empty-title">The gift catalogue could not be loaded.</p><p>If you opened this file directly from your computer, run a local server instead (see the README).</p>';
      });
  }

  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", start); } else { start(); }
})();
