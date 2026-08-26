(() => {
  "use strict";

  const placeholderAudio = "examples/placeholder.wav";

  const mainComparison = [
    { key: "clean", label: "Clean reference", tag: "Reference" },
    { key: "noisy", label: "Noisy input", tag: "Input" },
    { key: "llase-g1", label: "LLaSE-G1", tag: "Offline" },
    { key: "unise", label: "UniSE", tag: "Offline" },
    { key: "flowse", label: "FlowSE", tag: "Offline" },
    { key: "bridge-retrained", label: "Bridge model (retrained)", tag: "Offline" },
    { key: "stream-fm", label: "Stream.FM", tag: "Streaming" },
    { key: "internal-gan", label: "Internal streaming GAN", tag: "Streaming" },
    { key: "delaygse", label: "DelayGSE", tag: "Prior work" },
    { key: "edge-gse-default", label: "Edge-GSE · 186.7 ms default", tag: "Ours", highlight: true }
  ];

  const factorizationComparison = [
    { key: "clean", label: "Clean reference", tag: "Reference" },
    { key: "noisy", label: "Noisy input", tag: "Input" },
    { key: "time-ar-control", label: "Delayed-grid time-AR control", tag: "Control" },
    { key: "all-nar", label: "All-codebook NAR", tag: "Ablation" },
    { key: "core-depth-ar", label: "Core · time-NAR CB1 + depth-AR", tag: "No GRU" },
    { key: "edge-gse-gru", label: "Edge-GSE · Core + auxiliary GRU", tag: "Full", highlight: true }
  ];

  const latencyComparison = [
    { key: "clean", label: "Clean reference", tag: "Reference" },
    { key: "noisy", label: "Noisy input", tag: "Input" },
    { key: "nla-0", label: "Edge-GSE · 26.7 ms", tag: "NLA 0" },
    { key: "nla-2", label: "Edge-GSE · 80 ms", tag: "NLA 2" },
    { key: "nla-5", label: "Edge-GSE · 160 ms", tag: "NLA 5" },
    { key: "nla-6", label: "Edge-GSE · 186.7 ms", tag: "Default", highlight: true },
    { key: "nla-8", label: "Edge-GSE · 240 ms", tag: "NLA 8" }
  ];

  function createAudioCard(method, scope) {
    const card = document.createElement("article");
    card.className = `audio-card${method.highlight ? " is-highlight" : ""}`;
    card.dataset.slot = `${scope}-${method.key}`;

    const header = document.createElement("div");
    header.className = "audio-card-header";

    const title = document.createElement("h5");
    title.textContent = method.label;

    const tag = document.createElement("span");
    tag.className = "audio-tag";
    tag.textContent = method.tag;

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";
    audio.src = placeholderAudio;
    audio.dataset.futureSrc = `examples/${scope}/${method.key}.wav`;
    audio.setAttribute("aria-label", `${method.label} placeholder audio`);

    const note = document.createElement("p");
    note.className = "audio-placeholder-label";
    note.textContent = "Placeholder — not an Edge-GSE result";

    header.append(title, tag);
    card.append(header, audio, note);
    return card;
  }

  function renderGrid(id, methods, scope) {
    const grid = document.getElementById(id);
    if (!grid) return;
    const fragment = document.createDocumentFragment();
    methods.forEach((method) => fragment.appendChild(createAudioCard(method, scope)));
    grid.appendChild(fragment);
  }

  renderGrid("main-en-grid", mainComparison, "main-en");
  renderGrid("main-zh-grid", mainComparison, "main-zh");
  renderGrid("factor-case-a-grid", factorizationComparison, "factor-a");
  renderGrid("factor-case-b-grid", factorizationComparison, "factor-b");
  renderGrid("latency-grid", latencyComparison, "latency");
})();
