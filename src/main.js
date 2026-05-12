import zh from "./locales/zh.js";
import en from "./locales/en.js";
import { layoutWithLines, prepareWithSegments } from "@chenglou/pretext";
import * as THREE from "three";

const locales = { zh, en };
let currentLang = "zh";

const stage = document.getElementById("stage");
const progressRail = document.createElement("div");
progressRail.className = "scroll-rail";
progressRail.innerHTML = '<span class="scroll-rail-fill"></span><span class="scroll-rail-node"></span>';
stage.appendChild(progressRail);

const progressFill = progressRail.querySelector(".scroll-rail-fill");
const progressNode = progressRail.querySelector(".scroll-rail-node");

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
const BLOCK_TOP_Y = 15;
const BLOCK_SPAN_Y = 31;
const HELIX_STEP = 1.42;
const BLOCK_ORBIT_RADIUS = 2.15;
const CAMERA_ORBIT_RADIUS = 6.25;
const BLOCK_BODY_FONT = '500 31px "Helvetica Neue", Arial, sans-serif';
const BLOCK_BODY_LINE_HEIGHT = 42;

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
  bio: 0x8fffe7,
  research: 0x87b7ff,
  publications: 0xffd36e,
  projects: 0xb899ff,
  skills: 0xff8b72,
  experience: 0xff7fca,
  awards: 0xd9ff75,
};

function compactText(parts, max = 170) {
  const text = parts.filter(Boolean).map(stripHtml).join(" ").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
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

function colorToCss(hex, alpha = 1) {
  const r = (hex >> 16) & 255;
  const g = (hex >> 8) & 255;
  const b = hex & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function makeAsciiTexture(seed, variant = "cyan") {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 2048;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = '700 18px "Courier New", Consolas, monospace';
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
      ? ["rgba(255, 224, 139,", "rgba(255, 127, 202,", "rgba(255, 255, 255,"]
      : ["rgba(143, 255, 231,", "rgba(135, 183, 255,", "rgba(255, 255, 255,"];

  for (let y = 8; y < canvas.height; y += 24) {
    for (let x = 16; x < canvas.width; x += 24) {
      if (rand() < 0.18) continue;
      const alpha = 0.14 + rand() * 0.78;
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
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const accent = block.color;

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "rgba(4, 8, 14, 0.82)");
  gradient.addColorStop(0.52, colorToCss(accent, 0.16));
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.92)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = colorToCss(accent, 0.76);
  ctx.lineWidth = 3;
  ctx.strokeRect(28, 28, canvas.width - 56, canvas.height - 56);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.strokeRect(46, 46, canvas.width - 92, canvas.height - 92);

  ctx.font = '700 24px "Courier New", Consolas, monospace';
  ctx.fillStyle = colorToCss(accent, 0.95);
  ctx.fillText(`BLOCK ${String(block.index + 1).padStart(2, "0")} / ${block.id.toUpperCase()}`, 76, 96);

  ctx.font = '800 58px "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.fillText(block.title.toUpperCase(), 74, 178);

  ctx.font = BLOCK_BODY_FONT;
  ctx.fillStyle = "rgba(225, 244, 255, 0.78)";
  wrapCanvasText(ctx, block.body, 78, 252, 820, BLOCK_BODY_LINE_HEIGHT, 4);

  ctx.font = '700 18px "Courier New", Consolas, monospace';
  ctx.fillStyle = "rgba(255, 255, 255, 0.34)";
  ctx.fillText("SELF-LIT DATA NODE // CLICK TO OPEN", 76, 444);

  for (let i = 0; i < 90; i++) {
    const x = 54 + Math.random() * 910;
    const y = 54 + Math.random() * 400;
    ctx.fillStyle = colorToCss(accent, 0.08 + Math.random() * 0.18);
    ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
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
scene.fog = new THREE.FogExp2(0x03050a, 0.035);

const camera = new THREE.PerspectiveCamera(48, W0 / H0, 0.1, 120);
const cameraTarget = new THREE.Vector3();
const desiredCamera = new THREE.Vector3();
const desiredTarget = new THREE.Vector3();

const dataColumn = new THREE.Group();
scene.add(dataColumn);

const streamLayers = [];
for (let i = 0; i < 14; i++) {
  const radius = 0.48 + i * 0.035;
  const height = 44;
  const thetaLength = Math.PI * (0.26 + (i % 4) * 0.08);
  const thetaStart = (i / 14) * Math.PI * 2;
  const texture = makeAsciiTexture(i + 11, i % 5 === 0 ? "warm" : "cyan");
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 28, 1, true, thetaStart, thetaLength);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.18 + (i % 5) * 0.045,
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
    speed: 0.06 + (i % 6) * 0.022,
    direction: i % 2 === 0 ? 1 : -1,
    spin: (i % 2 === 0 ? 1 : -1) * (0.035 + i * 0.002),
  });
}

const haloGeometry = new THREE.CylinderGeometry(0.72, 0.72, 44, 64, 1, true);
const haloMaterial = new THREE.MeshBasicMaterial({
  color: 0x87b7ff,
  transparent: true,
  opacity: 0.045,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  side: THREE.DoubleSide,
});
const halo = new THREE.Mesh(haloGeometry, haloMaterial);
dataColumn.add(halo);

const axisMaterial = new THREE.MeshBasicMaterial({
  color: 0xdffcff,
  transparent: true,
  opacity: 0.36,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const axis = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 44, 16), axisMaterial);
dataColumn.add(axis);

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
    color: 0xbfefff,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
  }),
);
scene.add(helixGuide);

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
      blending: THREE.AdditiveBlending,
    });
    const edge = new THREE.MeshBasicMaterial({
      color: block.color,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
    });
    const geometry = new THREE.BoxGeometry(2.25, 1.14, 0.08);
    const mesh = new THREE.Mesh(geometry, [edge, edge, edge, edge, front, front]);
    const line = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: block.color,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
      }),
    );
    mesh.add(line);
    mesh.userData.block = block;
    mesh.userData.front = front;
    mesh.userData.edge = edge;
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
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function getCameraOrbitRadius() {
  const w = document.documentElement.clientWidth;
  return w < 520 ? 9.7 : w < 760 ? 8.6 : CAMERA_ORBIT_RADIUS;
}

function getPanelScaleFactor() {
  const w = document.documentElement.clientWidth;
  return w < 520 ? 0.78 : w < 760 ? 0.88 : 1;
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
    targetScrollProgress = clamp01(targetScrollProgress + event.deltaY / 4200);
    event.preventDefault();
  },
  { passive: false },
);

window.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === " ") {
    targetScrollProgress = clamp01(targetScrollProgress + 0.12);
    event.preventDefault();
  }
  if (event.key === "ArrowUp" || event.key === "PageUp") {
    targetScrollProgress = clamp01(targetScrollProgress - 0.12);
    event.preventDefault();
  }
  if (event.key === "Home") targetScrollProgress = 0;
  if (event.key === "End") targetScrollProgress = 1;
});

window.addEventListener("pointermove", (event) => {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
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
  });
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
    mesh.userData.front.opacity = 0.24 + visibility * 0.55 + (focus || hover ? 0.22 : 0);
    mesh.userData.edge.opacity = 0.08 + visibility * 0.16 + (focus || hover ? 0.16 : 0);
    mesh.userData.line.material.opacity = 0.24 + visibility * 0.46 + (focus || hover ? 0.22 : 0);
    mesh.visible = visibility > 0.03;
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
  const blendedAngle = THREE.MathUtils.lerp(cameraAngle, activeAngle, 0.18);
  desiredCamera.set(
    Math.cos(blendedAngle) * getCameraOrbitRadius(),
    y + 0.24,
    Math.sin(blendedAngle) * getCameraOrbitRadius(),
  );
  desiredTarget.set(
    Math.cos(blendedAngle) * 0.22,
    y - 0.08,
    Math.sin(blendedAngle) * 0.22,
  );
  const k = 1 - Math.exp(-dt * 4.4);
  camera.position.lerp(desiredCamera, k);
  cameraTarget.lerp(desiredTarget, k);
  camera.lookAt(cameraTarget);
}

function animate(now) {
  requestAnimationFrame(animate);
  const time = now * 0.001;
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  resize(document.documentElement.clientWidth, document.documentElement.clientHeight);
  scrollProgress += (targetScrollProgress - scrollProgress) * Math.min(dt * 5.5, 1);
  progressFill.style.height = `${Math.round(scrollProgress * 100)}%`;
  progressNode.style.top = `${scrollProgress * 100}%`;

  streamLayers.forEach((layer) => {
    layer.texture.offset.y += dt * layer.speed * layer.direction;
    layer.mesh.rotation.y += dt * layer.spin;
  });
  halo.rotation.y += dt * 0.03;
  axis.material.opacity = 0.28 + Math.sin(time * 1.6) * 0.08;

  dust.rotation.y += dt * 0.018;
  dust.rotation.x = Math.sin(time * 0.08) * 0.045;
  distantDust.rotation.y -= dt * 0.011;

  updateCamera(dt);
  updateBlocks(time, dt);
  updatePointer();
  renderer.render(scene, camera);
}

document.querySelectorAll(".lang-btn").forEach((item) => {
  item.classList.toggle("active", item.dataset.lang === currentLang);
});
rebuildBlocks();
camera.position.set(getCameraOrbitRadius(), BLOCK_TOP_Y + 0.2, 0);
cameraTarget.set(0, BLOCK_TOP_Y, 0);
requestAnimationFrame(animate);
