/**
 * Editorial Engine — Academic Portfolio
 * Pretext-powered text reflow around draggable orbs, 60fps, zero DOM reads.
 */
import zh from "./locales/zh.js";
import en from "./locales/en.js";
import {
  layout,
  prepareWithSegments,
  layoutWithLines,
  layoutNextLine,
  walkLineRanges,
} from "@chenglou/pretext";

// ── Typography ──────────────────────────────────────────
const FONT_FAMILY =
  '"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, "Songti SC", "SimSun", serif';
const BODY_FONT = `17px ${FONT_FAMILY}`;
const BODY_LINE_HEIGHT = 28;
const HEADLINE_FONT_FAMILY = FONT_FAMILY;
const PQ_FONT = `italic 18px ${FONT_FAMILY}`;
const PQ_LINE_HEIGHT = 26;

// ── Layout constants ────────────────────────────────────
const GUTTER = 48;
const COL_GAP = 40;
const STATS_BAR_HEIGHT = 42;
const DROP_CAP_LINES = 3;
const MIN_SLOT_WIDTH = 50;

// ── Locale data ─────────────────────────────────────────
const locales = { zh, en };
let currentLang = "zh";

// ── Pull quotes per language ────────────────────────────
const PULL_QUOTES = {
  zh: [
    {
      text: "\u201C胃肠道诊断系统 \u00B7 Kvasir 87.25% \u2197\u201D",
      link: "https://github.com/Shr1mpTop/Gastrointestinal-Diagnosis-System",
    },
    {
      text: "\u201CHackathon_TornPrivacy \u00B7 ZKP隐私增强 \u2197\u201D",
      link: "https://github.com/2022ljz/Hackathon_TornPrivacy",
    },
    {
      text: "\u201C分布式预订系统 \u00B7 共识算法 \u2197\u201D",
      link: "https://github.com/Shr1mpTop/Distributed_Facility_Booking_System",
    },
    { text: "\u201C数学建模省一 \u00B7 标兵奖学金\u00D72\u201D" },
    {
      text: "\u201CPyTorch \u00B7 Solidity \u00B7 LightGBM \u00B7 Docker\u201D",
    },
  ],
  en: [
    {
      text: "\u201CGI Diagnosis \u00B7 Kvasir 87.25% \u2197\u201D",
      link: "https://github.com/Shr1mpTop/Gastrointestinal-Diagnosis-System",
    },
    {
      text: "\u201CTornPrivacy \u00B7 ZKP Privacy \u2197\u201D",
      link: "https://github.com/2022ljz/Hackathon_TornPrivacy",
    },
    {
      text: "\u201CDistributed Booking \u00B7 Consensus \u2197\u201D",
      link: "https://github.com/Shr1mpTop/Distributed_Facility_Booking_System",
    },
    { text: "\u201CMath Modeling Prov. 1st \u00B7 Scholarship \u00D72\u201D" },
    {
      text: "\u201CPyTorch \u00B7 Solidity \u00B7 LightGBM \u00B7 Docker\u201D",
    },
  ],
};

// ── Headlines per language ──────────────────────────────
const HEADLINES = {
  zh: "\u4F55\u81F4\u529B \u00B7 \u5206\u5E03\u5F0F\u7CFB\u7EDF \u00B7 \u533A\u5757\u94FE \u00B7 \u4EBA\u5DE5\u667A\u80FD",
  en: "ZHILI HE \u00B7 DISTRIBUTED SYSTEMS \u00B7 BLOCKCHAIN \u00B7 AI",
};

// ── Helpers ──────────────────────────────────────────────
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "");
}

function buildBodyText(d) {
  const parts = [];
  parts.push(d.bioText);
  parts.push(
    d.researchTitle +
      "\u3000" +
      d.researchPoints.map((p) => stripHtml(p)).join(" "),
  );
  parts.push(
    stripHtml(d.pubHeading) +
      "\u3000" +
      d.pubList.map((p) => stripHtml(p)).join(" "),
  );
  parts.push(d.projHeading);
  for (const proj of d.projList) {
    parts.push(proj.title + " \u2014 " + proj.desc);
  }
  parts.push(
    d.skillsTitle +
      "\u3000" +
      d.skills.map((s) => s.label + ": " + s.value).join(". ") +
      ".",
  );
  parts.push(d.expTitle + "\u3000" + d.expList.join(" "));
  parts.push(d.awardsTitle + "\u3000" + d.awardsList.join(" "));
  parts.push(d.footer);
  return parts.join("\n\n");
}

// ── Slot carving (text around obstacles) ────────────────
function carveTextLineSlots(base, blocked) {
  let slots = [base];
  for (let bi = 0; bi < blocked.length; bi++) {
    const iv = blocked[bi];
    const next = [];
    for (let si = 0; si < slots.length; si++) {
      const s = slots[si];
      if (iv.right <= s.left || iv.left >= s.right) {
        next.push(s);
        continue;
      }
      if (iv.left > s.left) next.push({ left: s.left, right: iv.left });
      if (iv.right < s.right) next.push({ left: iv.right, right: s.right });
    }
    slots = next;
  }
  return slots.filter((s) => s.right - s.left >= MIN_SLOT_WIDTH);
}

function circleIntervalForBand(cx, cy, r, bandTop, bandBottom, hPad, vPad) {
  const top = bandTop - vPad;
  const bottom = bandBottom + vPad;
  if (top >= cy + r || bottom <= cy - r) return null;
  const minDy =
    cy >= top && cy <= bottom ? 0 : cy < top ? top - cy : cy - bottom;
  if (minDy >= r) return null;
  const maxDx = Math.sqrt(r * r - minDy * minDy);
  return { left: cx - maxDx - hPad, right: cx + maxDx + hPad };
}

// ── DOM ─────────────────────────────────────────────────
const stage = document.getElementById("stage");

// ── Pets (replace orbs) ─────────────────────────────────
const petDefs = [
  { fx: 0.18, fy: 0.3, r: 60, hoverR: 90, src: "/pets/golden.svg" },
  { fx: 0.75, fy: 0.25, r: 55, hoverR: 82, src: "/pets/orange-cat.svg" },
  { fx: 0.5, fy: 0.6, r: 58, hoverR: 86, src: "/pets/cow-cat.svg" },
  { fx: 0.28, fy: 0.72, r: 52, hoverR: 78, src: "/pets/shiba.svg" },
];

function createPetEl(def) {
  const el = document.createElement("div");
  el.className = "pet";
  const img = document.createElement("img");
  img.src = def.src;
  img.alt = "";
  img.draggable = false;
  el.appendChild(img);
  stage.appendChild(el);
  return el;
}

const W0 = window.innerWidth;
const H0 = window.innerHeight;
const pets = petDefs.map((d) => ({
  x: d.fx * W0,
  y: d.fy * H0,
  baseR: d.r,
  hoverR: d.hoverR,
  r: d.r,
  targetR: d.r,
  vx: 0,
  vy: 0,
  dragging: false,
  dragStartX: 0,
  dragStartY: 0,
  dragStartPetX: 0,
  dragStartPetY: 0,
  el: createPetEl(d),
}));

// ── Wait for fonts ──────────────────────────────────────
await document.fonts.ready;

// ── Prepared text state ─────────────────────────────────
let preparedBody;
let preparedPQ = [];
let headlineText = "";

const DROP_CAP_SIZE = BODY_LINE_HEIGHT * DROP_CAP_LINES - 4;
const DROP_CAP_FONT = `700 ${DROP_CAP_SIZE}px ${FONT_FAMILY}`;
let DROP_CAP_TOTAL_W = 0;

const dropCapEl = document.createElement("div");
dropCapEl.className = "drop-cap";
stage.appendChild(dropCapEl);

// ── Headline cache (must be declared before prepareLang) ─
let cachedHeadlineKey = "";
let cachedHeadlineFontSize = 24;
let cachedHeadlineLines = [];

function prepareLang(lang) {
  const d = locales[lang] || locales.zh;
  headlineText = HEADLINES[lang] || HEADLINES.zh;
  const bodyText = buildBodyText(d);
  const pullQuoteEntries = PULL_QUOTES[lang] || PULL_QUOTES.zh;

  // Drop cap — first character; prepare body WITHOUT it to avoid CJK cursor issues
  const firstChar = bodyText[0];
  const bodyTextAfterDropCap = bodyText.slice(1);
  preparedBody = prepareWithSegments(bodyTextAfterDropCap, BODY_FONT);
  preparedPQ = pullQuoteEntries.map((pq) => ({
    prepared: prepareWithSegments(pq.text, PQ_FONT),
    link: pq.link || null,
  }));
  const preparedDropCap = prepareWithSegments(firstChar, DROP_CAP_FONT);
  let dcw = 0;
  walkLineRanges(preparedDropCap, 9999, (line) => {
    dcw = line.width;
  });
  DROP_CAP_TOTAL_W = Math.ceil(dcw) + 10;
  dropCapEl.textContent = firstChar;
  dropCapEl.style.font = DROP_CAP_FONT;
  dropCapEl.style.lineHeight = DROP_CAP_SIZE + "px";

  // Invalidate headline cache
  cachedHeadlineKey = "";

  // Update lang indicator
  const sLang = document.getElementById("sLang");
  if (sLang) sLang.textContent = lang.toUpperCase();

  // Update active lang button
  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
}

// Initial preparation
prepareLang(currentLang);

// ── Language switching ──────────────────────────────────
document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    const lang = btn.dataset.lang;
    if (lang && lang !== currentLang) {
      currentLang = lang;
      prepareLang(lang);
    }
  });
});

// ── Element pools ───────────────────────────────────────
const linePool = [];
const headlinePool = [];
const pqLinePool = [];
const pqBoxPool = [];

function syncPool(pool, count, className) {
  while (pool.length < count) {
    const el = document.createElement("div");
    el.className = className;
    stage.appendChild(el);
    pool.push(el);
  }
  for (let i = 0; i < pool.length; i++) {
    pool[i].style.display = i < count ? "" : "none";
  }
}

// ── Headline fitting (binary search) ────────────────────

function fitHeadline(maxWidth, maxHeight) {
  const key = `${maxWidth}:${maxHeight}:${headlineText}`;
  if (key === cachedHeadlineKey)
    return { fontSize: cachedHeadlineFontSize, lines: cachedHeadlineLines };
  cachedHeadlineKey = key;

  let lo = 24,
    hi = 100,
    best = lo;
  let bestLines = [];

  while (lo <= hi) {
    const size = Math.floor((lo + hi) / 2);
    const font = `700 ${size}px ${HEADLINE_FONT_FAMILY}`;
    const lh = Math.round(size * 0.93);
    const prepared = prepareWithSegments(headlineText, font);
    let breaksWord = false;
    let lineCount = 0;
    walkLineRanges(prepared, maxWidth, (line) => {
      lineCount++;
      if (line.end.graphemeIndex !== 0) breaksWord = true;
    });
    const totalH = lineCount * lh;
    if (!breaksWord && totalH <= maxHeight) {
      best = size;
      const result = layoutWithLines(prepared, maxWidth, lh);
      bestLines = result.lines.map((l, i) => ({
        x: 0,
        y: i * lh,
        text: l.text,
        width: l.width,
      }));
      lo = size + 1;
    } else {
      hi = size - 1;
    }
  }

  cachedHeadlineFontSize = best;
  cachedHeadlineLines = bestLines;
  return { fontSize: best, lines: bestLines };
}

// ── Column layout (text reflow around obstacles) ────────
function layoutColumn(
  prepared,
  startCursor,
  regionX,
  regionY,
  regionW,
  regionH,
  lineHeight,
  circleObs,
  rectObstacles,
) {
  let cursor = startCursor;
  let lineTop = regionY;
  const lines = [];
  let textExhausted = false;

  while (lineTop + lineHeight <= regionY + regionH && !textExhausted) {
    const bandTop = lineTop;
    const bandBottom = lineTop + lineHeight;
    const blocked = [];

    for (let oi = 0; oi < circleObs.length; oi++) {
      const c = circleObs[oi];
      const iv = circleIntervalForBand(
        c.cx,
        c.cy,
        c.r,
        bandTop,
        bandBottom,
        c.hPad,
        c.vPad,
      );
      if (iv !== null) blocked.push(iv);
    }
    for (let ri = 0; ri < rectObstacles.length; ri++) {
      const r = rectObstacles[ri];
      if (bandBottom <= r.y || bandTop >= r.y + r.h) continue;
      blocked.push({ left: r.x, right: r.x + r.w });
    }

    const slots = carveTextLineSlots(
      { left: regionX, right: regionX + regionW },
      blocked,
    );
    if (slots.length === 0) {
      lineTop += lineHeight;
      continue;
    }
    slots.sort((a, b) => a.left - b.left);

    for (let si = 0; si < slots.length; si++) {
      const slot = slots[si];
      const slotWidth = slot.right - slot.left;
      const line = layoutNextLine(prepared, cursor, slotWidth);
      if (line === null) {
        textExhausted = true;
        break;
      }
      lines.push({
        x: Math.round(slot.left),
        y: Math.round(lineTop),
        text: line.text,
        width: line.width,
      });
      cursor = line.end;
    }
    lineTop += lineHeight;
  }
  return { lines, cursor };
}

// ── Pointer / Drag + Hover interaction ──────────────────
let activePet = null;
let pointerX = -9999;
let pointerY = -9999;

function hitTestPets(px, py) {
  for (let i = pets.length - 1; i >= 0; i--) {
    const p = pets[i];
    const dx = px - p.x,
      dy = py - p.y;
    if (dx * dx + dy * dy <= p.hoverR * p.hoverR) return p;
  }
  return null;
}

stage.addEventListener("click", (e) => {
  const box = e.target.closest(".pullquote-link");
  if (box && box.dataset.link) {
    window.open(box.dataset.link, "_blank", "noopener");
  }
});

stage.addEventListener("pointerdown", (e) => {
  const pet = hitTestPets(e.clientX, e.clientY);
  if (pet) {
    activePet = pet;
    pet.dragging = true;
    pet.vx = 0;
    pet.vy = 0;
    pet.dragStartX = e.clientX;
    pet.dragStartY = e.clientY;
    pet.dragStartPetX = pet.x;
    pet.dragStartPetY = pet.y;
    e.preventDefault();
  }
});

window.addEventListener("pointermove", (e) => {
  pointerX = e.clientX;
  pointerY = e.clientY;
  if (activePet) {
    activePet.x = activePet.dragStartPetX + (e.clientX - activePet.dragStartX);
    activePet.y = activePet.dragStartPetY + (e.clientY - activePet.dragStartY);
  }
  for (let i = 0; i < pets.length; i++) {
    const p = pets[i];
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    const inside = dx * dx + dy * dy <= p.hoverR * p.hoverR;
    p.targetR = inside ? p.hoverR : p.baseR;
    p.el.classList.toggle("hovered", inside);
  }
});

window.addEventListener("pointerup", () => {
  if (activePet) {
    activePet.dragging = false;
    activePet = null;
  }
});

// ── FPS tracking ────────────────────────────────────────
const fpsTimestamps = [];
let fpsDisplay = 60;
function updateFPS(now) {
  fpsTimestamps.push(now);
  while (fpsTimestamps.length > 0 && fpsTimestamps[0] < now - 1000)
    fpsTimestamps.shift();
  fpsDisplay = fpsTimestamps.length;
}

// ── Stats elements ──────────────────────────────────────
const elSLines = document.getElementById("sLines");
const elSReflow = document.getElementById("sReflow");
const elSDom = document.getElementById("sDom");
const elSFps = document.getElementById("sFps");
const elSCols = document.getElementById("sCols");

// ── Animation loop ──────────────────────────────────────
let lastTime = 0;

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  const pw = document.documentElement.clientWidth;
  const ph = document.documentElement.clientHeight;

  // ── Update pet radii (smooth lerp on hover) ──
  for (let i = 0; i < pets.length; i++) {
    const p = pets[i];
    p.r += (p.targetR - p.r) * Math.min(dt * 8, 1);
  }

  // ── Apply pet velocity (from collisions only, with friction) ──
  for (let i = 0; i < pets.length; i++) {
    const p = pets[i];
    if (p.dragging) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    // Friction — slow down quickly
    p.vx *= Math.max(0, 1 - 5 * dt);
    p.vy *= Math.max(0, 1 - 5 * dt);
    // Clamp inside viewport
    if (p.x - p.r < 0) {
      p.x = p.r;
      p.vx = Math.abs(p.vx);
    }
    if (p.x + p.r > pw) {
      p.x = pw - p.r;
      p.vx = -Math.abs(p.vx);
    }
    if (p.y - p.r < GUTTER * 0.5) {
      p.y = p.r + GUTTER * 0.5;
      p.vy = Math.abs(p.vy);
    }
    if (p.y + p.r > ph - STATS_BAR_HEIGHT) {
      p.y = ph - STATS_BAR_HEIGHT - p.r;
      p.vy = -Math.abs(p.vy);
    }
  }

  // ── Pet-pet collision ──
  for (let i = 0; i < pets.length; i++) {
    const a = pets[i];
    for (let j = i + 1; j < pets.length; j++) {
      const b = pets[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.r + b.r + 10;
      if (dist < minDist && dist > 0.1) {
        const overlap = minDist - dist;
        const nx = dx / dist;
        const ny = dy / dist;
        const push = overlap * 120;
        if (!a.dragging) {
          a.vx -= nx * push * dt;
          a.vy -= ny * push * dt;
        }
        if (!b.dragging) {
          b.vx += nx * push * dt;
          b.vy += ny * push * dt;
        }
      }
    }
  }

  // ── Circle obstacles for text ──
  const circleObs = pets.map((p) => ({
    cx: p.x,
    cy: p.y,
    r: p.r,
    hPad: 14,
    vPad: 4,
  }));

  const t0 = performance.now();

  // ── Headline ──
  const headlineWidth = Math.min(pw - GUTTER * 2, 1000);
  const maxHeadlineH = Math.floor(ph * 0.25);
  const { fontSize: hlSize, lines: hlLines } = fitHeadline(
    headlineWidth,
    maxHeadlineH,
  );
  const hlLineHeight = Math.round(hlSize * 0.93);
  const hlFont = `700 ${hlSize}px ${HEADLINE_FONT_FAMILY}`;
  const hlHeight = hlLines.length * hlLineHeight;

  syncPool(headlinePool, hlLines.length, "headline-line");
  for (let i = 0; i < hlLines.length; i++) {
    const el = headlinePool[i];
    const line = hlLines[i];
    el.textContent = line.text;
    el.style.left = GUTTER + "px";
    el.style.top = GUTTER + line.y + "px";
    el.style.font = hlFont;
    el.style.lineHeight = hlLineHeight + "px";
  }

  // ── Body layout ──
  const bodyTop = GUTTER + hlHeight + 20;
  const bodyHeight = ph - bodyTop - STATS_BAR_HEIGHT - 8;
  const colCount = pw > 1000 ? 3 : pw > 640 ? 2 : 1;
  const totalGutter = GUTTER * 2 + COL_GAP * (colCount - 1);
  const maxContentW = Math.min(pw, 1500);
  const colWidth = Math.floor((maxContentW - totalGutter) / colCount);
  const contentLeft = Math.round(
    (pw - (colCount * colWidth + (colCount - 1) * COL_GAP)) / 2,
  );
  const col0X = contentLeft;

  // Drop cap rect obstacle
  const dropCapRect = {
    x: col0X - 2,
    y: bodyTop - 2,
    w: DROP_CAP_TOTAL_W,
    h: DROP_CAP_LINES * BODY_LINE_HEIGHT + 2,
  };
  dropCapEl.style.left = col0X + "px";
  dropCapEl.style.top = bodyTop + "px";

  // ── Pull quotes placement ──
  const pqPlacements = [
    { colIdx: 0, yFrac: 0.12, wFrac: 0.48, side: "right" },
    { colIdx: 0, yFrac: 0.52, wFrac: 0.5, side: "left" },
    { colIdx: 1, yFrac: 0.2, wFrac: 0.48, side: "left" },
    { colIdx: 1, yFrac: 0.62, wFrac: 0.5, side: "right" },
    { colIdx: 2, yFrac: 0.35, wFrac: 0.48, side: "right" },
  ];

  const pqRects = [];
  for (let pi = 0; pi < pqPlacements.length; pi++) {
    const p = pqPlacements[pi];
    if (p.colIdx >= colCount) continue;
    const pqEntry = preparedPQ[pi];
    if (!pqEntry) continue;
    const pqW = Math.round(colWidth * p.wFrac);
    const result = layout(pqEntry.prepared, pqW - 20, PQ_LINE_HEIGHT);
    const pqH = result.height + 16;
    const colX = contentLeft + p.colIdx * (colWidth + COL_GAP);
    const pqX = p.side === "right" ? colX + colWidth - pqW : colX;
    const pqY = Math.round(bodyTop + bodyHeight * p.yFrac);
    const pqLayoutLines = layoutWithLines(
      pqEntry.prepared,
      pqW - 20,
      PQ_LINE_HEIGHT,
    );
    const pqPosLines = pqLayoutLines.lines.map((l, i) => ({
      x: pqX + 20,
      y: pqY + 8 + i * PQ_LINE_HEIGHT,
      text: l.text,
      width: l.width,
    }));
    pqRects.push({
      x: pqX,
      y: pqY,
      w: pqW,
      h: pqH,
      lines: pqPosLines,
      colIdx: p.colIdx,
      link: pqEntry.link,
    });
  }

  // ── Layout columns ──
  const allBodyLines = [];
  let cursor = { segmentIndex: 0, graphemeIndex: 0 }; // body text already excludes drop cap

  for (let col = 0; col < colCount; col++) {
    const colX = contentLeft + col * (colWidth + COL_GAP);
    const rects = [];
    if (col === 0) rects.push(dropCapRect);
    for (let pi = 0; pi < pqRects.length; pi++) {
      if (pqRects[pi].colIdx === col) {
        rects.push({
          x: pqRects[pi].x,
          y: pqRects[pi].y,
          w: pqRects[pi].w,
          h: pqRects[pi].h,
        });
      }
    }
    const result = layoutColumn(
      preparedBody,
      cursor,
      colX,
      bodyTop,
      colWidth,
      bodyHeight,
      BODY_LINE_HEIGHT,
      circleObs,
      rects,
    );
    allBodyLines.push(...result.lines);
    cursor = result.cursor;
  }

  const reflowTime = performance.now() - t0;

  // ── Update DOM: body lines ──
  syncPool(linePool, allBodyLines.length, "line");
  for (let i = 0; i < allBodyLines.length; i++) {
    const el = linePool[i];
    const line = allBodyLines[i];
    el.textContent = line.text;
    el.style.left = line.x + "px";
    el.style.top = line.y + "px";
    el.style.font = BODY_FONT;
    el.style.lineHeight = BODY_LINE_HEIGHT + "px";
  }

  // ── Update DOM: pull quotes ──
  let totalPQLines = 0;
  for (let pi = 0; pi < pqRects.length; pi++)
    totalPQLines += pqRects[pi].lines.length;

  syncPool(pqBoxPool, pqRects.length, "pullquote-box");
  syncPool(pqLinePool, totalPQLines, "pullquote-line");

  let pqLineIdx = 0;
  for (let pi = 0; pi < pqRects.length; pi++) {
    const pq = pqRects[pi];
    const boxEl = pqBoxPool[pi];
    boxEl.style.left = pq.x + "px";
    boxEl.style.top = pq.y + "px";
    boxEl.style.width = pq.w + "px";
    boxEl.style.height = pq.h + "px";
    if (pq.link) {
      boxEl.dataset.link = pq.link;
      boxEl.classList.add("pullquote-link");
    } else {
      delete boxEl.dataset.link;
      boxEl.classList.remove("pullquote-link");
    }
    for (let li = 0; li < pq.lines.length; li++) {
      const el = pqLinePool[pqLineIdx];
      const line = pq.lines[li];
      el.textContent = line.text;
      el.style.left = line.x + "px";
      el.style.top = line.y + "px";
      el.style.font = PQ_FONT;
      el.style.lineHeight = PQ_LINE_HEIGHT + "px";
      pqLineIdx++;
    }
  }

  // ── Update DOM: pets ──
  for (let i = 0; i < pets.length; i++) {
    const p = pets[i];
    const size = p.r * 2;
    p.el.style.left = p.x - p.r + "px";
    p.el.style.top = p.y - p.r + "px";
    p.el.style.width = size + "px";
    p.el.style.height = size + "px";
  }

  // ── Cursor style ──
  const hovered = hitTestPets(pointerX, pointerY);
  document.body.style.cursor = activePet ? "grabbing" : hovered ? "grab" : "";

  // ── Stats ──
  updateFPS(now);
  elSLines.textContent = String(allBodyLines.length);
  elSReflow.textContent = reflowTime.toFixed(1) + "ms";
  if (elSDom) elSDom.textContent = "0";
  elSFps.textContent = String(fpsDisplay);
  elSCols.textContent = String(colCount);
}

lastTime = performance.now();
requestAnimationFrame(animate);
