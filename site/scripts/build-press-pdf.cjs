#!/usr/bin/env node
// Regenerates site/imprensa.pdf from site/imprensa.html.
// Run this after ANY change to imprensa.html or css/imprensa.css so the
// downloadable PDF on the cover slide stays in sync with the on-page deck.
//
// Requires Playwright. If it isn't a local dependency, point NODE_PATH at a
// global install, e.g.:
//   NODE_PATH=/opt/node22/lib/node_modules node site/scripts/build-press-pdf.cjs
//
// Usage: node site/scripts/build-press-pdf.cjs

const { chromium } = require("playwright");
const path = require("node:path");

const siteDir = path.resolve(__dirname, "..");
const htmlPath = path.join(siteDir, "imprensa.html");
const pdfPath = path.join(siteDir, "imprensa.pdf");

(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto("file://" + htmlPath, { waitUntil: "load", timeout: 30000 });
    try {
      await page.evaluate(() => document.fonts && document.fonts.ready);
    } catch (e) {
      // fonts API unavailable or fonts failed to load — proceed with fallback fonts
    }
    await page.waitForTimeout(300);
    await page.pdf({
      path: pdfPath,
      width: "1920px",
      height: "1080px",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });
    console.log("Wrote " + pdfPath);
  } finally {
    await browser.close();
  }
})();
