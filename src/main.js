import zh from "./locales/zh.js";
import en from "./locales/en.js";
import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const locales = { zh, en };
const params = new URLSearchParams(window.location.search);
let currentLang = params.get("lang") === "en" || window.location.pathname.endsWith("index-en.html") ? "en" : "zh";
const stage = document.getElementById("stage");
const SECTION_IDS = ["bio", "research", "publications", "projects", "skills", "experience", "awards"];
const N = SECTION_IDS.length;
const SCROLL_SEGMENTS = N - 1;
const HOLD_HALF = 0.31;
const sectionLinks = { bio: "HeZhili_CV__English.pdf", research: "https://github.com/Shr1mpTop", publications: "https://www.ewadirect.com/proceedings/ace/article/view/15239/pdf", projects: "https://github.com/Shr1mpTop?tab=repositories", skills: "https://github.com/Shr1mpTop", experience: "HeZhili_CV__English.pdf", awards: "HeZhili_CV__English.pdf" };
const sectionColors = { bio: 0xc8fff5, research: 0xaec8ff, publications: 0xf4d69b, projects: 0xc7b3ff, skills: 0xffb29e, experience: 0xffaed8, awards: 0xe4f7b0 };

/* ─── Spiral Layout ─── */
const SPIRAL_TURNS = 1.4;
const Y_TOP = 6, Y_BOT = -6;
const CLOUD_R = 3.2, CAM_R = 8.5;
const PANEL_W = 5.7, PANEL_H = 3.85;
const TITLE_LINE_H = 0.42, BODY_LINE_H = 0.26;
const TITLE_MAX_LINES = 2, BODY_MAX_LINES = 7;

function secAngle(i) { return (i / (N - 1)) * SPIRAL_TURNS * Math.PI * 2; }
function secY(i) { return Y_TOP - (i / (N - 1)) * (Y_TOP - Y_BOT); }
function secPos(i) { return new THREE.Vector3(Math.cos(secAngle(i)) * CLOUD_R, secY(i), Math.sin(secAngle(i)) * CLOUD_R); }
function pathAngle(raw) { return (raw / SCROLL_SEGMENTS) * SPIRAL_TURNS * Math.PI * 2; }
function pathY(raw) { return Y_TOP - (raw / SCROLL_SEGMENTS) * (Y_TOP - Y_BOT); }
function pathPos(raw, radius = CLOUD_R) { return new THREE.Vector3(Math.cos(pathAngle(raw)) * radius, pathY(raw), Math.sin(pathAngle(raw)) * radius); }
function cameraPosRaw(raw) { const p = pathPos(raw, CAM_R); p.y += 0.35; return p; }

/* ─── Cursor ─── */
const cursorRing = document.createElement("div"); cursorRing.className = "cursor-ring"; document.body.appendChild(cursorRing);
const cursorDot = document.createElement("div"); cursorDot.className = "cursor-dot"; document.body.appendChild(cursorDot);
let cursorX = innerWidth / 2, cursorY = innerHeight / 2, ringX = cursorX, ringY = cursorY;
document.addEventListener("mousemove", e => { cursorX = e.clientX; cursorY = e.clientY; cursorDot.style.left = cursorX + "px"; cursorDot.style.top = cursorY + "px"; });

/* ─── DOM ─── */
const infoHud = document.createElement("aside"); infoHud.className = "info-hud"; stage.appendChild(infoHud);
const nodeMap = document.createElement("nav"); nodeMap.className = "node-map"; stage.appendChild(nodeMap);
const telemetryHud = document.createElement("aside"); telemetryHud.className = "telemetry-hud"; stage.appendChild(telemetryHud);
const socialPanel = document.createElement("aside"); socialPanel.className = "social-panel"; stage.appendChild(socialPanel);
const shootingStarContainer = document.createElement("div"); shootingStarContainer.className = "shooting-stars"; stage.appendChild(shootingStarContainer);
const progressRail = document.createElement("div"); progressRail.className = "scroll-rail";
progressRail.innerHTML = '<span class="scroll-rail-fill"></span><span class="scroll-rail-node"></span>';
stage.appendChild(progressRail);
const progressFill = progressRail.querySelector(".scroll-rail-fill");
const progressNode = progressRail.querySelector(".scroll-rail-node");
const ticker = document.createElement("div"); ticker.className = "data-ticker"; stage.appendChild(ticker);

/* ─── Helpers ─── */
function stripHtml(h) { return String(h).replace(/<[^>]*>/g, ""); }
function clamp01(v) { return Math.max(0, Math.min(1, v)); }
function easeIO(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function compactText(p, m = 240) { const t = p.filter(Boolean).map(stripHtml).join(" ").replace(/\s+/g, " ").trim(); return t.length > m ? t.slice(0, m - 1) + "..." : t; }
function compactLabel(t, m = 26) { const v = stripHtml(t || "").replace(/\s+/g, " ").trim(); return v.length > m ? v.slice(0, m - 1) + "..." : v; }
function c2s(hex, a = 1) { return `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${a})`; }
function getScrollState(progress) {
  const raw = clamp01(progress) * SCROLL_SEGMENTS;
  const si = Math.max(0, Math.min(N - 1, Math.round(raw)));
  const offset = raw - si;
  const distance = Math.abs(offset);
  const t = clamp01((distance - HOLD_HALF) / (0.5 - HOLD_HALF));
  const at = distance <= HOLD_HALF ? 1 : 1 - easeIO(t);
  const phase = distance <= HOLD_HALF ? "hold" : offset < 0 ? "assembling" : "scattering";
  return { raw, si, offset, phase, at };
}
function getCameraRaw(progress) {
  const raw = clamp01(progress) * SCROLL_SEGMENTS;
  const base = Math.min(SCROLL_SEGMENTS - 1, Math.max(0, Math.floor(raw)));
  if (raw >= SCROLL_SEGMENTS) return SCROLL_SEGMENTS;
  const local = raw - base;
  if (local <= HOLD_HALF) return base;
  if (local >= 1 - HOLD_HALF) return base + 1;
  return base + easeIO((local - HOLD_HALF) / (1 - HOLD_HALF * 2));
}

/* ─── Locale ─── */
const ARCH = {};
function archive(d) { return { sections: { bio: [d.bioTitle, d.bioText], research: [d.researchTitle, ...(d.researchPoints || []).map(stripHtml)], publications: [stripHtml(d.pubHeading || d.pubTitle || "Publications"), ...(d.pubList || []).map(stripHtml)], projects: [d.projHeading, ...(d.projList || []).map(p => `${p.title}: ${p.desc} ${p.stack}`)], skills: [d.skillsTitle, ...(d.skills || []).map(s => `${s.label}: ${s.value}`)], experience: [d.expTitle, ...(d.expList || [])], awards: [d.awardsTitle, ...(d.awardsList || [])] } }; }
Object.entries(locales).forEach(([l, d]) => ARCH[l] = archive(d));
function getSections(lang) {
  const a = ARCH[lang] || ARCH.en;
  return SECTION_IDS.map(id => { const p = a.sections[id] || []; return { id, title: stripHtml(p[0] || id), body: compactText(p.slice(1)), link: sectionLinks[id], color: sectionColors[id] }; });
}

/* ─── Three.js Scene ─── */
const W0 = innerWidth, H0 = innerHeight;
const cvs = document.createElement("canvas"); cvs.className = "world-canvas"; stage.appendChild(cvs);
const renderer = new THREE.WebGLRenderer({ canvas: cvs, alpha: true, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0, 0);
const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x02040a, 0.018);
const camera = new THREE.PerspectiveCamera(50, W0 / H0, 0.1, 200);
const camIntroStart = new THREE.Vector3(0, 16, 40);
camera.position.copy(camIntroStart); camera.lookAt(0, 0, 0);
let introT = 0; const INTRO_DUR = 5;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const faceMatrix = new THREE.Matrix4();
const faceQuat = new THREE.Quaternion();
function setPlaneFrontToCamera(mesh, target) {
  faceMatrix.lookAt(camera.position, target, WORLD_UP);
  mesh.quaternion.setFromRotationMatrix(faceMatrix);
}
function getPlaneFrontToCameraQuat(target, out = faceQuat) {
  faceMatrix.lookAt(camera.position, target, WORLD_UP);
  return out.setFromRotationMatrix(faceMatrix);
}

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(W0, H0), 0.08, 0.22, 0.82);
composer.addPass(bloomPass); composer.addPass(new OutputPass());

/* ─── Central Axis ─── */
const axMat = new THREE.MeshBasicMaterial({ color: 0xf7ffff, transparent: true, opacity: 0.08, depthWrite: false, blending: THREE.AdditiveBlending });
scene.add(new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, Y_TOP - Y_BOT + 4, 16), axMat));

/* ─── Floating Shards (Data Column) ─── */
const shardLabels = ["CONSENSUS", "ZK-PROOF", "NTU·AI", "BLOCK-42", "HASH·SYNC", "NEURAL·NET", "WEB3·DEFI", "DISTRIBUTED", "SMART·CONTRACT", "MAMBA·CV", "PYTORCH·ML", "SOLIDITY"];
shardLabels.length = 0;
const shardGroup = new THREE.Group(); scene.add(shardGroup);
const shards = shardLabels.map((label, i) => {
  const c = document.createElement("canvas"); c.width = 400; c.height = 64;
  const ctx = c.getContext("2d"); ctx.clearRect(0, 0, 400, 64);
  const col = Object.values(sectionColors)[i % N];
  ctx.fillStyle = c2s(col, 0.08); ctx.fillRect(0, 0, 400, 64);
  ctx.strokeStyle = c2s(col, 0.25); ctx.lineWidth = 1; ctx.strokeRect(0, 0, 400, 64);
  ctx.font = 'bold 28px "Courier New", Consolas, monospace';
  ctx.fillStyle = c2s(col, 0.88); ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = c2s(col, 0.22); ctx.shadowBlur = 4;
  ctx.fillText(label, 200, 32); ctx.shadowBlur = 0;
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.2, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.35), mat);
  const angle = (i / shardLabels.length) * Math.PI * 2;
  const r = 1.4 + (i % 3) * 0.3;
  const y = Y_TOP + 1 - (i / shardLabels.length) * (Y_TOP - Y_BOT + 2);
  mesh.position.set(Math.cos(angle) * r, y, Math.sin(angle) * r);
  shardGroup.add(mesh);
  return { mesh, angle, r, baseY: y, speed: 0.15 + (i % 4) * 0.06 };
});

/* ─── Energy Rings ─── */
const eRings = [];
for (let i = 0; i < N; i++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0 + (i % 2) * 0.2, 0.006, 8, 128), new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xf4d69b : 0xc8fff5, transparent: true, opacity: 0.06, depthWrite: false, blending: THREE.NormalBlending }));
  ring.rotation.x = Math.PI / 2; ring.position.y = secY(i);
  scene.add(ring); eRings.push(ring);
}

/* ─── Dust ─── */
let ds = 1187; const sr = () => { ds = (ds * 1664525 + 1013904223) >>> 0; return ds / 4294967296; };
const DC = 3200, dP = new Float32Array(DC * 3), dBP = new Float32Array(DC * 3), dC = new Float32Array(DC * 3), dS = new Float32Array(DC);
for (let i = 0; i < DC; i++) { const i3 = i * 3, a = sr() * Math.PI * 2, r = 1 + Math.pow(sr(), 0.6) * 10;
  dP[i3] = dBP[i3] = Math.cos(a) * r; dP[i3 + 1] = dBP[i3 + 1] = Y_BOT - 4 + sr() * (Y_TOP - Y_BOT + 8); dP[i3 + 2] = dBP[i3 + 2] = Math.sin(a) * r;
  dC[i3] = 0.78 + sr() * 0.22; dC[i3 + 1] = 0.82 + sr() * 0.2; dC[i3 + 2] = 0.88 + sr() * 0.15; dS[i] = 0.012 + Math.pow(sr(), 2) * 0.055; }
const dGeo = new THREE.BufferGeometry();
dGeo.setAttribute("position", new THREE.BufferAttribute(dP, 3)); dGeo.setAttribute("color", new THREE.BufferAttribute(dC, 3)); dGeo.setAttribute("size", new THREE.BufferAttribute(dS, 1));
const dMat = new THREE.ShaderMaterial({ uniforms: { o: { value: 0.6 } }, transparent: true, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute float size;varying vec3 vC;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*(420./max(.1,-mv.z));gl_Position=projectionMatrix*mv;}`,
  fragmentShader: `uniform float o;varying vec3 vC;void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p);gl_FragColor=vec4(vC,(smoothstep(.5,0.,d)+smoothstep(.5,.15,d)*.48)*o);}` });
const dust = new THREE.Points(dGeo, dMat); scene.add(dust);
const dust2 = dust.clone(); dust2.material = dMat.clone(); dust2.material.uniforms.o.value = 0.22; dust2.scale.setScalar(1.9); dust2.rotation.y = Math.PI * 0.18; scene.add(dust2);

/* ─── Constellation ─── */
const CN = 240, CML = 350, CD = 2.8;
const cP = new Float32Array(CN * 3), cC = new Float32Array(CN * 3), cSz = new Float32Array(CN), cV = [];
for (let i = 0; i < CN; i++) { const i3 = i * 3, a = Math.random() * Math.PI * 2, r = 2 + Math.pow(Math.random(), 0.55) * 10;
  cP[i3] = Math.cos(a) * r; cP[i3 + 1] = Y_BOT - 2 + Math.random() * (Y_TOP - Y_BOT + 4); cP[i3 + 2] = Math.sin(a) * r;
  cV.push({ os: 0.0001 + Math.random() * 0.0003, oa: a, or: r, vy: (Math.random() - 0.5) * 0.0015 });
  const t = (cP[i3 + 1] - Y_BOT + 2) / (Y_TOP - Y_BOT + 4);
  cC[i3] = 0.72 + t * 0.28; cC[i3 + 1] = 0.88 + (1 - t) * 0.12; cC[i3 + 2] = 0.94 + Math.random() * 0.06; cSz[i] = 0.018 + Math.pow(Math.random(), 1.5) * 0.045; }
const cGeo = new THREE.BufferGeometry();
cGeo.setAttribute("position", new THREE.BufferAttribute(cP, 3)); cGeo.setAttribute("color", new THREE.BufferAttribute(cC, 3)); cGeo.setAttribute("size", new THREE.BufferAttribute(cSz, 1));
const cMat = new THREE.ShaderMaterial({ uniforms: { o: { value: 0.7 } }, transparent: true, vertexColors: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute float size;varying vec3 vC;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*(420./max(.1,-mv.z));gl_Position=projectionMatrix*mv;}`,
  fragmentShader: `uniform float o;varying vec3 vC;void main(){vec2 p=gl_PointCoord-vec2(.5);float d=length(p);gl_FragColor=vec4(vC,(smoothstep(.5,0.,d)+smoothstep(.5,.12,d)*.55)*o);}` });
const cPts = new THREE.Points(cGeo, cMat); scene.add(cPts);
const lP = new Float32Array(CML * 6), lC = new Float32Array(CML * 6), lGeo = new THREE.BufferGeometry();
lGeo.setAttribute("position", new THREE.BufferAttribute(lP, 3)); lGeo.setAttribute("color", new THREE.BufferAttribute(lC, 3)); lGeo.setDrawRange(0, 0);
scene.add(new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })));

/* ─── TextCloud System ─── */
let lastTime = performance.now(), frameCount = 0, lastFpsTime = performance.now(), currentFps = 60;
const pointer = new THREE.Vector2(-10, -10);
let pTX = 0, pTY = 0, pSX = 0, pSY = 0;
let scrollProgress = 0, targetScroll = 0, draggingRail = false;
const smoothCamPos = new THREE.Vector3(0, 16, 40);
const smoothLookAt = new THREE.Vector3(0, 0, 0);
const textClouds = new Map();

const measureCanvas = document.createElement("canvas");
const measureCtx = measureCanvas.getContext("2d");
const titleFont = '700 68px "Segoe UI Variable Display","Segoe UI","Microsoft YaHei UI",Arial,sans-serif';
const bodyFont = '500 34px "Segoe UI Variable Text","Segoe UI","Microsoft YaHei UI",Arial,sans-serif';
const PX_PER_WORLD = 330;
const TITLE_FONT_SIZE = 68;
const BODY_FONT_SIZE = 34;
const TITLE_TEXT_COLOR = "rgba(232, 238, 247, 0.96)";
const BODY_TEXT_COLOR = "rgba(190, 203, 218, 0.88)";
const layoutCache = new Map();
const widthCache = new Map();
const charTextureCache = new Map();

function glyphs(text) { return Array.from(String(text || "")); }
function fontFor(isTitle) { return isTitle ? titleFont : bodyFont; }
function measureTextPx(text, isTitle) {
  const font = fontFor(isTitle);
  const key = `${font}|${text}`;
  if (widthCache.has(key)) return widthCache.get(key);
  measureCtx.font = font;
  const width = measureCtx.measureText(text).width;
  widthCache.set(key, width);
  return width;
}

function getPretextLines(text, isTitle, maxLines) {
  const value = String(text || "").replace(/\s+/g, " ").trim();
  if (!value) return [];
  const font = fontFor(isTitle);
  const maxWidth = (PANEL_W - (isTitle ? 1.1 : 0.75)) * PX_PER_WORLD;
  const lineHeight = isTitle ? 92 : 58;
  const key = `${font}|${maxWidth}|${lineHeight}|${value}`;
  let lines = layoutCache.get(key);
  if (!lines) {
    const prepared = prepareWithSegments(value, font, { whiteSpace: "normal" });
    lines = layoutWithLines(prepared, maxWidth, lineHeight).lines.map((line) => line.text.trim()).filter(Boolean);
    layoutCache.set(key, lines);
  }
  const result = lines.slice(0, maxLines);
  if (lines.length > maxLines && result.length) {
    const chars = glyphs(result[result.length - 1]);
    while (chars.length && measureTextPx(`${chars.join("")}...`, isTitle) > maxWidth) chars.pop();
    result[result.length - 1] = `${chars.join("")}...`;
  }
  return result;
}

function makeCharTex(ch, isTitle, color) {
  const key = `${isTitle ? "t" : "b"}|${color}|${ch}`;
  if (charTextureCache.has(key)) return charTextureCache.get(key);
  const fontSize = isTitle ? TITLE_FONT_SIZE : BODY_FONT_SIZE;
  const glyphWidth = Math.ceil(Math.max(measureTextPx(ch, isTitle), fontSize * 0.48));
  const padX = isTitle ? 18 : 12;
  const padY = isTitle ? 20 : 14;
  const canvas = document.createElement("canvas");
  canvas.width = glyphWidth + padX * 2;
  canvas.height = Math.ceil(fontSize * 1.28 + padY * 2);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = fontFor(isTitle);
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = c2s(0x000000, 0.45);
  ctx.shadowBlur = isTitle ? 3 : 2;
  ctx.shadowOffsetY = 1;
  ctx.fillText(ch, canvas.width / 2, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  charTextureCache.set(key, texture);
  return texture;
}

function glyphPlane(ch, isTitle) {
  const fontSize = isTitle ? TITLE_FONT_SIZE : BODY_FONT_SIZE;
  const measured = measureTextPx(ch, isTitle);
  const widthPx = ch === " " ? measured : Math.max(measured, fontSize * 0.62);
  const heightPx = fontSize * 1.08;
  return { w: widthPx / PX_PER_WORLD, h: heightPx / PX_PER_WORLD };
}

function buildLayout(title, body) {
  const titleLines = getPretextLines(title, true, TITLE_MAX_LINES);
  const bodyLines = getPretextLines(body, false, BODY_MAX_LINES);
  const items = [];
  const addLine = (text, y, isTitle) => {
    const chars = glyphs(text);
    const widths = chars.map((ch) => glyphPlane(ch, isTitle).w * PX_PER_WORLD);
    const total = widths.reduce((sum, w) => sum + w, 0);
    let x = -total / PX_PER_WORLD / 2;
    chars.forEach((ch, i) => {
      const size = glyphPlane(ch, isTitle);
      const w = widths[i] / PX_PER_WORLD;
      if (ch !== " ") items.push({ ch, x: x + w / 2, y, w: size.w, h: size.h, isTitle });
      x += w;
    });
  };
  const titleTop = 1.15;
  titleLines.forEach((text, i) => addLine(text, titleTop - i * TITLE_LINE_H, true));
  const bodyTop = titleTop - Math.max(1, titleLines.length) * TITLE_LINE_H - 0.36;
  bodyLines.forEach((text, i) => addLine(text, bodyTop - i * BODY_LINE_H, false));
  return items;
}

function makeBgPanel(color) {
  const c = document.createElement("canvas"); c.width = 800; c.height = 600;
  const ctx = c.getContext("2d"); ctx.clearRect(0, 0, 800, 600);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function createCloud(index) {
  const secs = getSections(currentLang), sec = secs[index], layout = buildLayout(sec.title, sec.body);
  const center = secPos(index), color = sec.color;
  const group = new THREE.Group(); scene.add(group);

  // Background panel
  const bgMat = new THREE.MeshBasicMaterial({ map: makeBgPanel(color), transparent: true, opacity: 0, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide });
  const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(PANEL_W, PANEL_H), bgMat);
  bgMesh.position.copy(center); bgMesh.position.z += 0.05;
  bgMesh.renderOrder = 1; group.add(bgMesh);

  const toCamera = new THREE.Vector3().subVectors(cameraPosRaw(index), center).normalize();
  const right = new THREE.Vector3().crossVectors(WORLD_UP, toCamera).normalize();

  const chars = layout.map(item => {
    const home = center.clone().addScaledVector(right, item.x).addScaledVector(WORLD_UP, item.y);
    const sA = Math.random() * Math.PI * 2, sR = 3 + Math.random() * 5;
    const scatter = new THREE.Vector3(center.x + Math.cos(sA) * sR, center.y + (Math.random() - 0.5) * 5, center.z + Math.sin(sA) * sR);
    const tex = makeCharTex(item.ch, item.isTitle, item.isTitle ? TITLE_TEXT_COLOR : BODY_TEXT_COLOR);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.08, depthWrite: false, side: THREE.FrontSide, blending: THREE.NormalBlending });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(item.w, item.h), mat);
    mesh.position.copy(scatter);
    mesh.rotation.set((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    mesh.renderOrder = 2; group.add(mesh);
    return { mesh, mat, home, scatter: scatter.clone(), isTitle: item.isTitle, progress: 0, sRot: mesh.rotation.clone(), fP: Math.random() * 6.28, fS: 0.2 + Math.random() * 0.4, oA: sA, oS: (Math.random() - 0.5) * 0.0005, oR: sR };
  });
  return { group, chars, bgMat, bgMesh, center: center.clone(), color, link: sec.link, faceQuat: new THREE.Quaternion() };
}

function rebuildClouds() {
  textClouds.forEach(cl => { cl.chars.forEach(c => { c.mat.dispose(); c.mesh.geometry.dispose(); }); cl.bgMat.map?.dispose(); cl.bgMat.dispose(); cl.bgMesh.geometry.dispose(); scene.remove(cl.group); });
  textClouds.clear(); for (let i = 0; i < N; i++) textClouds.set(i, createCloud(i));
}

function updateClouds(time, dt) {
  const { si, phase, at } = getScrollState(scrollProgress);

  textClouds.forEach((cl, ci) => {
    const active = ci === si;
    const target = active ? at : 0;
    getPlaneFrontToCameraQuat(cl.center, cl.faceQuat);

    // Background panel
    const bgTarget = active && at > 0.4 ? (at - 0.4) / 0.6 : 0;
    cl.bgMat.opacity += (0 - cl.bgMat.opacity) * Math.min(dt * 3, 1);
    cl.bgMesh.quaternion.copy(cl.faceQuat);

    cl.chars.forEach(c => {
      c.progress += (target - c.progress) * Math.min(dt * (target > c.progress ? 4.2 : 2.4), 1);
      c.progress = clamp01(c.progress);
      const e = c.progress;

      // Position: lerp scatter→home
      const pos = new THREE.Vector3().lerpVectors(c.scatter, c.home, e);
      if (e < 0.9) {
        c.oA += c.oS;
        const live = new THREE.Vector3(cl.center.x + Math.cos(c.oA) * c.oR, cl.center.y + Math.sin(time * c.fS + c.fP) * 0.3, cl.center.z + Math.sin(c.oA) * c.oR);
        pos.lerpVectors(live, c.home, e);
      }
      c.mesh.position.copy(pos);
      if (e > 0.45) {
        c.mesh.quaternion.slerp(cl.faceQuat, Math.min(dt * 10, 1));
      } else {
        c.mesh.rotation.x = c.sRot.x * (1 - e); c.mesh.rotation.y = c.sRot.y * (1 - e); c.mesh.rotation.z = c.sRot.z * (1 - e);
      }
      c.mat.opacity = 0.05 + e * (c.isTitle ? 0.9 : 0.82);
    });
  });
  nodeMap.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", i === si));
  updateTelemetry(si, phase, at);
}

/* ─── HUD ─── */
function renderHud(lang) {
  const d = locales[lang] || locales.en, secs = getSections(lang), pc = d.projList?.length || 0;
  infoHud.innerHTML = `<div class="hud-kicker">PORTFOLIO DATASTREAM</div><strong>${stripHtml(d.headerName)}</strong><p>${stripHtml(d.headerDesc)}</p>
    <div class="hud-grid"><span><b>${secs.length}</b><small>sections</small></span><span><b>${pc}</b><small>projects</small></span><span><b>NTU</b><small>blockchain</small></span><span><b>AI</b><small>systems</small></span></div>
    <div class="hud-grid hud-grid-2"><span><b>${currentFps}</b><small>fps</small></span><span><b>${CN}</b><small>stars</small></span><span><b>${DC}</b><small>dust</small></span><span><b>∞</b><small>data</small></span></div>`;
  nodeMap.innerHTML = secs.map((s, i) => `<button type="button" data-node="${i}"><i></i><span>${String(i + 1).padStart(2, "0")}</span><b>${compactLabel(s.title, 18)}</b></button>`).join("");
  const tk = secs.map(s => `<span>${compactLabel(s.title, 20)} // ${compactLabel(s.body, 68)}</span>`).join("");
  ticker.innerHTML = `<div>${tk}${tk}</div>`;
  telemetryHud.innerHTML = `<div class="telemetry-title">SCROLL ASSEMBLY</div><strong></strong><p></p>
    <div class="telemetry-bars"><span style="--v:78%"><i></i><b>signal</b></span><span style="--v:58%"><i></i><b>context</b></span></div>
    <div class="telemetry-meta"><span>scroll to explore</span><b>ready</b></div>`;
  socialPanel.innerHTML = `<div class="social-title">CONNECT</div>
    <a class="social-link" href="https://github.com/Shr1mpTop" target="_blank" rel="noopener"><span class="social-icon">⌘</span><span>GitHub</span></a>
    <a class="social-link" href="https://www.linkedin.com/in/zhili-he" target="_blank" rel="noopener"><span class="social-icon">◆</span><span>LinkedIn</span></a>
    <a class="social-link" href="mailto:HEZH0014@e.ntu.edu.sg"><span class="social-icon">◈</span><span>Email</span></a>
    <a class="social-link" href="HeZhili_CV__English.pdf" target="_blank" rel="noopener"><span class="social-icon">⬡</span><span>Resume</span></a>
    <a class="social-link" href="https://github.com/Shr1mpTop?tab=repositories" target="_blank" rel="noopener"><span class="social-icon">▲</span><span>Repos</span></a>
    <div class="social-status"><span class="status-dot"></span><span>open to collaborate</span></div>`;
}

function updateTelemetry(si, sp, at) {
  const secs = getSections(currentLang), s = secs[si]; if (!s) return;
  const t = telemetryHud.querySelector("strong"), b = telemetryHud.querySelector("p");
  if (t) t.textContent = `${String(si + 1).padStart(2, "0")} / ${s.title}`;
  const pct = Math.round(at * 100);
  if (b) b.textContent = sp === "hold" ? "HOLDING 100%" : `${sp.toUpperCase()} ${pct}%`;
}

/* ─── Shooting Stars ─── */
setInterval(() => { if (Math.random() < 0.3) { const s = document.createElement("div"); s.className = "shooting-star"; s.style.left = (10 + Math.random() * 60) + "%"; s.style.top = (5 + Math.random() * 40) + "%"; s.style.transform = `rotate(${25 + Math.random() * 30}deg)`; shootingStarContainer.appendChild(s); setTimeout(() => s.remove(), 1200); } }, 3500);

/* ─── Events ─── */
function setScrollY(y) { const r = progressRail.getBoundingClientRect(); targetScroll = clamp01((y - r.top) / r.height); }
progressRail.addEventListener("pointerdown", e => { draggingRail = true; progressRail.setPointerCapture(e.pointerId); setScrollY(e.clientY); e.preventDefault(); });
progressRail.addEventListener("pointermove", e => { if (draggingRail) setScrollY(e.clientY); });
progressRail.addEventListener("pointerup", () => draggingRail = false);
window.addEventListener("wheel", e => { if (e.ctrlKey) return; targetScroll = clamp01(targetScroll + e.deltaY / 14000); e.preventDefault(); }, { passive: false });
window.addEventListener("keydown", e => { if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") { targetScroll = clamp01(targetScroll + 1 / (N * 5)); e.preventDefault(); } if (e.key === "ArrowUp" || e.key === "PageUp") { targetScroll = clamp01(targetScroll - 1 / (N * 5)); e.preventDefault(); } if (e.key === "Home") targetScroll = 0; if (e.key === "End") targetScroll = 1; });
window.addEventListener("pointermove", e => { pointer.x = (e.clientX / innerWidth) * 2 - 1; pointer.y = -(e.clientY / innerHeight) * 2 + 1; pTX = pointer.x; pTY = pointer.y; });
document.querySelectorAll(".lang-btn").forEach(b => b.addEventListener("click", e => { e.preventDefault(); const l = b.dataset.lang; if (!l || l === currentLang) return; currentLang = l; const url = new URL(window.location.href); if (l === "en") url.searchParams.set("lang", "en"); else url.searchParams.delete("lang"); history.replaceState(null, "", url); document.querySelectorAll(".lang-btn").forEach(i => i.classList.toggle("active", i.dataset.lang === currentLang)); rebuildClouds(); renderHud(currentLang); }));
nodeMap.addEventListener("click", e => { const b = e.target.closest("button[data-node]"); if (!b) return; targetScroll = Number(b.dataset.node) / SCROLL_SEGMENTS; });
stage.addEventListener("click", e => { if (e.target.closest("a,button,.scroll-rail,.top-bar,.node-map,.social-panel")) return; const { si, at } = getScrollState(scrollProgress); if (at > 0.65) { const s = getSections(currentLang)[si]; if (s?.link) window.open(s.link, "_blank", "noopener"); } });

/* ─── Updates ─── */
function updateConst(time, dt) {
  for (let i = 0; i < CN; i++) { const v = cV[i], i3 = i * 3; v.oa += v.os; cP[i3] = Math.cos(v.oa) * v.or; cP[i3 + 1] += v.vy; cP[i3 + 2] = Math.sin(v.oa) * v.or; if (cP[i3 + 1] > Y_TOP + 2) cP[i3 + 1] = Y_BOT - 2; if (cP[i3 + 1] < Y_BOT - 2) cP[i3 + 1] = Y_TOP + 2; }
  cGeo.attributes.position.needsUpdate = true;
  let lc = 0; const dsq = CD * CD;
  for (let i = 0; i < CN && lc < CML; i++) { const i3 = i * 3; for (let j = i + 1; j < CN && lc < CML; j++) { const j3 = j * 3, dx = cP[i3] - cP[j3], dy = cP[i3 + 1] - cP[j3 + 1], dz = cP[i3 + 2] - cP[j3 + 2], d2 = dx * dx + dy * dy + dz * dz;
    if (d2 < dsq) { const a = Math.pow(1 - Math.sqrt(d2) / CD, 2), li = lc * 6; lP[li] = cP[i3]; lP[li + 1] = cP[i3 + 1]; lP[li + 2] = cP[i3 + 2]; lP[li + 3] = cP[j3]; lP[li + 4] = cP[j3 + 1]; lP[li + 5] = cP[j3 + 2]; lC[li] = .78 * a; lC[li + 1] = 1. * a; lC[li + 2] = .96 * a; lC[li + 3] = .68 * a; lC[li + 4] = .82 * a; lC[li + 5] = 1. * a; lc++; } } }
  lGeo.setDrawRange(0, lc * 2); lGeo.attributes.position.needsUpdate = true; lGeo.attributes.color.needsUpdate = true; cPts.rotation.y += dt * 0.008;
}

function updateDust() {
  const pw = new THREE.Vector3(pointer.x, pointer.y, 0.5).unproject(camera), dir = pw.sub(camera.position).normalize(), d = -camera.position.z / dir.z;
  const mw = camera.position.clone().add(dir.multiplyScalar(d));
  for (let i = 0; i < DC; i++) { const i3 = i * 3, dx = dBP[i3] - mw.x, dy = dBP[i3 + 1] - mw.y, dz = dBP[i3 + 2] - mw.z, dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 3) { const p = (1 - dist / 3) * 0.07; dP[i3] = dBP[i3] + (dx / dist) * p; dP[i3 + 1] = dBP[i3 + 1] + (dy / dist) * p; dP[i3 + 2] = dBP[i3 + 2] + (dz / dist) * p; }
    else { dP[i3] += (dBP[i3] - dP[i3]) * 0.04; dP[i3 + 1] += (dBP[i3 + 1] - dP[i3 + 1]) * 0.04; dP[i3 + 2] += (dBP[i3 + 2] - dP[i3 + 2]) * 0.04; } }
  dGeo.attributes.position.needsUpdate = true;
}

function updateShards(time) {
  shards.forEach((s, i) => {
    s.angle += s.speed * 0.016;
    s.mesh.position.x = Math.cos(s.angle) * s.r;
    s.mesh.position.z = Math.sin(s.angle) * s.r;
    s.mesh.position.y = s.baseY + Math.sin(time * 0.4 + i) * 0.2;
    setPlaneFrontToCamera(s.mesh, s.mesh.position);
  });
}

function updateCamera(dt) {
  pSX += (pTX - pSX) * Math.min(dt * 2.5, 1); pSY += (pTY - pSY) * Math.min(dt * 2.5, 1);
  const sp = introT < 1 ? 0 : scrollProgress;
  const cameraRaw = getCameraRaw(sp);
  const cameraState = getScrollState(sp);
  const pointerScale = cameraState.phase === "hold" ? 0 : 1;
  const ca = pathAngle(cameraRaw) + pSX * 0.12 * pointerScale;
  const cy = pathY(cameraRaw) + pSY * 0.1 * pointerScale;
  const desiredPos = new THREE.Vector3(Math.cos(ca) * CAM_R, cy + 0.35, Math.sin(ca) * CAM_R);
  const desiredLook = pathPos(cameraRaw);

  if (introT < 1) {
    introT = Math.min(1, introT + dt / INTRO_DUR);
    const e = easeIO(introT);
    camera.position.lerpVectors(camIntroStart, desiredPos, e);
    smoothLookAt.lerp(desiredLook, e);
    camera.lookAt(smoothLookAt);
  } else {
    const k = cameraState.phase === "hold" ? 1 : 1 - Math.exp(-dt * 2.4);
    smoothCamPos.lerp(desiredPos, k);
    camera.position.copy(smoothCamPos);

    smoothLookAt.lerp(desiredLook, cameraState.phase === "hold" ? 1 : 1 - Math.exp(-dt * 2.8));
    camera.lookAt(smoothLookAt);
  }
}

let renderW = 0, renderH = 0;
function resize(w, h) { if (w === renderW && h === renderH) return; renderW = w; renderH = h; renderer.setSize(w, h, false); composer.setSize(w, h); bloomPass.resolution.set(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }

/* ─── Loop ─── */
function animate(now) {
  requestAnimationFrame(animate);
  const time = now * 0.001, dt = Math.min((now - lastTime) / 1000, 0.05); lastTime = now;
  frameCount++; if (now - lastFpsTime >= 1000) { currentFps = frameCount; frameCount = 0; lastFpsTime = now; const el = infoHud.querySelector(".hud-grid-2 b"); if (el) el.textContent = currentFps; }
  resize(document.documentElement.clientWidth, document.documentElement.clientHeight);
  scrollProgress += (targetScroll - scrollProgress) * Math.min(dt * 1.6, 1);
  progressFill.style.height = `${Math.round(scrollProgress * 100)}%`; progressNode.style.top = `${scrollProgress * 100}%`;

  axMat.opacity = 0.06 + Math.sin(time * 1.2) * 0.02;
  const { si: activeRing } = getScrollState(scrollProgress);
  eRings.forEach((r, i) => { const f = i === activeRing ? 1 : 0; r.rotation.z += dt * (0.06 + i * 0.005); r.scale.setScalar(1 + f * 0.12 + Math.sin(time * 1.5 + i) * 0.01); r.material.opacity = 0.025 + f * 0.08 + Math.sin(time * 1.5 + i) * 0.015; });

  dust.rotation.y += dt * 0.015; dust.rotation.x = Math.sin(time * 0.07) * 0.04; dust2.rotation.y -= dt * 0.009;
  updateDust(); updateConst(time, dt); updateShards(time); updateClouds(time, dt); updateCamera(dt);
  ringX += (cursorX - ringX) * 0.12; ringY += (cursorY - ringY) * 0.12; cursorRing.style.left = ringX + "px"; cursorRing.style.top = ringY + "px";
  composer.render();
}

/* ─── Init ─── */
document.querySelectorAll(".lang-btn").forEach(i => i.classList.toggle("active", i.dataset.lang === currentLang));
renderHud(currentLang); rebuildClouds(); requestAnimationFrame(animate);
