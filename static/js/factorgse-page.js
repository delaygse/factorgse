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
    const controls = document.querySelector(".demo-switch");
    const status = document.getElementById("demo-status");
    if (!controls || !status) return;
    const entries = Array.from(controls.querySelectorAll("button[data-demo-version]"), (button) => ({
      button,
      video: document.getElementById(button.getAttribute("aria-controls")),
      label: button.dataset.videoLabel
    }));
    if (entries.some((entry) => !entry.video)) return;
    let active = entries.find((entry) => entry.button.getAttribute("aria-pressed") === "true");
    let pending = null;
    controls.hidden = false;

    function showStatus(message) {
      status.textContent = `${message} — ${active.label}.`;
    }

    function warm(entry) {
      entry.video.preload = "auto";
      if (entry.video.networkState === 0) entry.video.load();
    }

    function clearRequest(request) {
      clearTimeout(request.timer);
      request.entry.button.setAttribute("aria-busy", "false");
    }

    function cancelPending() {
      if (!pending) return;
      const request = pending;
      pending = null;
      clearRequest(request);
      request.controller.abort();
      request.entry.video.pause();
      request.entry.video.muted = true;
    }

    // A cancellable wait covers metadata, seeking and buffering without polling.
    function waitForMedia(video, ready, signal) {
      return new Promise((resolve, reject) => {
        const events = ["loadedmetadata", "loadeddata", "canplay", "seeked", "playing", "progress"];
        function cleanup() {
          events.forEach((name) => video.removeEventListener(name, check));
          video.removeEventListener("error", failed);
          signal.removeEventListener("abort", aborted);
        }
        function check() {
          if (ready()) { cleanup(); resolve(); }
        }
        function failed() { cleanup(); reject(new Error("Media unavailable")); }
        function aborted() { cleanup(); reject(signal.reason); }
        events.forEach((name) => video.addEventListener(name, check));
        video.addEventListener("error", failed);
        signal.addEventListener("abort", aborted, { once: true });
        if (signal.aborted) aborted();
        else if (video.error) failed();
        else check();
      });
    }

    async function switchTo(entry) {
      if (pending && pending.entry === entry) return;
      cancelPending();
      const request = { entry, controller: new AbortController() };
      const signal = request.controller.signal;
      request.timer = setTimeout(() => request.controller.abort(new Error("Switch timed out")), 12000);
      pending = request;
      entry.button.setAttribute("aria-busy", "true");
      status.textContent = `Preparing ${entry.label}… Current version stays selected. Select it to cancel.`;
      const next = entry.video;
      // The standby keeps its source and buffer. It is always silent until handoff.
      next.muted = true;
      next.playbackRate = active.video.playbackRate;
      try {
        warm(entry);
        if (next.error) next.load(); // Reload only to recover from an actual media error.
        // Keep this call in the click event for mobile user activation.
        next.play().catch((error) => request.controller.abort(error));
        await waitForMedia(next, () => next.readyState >= 1, signal);
        do {
          const position = active.video.ended ? 0 : active.video.currentTime;
          const end = Number.isFinite(next.duration) ? Math.max(0, next.duration - 0.1) : position;
          const target = Math.min(position, end);
          if (Math.abs(next.currentTime - target) > 0.08) next.currentTime = target;
          await waitForMedia(next, () => !next.seeking && next.readyState >= 3 && !next.paused, signal);
          // If loading took time, catch up to the still-playing current version.
        } while (!active.video.paused && !active.video.ended && Math.abs(next.currentTime - active.video.currentTime) > 0.2);
        if (pending !== request || signal.aborted) return;

        const previous = active.video;
        const muted = previous.muted;
        next.volume = previous.volume;
        next.playbackRate = previous.playbackRate;
        clearRequest(request);
        pending = null;
        active = entry;
        entries.forEach((item) => {
          const selected = item === active;
          item.button.setAttribute("aria-pressed", String(selected));
          item.video.dataset.visible = String(selected);
          item.video.dataset.demoStandby = String(!selected);
          item.video.controls = selected;
          item.video.inert = !selected;
          item.video.setAttribute("aria-hidden", String(!selected));
        });
        document.querySelectorAll("audio, video").forEach((player) => {
          if (player !== next) player.pause();
        });
        previous.muted = true;
        next.muted = muted;
        showStatus("Playing");
      } catch (error) {
        if (pending !== request) return;
        cancelPending();
        status.textContent = error && error.name === "NotAllowedError"
          ? `Playback was blocked. Play ${active.label} first, then select ${entry.label} again.`
          : `Could not switch. Still on ${active.label}. Select ${entry.label} to retry.`;
      }
    }

    entries.forEach((entry) => {
      const video = entry.video;
      entry.button.addEventListener("pointerenter", () => warm(entry));
      entry.button.addEventListener("focus", () => warm(entry));
      entry.button.addEventListener("click", () => {
        if (entry !== active) { switchTo(entry); return; }
        cancelPending();
        if (video.ended) video.currentTime = 0;
        if (video.error) video.load();
        showStatus("Loading");
        video.play().catch(() => {
          if (entry === active && !pending) showStatus("Unable to play; select this version to retry");
        });
      });
      video.addEventListener("playing", () => {
        if (entry === active && !pending && !video.paused) showStatus("Playing");
      });
      video.addEventListener("waiting", () => {
        if (entry === active && !pending) showStatus("Buffering");
      });
      video.addEventListener("pause", () => {
        if (entry !== active || !video.paused || video.ended) return;
        cancelPending();
        showStatus("Paused");
      });
      video.addEventListener("ended", () => {
        if (entry === active && !pending && video.ended) showStatus("Finished");
      });
      video.addEventListener("error", () => {
        if (entry === active && !pending) showStatus("Unable to load; select this version to retry");
      });
    });

    // Starting another sample must also cancel an in-flight video switch.
    document.addEventListener("play", (event) => {
      if (pending && !event.target.paused && !entries.some((entry) => entry.video === event.target)) {
        cancelPending();
        showStatus(active.video.paused ? "Paused" : "Playing");
      }
    }, true);

    // Preload near the demo, respecting data-saving and slow-connection hints.
    const connection = navigator.connection;
    if ("IntersectionObserver" in window && !(connection && (connection.saveData || /2g/.test(connection.effectiveType)))) {
      const observer = new IntersectionObserver((items) => {
        if (!items.some((item) => item.isIntersecting)) return;
        entries.forEach(warm);
        observer.disconnect();
      }, { rootMargin: "300px" });
      observer.observe(document.getElementById("demo"));
    }
  }

  document.addEventListener("play", (event) => {
    if (!(event.target instanceof HTMLMediaElement)) return;
    if (event.target.paused || event.target.dataset.demoStandby === "true") return;
    document.querySelectorAll("audio, video").forEach((player) => {
      // The other demo may be warming silently while the visible video plays.
      if (event.target.dataset.demoStandby === "false" && player.dataset.demoStandby === "true") return;
      if (player !== event.target) player.pause();
    });
  }, true);

  renderComparison("main-comparison-table", mainComparison, "main");
  renderComparison("factorization-table", factorizationComparison, "factorization");
  renderComparison("context-table", contextComparison, "context");
  setupVideoComparison();
})();
