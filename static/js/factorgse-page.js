(() => {
  "use strict";

  const audioRoot = "examples/audio";
  const languages = [
    { key: "en", label: "English" },
    { key: "zh", label: "Chinese" }
  ];

  const mainComparison = [
    { key: "clean", label: "Clean", tag: "Reference", file: "clean.wav" },
    { key: "clean-codec", label: "Clean codec reconstruction", tag: "Reference", file: "clean-codec.wav" },
    { key: "noisy", label: "Noisy input", tag: "Input", file: "noisy.wav" },
    { key: "unise", label: "UniSE", tag: "Offline", file: "unise.wav" },
    { key: "delaygse", label: "DelayGSE†", tag: "Inherited", file: "delaygse.wav" },
    { key: "bridge", label: "Bridge (retrained)", tag: "Offline", file: "bridge.wav" },
    { key: "streamfm", label: "Stream.FM", tag: "Streaming", file: "streamfm.wav" },
    { key: "fastenhancer-l", label: "FastEnhancer-L", tag: "Streaming", file: "fastenhancer-l.wav" },
    { key: "deepfilternet3", label: "DeepFilterNet3", tag: "Streaming", file: "deepfilternet3.wav" },
    {
      key: "factorgse-primary",
      label: "FactorGSE",
      tag: "Ours",
      meta: "186.7-ms input context · DNSMOS 3.62 · Macro ASR error 25.45% · SIM 0.708",
      sharedFile: "factorgse-186p7ms.wav",
      highlight: true
    },
    {
      key: "factorgse-small",
      label: "FactorGSE (Small)",
      tag: "Ours · compact",
      meta: "186.7-ms input context · DNSMOS 3.63 · Macro ASR error 25.75% · SIM 0.729",
      file: "factorgse-small-186p7ms.wav",
      highlight: true
    }
  ];

  const factorizationComparison = [
    {
      key: "time-ar-delayed-grid",
      label: "All-codebook time-AR (delayed)†",
      tag: "Scheduling control",
      meta: "DNSMOS 3.50 · Macro ASR error 48.80% · SIM 0.588",
      file: "time-ar-delayed-grid.wav"
    },
    {
      key: "time-ar-parallel",
      label: "All-codebook time-AR (aligned)",
      tag: "Aligned control",
      meta: "DNSMOS 3.48 · Macro ASR error 48.40% · SIM 0.504",
      file: "time-ar-parallel.wav"
    },
    {
      key: "time-nar-parallel",
      label: "Fully NAR",
      tag: "Parallel codebooks",
      meta: "DNSMOS 3.58 · Macro ASR error 26.60% · SIM 0.677",
      file: "time-nar-parallel.wav"
    },
    {
      key: "time-nar-depth-ar",
      label: "Time-NAR + depth-AR",
      tag: "Depth-AR",
      meta: "DNSMOS 3.57 · Macro ASR error 26.05% · SIM 0.696",
      file: "time-nar-depth-ar.wav"
    },
    {
      key: "factorgse-residual-gru",
      label: "FactorGSE (+ residual GRU)",
      tag: "Full model",
      meta: "DNSMOS 3.62 · Macro ASR error 25.45% · SIM 0.708",
      sharedFile: "factorgse-186p7ms.wav",
      highlight: true
    }
  ];

  const contextComparison = [
    {
      key: "nla-0",
      label: "26.67-ms input context",
      tag: "Sweep · N_LA = 0",
      meta: "DNSMOS 3.54 · Macro ASR error 29.85%",
      file: "26p7ms.wav"
    },
    {
      key: "nla-2",
      label: "80-ms input context",
      tag: "Sweep · N_LA = 2",
      meta: "DNSMOS 3.58 · Macro ASR error 28.00%",
      file: "80ms.wav"
    },
    {
      key: "nla-5",
      label: "160-ms input context",
      tag: "Sweep · N_LA = 5",
      meta: "DNSMOS 3.61 · Macro ASR error 26.85%",
      file: "160ms.wav"
    },
    {
      key: "nla-8",
      label: "240-ms input context",
      tag: "Sweep · N_LA = 8",
      meta: "DNSMOS 3.62 · Macro ASR error 23.30%",
      file: "240ms.wav"
    },
    {
      key: "nla-6-primary",
      label: "186.7-ms input context",
      tag: "Primary · separate run",
      meta: "DNSMOS 3.62 · Macro ASR error 25.45% · SIM 0.708",
      sharedFile: "factorgse-186p7ms.wav",
      highlight: true
    }
  ];

  function audioSource(scope, method, language) {
    if (method.sharedFile) {
      return `${audioRoot}/shared/${language.key}/${method.sharedFile}`;
    }
    return `${audioRoot}/${scope}/${language.key}/${method.file}`;
  }

  function spectrogramSource(scope, method, language) {
    return audioSource(scope, method, language).replace(/\.wav$/i, ".png");
  }

  function createComparisonHeader() {
    const header = document.createElement("div");
    header.className = "audio-comparison-header";
    ["Method", ...languages.map((language) => language.label)].forEach((label) => {
      const cell = document.createElement("span");
      cell.textContent = label;
      header.appendChild(cell);
    });
    return header;
  }

  function createMethodCell(method) {
    const cell = document.createElement("div");
    cell.className = "audio-method";

    const heading = document.createElement("div");
    heading.className = "audio-method-heading";

    const title = document.createElement("h4");
    title.textContent = method.label;

    const tag = document.createElement("span");
    tag.className = "audio-tag";
    tag.textContent = method.tag;

    heading.append(title, tag);
    cell.appendChild(heading);

    if (method.meta) {
      const meta = document.createElement("p");
      meta.className = "audio-metrics";
      meta.textContent = method.meta;
      cell.appendChild(meta);
    }

    return cell;
  }

  function createAudioCell(scope, method, language) {
    const cell = document.createElement("div");
    cell.className = "audio-sample";

    const label = document.createElement("span");
    label.className = "audio-language-label";
    label.textContent = language.label;

    const media = document.createElement("div");
    media.className = "audio-media";

    const spectrogramLink = document.createElement("a");
    spectrogramLink.className = "spectrogram-link";
    spectrogramLink.href = spectrogramSource(scope, method, language);
    spectrogramLink.target = "_blank";
    spectrogramLink.rel = "noopener";
    spectrogramLink.setAttribute("aria-label", `Open full-size spectrogram for the ${language.label} sample: ${method.label}`);

    const spectrogram = document.createElement("img");
    spectrogram.className = "spectrogram-image";
    spectrogram.src = spectrogramSource(scope, method, language);
    spectrogram.alt = "";
    spectrogram.width = 760;
    spectrogram.height = 220;
    spectrogram.loading = "lazy";
    spectrogram.decoding = "async";

    const audio = document.createElement("audio");
    audio.controls = true;
    audio.preload = "none";
    audio.src = audioSource(scope, method, language);
    audio.setAttribute("aria-label", `${language.label} sample: ${method.label}`);
    audio.setAttribute("aria-describedby", `urgent-transcript-${language.key}`);

    spectrogramLink.appendChild(spectrogram);
    media.append(spectrogramLink, audio);
    cell.append(label, media);
    return cell;
  }

  function createComparisonRow(scope, method) {
    const row = document.createElement("article");
    row.className = `audio-row${method.highlight ? " is-highlight" : ""}`;
    row.dataset.slot = `${scope}-${method.key}`;
    row.appendChild(createMethodCell(method));
    languages.forEach((language) => {
      row.appendChild(createAudioCell(scope, method, language));
    });
    return row;
  }

  function renderComparison(id, methods, scope) {
    const container = document.getElementById(id);
    if (!container) return;

    const fragment = document.createDocumentFragment();
    fragment.appendChild(createComparisonHeader());
    methods.forEach((method) => {
      fragment.appendChild(createComparisonRow(scope, method));
    });
    container.replaceChildren(fragment);
  }

  function setupVideoComparison() {
    const video = document.getElementById("realtime-video");
    const controls = document.querySelector(".demo-switch");
    const status = document.getElementById("demo-status");
    if (!video || !controls || !status) return;

    const buttons = Array.from(controls.querySelectorAll("button[data-demo-version]"));
    let activeButton = buttons.find((button) => button.getAttribute("aria-pressed") === "true");
    let pendingTime = null;
    let playRequest = 0;
    controls.hidden = false;

    function showStatus(message) {
      status.textContent = `${message} — ${activeButton.dataset.videoLabel}.`;
    }

    function playSelected() {
      const request = ++playRequest;
      // Call play directly from the click so mobile browsers retain user activation.
      video.play().catch((error) => {
        if (request !== playRequest || error.name === "AbortError") return;
        showStatus(error.name === "NotAllowedError"
          ? "Use the video play control to start"
          : "Unable to play; try the video link below");
      });
    }

    video.addEventListener("loadedmetadata", () => {
      if (pendingTime === null) return;
      const duration = Number.isFinite(video.duration) ? video.duration : pendingTime;
      video.currentTime = Math.min(pendingTime, Math.max(0, duration - 0.1));
      pendingTime = null;
    });
    video.addEventListener("playing", () => showStatus("Playing"));
    video.addEventListener("waiting", () => showStatus("Loading"));
    video.addEventListener("pause", () => {
      if (!video.ended && pendingTime === null) showStatus("Paused");
    });
    video.addEventListener("ended", () => showStatus("Finished"));
    video.addEventListener("error", () => showStatus("Unable to load; try the video link below"));

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        if (button !== activeButton) {
          // Preserve the requested position even during rapid switches before metadata loads.
          pendingTime = video.ended ? 0 : (pendingTime ?? video.currentTime);
          activeButton = button;
          buttons.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
          video.setAttribute("aria-label", `Real-time demo: ${button.dataset.videoLabel}`);
          video.src = button.dataset.videoSrc;
          video.load();
        } else if (video.ended) {
          video.currentTime = 0;
        }
        showStatus("Loading");
        playSelected();
      });
    });
  }

  document.addEventListener("play", (event) => {
    if (!(event.target instanceof HTMLMediaElement)) return;
    document.querySelectorAll("audio, video").forEach((player) => {
      if (player !== event.target) player.pause();
    });
  }, true);

  renderComparison("main-comparison-table", mainComparison, "main");
  renderComparison("factorization-table", factorizationComparison, "factorization");
  renderComparison("context-table", contextComparison, "context");
  setupVideoComparison();
})();
