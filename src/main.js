import zh from "./locales/zh.js";
import en from "./locales/en.js";
import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const locales = { zh, en };
let currentLang = "zh";

const stage = document.getElementById("stage");
stage.classList.add("intro-active");

const introCurtain = document.createElement("div");
introCurtain.className = "intro-curtain";
introCurtain.innerHTML = Array.from({ length: 24 }, (_, i) => {
  const stream = "01 ZK AI NTU WEB3 HASH SYNC BLOCK PRETEXT ".repeat(7);
  return `<span style="--i:${i}; --delay:${(i % 8) * 0.08}s">${stream}</span>`;
}).join("");
stage.appendChild(introCurtain);
window.setTimeout(() => {
  stage.classList.remove("intro-active");
  introCurtain.remove();
}, 3300);

const progressRail = document.createElement("div");
progressRail.className = "scroll-rail";
progressRail.innerHTML = '<span class="scroll-rail-fill"></span><span class="scroll-rail-node"></span>';
stage.appendChild(progressRail);

const progressFill = progressRail.querySelector(".scroll-rail-fill");
const progressNode = progressRail.querySelector(".scroll-rail-node");

const infoHud = document.createElement("aside");
infoHud.className = "info-hud";
stage.appendChild(infoHud);

const nodeMap = document.createElement("nav");
nodeMap.className = "node-map";
stage.appendChild(nodeMap);

const ticker = document.createElement("div");
ticker.className = "data-ticker";
stage.appendChild(ticker);

const telemetryHud = document.createElement("aside");
telemetryHud.className = "telemetry-hud";
stage.appendChild(telemetryHud);

const ARCHIVED_COPY = {};
const SECTION_IDS = [
  "bio",
  "research",
  "publications",
  "projects",
  "skills",
  "experience",
  "awards",
];
const BLOCK_TOP_Y = 11.5;
const BLOCK_SPAN_Y = 22.5;
const HELIX_STEP = 1.42;
const BLOCK_ORBIT_RADIUS = 2.32;
const CAMERA_ORBIT_RADIUS = 6.85;
const BLOCK_BODY_FONT = '500 28px "Helvetica Neue", Arial, sans-serif';
const BLOCK_BODY_LINE_HEIGHT = 38;

function stripHtml(html = "") {
  return String(html).replace(/<[^>]*>/g, "");
}

function archiveLocaleCopy(data) {
  return {
    hero: [data.headerName, data.headerTitle, data.headerDesc, data.headerEdu1, data.headerEdu2],
    sections: {
      bio: [data.bioTitle, data.bioText],
      research: [data.researchTitle, ...(data.researchPoints || []).map(stripHtml)],
      publications: [
        stripHtml(data.pubHeading || data.pubTitle || "Publications"),
        ...(data.pubList || []).map(stripHtml),
      ],
      projects: [data.projHeading, ...(data.projList || []).map((p) => `${p.title}: ${p.desc} ${p.stack}`)],
      skills: [data.skillsTitle, ...(data.skills || []).map((s) => `${s.label}: ${s.value}`)],
      experience: [data.expTitle, ...(data.expList || [])],
      awards: [data.awardsTitle, ...(data.awardsList || []), data.footer],
    },
  };
}

Object.entries(locales).forEach(([lang, data]) => {
  ARCHIVED_COPY[lang] = archiveLocaleCopy(data);
});

const sectionLinks = {
  bio: "HeZhili_CV__English.pdf",
  research: "https://github.com/Shr1mpTop",
  publications: "https://www.ewadirect.com/proceedings/ace/article/view/15239xxx",
  projects: "https://github.com/Shr1mpTop?tab=repositories",
  skills: "https://github.com/Shr1mpTop",
  experience: "HeZhili_CV__English.pdf",
  awards: "HeZhili_CV__English.pdf",
};

const sectionColors = {
  bio: 0xc8fff5,
  research: 0xaec8ff,
  publications: 0xf4d69b,
  projects: 0xc7b3ff,
  skills: 0xffb29e,
  experience: 0xffaed8,
  awards: 0xe4f7b0,
};

function compactText(parts, max = 170) {
  const text = parts.filter(Boolean).map(stripHtml).join(" ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function compactLabel(text, max = 26) {
  const value = stripHtml(text || "").replace(/\s+/g, " ").trim();
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function buildBlocks(lang) {
  const archive = ARCHIVED_COPY[lang] || ARCHIVED_COPY.en;
  return SECTION_IDS.map((id, index) => {
    const parts = archive.sections[id] || [];
    const title = stripHtml(parts[0] || id).replace(/[?]+$/g, "");
    return {
      id,
      index,
      title: title || id.toUpperCase(),
      body: compactText(parts.slice(1), id === "projects" ? 210 : 170),
      link: sectionLinks[id],
      color: sectionColors[id],
    };
  });
}

function renderHud(lang) {
  const data = locales[lang] || locales.en;
  const blockData = buildBlocks(lang);
  const projectCount = data.projList?.length || 0;
  const skills = (data.skills || []).slice(0, 4).map((item) => item.label || item.value).join(" / ");
  infoHud.innerHTML = `
    <div class="hud-kicker">PORTFOLIO DATASTREAM</div>
    <strong>${stripHtml(data.headerName || "Zhili He")}</strong>
    <p>${stripHtml(data.headerDesc || "Distributed Systems / Blockchain / AI")}</p>
    <div class="hud-grid">
      <span><b>${blockData.length}</b><small>nodes</small></span>
      <span><b>${projectCount}</b><small>projects</small></span>
      <span><b>NTU</b><small>blockchain</small></span>
      <span><b>AI</b><small>systems</small></span>
    </div>
    <div class="hud-line">${compactLabel(skills, 74)}</div>
  `;
  nodeMap.innerHTML = blockData
    .map(
      (block, index) => `
        <button type="button" data-node="${index}">
          <i></i>
          <span>${String(index + 1).padStart(2, "0")}</span>
          <b>${compactLabel(block.title, 18)}</b>
        </button>
      `,
    )
    .join("");
  const tickerItems = blockData
    .map((block) => `<span>${compactLabel(block.title, 20)} / ${compactLabel(block.body, 72)}</span>`)
    .join("");
  ticker.innerHTML = `
    <div>
      ${tickerItems}
      ${tickerItems}
    </div>
  `;
  telemetryHud.innerHTML = `
    <div class="telemetry-title">ACTIVE NODE</div>
    <strong></strong>
    <p></p>
    <div class="telemetry-bars">
      <span style="--v:72%"><i></i><b>signal</b></span>
      <span style="--v:54%"><i></i><b>context</b></span>
      <span style="--v:86%"><i></i><b>depth</b></span>
    </div>
    <div class="telemetry-meta">
      <span>scroll lock</span>
      <b>armed</b>
    </div>
  `;
}

function updateTelemetry() {
  const block = blocks[activeIndex];
  if (!block) return;
  const title = telemetryHud.querySelector("strong");
  const body = telemetryHud.querySelector("p");
  if (title) title.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${block.title}`;
  if (body) body.textContent = compactLabel(block.body, 136);
}

function colorToCss(hex, alpha = 1) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeAsciiTexture(seed, variant = "cyan") {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '700 15px "Courier New", Consolas, monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let n = seed * 2654435761;
  const rand = () => {
    n = (n * 1664525 + 1013904223) >>> 0;
    return n / 4294967296;
  };
  const chars = "01{}[]<>/\\|#$%&+=*-:;AIWEB3ZK";
  const palette =
    variant === "warm"
      ? ["rgba(244, 214, 155,", "rgba(255, 174, 216,", "rgba(255, 255, 255,"]
      : ["rgba(200, 255, 245,", "rgba(174, 200, 255,", "rgba(255, 255, 255,"];

  for (let y = 8; y < canvas.height; y += 20) {
    for (let x = 16; x < canvas.width; x += 22) {
      if (rand() < 0.32) continue;
      const alpha = 0.08 + rand() * 0.48;
      ctx.fillStyle = `${palette[Math.floor(rand() * palette.length)]}${alpha})`;
      ctx.fillText(chars[Math.floor(rand() * chars.length)], x + (rand() - 0.5) * 8, y);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 2.8);
  texture.anisotropy = 8;
  return texture;
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const prepared = prepareWithSegments(String(text), ctx.font);
  const result = layoutWithLines(prepared, maxWidth, lineHeight);
  result.lines.slice(0, maxLines).forEach((line, i) => {
    ctx.fillText(line.text, x, y + i * lineHeight);
  });
}

function makeBlockTexture(block) {
  const canvas = document.createElement("canvas");
  canvas.width = 1400;
  canvas.height = 760;
  const ctx = canvas.getContext("2d");
  const accent = block.color;
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);

  const outerGlow = ctx.createRadialGradient(w * 0.5, h * 0.48, 20, w * 0.5, h * 0.5, w * 0.72);
  outerGlow.addColorStop(0, colorToCss(accent, 0.08));
  outerGlow.addColorStop(0.56, "rgba(255, 255, 255, 0.018)");
  outerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = outerGlow;
  ctx.fillRect(0, 0, w, h);

  roundRectPath(ctx, 60, 70, w - 120, h - 140, 34);
  const glass = ctx.createLinearGradient(60, 70, w - 60, h - 70);
  glass.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  glass.addColorStop(0.08, colorToCss(accent, 0.075));
  glass.addColorStop(0.48, "rgba(10, 17, 27, 0.66)");
  glass.addColorStop(1, "rgba(0, 0, 0, 0.82)");
  ctx.fillStyle = glass;
  ctx.fill();

  ctx.save();
  roundRectPath(ctx, 60, 70, w - 120, h - 140, 34);
  ctx.clip();
  const sheen = ctx.createLinearGradient(90, 94, w - 140, h * 0.58);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0.075)");
  sheen.addColorStop(0.16, "rgba(255, 255, 255, 0.028)");
  sheen.addColorStop(0.32, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(60, 70, w - 120, h - 140);

  for (let i = 0; i < 160; i++) {
    const x = 95 + Math.random() * (w - 190);
    const y = 105 + Math.random() * (h - 210);
    const alpha = 0.035 + Math.random() * 0.1;
    ctx.fillStyle = Math.random() > 0.78 ? colorToCss(accent, alpha) : `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2.2, 1 + Math.random() * 2.2);
  }

  for (let y = 140; y < h - 130; y += 58) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${y % 116 === 0 ? 0.035 : 0.018})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(112, y);
    ctx.lineTo(w - 112, y);
    ctx.stroke();
  }
  ctx.restore();

  const stroke = ctx.createLinearGradient(60, 70, w - 60, h - 70);
  stroke.addColorStop(0, "rgba(255, 255, 255, 0.28)");
  stroke.addColorStop(0.22, colorToCss(accent, 0.52));
  stroke.addColorStop(0.6, "rgba(255, 255, 255, 0.08)");
  stroke.addColorStop(1, colorToCss(accent, 0.32));
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, 60, 70, w - 120, h - 140, 34);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 1;
  roundRectPath(ctx, 86, 96, w - 172, h - 192, 22);
  ctx.stroke();

  ctx.fillStyle = colorToCss(accent, 0.48);
  roundRectPath(ctx, 104, 126, 8, h - 252, 4);
  ctx.fill();

  ctx.font = '700 22px "Courier New", Consolas, monospace';
  ctx.fillStyle = colorToCss(accent, 0.88);
  ctx.fillText(`${String(block.index + 1).padStart(2, "0")} / ${block.id.toUpperCase()} / PRETEXT NODE`, 136, 150);

  ctx.font = '800 70px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.shadowColor = colorToCss(accent, 0.3);
  ctx.shadowBlur = 18;
  ctx.fillText(block.title.toUpperCase(), 134, 250);
  ctx.shadowBlur = 0;

  ctx.font = BLOCK_BODY_FONT;
  ctx.fillStyle = "rgba(231, 240, 247, 0.72)";
  wrapCanvasText(ctx, block.body, 138, 338, 1020, BLOCK_BODY_LINE_HEIGHT, 4);

  ctx.font = '700 18px "Courier New", Consolas, monospace';
  ctx.fillStyle = "rgba(255, 255, 255, 0.32)";
  ctx.fillText("SELF-LIT GLASS NODE // CLICK TO OPEN", 136, 610);

  ctx.fillStyle = colorToCss(accent, 0.78);
  ctx.beginPath();
  ctx.arc(w - 150, 148, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.36)";
  ctx.beginPath();
  ctx.arc(w - 150, 148, 32, 0, Math.PI * 1.62);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function makePanelGlowTexture(color) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 420;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.shadowColor = colorToCss(color, 0.78);
  ctx.shadowBlur = 42;
  ctx.strokeStyle = colorToCss(color, 0.38);
  ctx.lineWidth = 7;
  roundRectPath(ctx, 92, 82, canvas.width - 184, canvas.height - 164, 42);
  ctx.stroke();
  ctx.restore();

  const beam = ctx.createRadialGradient(
    canvas.width * 0.5,
    canvas.height * 0.5,
    10,
    canvas.width * 0.5,
    canvas.height * 0.5,
    canvas.width * 0.54,
  );
  beam.addColorStop(0, colorToCss(color, 0.08));
  beam.addColorStop(0.42, colorToCss(color, 0.035));
  beam.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = beam;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function makeShardTexture(label, color = 0xc8fff5) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 156;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(4, 8, 14, 0.48)";
  roundRectPath(ctx, 18, 22, canvas.width - 36, canvas.height - 44, 18);
  ctx.fill();
  ctx.strokeStyle = colorToCss(color, 0.32);
  ctx.lineWidth = 2;
  roundRectPath(ctx, 18, 22, canvas.width - 36, canvas.height - 44, 18);
  ctx.stroke();
  ctx.font = '700 26px "Courier New", Consolas, monospace';
  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  ctx.fillText(label.toUpperCase(), 42, 82);
  ctx.font = '700 14px "Courier New", Consolas, monospace';
  ctx.fillStyle = colorToCss(color, 0.58);
  ctx.fillText("AUXILIARY SIGNAL", 42, 112);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const W0 = window.innerWidth;
const H0 = window.innerHeight;
const canvas = document.createElement("canvas");
canvas.className = "world-canvas";
stage.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02040a, 0.041);

const camera = new THREE.PerspectiveCamera(48, W0 / H0, 0.1, 120);
const cameraTarget = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(W0, H0), 0.26, 0.48, 0.62);
const outputPass = new OutputPass();
composer.addPass(renderPass);
composer.addPass(bloomPass);
composer.addPass(outputPass);

const dataColumn = new THREE.Group();
scene.add(dataColumn);

const streamLayers = [];
for (let i = 0; i < 14; i++) {
  const radius = 0.32 + i * 0.025;
  const height = 44;
  const thetaLength = Math.PI * (0.2 + (i % 4) * 0.065);
  const thetaStart = (i / 14) * Math.PI * 2;
  const texture = makeAsciiTexture(i + 11, i % 5 === 0 ? "warm" : "cyan");
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 28, 1, true, thetaStart, thetaLength);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.028 + (i % 5) * 0.015,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.y = i * 0.38;
  dataColumn.add(mesh);
  streamLayers.push({
    mesh,
    texture,
    speed: 0.07 + (i % 6) * 0.026,
    direction: i % 2 === 0 ? 1 : -1,
    spin: (i % 2 === 0 ? 1 : -1) * (0.035 + i * 0.002),
  });
}

const haloGeometry = new THREE.CylinderGeometry(0.72, 0.72, 44, 64, 1, true);
const haloMaterial = new THREE.MeshBasicMaterial({
  color: 0xaec8ff,
  transparent: true,
  opacity: 0.018,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
});
const halo = new THREE.Mesh(haloGeometry, haloMaterial);
dataColumn.add(halo);

const axisMaterial = new THREE.MeshBasicMaterial({
  color: 0xf7ffff,
  transparent: true,
  opacity: 0.1,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 44, 16), axisMaterial);
dataColumn.add(axis);

const energyRings = [];
for (let i = 0; i < SECTION_IDS.length; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.78 + (i % 2) * 0.1, 0.004, 8, 96),
    new THREE.MeshBasicMaterial({
      color: i % 3 === 0 ? 0xf4d69b : 0xc8fff5,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = BLOCK_TOP_Y - i * (BLOCK_SPAN_Y / Math.max(1, SECTION_IDS.length - 1));
  dataColumn.add(ring);
  energyRings.push(ring);
}

const blockGroup = new THREE.Group();
scene.add(blockGroup);

const helixPoints = [];
for (let i = 0; i <= 360; i++) {
  const u = i / 360;
  const angle = u * HELIX_STEP * (SECTION_IDS.length - 1);
  const y = BLOCK_TOP_Y - u * BLOCK_SPAN_Y;
  helixPoints.push(
    new THREE.Vector3(
      Math.cos(angle) * (BLOCK_ORBIT_RADIUS - 0.28),
      y,
      Math.sin(angle) * (BLOCK_ORBIT_RADIUS - 0.28),
    ),
  );
}
const helixGuide = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(helixPoints),
  new THREE.LineBasicMaterial({
    color: 0xf8ffff,
    transparent: true,
    opacity: 0.025,
    blending: THREE.AdditiveBlending,
  }),
);
scene.add(helixGuide);

const decorGroup = new THREE.Group();
scene.add(decorGroup);
const decorLabels = [
  "consensus",
  "zero knowledge",
  "medical ai",
  "distributed systems",
  "solidity",
  "pytorch",
  "research graph",
  "modeling awards",
  "agent systems",
  "market signals",
];
const decorShards = decorLabels.map((label, index) => {
  const color = Object.values(sectionColors)[index % SECTION_IDS.length];
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.35, 0.42),
    new THREE.MeshBasicMaterial({
      map: makeShardTexture(label, color),
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  );
  mesh.userData.angle = index * 0.78;
  mesh.userData.radius = 4.6 + (index % 3) * 0.95;
  mesh.userData.y = BLOCK_TOP_Y - (index / Math.max(1, decorLabels.length - 1)) * BLOCK_SPAN_Y;
  decorGroup.add(mesh);
  return mesh;
});

const gridRings = [];
for (let i = 0; i < 5; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.25 + i * 0.72, 0.003, 8, 128),
    new THREE.MeshBasicMaterial({
      color: i % 2 ? 0xaec8ff : 0xf4d69b,
      transparent: true,
      opacity: 0.018,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = BLOCK_TOP_Y - BLOCK_SPAN_Y * (0.12 + i * 0.18);
  decorGroup.add(ring);
  gridRings.push(ring);
}

let blocks = [];
let blockMeshes = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(-10, -10);
let hoveredMesh = null;
let activeIndex = 0;
const initialProgress = clamp01(Number(new URLSearchParams(window.location.search).get("p")) || 0.02);
let scrollProgress = initialProgress;
let targetScrollProgress = initialProgress;
let draggingRail = false;
let lastTime = performance.now();
let scrollEnergy = 0;
let pointerTargetX = 0;
let pointerTargetY = 0;
let pointerSmoothX = 0;
let pointerSmoothY = 0;
let lockedNodeIndex = null;
let lockScrollDebt = 0;
let lastLockDirection = 0;
let lockReleaseUntil = 0;

function disposeObject(object) {
  object.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => {
      if (material.map) material.map.dispose();
      material.dispose();
    });
  });
}

function rebuildBlocks() {
  blockMeshes.forEach((mesh) => {
    blockGroup.remove(mesh);
    disposeObject(mesh);
  });
  blocks = buildBlocks(currentLang);
  blockMeshes = blocks.map((block, index) => {
    const texture = makeBlockTexture(block);
    const front = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.FrontSide,
    });
    const glowTexture = makePanelGlowTexture(block.color);
    const geometry = new THREE.PlaneGeometry(2.82, 1.53, 10, 4);
    const mesh = new THREE.Mesh(geometry, front);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.24, 1.86, 1, 1),
      new THREE.MeshBasicMaterial({
        map: glowTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0.04,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    glow.position.z = -0.018;
    glow.raycast = () => {};
    glow.renderOrder = 3;
    mesh.add(glow);
    const line = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: block.color,
        transparent: true,
        opacity: 0.02,
        blending: THREE.AdditiveBlending,
      }),
    );
    line.raycast = () => {};
    line.renderOrder = 5;
    mesh.add(line);
    mesh.renderOrder = 4;
    mesh.userData.block = block;
    mesh.userData.front = front;
    mesh.userData.glow = glow;
    mesh.userData.line = line;
    blockGroup.add(mesh);
    return mesh;
  });
}

function seededDust() {
  let seed = 1187;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

const rand = seededDust();
const dustCount = 2600;
const dustPositions = new Float32Array(dustCount * 3);
const dustColors = new Float32Array(dustCount * 3);
const dustSizes = new Float32Array(dustCount);
for (let i = 0; i < dustCount; i++) {
  const i3 = i * 3;
  const angle = rand() * Math.PI * 2;
  const radius = 1.2 + Math.pow(rand(), 0.62) * 8.8;
  dustPositions[i3] = Math.cos(angle) * radius;
  dustPositions[i3 + 1] = -21 + rand() * 42;
  dustPositions[i3 + 2] = Math.sin(angle) * radius - 2.2;
  const blueTint = rand() * 0.12;
  dustColors[i3] = 0.78 + rand() * 0.22;
  dustColors[i3 + 1] = 0.8 + rand() * 0.2;
  dustColors[i3 + 2] = 0.86 + blueTint;
  dustSizes[i] = 0.012 + Math.pow(rand(), 2) * 0.052;
}

const dustGeometry = new THREE.BufferGeometry();
dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
dustGeometry.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
dustGeometry.setAttribute("size", new THREE.BufferAttribute(dustSizes, 1));

const dustMaterial = new THREE.ShaderMaterial({
  uniforms: {
    opacity: { value: 0.62 },
  },
  transparent: true,
  vertexColors: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: `
    attribute float size;
    varying vec3 vColor;
    void main() {
      vColor = color;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * (420.0 / max(0.1, -mvPosition.z));
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float opacity;
    varying vec3 vColor;
    void main() {
      vec2 p = gl_PointCoord - vec2(0.5);
      float d = length(p);
      float core = smoothstep(0.5, 0.0, d);
      float bloom = smoothstep(0.5, 0.18, d) * 0.42;
      gl_FragColor = vec4(vColor, (core + bloom) * opacity);
    }
  `,
});
const dust = new THREE.Points(dustGeometry, dustMaterial);
scene.add(dust);

const distantDust = dust.clone();
distantDust.material = dustMaterial.clone();
distantDust.material.uniforms.opacity.value = 0.25;
distantDust.scale.setScalar(1.85);
distantDust.rotation.y = Math.PI * 0.18;
scene.add(distantDust);

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function resize(width, height) {
  renderer.setSize(width, height, false);
  composer.setSize(width, height);
  bloomPass.resolution.set(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function getCameraOrbitRadius() {
  const w = document.documentElement.clientWidth;
  return w < 520 ? 10.8 : w < 760 ? 9.1 : CAMERA_ORBIT_RADIUS;
}

function getPanelScaleFactor() {
  const w = document.documentElement.clientWidth;
  return w < 520 ? 0.78 : w < 760 ? 0.88 : 1;
}

function nodeProgress(index) {
  return blockMeshes.length <= 1 ? 0 : index / (blockMeshes.length - 1);
}

function nearestNodeProgress(value) {
  return nodeProgress(Math.round(value * Math.max(1, blockMeshes.length - 1)));
}

function smoothstep(edge0, edge1, value) {
  const x = clamp01((value - edge0) / (edge1 - edge0));
  return x * x * (3 - 2 * x);
}

function nodeResistance(value) {
  const nearest = nearestNodeProgress(value);
  const dist = Math.abs(value - nearest);
  return 0.26 + 0.74 * smoothstep(0.018, 0.095, dist);
}

function nudgeTargetProgress(delta, rawAmount = Math.abs(delta) * 3600, force = false) {
  const direction = Math.sign(delta);
  if (!direction) return;
  const nearest = nearestNodeProgress(targetScrollProgress);
  const nearestIndex = Math.round(targetScrollProgress * Math.max(1, blockMeshes.length - 1));
  const nearNode = Math.abs(targetScrollProgress - nearest) < 0.018 && Math.abs(scrollProgress - nearest) < 0.028;
  const now = performance.now();

  if (!force && nearNode && now > lockReleaseUntil) {
    if (lockedNodeIndex !== nearestIndex || lastLockDirection !== direction) {
      lockedNodeIndex = nearestIndex;
      lastLockDirection = direction;
      lockScrollDebt = 0;
    }
    lockScrollDebt += rawAmount;
    targetScrollProgress = nearest;
    if (lockScrollDebt < 300) return;
    lockReleaseUntil = now + 720;
    lockScrollDebt = 0;
    lockedNodeIndex = null;
    targetScrollProgress = clamp01(nearest + direction * 0.062);
    return;
  }

  lockScrollDebt = 0;
  lockedNodeIndex = null;
  const resistedDelta = delta * nodeResistance(targetScrollProgress);
  targetScrollProgress = clamp01(targetScrollProgress + resistedDelta);
}

function setScrollFromClientY(clientY) {
  const rect = progressRail.getBoundingClientRect();
  targetScrollProgress = clamp01((clientY - rect.top) / rect.height);
}

progressRail.addEventListener("pointerdown", (event) => {
  draggingRail = true;
  progressRail.setPointerCapture(event.pointerId);
  setScrollFromClientY(event.clientY);
  event.preventDefault();
});

progressRail.addEventListener("pointermove", (event) => {
  if (draggingRail) setScrollFromClientY(event.clientY);
});

progressRail.addEventListener("pointerup", () => {
  draggingRail = false;
});

window.addEventListener(
  "wheel",
  (event) => {
    if (event.ctrlKey) return;
    nudgeTargetProgress(event.deltaY / 3600, Math.abs(event.deltaY));
    scrollEnergy = clamp01(scrollEnergy + Math.abs(event.deltaY) / 1400);
    event.preventDefault();
  },
  { passive: false },
);

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
    nudgeTargetProgress(0.12, 300, true);
    event.preventDefault();
  }
  if (event.key === "ArrowUp" || event.key === "PageUp") {
    nudgeTargetProgress(-0.12, 300, true);
    event.preventDefault();
  }
  if (event.key === "Home") targetScrollProgress = 0;
  if (event.key === "End") targetScrollProgress = 1;
});

window.addEventListener("pointermove", (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  pointerTargetX = pointer.x;
  pointerTargetY = pointer.y;
});

stage.addEventListener("click", () => {
  if (!hoveredMesh) return;
  const link = hoveredMesh.userData.block?.link;
  if (link) window.open(link, "_blank", "noopener");
});

document.querySelectorAll(".lang-btn").forEach((btn) => {
  btn.addEventListener("click", (event) => {
    event.preventDefault();
    const lang = btn.dataset.lang;
    if (!lang || lang === currentLang) return;
    currentLang = lang;
    document.querySelectorAll(".lang-btn").forEach((item) => {
      item.classList.toggle("active", item.dataset.lang === currentLang);
    });
    rebuildBlocks();
    renderHud(currentLang);
  });
});

nodeMap.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-node]");
  if (!button) return;
  targetScrollProgress = nodeProgress(Number(button.dataset.node));
  scrollEnergy = 0.55;
});

function updateBlocks(time, dt) {
  activeIndex = Math.round(scrollProgress * Math.max(1, blockMeshes.length - 1));

  blockMeshes.forEach((mesh, index) => {
    const angle = index * HELIX_STEP;
    const y = BLOCK_TOP_Y - index * (BLOCK_SPAN_Y / Math.max(1, blockMeshes.length - 1));
    const orbit = BLOCK_ORBIT_RADIUS + Math.sin(time * 0.72 + index) * 0.035;
    const focus = index === activeIndex;
    const hover = mesh === hoveredMesh;
    const progressY = BLOCK_TOP_Y - scrollProgress * BLOCK_SPAN_Y;
    const distFromCamera = Math.abs(y - progressY);
    const visibility = clamp01(1.25 - distFromCamera / 7.2);
    const scale =
      (0.82 + visibility * 0.22 + (focus ? 0.16 : 0) + (hover ? 0.08 : 0)) *
      getPanelScaleFactor();

    mesh.position.set(Math.cos(angle) * orbit, y, Math.sin(angle) * orbit);
    mesh.rotation.set(0, Math.PI / 2 - angle, 0);
    mesh.scale.lerp(new THREE.Vector3(scale, scale, scale), Math.min(dt * 7, 1));
    mesh.userData.front.opacity = 0.24 + visibility * 0.68 + (focus || hover ? 0.08 : 0);
    mesh.userData.line.material.opacity = 0.008 + visibility * 0.022 + (focus || hover ? 0.026 : 0);
    mesh.userData.glow.material.opacity = 0.012 + visibility * 0.035 + (focus ? 0.05 : 0) + (hover ? 0.06 : 0);
    mesh.position.y += Math.sin(time * 1.7 + index * 0.9) * (focus ? 0.025 : 0.012);
    mesh.visible = visibility > 0.03;
  });
}

function updateDecor(time) {
  const progressY = BLOCK_TOP_Y - scrollProgress * BLOCK_SPAN_Y;
  decorShards.forEach((mesh, index) => {
    const angle = mesh.userData.angle + time * (0.035 + index * 0.002);
    const y = mesh.userData.y + Math.sin(time * 0.52 + index) * 0.18;
    const radius = mesh.userData.radius;
    const visibility = clamp01(1.2 - Math.abs(y - progressY) / 9.5);
    mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    mesh.lookAt(camera.position);
    mesh.material.opacity = 0.045 + visibility * 0.18;
    mesh.scale.setScalar(0.82 + visibility * 0.28);
  });
  gridRings.forEach((ring, index) => {
    ring.rotation.z += 0.002 + index * 0.0007;
    ring.material.opacity = 0.012 + 0.012 * Math.sin(time * 0.7 + index);
  });
}

function updatePointer() {
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(blockMeshes.filter((mesh) => mesh.visible), false);
  hoveredMesh = hits[0]?.object || null;
  document.body.style.cursor = hoveredMesh ? "pointer" : "";
}

function updateCamera(dt) {
  const y = BLOCK_TOP_Y - scrollProgress * BLOCK_SPAN_Y;
  const cameraAngle = scrollProgress * HELIX_STEP * Math.max(1, blockMeshes.length - 1);
  const activeAngle = activeIndex * HELIX_STEP;
  const blendedAngle = THREE.MathUtils.lerp(cameraAngle, activeAngle, 0.14);
  pointerSmoothX += (pointerTargetX - pointerSmoothX) * Math.min(dt * 4, 1);
  pointerSmoothY += (pointerTargetY - pointerSmoothY) * Math.min(dt * 4, 1);
  desiredCamera.set(
    Math.cos(blendedAngle) * (getCameraOrbitRadius() + scrollEnergy * 0.55),
    y + 0.18 + pointerSmoothY * 0.18,
    Math.sin(blendedAngle) * (getCameraOrbitRadius() + scrollEnergy * 0.55),
  );
  desiredTarget.set(
    Math.cos(blendedAngle) * 0.18 + pointerSmoothX * 0.14,
    y - 0.08 - pointerSmoothY * 0.06,
    Math.sin(blendedAngle) * 0.18,
  );
  const k = 1 - Math.exp(-dt * 4.4);
  camera.position.lerp(desiredCamera, k);
  cameraTarget.lerp(desiredTarget, k);
  camera.lookAt(cameraTarget);
  camera.rotateZ(pointerSmoothX * 0.018 + scrollEnergy * 0.018);
}

function animate(now) {
  requestAnimationFrame(animate);
  const time = now * 0.001;
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  resize(document.documentElement.clientWidth, document.documentElement.clientHeight);
  scrollProgress += (targetScrollProgress - scrollProgress) * Math.min(dt * 5.5, 1);
  if (!draggingRail && Math.abs(targetScrollProgress - scrollProgress) < 0.004) {
    const nearest = nearestNodeProgress(targetScrollProgress);
    if (Math.abs(targetScrollProgress - nearest) < 0.035) {
      targetScrollProgress = THREE.MathUtils.lerp(targetScrollProgress, nearest, Math.min(dt * 1.7, 1));
    }
  }
  scrollEnergy += (0 - scrollEnergy) * Math.min(dt * 2.4, 1);
  activeIndex = Math.round(scrollProgress * Math.max(1, blockMeshes.length - 1));
  progressFill.style.height = `${Math.round(scrollProgress * 100)}%`;
  progressNode.style.top = `${scrollProgress * 100}%`;
  nodeMap.querySelectorAll("button").forEach((button, index) => {
    button.classList.toggle("active", index === activeIndex);
  });
  infoHud.dataset.active = blocks[activeIndex]?.id || "";
  updateTelemetry();

  streamLayers.forEach((layer) => {
    layer.texture.offset.y += dt * layer.speed * layer.direction;
    layer.mesh.rotation.y += dt * layer.spin;
  });
  halo.rotation.y += dt * 0.03;
  axis.material.opacity = 0.08 + Math.sin(time * 1.6) * 0.022;
  energyRings.forEach((ring, index) => {
    const focus = index === activeIndex ? 1 : 0;
    const pulse = 0.5 + 0.5 * Math.sin(time * 1.8 + index);
    ring.rotation.z += dt * (0.08 + index * 0.006);
    ring.scale.setScalar(1 + focus * 0.18 + pulse * 0.018);
    ring.material.opacity = 0.055 + focus * 0.24 + pulse * 0.05;
  });

  dust.rotation.y += dt * 0.018;
  dust.rotation.x = Math.sin(time * 0.08) * 0.045;
  distantDust.rotation.y -= dt * 0.011;

  updateDecor(time);
  updateCamera(dt);
  updateBlocks(time, dt);
  updatePointer();
  composer.render();
}

document.querySelectorAll(".lang-btn").forEach((item) => {
  item.classList.toggle("active", item.dataset.lang === currentLang);
});
renderHud(currentLang);
rebuildBlocks();
activeIndex = Math.round(scrollProgress * Math.max(1, blockMeshes.length - 1));
{
  const initialY = BLOCK_TOP_Y - scrollProgress * BLOCK_SPAN_Y;
  const initialAngle = scrollProgress * HELIX_STEP * Math.max(1, blockMeshes.length - 1);
  camera.position.set(
    Math.cos(initialAngle) * getCameraOrbitRadius(),
    initialY + 0.18,
    Math.sin(initialAngle) * getCameraOrbitRadius(),
  );
  cameraTarget.set(Math.cos(initialAngle) * 0.18, initialY - 0.08, Math.sin(initialAngle) * 0.18);
  camera.lookAt(cameraTarget);
}
requestAnimationFrame(animate);
