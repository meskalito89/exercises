    const STORAGE_KEY = "guitar-practice-feed-v1";
    const METRONOME_KEY = "guitar-practice-metronome-v1";
    const EXERCISES_TREE_API_URL = "https://api.github.com/repos/meskalito89/exercises/git/trees/master?recursive=1";
    const EXERCISES_RAW_BASE_URL = "https://raw.githubusercontent.com/meskalito89/exercises/master/";

    const EXERCISES_GITHUB_URL = "https://github.com/meskalito89/exercises/blob/master/exercises/";
    const exerciseImage = (filename) => `${EXERCISES_GITHUB_URL}${filename}`;
    const defaultItems = [
      { type: "rest", title: "отдых", duration: 10 },
      { type: "exercise", title: "Гитарные арпеджио 1-4", duration: 300, bpm: 50, image: exerciseImage("1_gitarnye_arpedgio_1-4.jpg") },
      { type: "rest", title: "Пауза", duration: 10 },
      { type: "exercise", title: "Координация рук", duration: 240, bpm: 50, image: exerciseImage("3_koordinaziya_ruk_gitarista.jpg") },
      { type: "rest", title: "Пауза", duration: 10 },
      { type: "exercise", title: "Легато", duration: 360, bpm: 50, image: exerciseImage("4_upragneniya_na_legato_dlya_levoi_ruki.jpg") },
      { type: "rest", title: "Пауза", duration: 10 },
      { type: "exercise", title: "Пассажи 1", duration: 180, bpm: 48, image: exerciseImage("5_passagi_i_gammy_a.jpg") },
      { type: "rest", title: "Пауза", duration: 10 },
      { type: "exercise", title: "Пассажи 2", duration: 190, bpm: 50, image: exerciseImage("6_passagi_i_gammy_b.jpg") },
      { type: "rest", title: "Пауза", duration: 10 },
      { type: "exercise", title: "Упражнение", duration: 210, bpm: 50, image: exerciseImage("7_passagi_i_gammy_c.jpg") },
      { type: "rest", title: "Пауза", duration: 10 },
      { type: "exercise", title: "Пассажи 3", duration: 120, bpm: 50, image: exerciseImage("8_passagi_i_gammy_d.jpg") },
      { type: "rest", title: "Пауза", duration: 10 },
      { type: "exercise", title: "Пассажи 4", duration: 180, bpm: 50, image: exerciseImage("9_passagi_i_gammy_e.jpg") },
      { type: "rest", title: "Пауза", duration: 10 },
      { type: "exercise", title: "Легато", duration: 300, bpm: 50, image: exerciseImage("10_legato_na_gitare_c_d.jpg") },
      { type: "rest", title: "Пауза", duration: 10 },
      { type: "exercise", title: "арпеджио", duration: 720, bpm: 50, image: exerciseImage("11_gitarnye_arpedgio_7-12.jpg") },
    ];

    const state = {
      mode: "exercise",
      items: loadItems(),
      editingIndex: -1,
      activeIndex: -1,
      remaining: 0,
      initialRemaining: 0,
      running: false,
      paused: false,
      finished: false,
      timerId: null,
      audioContext: null,
      metronomeId: null,
      tunerOscillator: null,
      tunerGain: null,
      tunerFrequency: null,
      beat: 0,
      descriptionOpen: true,
      metronome: loadMetronomeSettings()
    };

    const nodes = {
      exerciseMode: document.querySelector("#exerciseMode"),
      restMode: document.querySelector("#restMode"),
      titleInput: document.querySelector("#titleInput"),
      minutesInput: document.querySelector("#minutesInput"),
      secondsInput: document.querySelector("#secondsInput"),
      bpmInput: document.querySelector("#bpmInput"),
      bpmLabel: document.querySelector("#bpmLabel"),
      descriptionInput: document.querySelector("#descriptionInput"),
      descriptionLabel: document.querySelector("#descriptionLabel"),
      imageInput: document.querySelector("#imageInput"),
      imageLabel: document.querySelector("#imageLabel"),
      imageFileButton: document.querySelector("#imageFileButton"),
      imageUrlInput: document.querySelector("#imageUrlInput"),
      editorPanel: document.querySelector("#editorPanel"),
      addButton: document.querySelector("#addButton"),
      cancelEditButton: document.querySelector("#cancelEditButton"),
      resetButton: document.querySelector("#resetButton"),
      exportButton: document.querySelector("#exportButton"),
      importButton: document.querySelector("#importButton"),
      importInput: document.querySelector("#importInput"),
      importUrlInput: document.querySelector("#importUrlInput"),
      importUrlButton: document.querySelector("#importUrlButton"),
      readyExercisesSelect: document.querySelector("#readyExercisesSelect"),
      readyExercisesButton: document.querySelector("#readyExercisesButton"),
      fileStatus: document.querySelector("#fileStatus"),
      feedList: document.querySelector("#feedList"),
      itemsCount: document.querySelector("#itemsCount"),
      totalTime: document.querySelector("#totalTime"),
      leftTime: document.querySelector("#leftTime"),
      sessionState: document.querySelector("#sessionState"),
      sessionTitle: document.querySelector("#sessionTitle"),
      viewer: document.querySelector("#viewer"),
      progressBar: document.querySelector("#progressBar"),
      startButton: document.querySelector("#startButton"),
      pauseButton: document.querySelector("#pauseButton"),
      skipButton: document.querySelector("#skipButton"),
      stopButton: document.querySelector("#stopButton"),
      nowTitle: document.querySelector("#nowTitle"),
      timer: document.querySelector("#timer"),
      tempoText: document.querySelector("#tempoText"),
      beatDots: Array.from(document.querySelectorAll(".beat span")),
      beatsPerBarInput: document.querySelector("#beatsPerBarInput"),
      muteFirstClickInput: document.querySelector("#muteFirstClickInput"),
      tunerButtons: Array.from(document.querySelectorAll(".tuner-note"))
    };

    function loadItems() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return Array.isArray(saved) && saved.length ? normalizeItems(saved) : structuredClone(defaultItems);
      } catch {
        return structuredClone(defaultItems);
      }
    }

    function saveItems() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    }

    function loadMetronomeSettings() {
      try {
        const saved = JSON.parse(localStorage.getItem(METRONOME_KEY));
        return {
          beatsPerBar: Math.min(8, Math.max(2, Number(saved?.beatsPerBar) || 4)),
          muteFirstClick: Boolean(saved?.muteFirstClick)
        };
      } catch {
        return { beatsPerBar: 4, muteFirstClick: false };
      }
    }

    function saveMetronomeSettings() {
      localStorage.setItem(METRONOME_KEY, JSON.stringify(state.metronome));
    }

    function normalizeItems(rawItems) {
      if (!Array.isArray(rawItems)) {
        throw new Error("В JSON должен быть массив items.");
      }

      return rawItems.map((item, index) => {
        if (!item || typeof item !== "object") {
          throw new Error(`Пункт ${index + 1}: неверный формат.`);
        }

        const type = item.type === "rest" ? "rest" : "exercise";
        const duration = Math.max(1, Math.round(Number(item.duration) || 0));
        const title = String(item.title || (type === "rest" ? "Пауза" : "Упражнение")).trim();
        const normalized = { type, title, duration };

        if (type === "exercise") {
          normalized.bpm = Math.min(260, Math.max(30, Math.round(Number(item.bpm) || 80)));
          normalized.image = typeof item.image === "string" ? item.image : "";
          normalized.description = typeof item.description === "string" ? item.description.trim() : "";
        }

        return normalized;
      });
    }

    function formatTime(seconds) {
      const value = Math.max(0, Math.ceil(seconds));
      const mins = Math.floor(value / 60).toString().padStart(2, "0");
      const secs = (value % 60).toString().padStart(2, "0");
      return `${mins}:${secs}`;
    }

    function totalDuration(fromIndex = 0) {
      return state.items.slice(fromIndex).reduce((sum, item) => sum + item.duration, 0);
    }

    function itemLabel(item) {
      return item.type === "rest" ? "Пауза" : `${item.bpm} BPM`;
    }

    function nextExercise(fromIndex) {
      return state.items.slice(fromIndex + 1).find((candidate) => candidate.type === "exercise");
    }

    function setStatus(message) {
      nodes.fileStatus.textContent = message;
    }

    function renderFeed() {
      nodes.feedList.innerHTML = "";
      nodes.itemsCount.textContent = state.items.length;
      nodes.totalTime.textContent = formatTime(totalDuration(0));

      if (!state.items.length) {
        nodes.feedList.innerHTML = "<p class=\"small\">Лента пустая. Добавьте упражнение или паузу.</p>";
        return;
      }

      state.items.forEach((item, index) => {
        const row = document.createElement("div");
        row.className = `feed-item${index === state.activeIndex || index === state.editingIndex ? " active" : ""}`;

        const thumb = document.createElement("div");
        thumb.className = "thumb";
        if (item.type === "exercise" && item.image) {
          const image = document.createElement("img");
          image.src = githubRawUrl(item.image);
          image.alt = "";
          thumb.append(image);
        } else {
          thumb.textContent = item.type === "rest" ? "∥" : "♪";
        }

        const meta = document.createElement("div");
        meta.className = "feed-meta";
        meta.innerHTML = `
          <div class="feed-title">${escapeHtml(item.title)}</div>
          <p class="small">${formatTime(item.duration)} · ${itemLabel(item)}</p>
        `;

        const actions = document.createElement("div");
        actions.className = "feed-actions";
        actions.innerHTML = `
          <button class="icon-button" type="button" title="Редактировать" data-action="edit" data-index="${index}">✎</button>
          <button class="icon-button" type="button" title="Выше" data-action="up" data-index="${index}">↑</button>
          <button class="icon-button" type="button" title="Ниже" data-action="down" data-index="${index}">↓</button>
          <button class="icon-button" type="button" title="Удалить" data-action="delete" data-index="${index}">×</button>
        `;

        row.append(thumb, meta, actions);
        nodes.feedList.append(row);
      });
    }

    function escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll("\"", "&quot;")
        .replaceAll("'", "&#039;");
    }

    function renderStage() {
      const item = state.items[state.activeIndex];
      const left = state.running
        ? totalDuration(state.activeIndex + 1) + state.remaining
        : totalDuration(0);
      updateEditorButtons();
      nodes.leftTime.textContent = formatTime(left);
      nodes.timer.textContent = formatTime(state.remaining);
      nodes.pauseButton.textContent = state.paused ? "Продолжить" : "Пауза";
      nodes.startButton.disabled = state.running || !state.items.length;
      nodes.pauseButton.disabled = !state.running;
      nodes.skipButton.disabled = !state.running;
      nodes.stopButton.disabled = !state.running;

      const progress = state.initialRemaining
        ? ((state.initialRemaining - state.remaining) / state.initialRemaining) * 100
        : 0;
      nodes.progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;

      if (state.finished) {
        nodes.viewer.classList.remove("exercise-viewer");
        nodes.sessionState.textContent = "Сессия завершена";
        nodes.sessionTitle.textContent = "Лента пройдена полностью";
        nodes.nowTitle.textContent = "Занятие завершено";
        nodes.tempoText.textContent = "Метроном готов";
        nodes.timer.textContent = "00:00";
        nodes.viewer.innerHTML = `
          <div class="finish-screen">
            <div>
              <strong>Занятие завершено</strong>
              <span>Лента пройдена полностью.</span>
            </div>
          </div>
        `;
        renderBeat(-1);
        renderFeed();
        return;
      }

      if (!state.running || !item) {
        nodes.viewer.classList.remove("exercise-viewer");
        nodes.sessionState.textContent = "Сессия не запущена";
        nodes.sessionTitle.textContent = "Подготовьте ленту и нажмите старт";
        nodes.nowTitle.textContent = "Нет активного упражнения";
        nodes.tempoText.textContent = "Метроном готов";
        nodes.viewer.innerHTML = `
          <div class="empty">
            <div>
              <strong>Готово к занятию</strong>
              <span>Добавьте упражнения и паузы в нужном порядке.</span>
            </div>
          </div>
        `;
        renderBeat(-1);
        renderFeed();
        return;
      }

      nodes.sessionState.textContent = state.paused ? "Пауза на месте" : "Сессия идет";
      nodes.sessionTitle.textContent = `${state.activeIndex + 1} из ${state.items.length}`;
      nodes.nowTitle.textContent = item.title;

      if (item.type === "rest") {
        nodes.viewer.classList.remove("exercise-viewer");
        nodes.tempoText.textContent = "Пауза без метронома";
        const upcoming = nextExercise(state.activeIndex);
        const preview = upcoming?.image
          ? `<img src="${escapeAttribute(githubRawUrl(upcoming.image))}" alt="${escapeAttribute(upcoming.title)}">`
          : `<p>${upcoming ? "Картинка для следующего упражнения не выбрана." : "Следующих упражнений в ленте нет."}</p>`;
        nodes.viewer.innerHTML = `
          <div class="rest-screen">
            <div class="next-exercise-preview">
              <div>
              <strong>${escapeHtml(item.title)}</strong>
                <p>${upcoming ? `Следующее: ${escapeHtml(upcoming.title)}` : "Восстановитесь перед продолжением."}</p>
              </div>
              ${preview}
            </div>
          </div>
        `;
      } else {
        nodes.viewer.classList.add("exercise-viewer");
        nodes.tempoText.textContent = `${item.bpm} BPM`;
        nodes.viewer.innerHTML = item.image
          ? `<img src="${escapeAttribute(githubRawUrl(item.image))}" alt="${escapeAttribute(item.title)}">${item.description ? `<details class="exercise-notes"${state.descriptionOpen ? " open" : ""}><summary>Описание упражнения</summary><p>${escapeHtml(item.description)}</p></details>` : ""}`
          : `<div class="empty"><div><strong>${escapeHtml(item.title)}</strong><span>Картинка не выбрана.</span></div></div>`;
      }

      renderFeed();
    }

    function escapeAttribute(value) {
      return escapeHtml(value).replaceAll("`", "&#096;");
    }

    function renderBeat(activeBeat) {
      const needed = state.metronome.beatsPerBar;
      if (nodes.beatDots.length !== needed) {
        const beat = document.querySelector(".beat");
        beat.innerHTML = "";
        for (let index = 0; index < needed; index += 1) beat.append(document.createElement("span"));
        nodes.beatDots = Array.from(beat.querySelectorAll("span"));
      }
      nodes.beatDots.forEach((dot, index) => {
        dot.classList.toggle("on", index === activeBeat);
      });
    }

    function setMode(mode) {
      state.mode = mode;
      nodes.exerciseMode.classList.toggle("active", mode === "exercise");
      nodes.restMode.classList.toggle("active", mode === "rest");
      nodes.bpmLabel.classList.toggle("hidden", mode === "rest");
      nodes.descriptionLabel.classList.toggle("hidden", mode === "rest");
      nodes.imageLabel.classList.toggle("hidden", mode === "rest");
      nodes.titleInput.placeholder = mode === "rest" ? "Передохнуть" : "Арпеджио 1-4";
      updateEditorButtons();
    }

    function updateEditorButtons() {
      const isEditing = state.editingIndex >= 0;
      nodes.addButton.textContent = isEditing
        ? "Сохранить изменения"
        : state.mode === "rest" ? "Добавить паузу" : "Добавить в ленту";
      nodes.cancelEditButton.classList.toggle("hidden", !isEditing);
      nodes.exerciseMode.disabled = state.running;
      nodes.restMode.disabled = state.running;
      nodes.addButton.disabled = state.running;
      nodes.resetButton.disabled = state.running;
      nodes.importButton.disabled = state.running;
      nodes.importUrlButton.disabled = state.running;
      nodes.readyExercisesSelect.disabled = state.running || nodes.readyExercisesSelect.options.length <= 1;
      nodes.readyExercisesButton.disabled = state.running || !nodes.readyExercisesSelect.value;
    }

    function fillEditor(item, index) {
      if (state.running || !item) return;
      nodes.editorPanel.open = true;
      state.editingIndex = index;
      setMode(item.type);
      nodes.titleInput.value = item.title;
      nodes.minutesInput.value = Math.floor(item.duration / 60);
      nodes.secondsInput.value = item.duration % 60;
      nodes.bpmInput.value = item.type === "exercise" ? item.bpm : 80;
      nodes.descriptionInput.value = item.type === "exercise" ? item.description || "" : "";
      nodes.imageInput.value = "";
      nodes.imageUrlInput.value = item.type === "exercise" && item.image && !item.image.startsWith("data:")
        ? item.image
        : "";
      setStatus(item.type === "exercise" && item.image
        ? "Текущая картинка сохранится, если не выбрать файл или новый URL."
        : "Редактирование пункта ленты.");
      renderFeed();
    }

    function clearEditor(keepStatus = false) {
      state.editingIndex = -1;
      nodes.titleInput.value = "";
      nodes.descriptionInput.value = "";
      nodes.imageInput.value = "";
      nodes.imageUrlInput.value = "";
      if (!keepStatus) setStatus("");
      updateEditorButtons();
      renderFeed();
    }

    function durationFromInputs() {
      const minutes = Number(nodes.minutesInput.value) || 0;
      const seconds = Number(nodes.secondsInput.value) || 0;
      return Math.max(1, Math.round(minutes * 60 + Math.min(59, seconds)));
    }

    async function imageFromInput() {
      const file = nodes.imageInput.files[0];
      if (!file) return "";

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    async function addItem() {
      if (state.running) return;
      const duration = durationFromInputs();
      const fallbackTitle = state.mode === "rest" ? "Пауза" : "Упражнение";
      const title = nodes.titleInput.value.trim() || fallbackTitle;
      const previous = state.items[state.editingIndex];
      const item = { type: state.mode, title, duration };

      if (state.mode === "exercise") {
        item.bpm = Math.min(260, Math.max(30, Number(nodes.bpmInput.value) || 80));
        item.description = nodes.descriptionInput.value.trim();
        item.image = await imageFromInput()
          || nodes.imageUrlInput.value.trim()
          || (previous && previous.type === "exercise" ? previous.image : "");
      }

      if (state.editingIndex >= 0) {
        state.items[state.editingIndex] = item;
        setStatus("Изменения сохранены.");
      } else {
        state.items.push(item);
        setStatus("Пункт добавлен в ленту.");
      }

      saveItems();
      clearEditor(true);
      nodes.editorPanel.open = false;
      renderFeed();
      renderStage();
    }

    function moveItem(index, direction) {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= state.items.length || state.running) return;
      const [item] = state.items.splice(index, 1);
      state.items.splice(nextIndex, 0, item);
      if (state.editingIndex === index) state.editingIndex = nextIndex;
      else if (state.editingIndex === nextIndex) state.editingIndex = index;
      saveItems();
      renderFeed();
    }

    function deleteItem(index) {
      if (state.running) return;
      state.items.splice(index, 1);
      if (state.editingIndex === index) clearEditor();
      else if (state.editingIndex > index) state.editingIndex -= 1;
      saveItems();
      renderFeed();
      renderStage();
    }

    function exportSettings() {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        items: state.items,
        metronome: state.metronome
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);

      link.href = url;
      link.download = `guitar-practice-${date}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus("JSON-файл сохранен.");
    }

    function applyImportedSettings(parsed) {
      const rawItems = Array.isArray(parsed) ? parsed : parsed.items;
      const importedItems = normalizeItems(rawItems);
      if (!importedItems.length) throw new Error("В конфиге нет пунктов ленты.");

      state.items = importedItems;
      if (parsed?.metronome && typeof parsed.metronome === "object") {
        state.metronome = {
          beatsPerBar: Math.min(8, Math.max(2, Number(parsed.metronome.beatsPerBar) || 4)),
          muteFirstClick: Boolean(parsed.metronome.muteFirstClick)
        };
        saveMetronomeSettings();
        renderMetronomeSettings();
      }
      state.finished = false;
      clearEditor(true);
      saveItems();
      renderFeed();
      renderStage();
      setStatus(`Загружено пунктов: ${importedItems.length}.`);
    }

    function importSettings(file) {
      if (!file || state.running) return;
      const reader = new FileReader();
      reader.onload = () => {
        try { applyImportedSettings(JSON.parse(reader.result)); }
        catch (error) { setStatus(`Не удалось загрузить JSON: ${error.message}`); }
        finally { nodes.importInput.value = ""; }
      };
      reader.readAsText(file);
    }

    function startSession() {
      if (!state.items.length) return;
      state.activeIndex = 0;
      state.running = true;
      state.paused = false;
      state.finished = false;
      beginItem();
    }

    function beginItem() {
      const item = state.items[state.activeIndex];
      if (!item) {
        finishSession();
        return;
      }

      state.remaining = item.duration;
      state.initialRemaining = item.duration;
      state.beat = 0;
      state.descriptionOpen = true;
      renderStage();
      startTimer();
      syncMetronome();
    }

    function startTimer() {
      clearInterval(state.timerId);
      state.timerId = setInterval(() => {
        if (state.paused) return;
        state.remaining -= 1;
        if (state.remaining <= 0) {
          state.remaining = 0;
          renderStage();
          nextItem();
          return;
        }
        renderStage();
      }, 1000);
    }

    function nextItem() {
      clearInterval(state.timerId);
      stopMetronome();
      state.activeIndex += 1;
      beginItem();
    }

    function togglePause() {
      if (!state.running) return;
      state.paused = !state.paused;
      syncMetronome();
      renderStage();
    }

    function stopSession() {
      clearInterval(state.timerId);
      stopMetronome();
      state.activeIndex = -1;
      state.remaining = 0;
      state.initialRemaining = 0;
      state.running = false;
      state.paused = false;
      state.finished = false;
      renderStage();
    }

    function finishSession() {
      clearInterval(state.timerId);
      stopMetronome();
      state.running = false;
      state.paused = false;
      state.finished = true;
      state.activeIndex = -1;
      state.remaining = 0;
      state.initialRemaining = 0;
      renderStage();
    }

    function getAudioContext() {
      if (!state.audioContext) {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (state.audioContext.state === "suspended") {
        state.audioContext.resume();
      }
      return state.audioContext;
    }

    function playClick(isAccent) {
      const context = getAudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;

      oscillator.type = "square";
      oscillator.frequency.setValueAtTime(isAccent ? 1320 : 880, now);
      gain.gain.setValueAtTime(isAccent ? 0.24 : 0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.06);
    }

    function syncMetronome() {
      stopMetronome();
      const item = state.items[state.activeIndex];
      if (!state.running || state.paused || !item || item.type !== "exercise") {
        renderBeat(-1);
        return;
      }

      const interval = 60000 / item.bpm;
      state.beat = 0;
      playClick(state.metronome.muteFirstClick);
      renderBeat(0);
      state.metronomeId = setInterval(() => {
        state.beat = (state.beat + 1) % state.metronome.beatsPerBar;
        playClick(state.metronome.muteFirstClick && state.beat === 0);
        renderBeat(state.beat);
      }, interval);
    }

    function stopMetronome() {
      clearInterval(state.metronomeId);
      state.metronomeId = null;
      renderBeat(-1);
    }

    function stopTuner() {
      if (state.tunerOscillator) {
        state.tunerOscillator.stop();
        state.tunerOscillator.disconnect();
      }
      state.tunerGain?.disconnect();
      state.tunerOscillator = null;
      state.tunerGain = null;
      state.tunerFrequency = null;
      nodes.tunerButtons.forEach((button) => {
        button.classList.remove("active");
        button.setAttribute("aria-pressed", "false");
      });
    }

    function toggleTuner(frequency, button) {
      if (state.tunerFrequency === frequency) {
        stopTuner();
        return;
      }

      stopTuner();
      const context = getAudioContext();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.08;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      state.tunerOscillator = oscillator;
      state.tunerGain = gain;
      state.tunerFrequency = frequency;
      button.classList.add("active");
      button.setAttribute("aria-pressed", "true");
    }

    function renderMetronomeSettings() {
      nodes.beatsPerBarInput.value = String(state.metronome.beatsPerBar);
      nodes.muteFirstClickInput.checked = state.metronome.muteFirstClick;
      renderBeat(-1);
    }

    function githubRawUrl(url) {
      try {
        const parsed = new URL(url);
        if (parsed.hostname === "github.com") {
          const parts = parsed.pathname.split("/").filter(Boolean);
          if (parts.length >= 5 && parts[2] === "blob") {
            return `https://raw.githubusercontent.com/${parts[0]}/${parts[1]}/${parts.slice(3).join("/")}`;
          }
        }
      } catch {
        // The browser will provide a clear error below for an invalid URL.
      }
      return url;
    }

    async function importSettingsFromUrl() {
      if (state.running) return;
      const suppliedUrl = nodes.importUrlInput.value.trim();
      if (!suppliedUrl) {
        setStatus("Вставьте URL JSON-конфига.");
        return;
      }

      nodes.importUrlButton.disabled = true;
      setStatus("Загрузка JSON по сети…");
      try {
        const response = await fetch(githubRawUrl(suppliedUrl), { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`сервер вернул ${response.status}`);
        applyImportedSettings(JSON.parse(await response.text()));
      } catch (error) {
        setStatus(`Не удалось загрузить JSON по URL: ${error.message}`);
      } finally {
        updateEditorButtons();
      }
    }

    async function loadReadyExercises() {
      try {
        const response = await fetch(EXERCISES_TREE_API_URL, { headers: { Accept: "application/vnd.github+json" } });
        if (!response.ok) throw new Error(`сервер вернул ${response.status}`);
        const catalog = (await response.json()).tree
          .filter((entry) => entry.type === "blob" && entry.path.startsWith("exercises/") && entry.path.endsWith(".json"))
          .map((entry) => entry.path)
          .sort((left, right) => left.localeCompare(right, "ru"));

        if (!catalog.length) throw new Error("JSON-файлы не найдены");
        nodes.readyExercisesSelect.innerHTML = '<option value="">Выберите готовое упражнение</option>';
        catalog.forEach((path) => {
          const option = document.createElement("option");
          option.value = `${EXERCISES_RAW_BASE_URL}${path}`;
          option.textContent = path.replace(/^exercises\//, "");
          nodes.readyExercisesSelect.append(option);
        });
      } catch (error) {
        nodes.readyExercisesSelect.innerHTML = '<option value="">Не удалось загрузить список</option>';
        setStatus(`Не удалось получить готовые упражнения: ${error.message}`);
      } finally {
        updateEditorButtons();
      }
    }

    function importReadyExercise() {
      const url = nodes.readyExercisesSelect.value;
      if (!url || state.running) return;
      nodes.importUrlInput.value = url;
      importSettingsFromUrl();
    }

    nodes.exerciseMode.addEventListener("click", () => setMode("exercise"));
    nodes.restMode.addEventListener("click", () => setMode("rest"));
    nodes.addButton.addEventListener("click", addItem);
    nodes.cancelEditButton.addEventListener("click", () => {
      clearEditor();
      nodes.editorPanel.open = false;
    });
    nodes.editorPanel.addEventListener("toggle", () => {
      if (!nodes.editorPanel.open && state.editingIndex >= 0) clearEditor();
    });
    nodes.exportButton.addEventListener("click", exportSettings);
    nodes.importButton.addEventListener("click", () => nodes.importInput.click());
    nodes.importInput.addEventListener("change", () => importSettings(nodes.importInput.files[0]));
    nodes.importUrlButton.addEventListener("click", importSettingsFromUrl);
    nodes.readyExercisesSelect.addEventListener("change", updateEditorButtons);
    nodes.readyExercisesButton.addEventListener("click", importReadyExercise);
    nodes.imageFileButton.addEventListener("click", () => nodes.imageInput.click());
    nodes.imageFileButton.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        nodes.imageInput.click();
      }
    });
    nodes.imageInput.addEventListener("change", () => {
      const file = nodes.imageInput.files[0];
      if (file) {
        nodes.imageUrlInput.value = "";
        setStatus(`Выбран файл: ${file.name}`);
      }
    });
    nodes.imageUrlInput.addEventListener("input", () => {
      if (nodes.imageUrlInput.value.trim()) nodes.imageInput.value = "";
    });
    nodes.beatsPerBarInput.addEventListener("change", () => {
      state.metronome.beatsPerBar = Number(nodes.beatsPerBarInput.value);
      saveMetronomeSettings();
      if (state.running && !state.paused) syncMetronome();
      else renderBeat(-1);
    });
    nodes.muteFirstClickInput.addEventListener("change", () => {
      state.metronome.muteFirstClick = nodes.muteFirstClickInput.checked;
      saveMetronomeSettings();
      if (state.running && !state.paused) syncMetronome();
    });
    nodes.tunerButtons.forEach((button) => {
      button.addEventListener("click", () => toggleTuner(Number(button.dataset.frequency), button));
    });
    nodes.resetButton.addEventListener("click", () => {
      if (state.running) return;
      state.items = structuredClone(defaultItems);
      clearEditor();
      saveItems();
      renderFeed();
      renderStage();
    });
    nodes.feedList.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const index = Number(button.dataset.index);
      if (button.dataset.action === "edit") fillEditor(state.items[index], index);
      if (button.dataset.action === "up") moveItem(index, -1);
      if (button.dataset.action === "down") moveItem(index, 1);
      if (button.dataset.action === "delete") deleteItem(index);
    });
    nodes.startButton.addEventListener("click", startSession);
    nodes.pauseButton.addEventListener("click", togglePause);
    nodes.skipButton.addEventListener("click", nextItem);
    nodes.stopButton.addEventListener("click", stopSession);
    nodes.viewer.addEventListener("toggle", (event) => {
      if (event.target.matches(".exercise-notes")) {
        state.descriptionOpen = event.target.open;
      }
    }, true);
    document.addEventListener("keydown", (event) => {
      if (event.target.matches("input, textarea, select, button")) return;
      if (event.code === "Space") {
        event.preventDefault();
        state.running ? togglePause() : startSession();
      }
      if (event.code === "Enter" && state.running) {
        event.preventDefault();
        nextItem();
      }
    });

    setMode("exercise");
    renderMetronomeSettings();
    renderFeed();
    renderStage();
    loadReadyExercises();
