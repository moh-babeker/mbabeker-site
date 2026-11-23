/* =====================================================================
   عارض الصور المنبثق: يفتح الصورة التي ضُغط عليها وحدها في نافذة فوق الصفحة
   بأكبر حجم تسمح به الشاشة، دون تنقل بين الصور ودون رابط مباشر للتحميل.
   ===================================================================== */
(() => {
  const css = `
  .lbx { position: fixed; inset: 0; z-index: 9999; background: rgba(2,6,23,.94); display: none;
         align-items: center; justify-content: center; padding: 3vh 3vw; cursor: zoom-out;
         -webkit-user-select: none; user-select: none; }
  .lbx.open { display: flex; }
  .lbx-img { max-width: 100%; max-height: 100%; object-fit: contain; border-radius: .4rem;
             box-shadow: 0 20px 60px rgba(0,0,0,.6); -webkit-user-drag: none; -webkit-touch-callout: none; }
  .lbx-close { position: absolute; top: 14px; right: 14px; width: 44px; height: 44px; border-radius: 999px; border: 0;
               background: rgba(15,23,42,.85); color: #fff; font-size: 22px; line-height: 44px; cursor: pointer; }
  .lbx-close:hover { background: rgb(14,165,233); }
  [data-zoom] { cursor: zoom-in; -webkit-touch-callout: none; }
  img[data-zoom], [data-zoom] img { -webkit-user-drag: none; }`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  let box, img;
  function build() {
    box = document.createElement('div');
    box.className = 'lbx';
    box.innerHTML = '<img class="lbx-img" alt="" draggable="false"><button class="lbx-close" aria-label="Close">&times;</button>';
    document.body.appendChild(box);
    img = box.querySelector('.lbx-img');
    box.addEventListener('click', close);           // أي نقرة تغلق النافذة
    box.addEventListener('contextmenu', e => e.preventDefault());
  }
  function open(src) {
    if (!box) build();
    img.src = src;
    box.classList.add('open');
    document.documentElement.style.overflow = 'hidden';
  }
  function close() {
    box.classList.remove('open');
    document.documentElement.style.overflow = '';
    img.removeAttribute('src');
  }

  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-zoom]');
    if (!el || (box && box.contains(el))) return;
    e.preventDefault(); open(el.getAttribute('data-zoom'));
  });
  document.addEventListener('keydown', e => {
    if (box && box.classList.contains('open') && e.key === 'Escape') close();
    const el = document.activeElement;
    if ((e.key === 'Enter' || e.key === ' ') && el && el.hasAttribute && el.hasAttribute('data-zoom')) { e.preventDefault(); open(el.getAttribute('data-zoom')); }
  });
  // منع القائمة اليمنى والسحب على الصور
  document.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('[data-zoom], .lbx')) e.preventDefault(); });
  document.addEventListener('dragstart', e => { if (e.target.closest && e.target.closest('[data-zoom], .lbx')) e.preventDefault(); });
})();
