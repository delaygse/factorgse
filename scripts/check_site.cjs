/* Validate static links and generated audio rows without browser dependencies. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const origin = 'https://delaygse.github.io/factorgse/';
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const script = fs.readFileSync(path.join(root, 'static/js/factorgse-page.js'), 'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(new Set(ids).size, ids.length, 'Duplicate HTML ids');
assert(html.includes(`<link rel="canonical" href="${origin}">`));
// The downloadable framework PDF retains its existing URL for compatibility.
assert(!/edge-gse\/|static\/images\/edge_gse_framework|edge-page\.js/i.test(html + script));

const checked = new Set();
function checkReference(reference) {
  if (reference.startsWith('#')) {
    assert(ids.includes(reference.slice(1)), `Missing anchor: ${reference}`);
    return;
  }
  if (reference.startsWith(origin)) reference = reference.slice(origin.length);
  else if (/^(?:https?:|mailto:|data:)/.test(reference)) return;
  const relative = decodeURIComponent(reference.split(/[?#]/)[0]) || 'index.html';
  const target = path.resolve(root, relative);
  assert(target.startsWith(root + path.sep), `Out-of-root resource: ${reference}`);
  assert(fs.existsSync(target), `Missing resource: ${reference}`);
  checked.add(relative);
}
for (const match of html.matchAll(/\b(?:href|src|poster)="([^"]+)"/g)) checkReference(match[1]);
for (const match of html.matchAll(/<meta[^>]+(?:og:image|twitter:image)[^>]+content="([^"]+)"/g)) checkReference(match[1]);

function environment({ saveData = false } = {}) {
  const nodes = [], listeners = {}, timers = new Map(), observers = [];
  let timerId = 0;
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.listeners = {}; nodes.push(this); }
    append(...children) { this.children.push(...children); }
    appendChild(child) { this.append(child); return child; }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this[name] = value; }
    getAttribute(name) { return this[name]; }
    addEventListener(name, callback) { (this.listeners[name] ??= new Set()).add(callback); }
    removeEventListener(name, callback) { this.listeners[name]?.delete(callback); }
    dispatch(name) { for (const callback of [...(this.listeners[name] ?? [])]) callback(); }
    querySelectorAll() { return this.children; }
  }
  class MediaElement extends Element {
    constructor(tag) {
      super(tag);
      Object.assign(this, { paused: true, _time: 0, duration: NaN, ended: false, muted: false,
        volume: 1, playbackRate: 1, readyState: 0, networkState: 0, seeking: false, loadCalls: 0, playCalls: 0 });
    }
    get currentTime() { return this._time; }
    set currentTime(time) { this._time = time; this.seeking = true; this.readyState = 1; this.ended = false; }
    advanceTo(time) { this._time = time; }
    pause() { if (!this.paused) { this.paused = true; this.dispatch('pause'); } }
    load() { this.loadCalls++; this.networkState = 2; this.readyState = 0; this.error = null; this._time = 0; this.ended = false; }
    play() {
      this.playCalls++;
      if (this.playError) return Promise.reject(this.playError);
      const wasPaused = this.paused;
      this.paused = false;
      if (wasPaused) for (const listener of listeners.play ?? []) listener({ target: this });
      if (this.readyState >= 3 && !this.seeking) this.dispatch('playing');
      return Promise.resolve();
    }
    metadata() { this.readyState = 1; this.duration = 99.5; this.dispatch('loadedmetadata'); }
    playable() {
      this.readyState = 4; this.networkState = 1; this.duration = 99.5; this.seeking = false;
      this.dispatch('seeked'); this.dispatch('canplay');
      if (!this.paused) this.dispatch('playing');
    }
  }
  const containers = Object.fromEntries(ids.map(id => [id, new Element('div')]));
  const switches = new Element('div'); switches.hidden = true;
  for (const match of html.matchAll(/<button\b([^>]*data-demo-version[^>]*)>/g)) {
    const button = new Element('button');
    for (const [, name, value] of match[1].matchAll(/([\w-]+)="([^"]*)"/g)) {
      if (name.startsWith('data-')) button.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      else button.setAttribute(name, value);
    }
    switches.append(button);
  }
  for (const match of html.matchAll(/<video\b([^>]*)>/g)) {
    const video = new MediaElement('video');
    for (const [, name, value] of match[1].matchAll(/([\w-]+)="([^"]*)"/g)) {
      if (name.startsWith('data-')) video.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
      else video.setAttribute(name, value);
    }
    video.muted = /\bmuted\b/.test(match[1]);
    containers[video.id] = video;
  }
  const document = {
    createElement: tag => tag === 'audio' ? new MediaElement(tag) : new Element(tag),
    createDocumentFragment: () => new Element('fragment'),
    getElementById: id => containers[id],
    querySelector: selector => selector === '.demo-switch' ? switches : null,
    addEventListener: (name, callback) => { (listeners[name] ??= []).push(callback); },
    querySelectorAll: selector => nodes.filter(node => selector.split(',').map(tag => tag.trim()).includes(node.tag)),
  };
  class IntersectionObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe(element) { this.target = element; }
    disconnect() { this.disconnected = true; }
  }
  vm.runInNewContext(script, { document, HTMLMediaElement: MediaElement, AbortController,
    setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
    clearTimeout: id => timers.delete(id), navigator: { connection: { saveData } },
    window: { IntersectionObserver }, IntersectionObserver });
  return { nodes, containers, switches, timers, observers,
    emitPlay: target => { for (const listener of listeners.play ?? []) listener({ target }); } };
}

async function flush() { for (let i = 0; i < 8; i++) await Promise.resolve(); }

async function main() {
  const env = environment();
  const { nodes, containers, switches, timers, observers } = env;
  const audio = nodes.filter(node => node.tag === 'audio');
  const images = nodes.filter(node => node.tag === 'img');
  const videos = nodes.filter(node => node.tag === 'video');
  const [enhanced, original] = switches.children;
  const [first, second] = videos;
  const status = containers['demo-status'];
  assert.equal(audio.length, 42); assert.equal(images.length, 42); assert.equal(videos.length, 2);
  assert.equal(switches.children.length, 2); assert.equal(switches.hidden, false);
  assert(!html.includes('Open video:'));
  assert(!/<a[^>]+href="static\/videos\//.test(html), 'Direct video links removed');
  for (const node of [...audio, ...images, ...videos]) checkReference(node.src);
  for (const node of audio) { assert.equal(node.preload, 'none'); assert(ids.includes(node['aria-describedby'])); }
  assert.equal(first.loadCalls, 0, 'No video download on page initialization');
  observers[0].callback([{ isIntersecting: true }]);
  assert.equal(first.loadCalls, 1); assert.equal(second.loadCalls, 1);
  assert(observers[0].disconnected);
  assert.equal(environment({ saveData: true }).observers.length, 0, 'Respect data-saving preference');
  const sources = videos.map(video => video.src);
  const loads = videos.map(video => video.loadCalls);

  first.playable();
  enhanced.dispatch('click');
  assert(!first.paused);
  first.advanceTo(37.25);
  first.volume = 0.6; first.playbackRate = 1.25;
  original.dispatch('click');
  await flush();
  assert(!first.paused, 'Current video continues while target metadata loads');
  assert.equal(first.dataset.visible, 'true');
  assert.equal(second.dataset.visible, 'false');
  assert(second.muted, 'Standby playback stays silent');
  assert.equal(enhanced['aria-pressed'], 'true', 'Selection changes only after handoff');
  assert.equal(original['aria-busy'], 'true');
  second.metadata(); await flush();
  assert.equal(second.currentTime, 37.25);
  assert(!first.paused, 'Seeking standby never pauses the active video');
  // Let the original advance during buffering; the standby must catch up.
  first.advanceTo(38);
  second.playable(); await flush();
  assert.equal(second.currentTime, 38, 'Catch up after slow buffering');
  assert.equal(second.dataset.visible, 'false', 'Wait for the new seek to finish');
  second.playable(); await flush();
  assert(first.paused); assert(!second.paused); assert(!second.muted);
  assert.equal(second.dataset.visible, 'true'); assert.equal(first.dataset.visible, 'false');
  assert.equal(second.volume, 0.6); assert.equal(second.playbackRate, 1.25);
  assert.equal(original['aria-pressed'], 'true'); assert.equal(original['aria-busy'], 'false');
  assert.equal(timers.size, 0);

  // Cancel a switch by selecting the current version. Late events cannot commit it.
  second.advanceTo(63);
  enhanced.dispatch('click'); await flush();
  original.dispatch('click'); await flush();
  first.playable(); await flush();
  assert.equal(second.dataset.visible, 'true'); assert(!second.paused); assert(first.paused);
  assert.equal(enhanced['aria-busy'], 'false'); assert.equal(timers.size, 0);

  // Timeout keeps the current version available, then the same button can retry.
  second.advanceTo(65);
  enhanced.dispatch('click'); await flush();
  for (const timeout of [...timers.values()]) timeout();
  await flush();
  assert.equal(second.dataset.visible, 'true'); assert(!second.paused);
  assert.equal(enhanced['aria-busy'], 'false'); assert.match(status.textContent, /retry/);
  enhanced.dispatch('click'); await flush(); first.playable(); await flush();
  assert.equal(first.dataset.visible, 'true'); assert(!first.paused); assert(second.paused);
  assert.deepEqual(videos.map(video => video.src), sources, 'Keep fixed sources');
  assert.deepEqual(videos.map(video => video.loadCalls), loads, 'Never reload on ordinary switching or timeout retry');

  // Rapid toggles must keep only the final requested switch.
  first.advanceTo(70);
  original.dispatch('click'); await flush();
  enhanced.dispatch('click');
  original.dispatch('click'); await flush();
  env.emitPlay(first); // A queued play event from the visible video must not stop warming.
  first.dispatch('pause'); // A stale pause event after resume must not cancel the new request.
  assert.equal(original['aria-busy'], 'true'); assert(!second.paused);
  second.playable(); await flush();
  assert.equal(second.dataset.visible, 'true'); assert.equal(original['aria-pressed'], 'true');
  assert.equal(timers.size, 0);

  // An unrelated audio sample cancels a pending switch and pauses both videos.
  second.advanceTo(72);
  enhanced.dispatch('click'); await flush();
  await audio[0].play(); await flush();
  first.playable(); await flush();
  assert(first.paused && second.paused); assert(!audio[0].paused);
  assert.equal(second.dataset.visible, 'true'); assert.equal(timers.size, 0);
  original.dispatch('click'); await flush();
  assert(audio.every(player => player.paused)); assert(!second.paused);

  // Pausing explicitly, or starting audio while already paused, cancels cleanly.
  second.advanceTo(73);
  enhanced.dispatch('click'); await flush();
  second.pause(); await flush();
  assert.equal(enhanced['aria-busy'], 'false'); assert.equal(timers.size, 0);
  assert.match(status.textContent, /Paused/);
  enhanced.dispatch('click'); await flush();
  await audio[0].play(); await flush();
  assert.equal(timers.size, 0); assert(!status.textContent.includes('Preparing'));
  original.dispatch('click'); await flush();

  // Autoplay rejection and media errors leave the current player usable.
  first.playError = { name: 'NotAllowedError' };
  enhanced.dispatch('click'); await flush();
  assert.equal(second.dataset.visible, 'true'); assert(!second.paused);
  assert.match(status.textContent, /blocked/); assert.equal(timers.size, 0);
  first.playError = null;
  second.advanceTo(80);
  enhanced.dispatch('click'); await flush();
  first.error = { code: 2 }; first.dispatch('error'); await flush();
  assert.equal(second.dataset.visible, 'true'); assert.match(status.textContent, /retry/);
  enhanced.dispatch('click'); await flush();
  assert.equal(first.loadCalls, loads[0] + 1, 'Reload is allowed to recover from a real media error');
  first.metadata(); await flush(); first.playable(); await flush();
  assert.equal(first.dataset.visible, 'true');

  // Switching at the end replays from zero; choosing the active version resumes it.
  first.advanceTo(99.5); first.ended = true; first.paused = true;
  original.dispatch('click'); await flush();
  assert.equal(second.currentTime, 0);
  second.playable(); await flush();
  assert.equal(second.dataset.visible, 'true');
  second.advanceTo(99.5); second.ended = true; second.paused = true;
  original.dispatch('click'); assert.equal(second.currentTime, 0);
  second.playable(); await flush(); assert(!second.paused);
  assert.equal(timers.size, 0);
  for (const video of videos) assert.equal(video.listeners.canplay?.size ?? 0, 0, 'No stale readiness listeners');
  console.log(`Passed: ${checked.size} local resources, 42 audio players and spectrograms, segmented video controls, lazy preload, slow buffering, timestamp catch-up, cancellation, rapid toggles, timeout/retry, media errors, replay, and exclusive audible playback.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
