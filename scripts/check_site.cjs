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

const nodes = [];
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.listeners = {}; nodes.push(this); }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this[name] = value; }
  getAttribute(name) { return this[name]; }
  addEventListener(name, callback) { (this.listeners[name] ??= []).push(callback); }
  dispatch(name) { for (const callback of this.listeners[name] ?? []) callback(); }
  querySelectorAll() { return this.children; }
}
class MediaElement extends Element {
  constructor(tag) { super(tag); this.paused = false; this.currentTime = 0; this.duration = 99.5; this.ended = false; this.playCalls = 0; }
  pause() { this.paused = true; }
  load() { this.paused = true; this.currentTime = 0; this.ended = false; }
  play() {
    this.playCalls++;
    if (this.playError) return Promise.reject(this.playError);
    this.paused = false;
    listeners.play({ target: this });
    return Promise.resolve();
  }
}
const video = new MediaElement('video');
const containers = Object.fromEntries(ids.map(id => [id, new Element('div')]));
containers['realtime-video'] = video;
const switches = new Element('div');
switches.hidden = true;
for (const match of html.matchAll(/<button\b([^>]*data-demo-version[^>]*)>/g)) {
  const button = new Element('button');
  for (const attribute of match[1].matchAll(/([\w-]+)="([^"]*)"/g)) {
    const [, name, value] = attribute;
    if (name.startsWith('data-')) button.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    else button.setAttribute(name, value);
  }
  switches.append(button);
}
assert.equal(switches.children.length, 2);
video.src = switches.children[0].dataset.videoSrc;
const listeners = {};
const document = {
  createElement: tag => tag === 'audio' ? new MediaElement(tag) : new Element(tag),
  createDocumentFragment: () => new Element('fragment'),
  getElementById: id => containers[id],
  querySelector: selector => selector === '.demo-switch' ? switches : null,
  addEventListener: (name, callback) => { listeners[name] = callback; },
  querySelectorAll: selector => nodes.filter(node => selector.split(',').map(tag => tag.trim()).includes(node.tag)),
};
vm.runInNewContext(script, { document, HTMLMediaElement: MediaElement });
const audio = nodes.filter(node => node.tag === 'audio');
const images = nodes.filter(node => node.tag === 'img');
assert.equal(audio.length, 42);
assert.equal(images.length, 42);
for (const node of [...audio, ...images]) checkReference(node.src);
for (const node of audio) {
  assert.equal(node.preload, 'none');
  assert(ids.includes(node['aria-describedby']));
}
listeners.play({ target: audio[0] });
assert.equal(audio[0].paused, false);
assert(audio.slice(1).every(player => player.paused));
assert.equal(video.paused, true);
video.paused = false;
listeners.play({ target: video });
assert.equal(video.paused, false);
assert(audio.every(player => player.paused));
const [enhanced, original] = switches.children;
assert.equal(switches.hidden, false);
enhanced.dispatch('click');
assert.equal(video.playCalls, 1, 'Enhanced button starts playback immediately');
video.currentTime = 37.25;
original.dispatch('click');
assert.equal(video.src, original.dataset.videoSrc);
assert.equal(video.paused, false, 'Original button starts playback');
assert.equal(original['aria-pressed'], 'true');
assert.equal(enhanced['aria-pressed'], 'false');
video.dispatch('loadedmetadata');
assert.equal(video.currentTime, 37.25, 'Switch preserves the scene position');
assert(audio.every(player => player.paused));
video.paused = true;
original.dispatch('click');
assert.equal(video.paused, false, 'Selected button resumes paused video');
assert.equal(video.currentTime, 37.25, 'Resume does not reset the position');
video.currentTime = 63;
enhanced.dispatch('click');
original.dispatch('click');
enhanced.dispatch('click');
video.dispatch('loadedmetadata');
assert.equal(video.currentTime, 63, 'Rapid switches keep the pending position');
assert.equal(video.src, enhanced.dataset.videoSrc);
assert.equal(enhanced['aria-pressed'], 'true');
video.ended = true;
original.dispatch('click');
video.dispatch('loadedmetadata');
assert.equal(video.currentTime, 0, 'Switching after the end restarts playback');
video.ended = true;
video.currentTime = video.duration;
original.dispatch('click');
assert.equal(video.currentTime, 0, 'Clicking the same finished video replays it');
video.ended = false;
video.dispatch('error');
assert.match(containers['demo-status'].textContent, /Unable to load/);
video.playError = { name: 'NotAllowedError' };
original.dispatch('click');
Promise.resolve().then(() => {
  assert.match(containers['demo-status'].textContent, /Use the video play control/);
  console.log(`Passed: ${checked.size} local resources, 42 audio players, 42 spectrograms, navigation, canonical URL, exclusive media playback, both video buttons, timestamp preservation, rapid switching, replay, and playback errors.`);
});
