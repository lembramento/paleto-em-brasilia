(function () {
  "use strict";

  var CONFIG = window.SITE_CONFIG || {};
  var LANG_KEY = "paleto_lang";
  var state = { lang: "pt" };

  // ---------- IDIOMA ----------
  function applyLang(lang) {
    document.querySelectorAll("[data-pt]").forEach(function (node) {
      var html = lang === "en" ? node.dataset.en : node.dataset.pt;
      if (html !== undefined) node.innerHTML = html;
    });
    document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.langBtn === lang);
    });
    document.documentElement.lang = lang === "en" ? "en" : "pt-BR";
  }

  function setLang(lang) {
    if (state.lang === lang) return;
    state.lang = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    applyLang(lang);
  }

  document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
    btn.addEventListener("click", function () { setLang(btn.dataset.langBtn); });
  });

  var savedLang = "pt";
  try { savedLang = localStorage.getItem(LANG_KEY) || "pt"; } catch (e) {}
  state.lang = savedLang;
  applyLang(savedLang);

  // ---------- TWEAKS / CONFIG ----------
  var presaveEls = document.querySelectorAll("[data-presave-link], [data-presave-cta]");
  presaveEls.forEach(function (el) { el.href = CONFIG.preSaveUrl || "#"; });

  var instagramEl = document.querySelector("[data-instagram-link]");
  if (instagramEl) instagramEl.href = CONFIG.instagramUrl || "#";

  var pressEl = document.querySelector("[data-press-link]");
  if (pressEl) {
    var pressUrl = CONFIG.pressReleaseUrl || "#";
    pressEl.href = pressUrl;
    if (pressUrl === "#") pressEl.removeAttribute("download");
  }

  if (CONFIG.mostrarArquivo === false) {
    var archiveSection = document.querySelector('[data-section="arquivo"]');
    if (archiveSection) archiveSection.remove();
  }

  var channelEl = document.querySelector("[data-youtube-channel]");
  if (channelEl) {
    if (CONFIG.youtubeChannelUrl) channelEl.href = CONFIG.youtubeChannelUrl;
    else channelEl.classList.remove("archive-channel");
  }

  // ---------- PRONUNCIAMENTOS (lista + player sob demanda) ----------
  function buildArchiveRows() {
    var list = document.querySelector("[data-archive-list]");
    if (!list) return;

    var items = CONFIG.pronunciamentos || [];
    items.forEach(function (item, i) {
      var hasVideo = !!item.youtubeId;

      var row = document.createElement("div");
      row.className = "archive-row" + (hasVideo ? "" : " last");
      if (i === items.length - 1) row.classList.add("is-last-item");

      var num = document.createElement("span");
      num.className = "archive-num";
      num.textContent = item.numero || "";

      var quote = document.createElement("span");
      quote.className = "archive-quote";
      if (item.pt) quote.dataset.pt = item.pt;
      if (item.en) quote.dataset.en = item.en;

      var time = document.createElement("span");
      time.className = "archive-time";
      time.textContent = item.duracao || "--:--";

      var play = document.createElement("span");
      play.className = "archive-play";
      play.textContent = hasVideo ? "▶" : "✕";

      row.appendChild(num);
      row.appendChild(quote);
      row.appendChild(time);
      row.appendChild(play);
      list.appendChild(row);

      if (!hasVideo) return;

      var player = document.createElement("div");
      player.className = "archive-player";
      player.hidden = true;
      list.appendChild(player);

      row.setAttribute("role", "button");
      row.tabIndex = 0;

      function toggle() {
        if (player.hidden) {
          player.hidden = false;
          play.textContent = "▬";
          if (!player.firstChild) mountThumb(player, item);
        } else {
          player.hidden = true;
          play.textContent = "▶";
          player.innerHTML = "";
        }
      }

      row.addEventListener("click", toggle);
      row.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
    });
  }

  function mountThumb(container, item) {
    var thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = "archive-thumb";
    thumb.setAttribute("aria-label", "Play");

    var img = document.createElement("img");
    img.loading = "lazy";
    img.alt = "";
    img.src = "https://i.ytimg.com/vi/" + item.youtubeId + "/maxresdefault.jpg";
    img.addEventListener("error", function () {
      img.src = "https://i.ytimg.com/vi/" + item.youtubeId + "/hqdefault.jpg";
    });

    var badge = document.createElement("span");
    badge.className = "archive-thumb-play";
    badge.textContent = "▶";

    thumb.appendChild(img);
    thumb.appendChild(badge);
    container.appendChild(thumb);

    thumb.addEventListener("click", function () {
      var frame = document.createElement("iframe");
      frame.className = "archive-iframe";
      frame.src = "https://www.youtube-nocookie.com/embed/" + item.youtubeId +
        "?autoplay=1&rel=0&modestbranding=1";
      frame.title = item.pt || "";
      frame.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      frame.allowFullscreen = true;
      container.innerHTML = "";
      container.appendChild(frame);
    });
  }

  buildArchiveRows();
  applyLang(state.lang);

  // ---------- ENVIO PARA MAILERLITE (sem sair da página) ----------
  function submitEmailToMailerLite(email) {
    var action = CONFIG.mailerlite && CONFIG.mailerlite.action;
    if (!action) return;

    var form = document.createElement("form");
    form.action = action;
    form.method = "post";
    form.target = "ml-target";
    form.style.display = "none";

    var fields = {
      "fields[email]": email,
      "ml-submit": "1",
      "anticsrf": "true"
    };
    Object.keys(fields).forEach(function (name) {
      var input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = fields[name];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
    setTimeout(function () { form.remove(); }, 1000);
  }

  // ---------- FORMULÁRIO PRINCIPAL (seção "A banda") ----------
  var signupForm = document.querySelector("[data-signup-form]");
  if (signupForm) {
    signupForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = signupForm.querySelector(".email-input");
      var msgEl = signupForm.querySelector("[data-signup-msg]");
      var email = input.value.trim();
      if (!email) return;

      submitEmailToMailerLite(email);

      if (msgEl) {
        msgEl.textContent = state.lang === "en"
          ? "Recorded. Nothing else will be said."
          : "Registrado. Nada mais será dito.";
      }
      signupForm.reset();
    });
  }

  // ---------- FLUXO: RECEBA A INTIMAÇÃO ----------
  var overlay = document.querySelector("[data-modal-overlay]");
  var steps = {
    email: document.querySelector('[data-step="email"]'),
    presave: document.querySelector('[data-step="presave"]'),
    fim: document.querySelector('[data-step="fim"]')
  };

  function showStep(name) {
    Object.keys(steps).forEach(function (key) {
      if (steps[key]) steps[key].hidden = key !== name;
    });
  }

  function openIntimacao() {
    showStep("email");
    overlay.hidden = false;
  }

  function closeIntimacao() {
    overlay.hidden = true;
    showStep("email");
    var emailForm = document.querySelector("[data-intimacao-email-form]");
    if (emailForm) emailForm.reset();
  }

  document.querySelectorAll("[data-open-intimacao]").forEach(function (btn) {
    btn.addEventListener("click", openIntimacao);
  });

  document.querySelectorAll("[data-close-intimacao]").forEach(function (btn) {
    btn.addEventListener("click", closeIntimacao);
  });

  if (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeIntimacao();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay && !overlay.hidden) closeIntimacao();
  });

  var intimacaoEmailForm = document.querySelector("[data-intimacao-email-form]");
  if (intimacaoEmailForm) {
    intimacaoEmailForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var input = intimacaoEmailForm.querySelector(".email-input");
      var email = input.value.trim();
      if (!email) return;
      submitEmailToMailerLite(email);
      showStep("presave");
    });
  }

  var presaveCta = document.querySelector("[data-presave-cta]");
  if (presaveCta) {
    presaveCta.addEventListener("click", function () {
      // Deixa o link abrir o pré-save numa nova aba normalmente
      // e avança o modal para a etapa final.
      showStep("fim");
    });
  }
})();
