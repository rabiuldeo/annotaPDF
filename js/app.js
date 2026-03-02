/**
 * AnnotaPDF v1
 * Chrome-style PDF Viewer · Multi-page scroll · Per-page rotation · Auto-save
 * Developer: রবিউল হাসান
 */
'use strict';

/* ── PDF.JS ── */
pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* ── COLOR MAP — Bangladesh flag inspired ── */
const COLOR_MAP = {
  yellow: { r:249, g:168, b:37,  hex:'#F9A825' },  // BD golden
  red:    { r:244, g:42,  b:65,  hex:'#F42A41' },  // BD flag red
  green:  { r:0,   g:106, b:78,  hex:'#006A4E' },  // BD flag green
  custom: { r:249, g:168, b:37,  hex:'#F9A825' },
};

const BASE_SCALE    = 1.5;
const SAVE_SCALE    = 3.0;
const MAX_HISTORY   = 50;
const MIN_HIGHLIGHT = 4;

/* ── STATE ── */
let tabs         = [];
let activeTabId  = null;
let drawMode     = 'highlight';
let activeColor  = 'yellow';
let activeOpacity = 60;
let zoomLevel    = 1.0;
let tabIdCounter = 0;
let toastTimer   = null;
let autoSaveTimer = null;

/* ── DOM ── */
const fileInput      = document.getElementById('file-input');
const loadBarInner   = document.getElementById('load-bar-inner');
const loadBarEl      = document.getElementById('load-bar');
const tabBar         = document.getElementById('tab-bar');
const addTabBtn      = document.getElementById('add-tab-btn');
const dropZone       = document.getElementById('drop-zone');
const pagesContainer = document.getElementById('pages-container');
const thumbList      = document.getElementById('thumb-list');
const thumbEmpty     = document.getElementById('thumb-empty');
const hiList         = document.getElementById('hi-list');
const hiEmpty        = document.getElementById('hi-empty');
const hiCountEl      = document.getElementById('hi-count');
const opSlider       = document.getElementById('op-slider');
const opValEl        = document.getElementById('op-val');
const opFill         = document.getElementById('op-fill');
const zoomLabelBtn   = document.getElementById('zoom-label');
const autosaveBadge  = document.getElementById('autosave-badge');

/* ═══════════════════════════════════
   TAB STATE
═══════════════════════════════════ */
class TabState {
  constructor(id, name, type) {
    this.id           = id;
    this.name         = name;
    this.type         = type;
    this.pdfDoc       = null;
    this.imgElement   = null;
    this.imgSrc       = null;
    this.totalPages   = 1;
    this.unsaved      = false;
    this.pageRotation = new Map();
    this.highlights   = [];
    this.history      = [];
    this.future       = [];
  }
  getRotation(p) { return this.pageRotation.get(p) || 0; }
  setRotation(p, d) { this.pageRotation.set(p, ((d % 360) + 360) % 360); }
}

/* ═══════════════════════════════════
   LOAD BAR
═══════════════════════════════════ */
function setLoadBar(pct) {
  if (pct === 0) {
    loadBarEl.style.display = 'block';
    loadBarInner.style.width = '5%';
  } else if (pct >= 100) {
    loadBarInner.style.width = '100%';
    setTimeout(() => { loadBarEl.style.display = 'none'; loadBarInner.style.width = '0'; }, 380);
  } else {
    loadBarInner.style.width = pct + '%';
  }
}

/* ═══════════════════════════════════
   TOAST
═══════════════════════════════════ */
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.innerHTML = msg;
  el.className = type ? `show ${type}` : 'show';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = ''; }, 2800);
}

/* ═══════════════════════════════════
   FILE HANDLING
═══════════════════════════════════ */
function openFiles(files) {
  [...files].forEach(f => {
    if (f.type === 'application/pdf') loadPdfFile(f);
    else if (f.type.startsWith('image/')) loadImageFile(f);
    else toast(`সাপোর্টেড নয়: ${f.name}`, 'error');
  });
}

async function loadPdfFile(file) {
  setLoadBar(0);
  try {
    const buf = await file.arrayBuffer();
    setLoadBar(40);
    const doc = await pdfjsLib.getDocument({ data: buf }).promise;
    setLoadBar(80);
    const tab = createTab(file.name, 'pdf');
    tab.pdfDoc = doc; tab.totalPages = doc.numPages;
    activateTab(tab.id);
    setLoadBar(100);
    toast(`<i class="fa-solid fa-circle-check"></i> ${file.name} (${doc.numPages} পেজ)`, 'success');
    autoLoadThumbs(tab);
  } catch(e) {
    setLoadBar(100);
    toast('PDF লোড ব্যর্থ', 'error');
  }
}

function loadImageFile(file) {
  setLoadBar(0);
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const tab = createTab(file.name, 'image');
    tab.imgElement = img; tab.imgSrc = url;
    activateTab(tab.id); setLoadBar(100);
    toast(`<i class="fa-solid fa-circle-check"></i> ${file.name}`, 'success');
    autoLoadThumbs(tab);
  };
  img.onerror = () => { setLoadBar(100); toast('ইমেজ লোড ব্যর্থ', 'error'); };
  img.src = url; setLoadBar(60);
}

async function loadFromUrl(rawUrl, inputEl = null) {
  const url = rawUrl.trim();
  if (!url) { toast('URL দিন', 'warning'); return; }
  if (inputEl) inputEl.value = '';
  const ext = url.split('?')[0].split('.').pop().toLowerCase();
  const isImg = ['jpg','jpeg','png','webp','gif','bmp','svg'].includes(ext);
  if (isImg) loadImageUrl(url);
  else await loadPdfUrl(url);
}

function loadImageUrl(url) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const name = url.split('/').pop().split('?')[0] || 'image';
    const tab = createTab(name, 'image');
    tab.imgElement = img; tab.imgSrc = url;
    activateTab(tab.id); setLoadBar(100);
    toast('ইমেজ লোড হয়েছে', 'success');
    autoLoadThumbs(tab);
  };
  img.onerror = () => toast('ইমেজ লোড ব্যর্থ', 'error');
  img.src = url; setLoadBar(30);
}

async function fetchWithProgress(fetchUrl, opts = {}) {
  const res = await fetch(fetchUrl, opts);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const len = res.headers.get('Content-Length');
  if (!len || !res.body) return res.arrayBuffer();
  const total = parseInt(len, 10);
  const reader = res.body.getReader();
  const chunks = []; let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value); received += value.length;
    setLoadBar(Math.min(5 + Math.round(received/total*70), 75));
  }
  const merged = new Uint8Array(received); let off = 0;
  for (const c of chunks) { merged.set(c, off); off += c.length; }
  return merged.buffer;
}

async function loadPdfUrl(rawUrl) {
  const name = rawUrl.split('/').pop().split('?')[0] || 'document.pdf';
  setLoadBar(5);
  function openDoc(doc) {
    const tab = createTab(name, 'pdf');
    tab.pdfDoc = doc; tab.totalPages = doc.numPages;
    activateTab(tab.id); setLoadBar(100);
    toast('PDF লোড হয়েছে', 'success');
    autoLoadThumbs(tab);
  }
  try { const d = await pdfjsLib.getDocument({ url: rawUrl, withCredentials: false }).promise; openDoc(d); return; } catch(_){}
  try {
    setLoadBar(10);
    const buf = await fetchWithProgress(`https://corsproxy.io/?${encodeURIComponent(rawUrl)}`);
    if (buf.byteLength > 100) { openDoc(await pdfjsLib.getDocument({ data: buf }).promise); return; }
  } catch(_){}
  try {
    setLoadBar(15);
    const buf = await fetchWithProgress(`https://api.allorigins.win/raw?url=${encodeURIComponent(rawUrl)}`);
    if (buf.byteLength > 100) { openDoc(await pdfjsLib.getDocument({ data: buf }).promise); return; }
  } catch(_){}
  setLoadBar(100);
  const te = document.getElementById('toast');
  te.innerHTML = `লোড ব্যর্থ। <a href="${rawUrl}" download target="_blank">ডাউনলোড করুন</a> তারপর ফাইল খুলুন।`;
  te.className = 'show error'; clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { te.className = ''; }, 9000);
}

/* ═══════════════════════════════════
   TABS
═══════════════════════════════════ */
function createTab(name, type) {
  const id = ++tabIdCounter;
  const tab = new TabState(id, name, type);
  tabs.push(tab); renderTabEl(tab); return tab;
}

function renderTabEl(tab) {
  const el = document.createElement('div');
  el.className = 'tab'; el.dataset.id = tab.id; el.title = tab.name;
  el.innerHTML = `
    <span class="tab-type ${tab.type}">${tab.type === 'pdf' ? 'PDF' : 'IMG'}</span>
    <span class="tab-name">${tab.name}</span>
    <span class="tab-close" data-id="${tab.id}"><i class="fa-solid fa-xmark"></i></span>
  `;
  el.addEventListener('click', e => {
    if (e.target.closest('.tab-close')) { closeTab(tab.id); return; }
    activateTab(tab.id);
  });
  tabBar.insertBefore(el, addTabBtn);
}

function activateTab(id) {
  activeTabId = id;
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', +t.dataset.id === id));
  dropZone.classList.add('hidden');
  pagesContainer.classList.remove('hidden');
  renderAllPages();
  updateHiPanel();
  updateThumbActiveState();
}

function closeTab(id) {
  const idx = tabs.findIndex(t => t.id === id);
  if (idx < 0) return;
  const tab = tabs[idx];
  if (tab.imgSrc?.startsWith('blob:')) URL.revokeObjectURL(tab.imgSrc);
  tabs.splice(idx, 1);
  document.querySelector(`.tab[data-id="${id}"]`)?.remove();
  if (!tabs.length) {
    activeTabId = null;
    dropZone.classList.remove('hidden');
    pagesContainer.classList.add('hidden');
    pagesContainer.innerHTML = '';
    thumbList.innerHTML = ''; thumbList.appendChild(thumbEmpty);
    thumbEmpty.style.display = '';
    updateHiPanel();
  } else {
    activateTab(tabs[Math.min(idx, tabs.length - 1)].id);
  }
}

function getTab() { return tabs.find(t => t.id === activeTabId) || null; }

/* ═══════════════════════════════════
   RENDERING (Chrome-style per-page)
═══════════════════════════════════ */
async function renderAllPages() {
  const tab = getTab(); if (!tab) return;
  pagesContainer.innerHTML = ''; pagesContainer.dataset.tabId = tab.id;
  if (tab.type === 'image') { renderImagePageEl(tab, 1); return; }
  for (let p = 1; p <= tab.totalPages; p++) renderPdfPageEl(tab, p);
}

async function renderPdfPageEl(tab, pageNum) {
  const wrapper = document.createElement('div');
  wrapper.className = 'page-wrapper'; wrapper.dataset.page = pageNum;
  const shadow = document.createElement('div'); shadow.className = 'page-shadow';
  const pdfC = document.createElement('canvas');
  const ovrC = document.createElement('canvas'); ovrC.className = 'overlay-canvas';
  const drawC = document.createElement('canvas'); drawC.className = 'draw-canvas';
  shadow.appendChild(pdfC); shadow.appendChild(ovrC); shadow.appendChild(drawC);

  const ptb = document.createElement('div'); ptb.className = 'page-toolbar';
  ptb.innerHTML = `
    <button class="pg-rot-ccw" title="বামে ঘুরান"><i class="fa-solid fa-rotate-left"></i></button>
    <span class="page-num-label">পেজ ${pageNum}</span>
    <button class="pg-rot-cw" title="ডানে ঘুরান"><i class="fa-solid fa-rotate-right"></i></button>
  `;
  ptb.querySelector('.pg-rot-ccw').addEventListener('click', () => rotatePageEl(tab, pageNum, 'ccw', shadow, pdfC, ovrC, drawC));
  ptb.querySelector('.pg-rot-cw').addEventListener('click',  () => rotatePageEl(tab, pageNum, 'cw',  shadow, pdfC, ovrC, drawC));

  wrapper.appendChild(shadow); wrapper.appendChild(ptb);
  pagesContainer.appendChild(wrapper);
  updatePageCursor(shadow);
  attachDrawEvents(tab, pageNum, shadow, pdfC, ovrC, drawC);
  await renderPdfPage(tab, pageNum, pdfC, ovrC, drawC, shadow);
}

async function renderPdfPage(tab, pageNum, pdfC, ovrC, drawC, shadow) {
  try {
    const page = await tab.pdfDoc.getPage(pageNum);
    const vp = page.getViewport({ scale: BASE_SCALE * zoomLevel, rotation: tab.getRotation(pageNum) });
    [pdfC, ovrC, drawC].forEach(c => { c.width = vp.width; c.height = vp.height; });
    shadow.style.width = vp.width + 'px'; shadow.style.height = vp.height + 'px';
    await page.render({ canvasContext: pdfC.getContext('2d'), viewport: vp }).promise;
    redrawHighlightsOnCanvas(tab, pageNum, ovrC);
  } catch(e) { if (e?.name !== 'RenderingCancelledException') console.error(e); }
}

function renderImagePageEl(tab, pageNum) {
  const wrapper = document.createElement('div');
  wrapper.className = 'page-wrapper'; wrapper.dataset.page = pageNum;
  const shadow = document.createElement('div'); shadow.className = 'page-shadow';
  const pdfC = document.createElement('canvas');
  const ovrC = document.createElement('canvas'); ovrC.className = 'overlay-canvas';
  const drawC = document.createElement('canvas'); drawC.className = 'draw-canvas';
  shadow.appendChild(pdfC); shadow.appendChild(ovrC); shadow.appendChild(drawC);
  const ptb = document.createElement('div'); ptb.className = 'page-toolbar';
  ptb.innerHTML = `
    <button class="pg-rot-ccw" title="বামে ঘুরান"><i class="fa-solid fa-rotate-left"></i></button>
    <span class="page-num-label">ছবি</span>
    <button class="pg-rot-cw" title="ডানে ঘুরান"><i class="fa-solid fa-rotate-right"></i></button>
  `;
  ptb.querySelector('.pg-rot-ccw').addEventListener('click', () => rotatePageEl(tab, 1, 'ccw', shadow, pdfC, ovrC, drawC));
  ptb.querySelector('.pg-rot-cw').addEventListener('click',  () => rotatePageEl(tab, 1, 'cw',  shadow, pdfC, ovrC, drawC));
  wrapper.appendChild(shadow); wrapper.appendChild(ptb);
  pagesContainer.appendChild(wrapper);
  updatePageCursor(shadow);
  attachDrawEvents(tab, pageNum, shadow, pdfC, ovrC, drawC);
  renderImageOnCanvas(tab, pdfC, ovrC, drawC, shadow);
}

function renderImageOnCanvas(tab, pdfC, ovrC, drawC, shadow) {
  const img = tab.imgElement;
  const rot = tab.getRotation(1); const sc = BASE_SCALE * zoomLevel;
  const sw = img.naturalWidth; const sh = img.naturalHeight;
  const cw = (rot===90||rot===270) ? sh*sc : sw*sc;
  const ch = (rot===90||rot===270) ? sw*sc : sh*sc;
  [pdfC, ovrC, drawC].forEach(c => { c.width = cw; c.height = ch; });
  shadow.style.width = cw + 'px'; shadow.style.height = ch + 'px';
  const ctx = pdfC.getContext('2d');
  ctx.save(); ctx.translate(cw/2, ch/2); ctx.rotate(rot * Math.PI/180);
  ctx.drawImage(img, -sw*sc/2, -sh*sc/2, sw*sc, sh*sc); ctx.restore();
  redrawHighlightsOnCanvas(tab, 1, ovrC);
}

async function rotatePageEl(tab, pageNum, dir, shadow, pdfC, ovrC, drawC) {
  const newRot = (tab.getRotation(pageNum) + (dir === 'cw' ? 90 : -90) + 360) % 360;
  const oldW = pdfC.width; const oldH = pdfC.height;
  tab.highlights = tab.highlights.map(h => {
    if (h.page !== pageNum) return h;
    const nx = dir==='cw' ? oldH-h.y-h.h : h.y;
    const ny = dir==='cw' ? h.x : oldW-h.x-h.w;
    return { ...h, x:nx, y:ny, w:h.h, h:h.w };
  });
  tab.setRotation(pageNum, newRot);
  if (tab.type === 'pdf') await renderPdfPage(tab, pageNum, pdfC, ovrC, drawC, shadow);
  else renderImageOnCanvas(tab, pdfC, ovrC, drawC, shadow);
  updateHiPanel(); markUnsaved(tab);
  toast('<i class="fa-solid fa-rotate"></i> রোটেট হয়েছে');
}

function redrawHighlightsOnCanvas(tab, pageNum, ovrC) {
  const octx = ovrC.getContext('2d');
  // White background — mix-blend-mode:multiply এর জন্য দরকার
  // transparent হলে multiply কাজ করে না
  octx.clearRect(0, 0, ovrC.width, ovrC.height);
  octx.fillStyle = '#ffffff';
  octx.fillRect(0, 0, ovrC.width, ovrC.height);

  tab.highlights.filter(h => h.page === pageNum).forEach(h => {
    const c = COLOR_MAP[h.color] || COLOR_MAP.yellow;
    // opacity/100 * 0.7 — multiply mode এ হাইলাইট উজ্জ্বল থাকে
    octx.fillStyle = `rgba(${c.r},${c.g},${c.b},${h.opacity/100})`;
    octx.fillRect(h.x, h.y, h.w, h.h);
  });
}

function redrawAllHighlights() {
  const tab = getTab(); if (!tab) return;
  pagesContainer.querySelectorAll('.page-wrapper').forEach(w => {
    const ovrC = w.querySelector('.overlay-canvas');
    if (ovrC) redrawHighlightsOnCanvas(tab, +w.dataset.page, ovrC);
  });
}

/* ═══════════════════════════════════
   DRAWING EVENTS (per canvas)
═══════════════════════════════════ */
let drawState = { active:false };

function attachDrawEvents(tab, pageNum, shadow, pdfC, ovrC, drawC) {
  const viewer = document.getElementById('pdf-viewer');

  const down = (e) => {
    if (activeTabId !== tab.id) return;
    const pos = cvPos(e, drawC);
    if (drawMode === 'pan') {
      drawState = { active:true, mode:'pan', tab, pageNum, shadow,
        sx: e.clientX ?? e.touches[0].clientX, sy: e.clientY ?? e.touches[0].clientY, viewer };
      shadow.classList.add('panning');
    } else {
      drawState = { active:true, mode:drawMode, tab, pageNum, shadow, drawC, ovrC, pdfC,
        startX:pos.x, startY:pos.y };
    }
  };

  const move = (e) => {
    if (!drawState.active || drawState.tab !== tab || drawState.pageNum !== pageNum) return;
    if (drawState.mode === 'pan') {
      const cx = e.clientX ?? e.touches[0].clientX;
      const cy = e.clientY ?? e.touches[0].clientY;
      viewer.scrollLeft -= cx - drawState.sx;
      viewer.scrollTop  -= cy - drawState.sy;
      drawState.sx = cx; drawState.sy = cy; return;
    }
    const pos = cvPos(e, drawC);
    const dctx = drawC.getContext('2d');
    dctx.clearRect(0, 0, drawC.width, drawC.height);
    // White background for multiply blend
    dctx.fillStyle = '#ffffff';
    dctx.fillRect(0, 0, drawC.width, drawC.height);
    const c = COLOR_MAP[activeColor] || COLOR_MAP.yellow;
    dctx.fillStyle = `rgba(${c.r},${c.g},${c.b},0.55)`;
    dctx.fillRect(Math.min(pos.x, drawState.startX), Math.min(pos.y, drawState.startY),
                  Math.abs(pos.x - drawState.startX), Math.abs(pos.y - drawState.startY));
  };

  const up = (e) => {
    if (!drawState.active || drawState.tab !== tab || drawState.pageNum !== pageNum) return;
    shadow.classList.remove('panning');
    if (drawState.mode === 'pan') { drawState.active = false; return; }
    const pos = cvPos(e, drawC);
    drawC.getContext('2d').clearRect(0, 0, drawC.width, drawC.height);
    const x = Math.min(pos.x, drawState.startX);
    const y = Math.min(pos.y, drawState.startY);
    const w = Math.abs(pos.x - drawState.startX);
    const h = Math.abs(pos.y - drawState.startY);
    if (drawState.mode === 'erase') {
      eraseAt(tab, pageNum, x, y, w, h);
      redrawHighlightsOnCanvas(tab, pageNum, ovrC);
    } else if (drawState.mode === 'highlight' && w > MIN_HIGHLIGHT && h > MIN_HIGHLIGHT) {
      pushHistory(tab);
      tab.highlights.push({ id:Date.now(), page:pageNum, x, y, w, h, color:activeColor, opacity:activeOpacity });
      redrawHighlightsOnCanvas(tab, pageNum, ovrC);
      updateHiPanel(); markUnsaved(tab); scheduleAutoSave(tab);
    }
    drawState.active = false;
  };

  drawC.addEventListener('mousedown', down);
  drawC.addEventListener('mousemove', move);
  drawC.addEventListener('mouseup', up);
  drawC.addEventListener('mouseleave', () => {
    if (drawState.active && drawState.pageNum === pageNum && drawState.mode !== 'pan') {
      drawC.getContext('2d').clearRect(0, 0, drawC.width, drawC.height);
      drawState.active = false;
    }
  });
  drawC.addEventListener('touchstart', e => { e.preventDefault(); down(e.touches[0]); }, { passive:false });
  drawC.addEventListener('touchmove',  e => { e.preventDefault(); move(e.touches[0]); }, { passive:false });
  drawC.addEventListener('touchend',   e => { e.preventDefault(); up(e.changedTouches[0]); }, { passive:false });
}

function cvPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = canvas.width / rect.width;
  const cx = e.clientX ?? (e.touches?.[0].clientX ?? 0);
  const cy = e.clientY ?? (e.touches?.[0].clientY ?? 0);
  return { x:(cx-rect.left)*ratio, y:(cy-rect.top)*ratio };
}

function eraseAt(tab, pageNum, x, y, w, h) {
  pushHistory(tab);
  const pad = 20;
  tab.highlights = tab.highlights.filter(hl => {
    if (hl.page !== pageNum) return true;
    return Math.max(hl.x, x-pad) >= Math.min(hl.x+hl.w, x+w+pad) ||
           Math.max(hl.y, y-pad) >= Math.min(hl.y+hl.h, y+h+pad);
  });
  updateHiPanel(); markUnsaved(tab);
}

function updatePageCursor(shadow) {
  shadow.classList.remove('mode-pan','mode-erase');
  if (drawMode === 'pan')   shadow.classList.add('mode-pan');
  if (drawMode === 'erase') shadow.classList.add('mode-erase');
}
function updateAllCursors() {
  pagesContainer.querySelectorAll('.page-shadow').forEach(s => updatePageCursor(s));
}

/* ═══════════════════════════════════
   ZOOM
═══════════════════════════════════ */
function setZoom(newZoom) {
  const tab = getTab();
  newZoom = Math.max(0.25, Math.min(5, newZoom));
  const ratio = newZoom / zoomLevel;
  zoomLevel = newZoom;
  zoomLabelBtn.textContent = Math.round(newZoom * 100) + '%';
  if (tab) tab.highlights = tab.highlights.map(h =>
    ({ ...h, x:h.x*ratio, y:h.y*ratio, w:h.w*ratio, h:h.h*ratio })
  );
  renderAllPages();
}

document.getElementById('zoom-in').addEventListener('click',  () => setZoom(zoomLevel + 0.25));
document.getElementById('zoom-out').addEventListener('click', () => setZoom(zoomLevel - 0.25));
zoomLabelBtn.addEventListener('click', async () => {
  const viewer = document.getElementById('pdf-viewer');
  const tab = getTab(); if (!tab) return;
  const avail = viewer.clientWidth - 64;
  let nw;
  if (tab.type === 'pdf') {
    const page = await tab.pdfDoc.getPage(1);
    nw = page.getViewport({ scale:1, rotation: tab.getRotation(1) }).width;
  } else {
    const r = tab.getRotation(1);
    nw = (r===90||r===270) ? tab.imgElement.naturalHeight : tab.imgElement.naturalWidth;
  }
  setZoom((avail / nw) / BASE_SCALE);
});

/* ═══════════════════════════════════
   UNDO / REDO
═══════════════════════════════════ */
function pushHistory(tab) {
  tab.history.push(JSON.parse(JSON.stringify(tab.highlights)));
  tab.future = [];
  if (tab.history.length > MAX_HISTORY) tab.history.shift();
}
function undo() {
  const tab = getTab(); if (!tab || !tab.history.length) return;
  tab.future.push(JSON.parse(JSON.stringify(tab.highlights)));
  tab.highlights = tab.history.pop();
  redrawAllHighlights(); updateHiPanel();
  toast('<i class="fa-solid fa-rotate-left"></i> আনডু');
}
function redo() {
  const tab = getTab(); if (!tab || !tab.future.length) return;
  tab.history.push(JSON.parse(JSON.stringify(tab.highlights)));
  tab.highlights = tab.future.pop();
  redrawAllHighlights(); updateHiPanel();
  toast('<i class="fa-solid fa-rotate-right"></i> রিডু');
}
document.getElementById('undo-btn').addEventListener('click', undo);
document.getElementById('redo-btn').addEventListener('click', redo);

/* ═══════════════════════════════════
   SAVE
═══════════════════════════════════ */
async function saveFile() {
  const tab = getTab();
  if (!tab) { toast('কোনো ফাইল খোলা নেই', 'error'); return; }
  if (tab.type === 'image') await saveImageFile(tab);
  else await savePdfFile(tab);
}

async function saveImageFile(tab) {
  const wrapper = pagesContainer.querySelector('.page-wrapper');
  if (!wrapper) return;
  const pdfC = wrapper.querySelector('canvas:first-child');
  const ovrC = wrapper.querySelector('.overlay-canvas');
  const out = document.createElement('canvas');
  out.width = pdfC.width; out.height = pdfC.height;
  const mctx = out.getContext('2d');
  mctx.drawImage(pdfC, 0, 0);
  mctx.globalCompositeOperation = 'multiply';
  if (ovrC) mctx.drawImage(ovrC, 0, 0);
  mctx.globalCompositeOperation = 'source-over';
  const a = document.createElement('a');
  a.download = tab.name.replace(/\.[^.]+$/, '') + '-highlighted.png';
  a.href = out.toDataURL('image/png'); a.click();
  toast('ইমেজ ডাউনলোড হচ্ছে…', 'success');
  markUnsaved(tab, false);
}

async function savePdfFile(tab) {
  toast('<i class="fa-solid fa-spinner fa-spin"></i> PDF তৈরি হচ্ছে…');
  setLoadBar(0);
  try {
    const { jsPDF } = window.jspdf;
    let pdf = null; let first = true;
    for (let p = 1; p <= tab.totalPages; p++) {
      setLoadBar(Math.round(p / tab.totalPages * 90));
      const page = await tab.pdfDoc.getPage(p);
      const vp = page.getViewport({ scale:SAVE_SCALE, rotation: tab.getRotation(p) });
      const tc = document.createElement('canvas');
      tc.width = vp.width; tc.height = vp.height;
      const tctx = tc.getContext('2d');
      await page.render({ canvasContext:tctx, viewport:vp }).promise;
      tctx.globalCompositeOperation = 'multiply';
      const ratio = SAVE_SCALE / (BASE_SCALE * zoomLevel);
      tab.highlights.filter(h => h.page === p).forEach(h => {
        const c = COLOR_MAP[h.color] || COLOR_MAP.yellow;
        tctx.fillStyle = `rgba(${c.r},${c.g},${c.b},${h.opacity/100})`;
        tctx.fillRect(h.x*ratio, h.y*ratio, h.w*ratio, h.h*ratio);
      });
      tctx.globalCompositeOperation = 'source-over';
      const imgData = tc.toDataURL('image/jpeg', 0.97);
      const mmW = vp.width*0.264583; const mmH = vp.height*0.264583;
      if (first) { pdf = new jsPDF({ orientation: mmW>mmH?'l':'p', unit:'mm', format:[mmW,mmH] }); first=false; }
      else pdf.addPage([mmW,mmH], mmW>mmH?'l':'p');
      pdf.addImage(imgData,'JPEG',0,0,mmW,mmH);
    }
    setLoadBar(100);
    pdf.save(tab.name.replace(/\.pdf$/i,'') + '-highlighted.pdf');
    toast('PDF সেভ হয়েছে', 'success');
    markUnsaved(tab, false);
  } catch(e) {
    setLoadBar(100); toast('PDF সেভ ব্যর্থ: ' + e.message, 'error');
  }
}

/* ── Auto-save (highlight state to localStorage) ── */
function scheduleAutoSave(tab) {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    try {
      localStorage.setItem(`apdf_hl_${tab.id}`, JSON.stringify({
        name: tab.name, highlights: tab.highlights, ts: Date.now()
      }));
      markUnsaved(tab, false);
      showAutosaveBadge();
    } catch(_) {}
  }, 3000);
}

function showAutosaveBadge() {
  autosaveBadge.classList.add('visible');
  setTimeout(() => autosaveBadge.classList.remove('visible'), 2500);
}

function markUnsaved(tab, state = true) {
  tab.unsaved = state;
  document.querySelector(`.tab[data-id="${tab.id}"]`)?.classList.toggle('unsaved', state);
}

/* ═══════════════════════════════════
   THUMBNAILS
═══════════════════════════════════ */
async function autoLoadThumbs(tab) {
  thumbEmpty.style.display = 'none';
  thumbList.querySelectorAll('.thumb-item').forEach(e => e.remove());
  if (tab.type === 'image') {
    addThumbItem(tab, 1, async c => {
      const img = tab.imgElement;
      c.width = 150; c.height = Math.round(img.naturalHeight / img.naturalWidth * 150);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    }); return;
  }
  for (let p = 1; p <= tab.totalPages; p++) {
    addThumbItem(tab, p, async c => {
      const page = await tab.pdfDoc.getPage(p);
      const vp = page.getViewport({ scale:0.3, rotation: tab.getRotation(p) });
      c.width = vp.width; c.height = vp.height;
      await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    });
  }
}

function addThumbItem(tab, pageNum, renderFn) {
  const item = document.createElement('div');
  item.className = 'thumb-item'; item.dataset.page = pageNum;
  const c = document.createElement('canvas'); c.width = 150;
  const num = document.createElement('div');
  num.className = 'thumb-pg-num'; num.textContent = pageNum;
  const rotWrap = document.createElement('div'); rotWrap.className = 'thumb-rot-wrap';
  const rotCCW = document.createElement('button');
  rotCCW.className = 'thumb-rot-btn'; rotCCW.title = 'বামে';
  rotCCW.innerHTML = '<i class="fa-solid fa-rotate-left"></i>';
  const rotCW = document.createElement('button');
  rotCW.className = 'thumb-rot-btn'; rotCW.title = 'ডানে';
  rotCW.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
  rotWrap.appendChild(rotCCW); rotWrap.appendChild(rotCW);
  item.appendChild(c); item.appendChild(num); item.appendChild(rotWrap);
  thumbList.appendChild(item);
  renderFn(c).catch(() => {});

  item.addEventListener('click', e => {
    if (e.target.closest('.thumb-rot-wrap')) return;
    const w = pagesContainer.querySelector(`.page-wrapper[data-page="${pageNum}"]`);
    if (w) w.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  const doRotate = async (dir) => {
    const w = pagesContainer.querySelector(`.page-wrapper[data-page="${pageNum}"]`);
    if (!w) return;
    const pdfC = w.querySelector('canvas:first-child');
    const ovrC = w.querySelector('.overlay-canvas');
    const drawC = w.querySelector('.draw-canvas');
    const shadow = w.querySelector('.page-shadow');
    await rotatePageEl(tab, pageNum, dir, shadow, pdfC, ovrC, drawC);
    if (tab.pdfDoc) {
      const page = await tab.pdfDoc.getPage(pageNum);
      const vp = page.getViewport({ scale:0.3, rotation: tab.getRotation(pageNum) });
      c.width = vp.width; c.height = vp.height;
      page.render({ canvasContext: c.getContext('2d'), viewport: vp });
    }
  };
  rotCCW.addEventListener('click', e => { e.stopPropagation(); doRotate('ccw'); });
  rotCW.addEventListener('click',  e => { e.stopPropagation(); doRotate('cw'); });
}

function updateThumbActiveState() {
  thumbList.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
}

/* ═══════════════════════════════════
   HIGHLIGHTS PANEL
═══════════════════════════════════ */
function updateHiPanel() {
  const tab = getTab();
  const all = tab ? tab.highlights : [];
  hiCountEl.textContent = all.length;

  if (!all.length) {
    hiList.innerHTML = ''; hiList.appendChild(hiEmpty);
    hiEmpty.style.display = ''; return;
  }
  hiEmpty.style.display = 'none';

  const byPage = {};
  all.forEach(h => (byPage[h.page] = byPage[h.page]||[]).push(h));

  let html = '';
  Object.keys(byPage).sort((a,b)=>+a-+b).forEach(pg => {
    if (tab.totalPages > 1)
      html += `<div class="hi-page-group">পেজ ${pg}</div>`;
    byPage[pg].forEach((h,i) => {
      const c = COLOR_MAP[h.color] || COLOR_MAP.yellow;
      html += `<div class="hi-item" onclick="jumpToHighlight(${h.id})">
        <div class="hi-dot" style="background:${c.hex};border-radius:4px"></div>
        <div class="hi-meta">
          <div class="hi-label">হাইলাইট ${i+1}</div>
          <div class="hi-sub">${Math.round(h.w)}×${Math.round(h.h)}px · অপাসিটি ${h.opacity}%</div>
        </div>
        <button class="hi-del" onclick="event.stopPropagation();deleteHighlight(${h.id})" title="মুছুন">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>`;
    });
  });

  hiList.innerHTML = html;
  hiList.appendChild(hiEmpty); hiEmpty.style.display = 'none';
}

function jumpToHighlight(id) {
  const tab = getTab(); if (!tab) return;
  const h = tab.highlights.find(x => x.id === id); if (!h) return;
  pagesContainer.querySelector(`.page-wrapper[data-page="${h.page}"]`)
    ?.scrollIntoView({ behavior:'smooth', block:'center' });
}

function deleteHighlight(id) {
  const tab = getTab(); if (!tab) return;
  pushHistory(tab);
  tab.highlights = tab.highlights.filter(h => h.id !== id);
  redrawAllHighlights(); updateHiPanel(); markUnsaved(tab);
  toast('হাইলাইট মুছা হয়েছে');
}

/* ═══════════════════════════════════
   TOOLBAR WIRING
═══════════════════════════════════ */

/* Draw mode */
document.querySelectorAll('.tb-btn[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tb-btn[data-mode]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); drawMode = btn.dataset.mode;
    updateAllCursors();
    const icons  = { highlight:'fa-highlighter', erase:'fa-eraser', pan:'fa-hand-back-fist' };
    const labels = { highlight:'হাইলাইট', erase:'ইরেজ', pan:'স্ক্রোল' };
    const mb = document.getElementById('mb-mode');
    mb.querySelector('i').className = `fa-solid ${icons[drawMode]}`;
    mb.querySelector('span').textContent = labels[drawMode];
  });
});

/* Colors */
document.querySelectorAll('.color-swatch').forEach(s => {
  s.addEventListener('click', () => {
    document.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('active'));
    s.classList.add('active'); activeColor = s.dataset.color;
  });
});
document.getElementById('custom-color').addEventListener('input', e => {
  const hex = e.target.value;
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  COLOR_MAP.custom = { r, g, b, hex };
  const cs = document.querySelector('.custom-sw');
  cs.style.setProperty('--sw', hex);
  cs.style.background = hex;
  document.querySelectorAll('.color-swatch').forEach(x => x.classList.remove('active'));
  cs.classList.add('active'); activeColor = 'custom';
});

/* Opacity */
opSlider.addEventListener('input', () => {
  activeOpacity = +opSlider.value;
  opValEl.textContent = activeOpacity + '%';
  opFill.style.width = activeOpacity + '%';
});

/* Save */
document.getElementById('save-btn').addEventListener('click', saveFile);
document.getElementById('mb-save').addEventListener('click', saveFile);

/* Clear */
document.getElementById('clear-btn').addEventListener('click', () => {
  const tab = getTab(); if (!tab || !tab.highlights.length) return;
  pushHistory(tab); tab.highlights = [];
  redrawAllHighlights(); updateHiPanel(); markUnsaved(tab);
  toast('সব হাইলাইট মুছা হয়েছে');
});

/* File open */
[document.getElementById('header-file-btn'), document.getElementById('dz-file-btn'),
 document.getElementById('mb-file'), addTabBtn].forEach(btn => {
  if (btn) btn.addEventListener('click', () => fileInput.click());
});
fileInput.addEventListener('change', e => { openFiles(e.target.files); fileInput.value = ''; });

/* URL inputs */
const hUrl = document.getElementById('header-url-input');
document.getElementById('url-load-btn').addEventListener('click', () => loadFromUrl(hUrl.value, hUrl));
hUrl.addEventListener('keydown', e => { if (e.key==='Enter') loadFromUrl(hUrl.value, hUrl); });
hUrl.addEventListener('paste', e => {
  const p = (e.clipboardData||window.clipboardData).getData('text').trim();
  if (p.startsWith('http')) { e.preventDefault(); loadFromUrl(p, hUrl); }
});
const dzUrl = document.getElementById('dz-url-input');
document.getElementById('dz-url-btn').addEventListener('click', () => loadFromUrl(dzUrl.value, dzUrl));
dzUrl.addEventListener('keydown', e => { if (e.key==='Enter') loadFromUrl(dzUrl.value, dzUrl); });
dzUrl.addEventListener('paste', e => {
  const p = (e.clipboardData||window.clipboardData).getData('text').trim();
  if (p.startsWith('http')) { e.preventDefault(); loadFromUrl(p, dzUrl); }
});

/* Sidebar toggle */
document.getElementById('sidebar-toggle').addEventListener('click', () => {
  document.getElementById('thumb-panel').classList.toggle('open');
});

/* Drag & Drop */
dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', e => { if (!dropZone.contains(e.relatedTarget)) dropZone.classList.remove('drag-over'); });
dropZone.addEventListener('drop', e => {
  e.preventDefault(); dropZone.classList.remove('drag-over');
  if (e.dataTransfer.files.length) openFiles(e.dataTransfer.files);
});
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  if (e.dataTransfer.files.length) openFiles(e.dataTransfer.files);
});

/* ═══════════════════════════════════
   MOBILE BAR
═══════════════════════════════════ */
document.getElementById('mb-mode').addEventListener('click', () => {
  const modes = ['highlight','erase','pan'];
  const next = modes[(modes.indexOf(drawMode)+1) % modes.length];
  document.querySelector(`.tb-btn[data-mode="${next}"]`).click();
});

/* Mobile Color Modal */
document.getElementById('mb-color').addEventListener('click', () => {
  const grid = document.getElementById('mob-color-grid');
  grid.innerHTML = '';
  const colors = [
    { key:'yellow', hex:'#F9A825', label:'সোনালি' },
    { key:'red',    hex:'#F42A41', label:'লাল' },
    { key:'green',  hex:'#006A4E', label:'সবুজ' },
    { key:'custom', hex: COLOR_MAP.custom.hex, label:'কাস্টম' },
  ];
  colors.forEach(({ key, hex }) => {
    const s = document.createElement('div');
    s.className = `mob-swatch${activeColor===key?' active':''}`;
    s.style.background = key==='custom'
      ? 'conic-gradient(#F42A41,#F9A825,#006A4E,#22D3EE,#9775FA,#F42A41)'
      : hex;
    s.addEventListener('click', () => {
      document.querySelectorAll('.mob-swatch').forEach(x => x.classList.remove('active'));
      s.classList.add('active'); activeColor = key;
      document.querySelectorAll('.color-swatch').forEach(x => x.classList.toggle('active', x.dataset.color===key));
    });
    grid.appendChild(s);
  });
  document.getElementById('color-modal').classList.remove('hidden');
});
['close-color-modal'].forEach(id => {
  document.getElementById(id).addEventListener('click', () =>
    document.getElementById('color-modal').classList.add('hidden'));
});
document.getElementById('color-modal').addEventListener('click', e => {
  if (e.target.id === 'color-modal') document.getElementById('color-modal').classList.add('hidden');
});

/* Mobile Highlight Modal */
document.getElementById('mb-list').addEventListener('click', () => {
  const tab = getTab();
  const all = tab ? tab.highlights : [];
  const ml = document.getElementById('mob-hi-content');
  if (!all.length) {
    ml.innerHTML = `<div style="text-align:center;padding:32px;color:#94A3B8;font-family:'Noto Sans Bengali',sans-serif">হাইলাইট নেই</div>`;
  } else {
    ml.innerHTML = all.map((h,i) => {
      const c = COLOR_MAP[h.color] || COLOR_MAP.yellow;
      return `<div class="hi-item">
        <div class="hi-dot" style="background:${c.hex}"></div>
        <div class="hi-meta">
          <div class="hi-label">হাইলাইট ${i+1} — পেজ ${h.page}</div>
          <div class="hi-sub">${Math.round(h.w)}×${Math.round(h.h)}px</div>
        </div>
        <button class="hi-del" style="opacity:1" onclick="deleteHighlight(${h.id});document.getElementById('mob-hi-content').innerHTML=''">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>`;
    }).join('');
  }
  document.getElementById('hi-modal').classList.remove('hidden');
});
document.getElementById('close-hi-modal').addEventListener('click', () =>
  document.getElementById('hi-modal').classList.add('hidden'));
document.getElementById('hi-modal').addEventListener('click', e => {
  if (e.target.id === 'hi-modal') document.getElementById('hi-modal').classList.add('hidden');
});

/* ═══════════════════════════════════
   KEYBOARD SHORTCUTS
═══════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (['INPUT','TEXTAREA'].includes(e.target.tagName)) return;
  const ctrl = e.ctrlKey || e.metaKey;
  if (ctrl && e.key==='s') { e.preventDefault(); saveFile(); return; }
  if (ctrl && e.key==='o') { e.preventDefault(); fileInput.click(); return; }
  if (ctrl && e.key==='z') { e.preventDefault(); undo(); return; }
  if (ctrl && (e.key==='y'||e.key==='Y')) { e.preventDefault(); redo(); return; }
  if (ctrl && e.key==='=') { e.preventDefault(); setZoom(zoomLevel+0.25); return; }
  if (ctrl && e.key==='-') { e.preventDefault(); setZoom(zoomLevel-0.25); return; }
  if (e.key==='h'||e.key==='H') { document.querySelector('.tb-btn[data-mode="highlight"]').click(); return; }
  if (e.key==='e'||e.key==='E') { document.querySelector('.tb-btn[data-mode="erase"]').click(); return; }
  if (e.key==='v'||e.key==='V') { document.querySelector('.tb-btn[data-mode="pan"]').click(); return; }
});

/* ═══════════════════════════════════
   PINCH ZOOM
═══════════════════════════════════ */
let pinchDist = 0;
const viewer = document.getElementById('pdf-viewer');
viewer.addEventListener('touchstart', e => {
  if (e.touches.length===2) pinchDist = Math.hypot(
    e.touches[0].clientX-e.touches[1].clientX,
    e.touches[0].clientY-e.touches[1].clientY
  );
}, { passive:true });
viewer.addEventListener('touchmove', e => {
  if (e.touches.length===2) {
    const d = Math.hypot(e.touches[0].clientX-e.touches[1].clientX, e.touches[0].clientY-e.touches[1].clientY);
    const delta = d - pinchDist; pinchDist = d;
    if (Math.abs(delta) > 2) setZoom(zoomLevel + delta * 0.005);
  }
}, { passive:true });

/* ═══════════════════════════════════
   SCROLL → THUMB SYNC
═══════════════════════════════════ */
viewer.addEventListener('scroll', () => {
  const midY = viewer.scrollTop + viewer.clientHeight/2;
  let active = null;
  pagesContainer.querySelectorAll('.page-wrapper').forEach(w => {
    if (midY >= w.offsetTop && midY < w.offsetTop + w.offsetHeight) active = +w.dataset.page;
  });
  if (active) thumbList.querySelectorAll('.thumb-item').forEach(t =>
    t.classList.toggle('active', +t.dataset.page === active));
}, { passive:true });