(function () {
  "use strict";

  var STAGE_W = 1920;
  var STAGE_H = 1080;

  var viewport = document.querySelector("[data-deck-viewport]");
  var stage = document.querySelector("[data-deck-stage]");
  var slides = Array.prototype.slice.call(document.querySelectorAll("[data-slide]"));
  var prevBtn = document.querySelector("[data-deck-prev]");
  var nextBtn = document.querySelector("[data-deck-next]");
  var currentEl = document.querySelector("[data-deck-current]");
  var totalEl = document.querySelector("[data-deck-total]");

  if (!stage || !slides.length) return;

  var index = 0;

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  function render() {
    slides.forEach(function (slide, i) {
      slide.classList.toggle("is-active", i === index);
    });
    if (currentEl) currentEl.textContent = String(index + 1).padStart(2, "0");
    if (totalEl) totalEl.textContent = String(slides.length).padStart(2, "0");
    if (prevBtn) prevBtn.disabled = index === 0;
    if (nextBtn) nextBtn.disabled = index === slides.length - 1;
    try { history.replaceState(null, "", "#slide-" + (index + 1)); } catch (e) {}
  }

  function goTo(n) {
    var next = clamp(n, 0, slides.length - 1);
    if (next === index) return;
    index = next;
    render();
  }

  function next() { goTo(index + 1); }
  function prev() { goTo(index - 1); }

  if (prevBtn) prevBtn.addEventListener("click", prev);
  if (nextBtn) nextBtn.addEventListener("click", next);

  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); next(); }
    else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
    else if (e.key === "Home") { e.preventDefault(); goTo(0); }
    else if (e.key === "End") { e.preventDefault(); goTo(slides.length - 1); }
  });

  // Swipe (touch)
  var touchStartX = null;
  viewport.addEventListener("touchstart", function (e) {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  viewport.addEventListener("touchend", function (e) {
    if (touchStartX === null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { dx < 0 ? next() : prev(); }
    touchStartX = null;
  }, { passive: true });

  function fit() {
    var w = viewport.clientWidth;
    var h = viewport.clientHeight;
    var scale = Math.min(w / STAGE_W, h / STAGE_H);
    stage.style.setProperty("--deck-scale", scale);
  }

  window.addEventListener("resize", fit);
  fit();

  // Align the timeline rule (slide 6) so it passes through the dot
  // centers instead of a hand-tuned pixel offset — robust to font
  // metric differences and independent of the deck's --deck-scale.
  function positionTimelineRule() {
    var timeline = document.querySelector(".timeline");
    var rule = document.querySelector(".timeline-rule");
    var dot = timeline && timeline.querySelector(".timeline-dot span");
    if (!timeline || !rule || !dot) return;
    var top = 0;
    var el = dot;
    while (el && el !== timeline) {
      top += el.offsetTop;
      el = el.offsetParent;
    }
    rule.style.top = (top + dot.offsetHeight / 2) + "px";
  }

  positionTimelineRule();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(positionTimelineRule).catch(function () {});
  }

  var startIndex = 0;
  var hash = window.location.hash.match(/^#slide-(\d+)$/);
  if (hash) startIndex = clamp(parseInt(hash[1], 10) - 1, 0, slides.length - 1);
  index = startIndex;
  render();
})();
