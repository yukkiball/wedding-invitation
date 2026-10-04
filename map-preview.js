(() => {
  const trigger = document.querySelector('.location-map');
  const preview = document.querySelector('#map-preview');
  const viewport = preview.querySelector('.map-preview-viewport');
  const image = preview.querySelector('img');
  const loading = preview.querySelector('.map-loading');
  const closeButton = document.querySelector('#map-close');
  const zoomIn = document.querySelector('#map-zoom-in');
  const zoomOut = document.querySelector('#map-zoom-out');
  const resetButton = document.querySelector('#map-reset');
  const buttons = [closeButton, zoomOut, resetButton, zoomIn];
  let scale = 1, x = 0, y = 0, gesture = null, scrollY = 0, previousBodyStyle;
  const limitScale = value => Math.max(1, Math.min(5, value));
  function render() {
    const width = viewport.clientWidth, height = viewport.clientHeight;
    const fit = Math.min(width / (image.naturalWidth || 1920), height / (image.naturalHeight || 1279));
    const maxX = Math.max(0, ((image.naturalWidth || 1920) * fit * scale - width) / 2);
    const maxY = Math.max(0, ((image.naturalHeight || 1279) * fit * scale - height) / 2);
    x = Math.max(-maxX, Math.min(maxX, x));
    y = Math.max(-maxY, Math.min(maxY, y));
    image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    zoomOut.disabled = scale <= 1;
    zoomIn.disabled = scale >= 5;
  }
  function reset() { scale = 1; x = y = 0; gesture = null; render(); }
  function zoom(factor) {
    const next = limitScale(scale * factor);
    x *= next / scale; y *= next / scale; scale = next; render();
  }
  function open() {
    scrollY = window.scrollY;
    previousBodyStyle = document.body.getAttribute('style');
    Object.assign(document.body.style, {position:'fixed', top:`-${scrollY}px`, width:'100%', overflow:'hidden'});
    preview.hidden = false;
    if (!image.getAttribute('src') || !image.complete || !image.naturalWidth) {
      loading.hidden = false;
      loading.textContent = '地图加载中…';
      image.src = image.dataset.src;
    }
    reset();
    closeButton.focus({preventScroll:true});
  }
  function close() {
    if (preview.hidden) return;
    preview.hidden = true;
    gesture = null;
    if (previousBodyStyle === null) document.body.removeAttribute('style');
    else document.body.setAttribute('style', previousBodyStyle);
    // Avoid the page's smooth-scroll rule moving the restored viewport.
    const behavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo(0, scrollY);
    trigger.focus({preventScroll:true});
    document.documentElement.style.scrollBehavior = behavior;
  }
  function point(touch) {
    const rect = viewport.getBoundingClientRect();
    return {x:touch.clientX - rect.left - rect.width / 2, y:touch.clientY - rect.top - rect.height / 2};
  }
  function sample(touches) {
    const a = point(touches[0]);
    if (touches.length < 2) return {x:a.x, y:a.y, distance:0, count:1};
    const b = point(touches[1]);
    return {x:(a.x+b.x)/2, y:(a.y+b.y)/2, distance:Math.hypot(a.x-b.x,a.y-b.y), count:2};
  }
  function begin(touches) {
    gesture = touches.length ? {...sample(touches), scale, offsetX:x, offsetY:y} : null;
  }
  function move(touches) {
    if (!gesture || !touches.length) return;
    const current = sample(touches);
    if (current.count !== gesture.count) { begin(touches); return; }
    const next = current.count === 2 && gesture.distance ? limitScale(gesture.scale * current.distance / gesture.distance) : gesture.scale;
    x = current.x - (gesture.x - gesture.offsetX) * next / gesture.scale;
    y = current.y - (gesture.y - gesture.offsetY) * next / gesture.scale;
    scale = next;
    render();
  }
  trigger.addEventListener('click', open);
  closeButton.addEventListener('click', close);
  zoomIn.addEventListener('click', () => zoom(1.5));
  zoomOut.addEventListener('click', () => zoom(1/1.5));
  resetButton.addEventListener('click', reset);
  image.addEventListener('load', () => { loading.hidden = true; render(); });
  image.addEventListener('error', () => { loading.hidden = false; loading.textContent = '地图加载失败，请关闭后重试'; });
  window.addEventListener('resize', () => { if (!preview.hidden) render(); });
  viewport.addEventListener('touchstart', event => { event.preventDefault(); begin(event.touches); }, {passive:false});
  viewport.addEventListener('touchmove', event => { event.preventDefault(); move(event.touches); }, {passive:false});
  viewport.addEventListener('touchend', event => { begin(event.touches); }, {passive:true});
  viewport.addEventListener('touchcancel', () => { gesture = null; }, {passive:true});
  viewport.addEventListener('mousedown', event => { if (event.button === 0) { event.preventDefault(); begin([event]); } });
  window.addEventListener('mousemove', event => { if (!preview.hidden && gesture && event.buttons === 1) move([event]); });
  window.addEventListener('mouseup', () => { gesture = null; });
  document.addEventListener('keydown', event => {
    if (preview.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Tab') {
      const enabled = buttons.filter(button => !button.disabled);
      const index = enabled.indexOf(document.activeElement);
      const next = event.shiftKey ? (index <= 0 ? enabled.length - 1 : index - 1) : (index + 1) % enabled.length;
      event.preventDefault(); enabled[next].focus();
    }
  });
})();
