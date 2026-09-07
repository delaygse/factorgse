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
assert(!/edge-gse\/|edge_gse_framework|edge-page\.js/i.test(html + script));

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
for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) checkReference(match[1]);
for (const match of html.matchAll(/<meta[^>]+(?:og:image|twitter:image)[^>]+content="([^"]+)"/g)) checkReference(match[1]);

const nodes = [];
class Element {
  constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; nodes.push(this); }
  append(...children) { this.children.push(...children); }
  appendChild(child) { this.append(child); return child; }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this[name] = value; }
}
class AudioElement extends Element {
  constructor() { super('audio'); this.paused = false; }
  pause() { this.paused = true; }
}
const containers = Object.fromEntries(ids.map(id => [id, new Element('div')]));
const listeners = {};
const document = {
  createElement: tag => tag === 'audio' ? new AudioElement() : new Element(tag),
  createDocumentFragment: () => new Element('fragment'),
  getElementById: id => containers[id],
  addEventListener: (name, callback) => { listeners[name] = callback; },
  querySelectorAll: tag => nodes.filter(node => node.tag === tag),
};
vm.runInNewContext(script, { document, HTMLAudioElement: AudioElement });
const audio = nodes.filter(node => node.tag === 'audio');
const images = nodes.filter(node => node.tag === 'img');
assert.equal(audio.length, 36);
assert.equal(images.length, 36);
for (const node of [...audio, ...images]) checkReference(node.src);
for (const node of audio) {
  assert.equal(node.preload, 'none');
  assert(ids.includes(node['aria-describedby']));
}
listeners.play({ target: audio[0] });
assert.equal(audio[0].paused, false);
assert(audio.slice(1).every(player => player.paused));
console.log(`Passed: ${checked.size} local resources, 36 audio players, 36 spectrograms, navigation, canonical URL, and exclusive audio playback.`);
