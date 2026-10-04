const wedding = { names: ['戴瑞麟', '张语漾'], date: '2026-11-22', venue: '听松楼花园酒店', room: '一楼 · 楓雅聚包厢', address: '江苏省常州市天宁区罗汉路1号', time: '午宴' };
const toast = document.querySelector('#toast');
let toastTimer;
function showToast(message) { toast.textContent = message; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 3500); }
function updateCountdown() {
  const today = new Intl.DateTimeFormat('sv-SE', {timeZone:'Asia/Shanghai', year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const days = Math.round((Date.parse(wedding.date + 'T00:00:00+08:00') - Date.parse(today + 'T00:00:00+08:00')) / 86400000);
  document.querySelector('#days').textContent = days > 0 ? days : days === 0 ? '今天' : Math.abs(days);
  document.querySelector('#countdown-label').textContent = days > 0 ? '距离婚礼还有' : days === 0 ? '幸福时刻就在' : '幸福已经启程';
  document.querySelector('#countdown-unit').textContent = days === 0 ? '' : '天';
}
updateCountdown(); setInterval(updateCountdown, 60000);
const musicButton = document.querySelector('#music');
let audioContext, playing = false, loopTimer, activeNotes = new Set();
let musicEnabled = true;
// Original pentatonic tune: request playback on entry and retry on a real user gesture.
const melody = [72,76,79,76,74,72,69,67,72,74,76,79,81,79,76,74,72,76,74,69,67,69,72,null];
function playNote(note, start, duration, level = .07, type = 'triangle') {
  const osc = audioContext.createOscillator(); const gain = audioContext.createGain();
  osc.type = type; osc.frequency.value = 440 * Math.pow(2, (note - 69) / 12);
  gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(level, start + .035); gain.gain.exponentialRampToValueAtTime(.001, start + duration);
  osc.connect(gain); gain.connect(audioContext.destination); osc.start(start); osc.stop(start + duration + .02); activeNotes.add(osc);
  osc.onended = () => { activeNotes.delete(osc); osc.disconnect(); gain.disconnect(); };
}
function scheduleMelody() {
  const start = audioContext.currentTime + .06, beat = .46;
  melody.forEach((note,i) => { if (note !== null) playNote(note, start + i * beat, .42); });
  [48,53,55,48,48,53].forEach((note,i) => { playNote(note,start + i * beat * 4,1.7,.025,'sine'); playNote(note+7,start + i * beat * 4,1.7,.015,'sine'); });
  loopTimer = setTimeout(() => { if(playing) scheduleMelody(); }, melody.length * beat * 1000);
}
function updateMusicButton() {
  musicButton.setAttribute('aria-pressed', String(playing));
  musicButton.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
  musicButton.querySelector('span').textContent = playing ? '音乐开' : musicEnabled ? '音乐待播' : '音乐关';
  musicButton.title = musicEnabled && !playing ? '音乐默认开启，首次互动后播放' : '';
}
function pauseNotes() {
  playing = false;
  clearTimeout(loopTimer);
  activeNotes.forEach(osc => { try { osc.stop(); } catch {} });
  activeNotes.clear();
  updateMusicButton();
}
function beginIfAllowed() {
  if (playing || !musicEnabled || document.hidden || audioContext?.state !== 'running') return;
  playing = true;
  updateMusicButton();
  scheduleMelody();
}
function startMusic(manual = false) {
  if (!musicEnabled || playing || document.hidden) return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error('Unsupported');
    if (!audioContext) {
      audioContext = new AudioContext();
      audioContext.addEventListener('statechange', () => {
        if (audioContext.state === 'running') beginIfAllowed();
        else if (playing) pauseNotes();
      });
    }
    // Autoplay can leave resume() pending. Gesture retries must remain available.
    if (audioContext.state !== 'running') {
      audioContext.resume().then(beginIfAllowed).catch(() => {
        if (manual) showToast('点击音乐按钮可再次尝试播放');
      });
    }
    beginIfAllowed();
    updateMusicButton();
  } catch {
    musicEnabled = false;
    updateMusicButton();
    if (manual) showToast('当前浏览器暂时无法播放音乐');
  }
}
musicButton.addEventListener('click', () => {
  if (playing) { musicEnabled = false; pauseNotes(); return; }
  musicEnabled = true;
  startMusic(true);
});
function unlockMusic(event) {
  if (!event.isTrusted || event.target?.closest?.('#music')) return;
  if (event.type === 'keydown' && (event.key === 'Escape' || event.metaKey || event.ctrlKey || event.altKey)) return;
  startMusic();
}
for (const type of ['click', 'pointerup', 'touchend', 'keydown']) {
  document.addEventListener(type, unlockMusic, { capture: true, passive: true });
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pauseNotes();
  else if (musicEnabled) startMusic();
});
updateMusicButton();
startMusic();
