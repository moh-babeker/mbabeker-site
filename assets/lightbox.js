/* =====================================================================
   عارض الصور المنبثق: يفتح أي صورة تحمل data-zoom داخل نافذة فوق الصفحة،
   مع التكبير (العجلة، الضغط المزدوج، إصبعان) والسحب والتنقل بين الصور،
   ودون رابط مباشر للتحميل.
   ===================================================================== */
(() => {
  const css = `
  .lbx { position: fixed; inset: 0; z-index: 9999; background: rgba(2,6,23,.94); display: none; touch-action: none;
         -webkit-user-select: none; user-select: none; }
  .lbx.open { display: block; }
  .lbx-stage { position: absolute; inset: 0; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .lbx-img { max-width: 94vw; max-height: 88vh; transform-origin: 0 0; will-change: transform; cursor: zoom-in;
             -webkit-user-drag: none; -webkit-touch-callout: none; pointer-events: auto; box-shadow: 0 20px 60px rgba(0,0,0,.6); border-radius: .4rem; }
  .lbx.zoomed .lbx-img { cursor: grab; }
  .lbx.dragging .lbx-img { cursor: grabbing; }
  .lbx-btn { position: absolute; width: 44px; height: 44px; border-radius: 999px; border: 0; background: rgba(15,23,42,.8); color: #fff;
             font-size: 22px; line-height: 44px; text-align: center; cursor: pointer; z-index: 2; }
  .lbx-btn:hover { background: rgb(14,165,233); }
  .lbx-close { top: 14px; right: 14px; }
  .lbx-prev { top: 50%; left: 14px; transform: translateY(-50%); }
  .lbx-next { top: 50%; right: 14px; transform: translateY(-50%); }
  .lbx-count { position: absolute; bottom: 14px; left: 50%; transform: translateX(-50%); color: #94a3b8; font-size: 12px;
               background: rgba(15,23,42,.8); padding: 4px 12px; border-radius: 999px; z-index: 2; }
  [data-zoom] { cursor: zoom-in; -webkit-touch-callout: none; }
  img[data-zoom], [data-zoom] img { -webkit-user-drag: none; }`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  let box, img, count, list = [], idx = 0;
  let scale = 1, tx = 0, ty = 0, base = { w: 0, h: 0, x: 0, y: 0 };

  function build() {
    box = document.createElement('div');
    box.className = 'lbx';
    box.innerHTML = `<div class="lbx-stage"><img class="lbx-img" alt="" draggable="false"></div>
      <button class="lbx-btn lbx-close" aria-label="Close">&times;</button>
      <button class="lbx-btn lbx-prev" aria-label="Previous">&lsaquo;</button>
      <button class="lbx-btn lbx-next" aria-label="Next">&rsaquo;</button>
      <div class="lbx-count"></div>`;
    document.body.appendChild(box);
    img = box.querySelector('.lbx-img'); count = box.querySelector('.lbx-count');
    box.querySelector('.lbx-close').onclick = close;
    box.querySelector('.lbx-prev').onclick = e => { e.stopPropagation(); go(-1); };
    box.querySelector('.lbx-next').onclick = e => { e.stopPropagation(); go(1); };
    box.querySelector('.lbx-stage').addEventListener('click', e => { if (e.target !== img && !moved) close(); });
    box.addEventListener('contextmenu', e => e.preventDefault());
    img.addEventListener('load', measure);
    bindGestures();
  }

  function measure() {
    scale = 1; tx = 0; ty = 0;
    const r = img.getBoundingClientRect();
    base = { w: r.width, h: r.height, x: r.left, y: r.top };
    apply();
  }
  function clamp() {
    if (scale <= 1) { scale = 1; tx = 0; ty = 0; return; }
    const maxX = 0, minX = base.w - base.w * scale, maxY = 0, minY = base.h - base.h * scale;
    tx = Math.min(maxX, Math.max(minX, tx)); ty = Math.min(maxY, Math.max(minY, ty));
  }
  function apply() {
    clamp();
    img.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
    box.classList.toggle('zoomed', scale > 1);
  }
  // تكبير حول نقطة على الشاشة
  function zoomAt(newScale, cx, cy) {
    const r = img.getBoundingClientRect();
    const ox = (cx - r.left) / scale, oy = (cy - r.top) / scale;
    newScale = Math.min(5, Math.max(1, newScale));
    tx += (scale - newScale) * ox; ty += (scale - newScale) * oy;
    scale = newScale; apply();
  }

  let moved = false;
  function bindGestures() {
    const pts = new Map(); let start = null, pinch = null, lastTap = 0;
    box.addEventListener('wheel', e => { e.preventDefault(); zoomAt(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX, e.clientY); }, { passive: false });
    img.addEventListener('dblclick', e => { zoomAt(scale > 1 ? 1 : 2.5, e.clientX, e.clientY); });
    box.addEventListener('pointerdown', e => {
      if (e.target.closest('.lbx-btn')) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false;
      if (pts.size === 1) {
        start = { x: e.clientX, y: e.clientY, tx, ty };
        const now = Date.now();
        if (e.pointerType === 'touch' && e.target === img && now - lastTap < 300) { zoomAt(scale > 1 ? 1 : 2.5, e.clientX, e.clientY); lastTap = 0; }
        else lastTap = now;
      }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: scale }; }
    });
    box.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()];
        zoomAt(pinch.s * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d, (a.x + b.x) / 2, (a.y + b.y) / 2); moved = true;
      } else if (pts.size === 1 && start) {
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
        if (scale > 1) { box.classList.add('dragging'); tx = start.tx + dx; ty = start.ty + dy; apply(); }
      }
    });
    const end = e => {
      if (pts.size === 1 && start && scale === 1) {
        const dx = e.clientX - start.x;
        if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);   // سحب أفقي للتنقل
      }
      pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) start = null;
      box.classList.remove('dragging');
    };
    box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
    document.addEventListener('keydown', e => {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') go(document.documentElement.dir === 'rtl' ? -1 : 1);
      if (e.key === 'ArrowLeft') go(document.documentElement.dir === 'rtl' ? 1 : -1);
    });
  }

  function show() {
    img.removeAttribute('style'); img.src = list[idx];
    count.textContent = list.length > 1 ? `${idx + 1} / ${list.length}` : '';
    box.querySelector('.lbx-prev').style.display = box.querySelector('.lbx-next').style.display = list.length > 1 ? '' : 'none';
    if (img.complete) measure();
  }
  function go(d) { if (list.length < 2) return; idx = (idx + d + list.length) % list.length; show(); }
  function open(src) {
    if (!box) build();
    list = [...new Set([...document.querySelectorAll('[data-zoom]')].map(el => el.getAttribute('data-zoom')))];
    idx = Math.max(0, list.indexOf(src));
    box.classList.add('open'); document.documentElement.style.overflow = 'hidden';
    show();
  }
  function close() { box.classList.remove('open'); document.documentElement.style.overflow = ''; img.removeAttribute('src'); }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-zoom]');
    if (!el || (box && box.contains(el))) return;
    e.preventDefault(); open(el.getAttribute('data-zoom'));
  });
  document.addEventListener('keydown', e => {
    const el = document.activeElement;
    if ((e.key === 'Enter' || e.key === ' ') && el && el.hasAttribute && el.hasAttribute('data-zoom')) { e.preventDefault(); open(el.getAttribute('data-zoom')); }
  });
  // منع القائمة اليمنى والسحب على صور المعرض
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('[data-zoom], .lbx')) e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (e.target.closest && e.target.closest('[data-zoom], .lbx')) e.preventDefault(); });
})();
