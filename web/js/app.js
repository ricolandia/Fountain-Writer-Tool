/* ── Fountain Writer v2 — app.js ── */
const app = {
  beats: JSON.parse(localStorage.getItem('fw_beats') || '[]'),
  titleData: JSON.parse(localStorage.getItem('fw_title') || 'null'),
  fileName: null, previewMode: 'editor', darkMode: false, focusOn: false,
  findTerm: '', findMatches: [], findIdx: -1, timerSec: 0, timerOn: false,
  isModified: false, timerMode: 'writing', pomodoroSec: 25 * 60,
  wordGoal: parseInt(localStorage.getItem('fw_goal') || '0'),
  sceneColors: JSON.parse(localStorage.getItem('fw_scene_colors') || '{}'),
  timelineVisible: false,
  projectName: localStorage.getItem('fw_project_name') || '',
  fontSize: parseInt(localStorage.getItem('fw_font_size') || '12'),
  soundOn: localStorage.getItem('fw_sound') === 'true',
  _audioContext: null,
  _sceneActMap: {},

  init() {
    this.translateUI();
    this.editor = document.getElementById('editor');
    this.preview = document.getElementById('preview');
    const stored = localStorage.getItem('fw_draft');
    if (stored) this.editor.value = stored;
    else this.editor.value = 'INT. ESCRITÓRIO - DIA\n\nJOÃO (CEO)\nPrecisamos de resultados!\n\nINT. CAFETERIA - DIA\n\nMARIA (SEC)\nEle nem me olha mais...\n\nEXT. PARQUE - DIA\n\nJOÃO\nO que importa é o lucro!\n\nINT. ESCRITÓRIO - DIA\n\nPEDRO (AMIGO)\nEla gosta de você, cara.\n\nINT. CAFETERIA - DIA\n\nJOÃO\nMaria, posso sentar?';

    // Tab switching
    document.querySelectorAll('#right-tabs .tab').forEach(t => {
      t.addEventListener('click', () => {
        document.querySelectorAll('#right-tabs .tab').forEach(x => x.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        const el = document.getElementById('tab-' + t.dataset.tab);
        if (el) { el.classList.add('active'); this.update(); }
      });
    });

    // Events
    let timer;
    this.editor.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => { this.update(); this.trackProductivity(); }, 100);
      this.playTick();
    });
    this.editor.addEventListener('mouseup', () => this.updateMarkButtonStates());
    this.editor.addEventListener('keyup', () => this.updateMarkButtonStates());
    this.editor.addEventListener('keydown', e => this.handleKey(e));

    // Drag reorder via Sortable-like manual implementation
    this.initBeatDragReorder();
    this.initDarkMode();
    this.applyFontSize();
    this.displayTimer();
    this.updateProjectNameDisplay();
    this.setupSelectionCount();
    this.renderProductivity();
    this.initAutoSave();
    this.initBackup();
    this.update();
    this.syncBeatsFromScenes(this.editor.value);
    this.renderBeats();
  },

  /* ── Updates ── */
  update() {
    const text = this.editor.value;
    localStorage.setItem('fw_draft', text);
    this.isModified = true;
    this.updateIndicator();
    this.autoAssignScenes(text);
    this.updateScenes(text);
    this.updateStats(text);
    this.updatePreview(text);
    this.renderTimeline();
    const activeTab = document.querySelector('#right-tabs .tab.active');
    const tab = activeTab ? activeTab.dataset.tab : 'beats';
    if (tab === 'chars' || tab === 'locs') this.renderCharsLocs(text);
  },

  updateIndicator() {
    const name = this.projectName || this.fileName || _('tb_project_name');
    document.title = 'Fountain Writer — ' + name + (this.isModified ? ' •' : '');
    const el = document.getElementById('save-indicator');
    if (el) el.textContent = this.isModified ? '💾' : '✓ Salvo';
  },

  updateScenes(text) {
    const scenes = this.parseScenes(text);
    document.getElementById('scene-count').textContent = scenes.length;
    this._sceneActMap = {};
    scenes.forEach(s => {
      const beat = this._findBeatForScene(s.label, s.line);
      this._sceneActMap[s.line] = beat ? (beat.act || 'Ato 1') : null;
    });
    // Debug: show matching result in status bar
    let dbg = '';
    scenes.forEach(s => {
      const b = this._findBeatForScene(s.label, s.line);
      const ref = s.label + '|L' + s.line;
      const foundBeat = b ? ('idx=' + this.beats.indexOf(b) + ' act=' + b.act + ' sr=' + b.scene_ref) : 'NONE';
      dbg += s.label.slice(0, 12) + ':' + foundBeat + ' ';
    });
    const el = document.getElementById('dbg');
    if (el) el.textContent = dbg;
    this.renderSceneList(scenes);
  },

  renderSceneList(scenes) {
    const list = document.getElementById('scene-list');
    list.innerHTML = '';
    if (scenes.length === 0) { list.innerHTML = '<li class="list-empty" style="cursor:default">' + _('empty_scenes') + '</li>'; return; }

    const plotColors = {'Principal':'#569cd6','A':'#ce9178','B':'#4ec9b0'};
    const actColors = {'Ato 1':'#569cd6','Ato 2':'#4ec9b0','Ato 3':'#dcdcaa','Ato 4':'#c586c0','Ato 5':'#d16969'};

    // Group scenes by act, preserving text order within each act
    const actGroups = {};
    const actFirstLine = {};
    scenes.forEach((s, i) => {
      const a = this._sceneActMap[s.line];
      if (a) {
        if (!actGroups[a]) { actGroups[a] = []; actFirstLine[a] = s.line; }
        actGroups[a].push(i);
      }
    });
    // Render acts sorted by first scene position
    Object.entries(actFirstLine).sort((a, b) => a[1] - b[1]).forEach(([actName]) => {
      this._renderActSeparator(list, actName, actColors);
      actGroups[actName].forEach(idx => {
        const li = this._makeSceneLi(scenes[idx], idx, plotColors);
        list.appendChild(li);
      });
    });
    // Unassigned scenes (no beat) at the end
    scenes.forEach((s, i) => {
      if (!this._sceneActMap[s.line]) {
        const li = this._makeSceneLi(s, i, plotColors);
        list.appendChild(li);
      }
    });
    // Empty acts at the end
    this._sortActs(Object.keys(this.getActs())).forEach(actName => {
      if (actFirstLine[actName] === undefined) this._renderActSeparator(list, actName, actColors);
    });
  },

  _renderActSeparator(list, actName, actColors) {
    const sep = document.createElement('li');
    sep.style.cssText = 'padding:3px 6px;font-weight:bold;font-size:8pt;color:var(--fg-sec);background:var(--surface2);border-radius:3px;margin:4px 0 2px;display:flex;justify-content:space-between;align-items:center;border-left:3px solid ' + (actColors[actName] || '#888');
    sep.innerHTML = '<span>' + esc(actName) + '</span><span class="act-remove" style="cursor:pointer;color:var(--fg-sec);font-size:7pt" title="Remover ato">✕</span>';
    sep.querySelector('.act-remove').addEventListener('click', e => { e.stopPropagation(); this.removeAct(actName); });
    list.appendChild(sep);
  },

  _makeSceneLi(s, i, plotColors) {
    const li = document.createElement('li');
    li.style.cssText = 'user-select:none;-webkit-user-select:none';
    const color = this.sceneColors[s.line];
    if (color) li.style.borderLeftColor = color;
    const marks = this.getLineMarks();
    if (marks[s.line]) {
      const mc = {'!':'#fff3b0', '*':'#c8e6c9', '?':'#ffcdd2'};
      li.style.backgroundColor = mc[marks[s.line]] || '';
    }
    const beat = this._findBeatForScene(s.label, s.line);
    let plot = beat ? beat.plotline || 'Principal' : '';
    if (plot === 'C' || plot === 'D') plot = 'B';
    li.innerHTML = (i + 1) + '. ' + esc(s.label) +
      (plot ? ' <span style="font-size:7pt;color:' + (plotColors[plot] || '#888') + '">[' + plot + ']</span>' : '') +
      ' <span style="font-size:6pt;color:var(--fg-sec)">' + (this._sceneActMap[s.line] || '?') + ' L' + s.line + '</span>';
    li.dataset.line = s.line;
    li.addEventListener('click', e => {
      if (e.target.closest('.act-remove')) return;
      this.goToScene(s.line);
    });
    return li;
  },

  goToScene(line) {
    const lines2 = this.editor.value.split('\n');
    let n = 0;
    for (let j = 0; j < line; j++) { n += lines2[j].length + 1; }
    this.editor.selectionStart = n;
    this.editor.selectionEnd = n;
    this.editor.focus();
    this.editor.scrollTop = Math.max(0, line * 18 - 200);
  },

  _findBeatForScene(label, line) {
    const ref = label + '|L' + line;
    return this.beats.find(b => b.scene_ref === ref || b.title === label || b.scene_ref === label);
  },

  _sortActs(actNames) {
    return actNames.sort((a, b) => (parseInt(a.match(/\d+/)) || 0) - (parseInt(b.match(/\d+/)) || 0));
  },

  parseScenes(text) {
    const lines = text.split('\n');
    const scenes = [];
    let prev = 'ACTION';
    lines.forEach((line, i) => {
      const t = guessType(line, prev);
      if (t === 'SCENE') scenes.push({ line: i, label: line.trim().replace(/^\./, '').slice(0, 60) });
      if (t !== 'BLANK') prev = t;
    });
    return scenes;
  },

  /* ── Scene colors ── */
  setSceneColor(idx, color) {
    const items = document.querySelectorAll('#scene-list li');
    if (idx < 0 || idx >= items.length) return;
    const line = parseInt(items[idx].dataset.line);
    if (color) this.sceneColors[line] = color;
    else delete this.sceneColors[line];
    localStorage.setItem('fw_scene_colors', JSON.stringify(this.sceneColors));
    this.updateScenes(this.editor.value);
  },

  /* ── Acts ── */
  getActs() {
    let acts = JSON.parse(localStorage.getItem('fw_acts') || 'null');
    if (!acts) { acts = {'Ato 1': [], 'Ato 2': [], 'Ato 3': [], 'Ato 4': [], 'Ato 5': [], 'Ato 6': [], 'Ato 7': []}; this.saveActs(acts); }
    return acts;
  },
  saveActs(acts) { localStorage.setItem('fw_acts', JSON.stringify(acts)); },

  getSceneBlocks(lines) {
    const blocks = [];
    let prev = 'ACTION';
    lines.forEach((line, idx) => {
      const t = guessType(line, prev);
      if (t === 'SCENE') blocks.push({ line: idx, end: lines.length });
      if (t !== 'BLANK') prev = t;
    });
    for (let j = 0; j < blocks.length - 1; j++) blocks[j].end = blocks[j + 1].line;
    if (blocks.length) blocks[blocks.length - 1].end = lines.length;
    return blocks;
  },

  addAct() {
    const name = prompt('Nome do ato:');
    if (!name) return;
    const acts = this.getActs();
    if (acts[name]) return;
    acts[name] = [];
    this.saveActs(acts);
    this.updateScenes(this.editor.value);
  },

  autoAssignScenes(text) {
    const acts = this.getActs();
    const lines = text.split('\n');
    const allScenes = [];
    let prev = 'ACTION';
    lines.forEach((line, i) => {
      const t = guessType(line, prev);
      if (t === 'SCENE') allScenes.push(i);
      if (t !== 'BLANK') prev = t;
    });
    const currentSceneSet = new Set(allScenes);
    let changed = false;
    // Clean stale line numbers from all acts
    Object.keys(acts).forEach(actName => {
      const valid = acts[actName].filter(l => currentSceneSet.has(l));
      if (valid.length !== acts[actName].length) { acts[actName] = valid; changed = true; }
    });
    if (changed) this.saveActs(acts);
  },

  removeAct(actName) {
    const acts = this.getActs();
    delete acts[actName];
    if (!acts['Ato 1']) acts['Ato 1'] = [];
    this.saveActs(acts);
    // Update beats that referenced the removed act
    this.beats.forEach(b => { if (b.act === actName) b.act = 'Ato 1'; });
    this.saveBeats();
    this.updateScenes(this.editor.value);
  },

  moveActToScene(fromAct, targetLine) {
    const acts = this.getActs();
    const lines = this.editor.value.split('\n');
    const blocks = this.getSceneBlocks(lines);
    if (blocks.length === 0) return;

    // Build block→act mapping from BEATS (always current, never stale)
    const blockToAct = {};
    blocks.forEach((b, i) => {
      blockToAct[i] = null;
      const label = lines[b.line].trim().replace(/^\./, '').slice(0, 60);
      const beat = this.beats.find(bt => bt.title === label || bt.scene_ref === label);
      if (beat && beat.act) blockToAct[i] = beat.act;
    });

    // Find blocks belonging to the dragged act
    const draggedIdxs = [];
    blocks.forEach((b, i) => {
      if (blockToAct[i] === fromAct) draggedIdxs.push(i);
    });
    if (draggedIdxs.length === 0) return;

    const otherIdxs = blocks.map((_, i) => i).filter(i => !draggedIdxs.includes(i));
    if (draggedIdxs.some(i => blocks[i].line === targetLine)) targetLine = lines.length;
    let insertIdx = otherIdxs.findIndex(i => blocks[i].line >= targetLine);
    if (insertIdx === -1) insertIdx = otherIdxs.length;

    const newOrderIdxs = [
      ...otherIdxs.slice(0, insertIdx),
      ...draggedIdxs,
      ...otherIdxs.slice(insertIdx)
    ];

    const savedScroll = this.editor.scrollTop;
    const savedStart = this.editor.selectionStart;
    this.editor.value = newOrderIdxs.map(i =>
      lines.slice(blocks[i].line, blocks[i].end).join('\n')
    ).join('\n\n');
    this.editor.selectionStart = savedStart;
    this.editor.selectionEnd = savedStart;
    this.editor.scrollTop = savedScroll;

    // Rebuild acts from new block order
    const newLines = this.editor.value.split('\n');
    const newBlocks = this.getSceneBlocks(newLines);
    const rebuilt = {};
    newOrderIdxs.forEach((oldIdx, newIdx) => {
      const act = blockToAct[oldIdx];
      if (act) {
        if (!rebuilt[act]) rebuilt[act] = [];
        rebuilt[act].push(newBlocks[newIdx].line);
      }
    });
    for (const aname of Object.keys(acts)) { if (!rebuilt[aname]) rebuilt[aname] = []; }
    this.saveActs(rebuilt);
    this.updateScenes(this.editor.value);
  },

  /* ── Single scene move ── */
  moveScene(fromLine, toLine) {
    const lines = this.editor.value.split('\n');
    const blocks = this.getSceneBlocks(lines);
    if (blocks.length <= 1) return;

    // Build block→act mapping from BEATS (always current)
    const blockToAct = {};
    blocks.forEach((b, i) => {
      blockToAct[i] = null;
      const label = lines[b.line].trim().replace(/^\./, '').slice(0, 60);
      const beat = this.beats.find(bt => bt.title === label || bt.scene_ref === label);
      if (beat && beat.act) blockToAct[i] = beat.act;
    });

    const fromIdx = blocks.findIndex(b => b.line === fromLine);
    if (fromIdx === -1) return;

    let toIdx = blocks.findIndex(b => b.line === toLine);
    if (toIdx === -1) toIdx = blocks.length;

    const newOrder = [];
    blocks.forEach((_, i) => { if (i !== fromIdx) newOrder.push(i); });
    if (toIdx > fromIdx) toIdx--;
    newOrder.splice(toIdx, 0, fromIdx);

    const savedScroll = this.editor.scrollTop;
    this.editor.value = newOrder.map(i =>
      lines.slice(blocks[i].line, blocks[i].end).join('\n')
    ).join('\n\n');
    this.editor.scrollTop = savedScroll;

    const newLines = this.editor.value.split('\n');
    const newBlocks = this.getSceneBlocks(newLines);
    const acts = this.getActs();
    const rebuilt = {};
    newOrder.forEach((oldIdx, newIdx) => {
      const act = blockToAct[oldIdx];
      if (act) {
        if (!rebuilt[act]) rebuilt[act] = [];
        rebuilt[act].push(newBlocks[newIdx].line);
      }
    });
    for (const aname of Object.keys(acts)) { if (!rebuilt[aname]) rebuilt[aname] = []; }
    this.saveActs(rebuilt);
    this.updateScenes(this.editor.value);
  },

  /* ── Beat drag reorder ── */
  initBeatDragReorder() {
    const list = document.getElementById('beat-list');
    list.addEventListener('dragstart', e => {
      const item = e.target.closest('.beat-item');
      if (!item) return;
      e.dataTransfer.setData('text/plain', item.dataset.idx);
      item.classList.add('drag-source');
    });
    list.addEventListener('dragend', e => {
      const item = e.target.closest('.beat-item');
      if (item) item.classList.remove('drag-source');
      list.querySelectorAll('.beat-item').forEach(el => el.classList.remove('drag-over'));
    });
    list.addEventListener('dragenter', e => {
      const item = e.target.closest('.beat-item');
      if (!item) return;
      list.querySelectorAll('.beat-item').forEach(el => el.classList.remove('drag-over'));
      item.classList.add('drag-over');
    });
    list.addEventListener('dragleave', e => {
      const item = e.target.closest('.beat-item');
      if (item) item.classList.remove('drag-over');
    });
    list.addEventListener('dragover', e => { e.preventDefault(); });
    list.addEventListener('drop', e => {
      e.preventDefault();
      list.querySelectorAll('.beat-item').forEach(el => el.classList.remove('drag-over', 'drag-source'));
      const from = parseInt(e.dataTransfer.getData('text/plain'));
      const target = e.target.closest('.beat-item');
      if (!target) return;
      const to = parseInt(target.dataset.idx);
      if (!isNaN(from) && !isNaN(to) && from !== to) {
        const [beat] = app.beats.splice(from, 1);
        app.beats.splice(to, 0, beat);
        app.saveBeats();
        app.renderBeats();
      }
    });
  },

  /* ── Dark mode auto ── */
  initDarkMode() {
    const saved = localStorage.getItem('fw_dark');
    if (saved !== null) { this.darkMode = saved === 'true'; }
    else { this.darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches; }
    document.body.classList.toggle('dark', this.darkMode);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (localStorage.getItem('fw_dark') === null) {
        this.darkMode = e.matches;
        document.body.classList.toggle('dark', this.darkMode);
      }
    });
  },

  updateStats(text) {
    const w = text.split(/\s+/).filter(x => x).length;
    const c = text.length;
    const s = (text.match(/^(INT|EXT|EST|I\/E)[.\s]/gmi) || []).length;
    const p = Math.max(1, Math.round(c / 1500));
    const lines = text.split('\n').length;
    const pages = Math.max(1, Math.round(lines / 55));
    const dur = Math.max(1, Math.round(c / 1500));
    document.getElementById('stat-cenas').textContent = _('stat_cenas', s);
    document.getElementById('stat-palavras').textContent = _('stat_palavras', w);
    document.getElementById('stat-chars').textContent = _('stat_chars', c);
    document.getElementById('stat-pagina').textContent = _('stat_pagina', pages);
    document.getElementById('stat-duration').textContent = _('stat_duracao', dur);
    this.updateGoalDisplay();
  },

  processHighlights(html) {
    const hlColors = {'!':'#fff3b0','*':'#c8e6c9','?':'#ffcdd2'};
    return html.replace(/\{([!*?])([^}]+)\}/g, function(m, t, content) {
      return '<mark style="background:' + (hlColors[t] || '#ff0') + ';padding:0 2px">' + content + '</mark>';
    });
  },

  updatePreview(text) {
    if (this.previewMode === 'editor') return;
    let html;
    try {
      const result = Fountain.parse(text);
      html = (this.titleData ? this.renderTitleHTML(this.titleData) + '<hr>' : '') +
             (result.html.title_page ? result.html.title_page + '<hr>' : '') + result.html.script;
    } catch (e) {
      html = this.simpleRender(text);
    }
    this.preview.innerHTML = this.processHighlights(html);
  },

  simpleRender(text) {
    const lines = text.split('\n');
    let out = '', prev = 'ACTION';
    for (const line of lines) {
      const c = line.trim();
      if (!c) { out += '<br>'; prev = 'BLANK'; continue; }
      if (c.startsWith('!')) { out += '<p>' + esc(c.slice(1).trim()) + '</p>'; prev = 'ACTION'; continue; }
      if (c.startsWith('@')) { out += '<div class="dialogue"><h4>' + esc(c.slice(1).trim()) + '</h4>'; prev = 'CHARACTER'; continue; }
      if (c.startsWith('>') && !c.endsWith('<')) { out += '<h2>' + esc(c.slice(1).trim()) + '</h2>'; prev = 'TRANSITION'; continue; }
      if (c.startsWith('.')) { out += '<h3>' + esc(c.slice(1).trim()) + '</h3>'; prev = 'SCENE'; continue; }
      if (/^(INT|EXT|EST|I\/E)[.\s]/i.test(c)) { out += '<h3>' + esc(c) + '</h3>'; prev = 'SCENE'; continue; }
      if (/^[A-ZÀ-Ú][A-ZÀ-Ú\s]{1,20}(TO|PARA):$/.test(c)) { out += '<h2>' + esc(c) + '</h2>'; prev = 'TRANSITION'; continue; }
      if (/^[A-ZÀ-Ú][A-ZÀ-Ú0-9\s\(\)\.\-']+$/.test(c) && !/^(INT|EXT|EST|I\/E)[.\s]/i.test(c)) {
        out += '<div class="dialogue"><h4>' + esc(c) + '</h4>'; prev = 'CHARACTER'; continue;
      }
      if (/^\s*\(.*\)\s*$/.test(c)) { out += '<p class="parenthetical">' + esc(c) + '</p>'; prev = 'PARENTHETICAL'; continue; }
      if (prev === 'CHARACTER' || prev === 'PARENTHETICAL' || prev === 'DIALOGUE') {
        out += '<p>' + esc(c) + '</p>'; prev = 'DIALOGUE'; continue;
      }
      out += '<p>' + esc(c) + '</p>'; prev = 'ACTION';
    }
    if (prev === 'DIALOGUE' || prev === 'CHARACTER' || prev === 'PARENTHETICAL') out += '</div>';
    return out;
  },

  renderTitleHTML(data) {
    if (!data) return '';
    const fields = [['title','Title:'],['credit','Credit:'],['author','Author:'],['source','Source:'],['draft_date','Draft date:'],['contact','Contact:']];
    let h = '<div style="text-align:center;margin-bottom:3em">';
    fields.forEach(([k, label]) => {
      const v = data[k];
      if (!v) return;
      label = label.replace(':', '');
      v.split('\n').forEach(line => { h += '<p style="text-align:center;margin:0.1em 0">' + esc(line) + '</p>'; });
    });
    return h + '</div>';
  },

  togglePreview() {
    const modes = ['editor', 'split', 'preview'];
    const idx = modes.indexOf(this.previewMode);
    this.previewMode = modes[(idx + 1) % modes.length];
    const editorWrap = document.getElementById('textarea-wrap');
    const previewWrap = document.getElementById('preview-wrap');
    const center = document.getElementById('pane-center');

    if (this.previewMode === 'editor') {
      editorWrap.style.display = 'block';
      previewWrap.style.display = 'none';
      center.style.flexDirection = 'column';
      editorWrap.style.flex = '1';
    } else if (this.previewMode === 'preview') {
      editorWrap.style.display = 'none';
      previewWrap.style.display = 'block';
      center.style.flexDirection = 'column';
      previewWrap.style.flex = '1';
    } else {
      editorWrap.style.display = 'block';
      previewWrap.style.display = 'block';
      center.style.flexDirection = 'row';
      editorWrap.style.flex = '1';
      previewWrap.style.flex = '1';
      previewWrap.style.overflow = 'auto';
      this.updatePreview(this.editor.value);
    }
  },

  /* ── Characters & Locations ── */
  renderCharsLocs(text) {
    const lines = text.split('\n');
    const chars = {}; const locs = new Set(); let prev = 'ACTION';
    lines.forEach(line => {
      const t = guessType(line, prev);
      if (t === 'CHARACTER') { const n = line.trim().toUpperCase(); chars[n] = (chars[n] || 0) + 1; }
      if (t === 'SCENE') {
        const m = line.trim().match(/^(INT|EXT|EST|I\/E)[.\s]+(.+?)(\s*[-–—].*)?$/i);
        if (m && m[2].trim()) locs.add(m[2].trim().toUpperCase());
      }
      if (t !== 'BLANK') prev = t;
    });
    const charDiv = document.getElementById('char-list');
    charDiv.innerHTML = '';
    const entries = Object.entries(chars).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0) { charDiv.innerHTML = '<div class="list-empty">' + _('empty_chars') + '</div>'; }
    else entries.forEach(([n, c]) => {
      charDiv.innerHTML += '<div class="char-item" style="cursor:pointer" onclick="app.openChar(\'' + esc(n) + '\')"><span class="char-name">' + esc(n) + '</span><span class="char-count">' + c + ' f</span></div>';
    });
    const locDiv = document.getElementById('loc-list');
    locDiv.innerHTML = '';
    const locArr = [...locs].sort();
    if (locArr.length === 0) { locDiv.innerHTML = '<div class="list-empty">' + _('empty_locs') + '</div>'; }
    else locArr.forEach(l => {
      const isInt = !text.split('\n').some(line => line.trim().toUpperCase().startsWith('EXT. ' + l));
      locDiv.innerHTML += '<div class="loc-item"><span class="loc-tag">' + (isInt ? 'INT' : 'EXT') + '</span><span>' + esc(l) + '</span></div>';
    });
  },

  /* ── Beats ── */
  openBeatModal(index) {
    this.syncBeatsFromScenes(this.editor.value);
    this._editingBeatIdx = index;
    const b = index >= 0 && index < this.beats.length ? this.beats[index] : null;
    document.getElementById('beat-title').value = b ? b.title : '';
    document.getElementById('beat-act').value = b ? (b.act || 'Ato 1') : 'Ato 1';
    document.getElementById('beat-plot').value = b && b.plotline ? b.plotline : 'Principal';
    document.getElementById('beat-modal').style.display = 'flex';
    document.getElementById('beat-title').focus();
  },

  saveBeatModal() {
    // Ensure beats are up to date before editing
    this.syncBeatsFromScenes(this.editor.value);
    const title = document.getElementById('beat-title').value.trim();
    const act = document.getElementById('beat-act').value.trim() || 'Ato 1';
    const plot = document.getElementById('beat-plot').value;
    if (!title) return;
    const idx = this._editingBeatIdx;
    if (idx >= 0 && idx < this.beats.length) {
      this.beats[idx].title = title;
      this.beats[idx].act = act;
      this.beats[idx].plotline = plot;
      // Find matching scene line for this beat's title
      const scenes = this.parseScenes(this.editor.value);
      for (const s of scenes) {
        if (s.label === title || s.label.startsWith(title) || title.startsWith(s.label)) {
          this.beats[idx].scene_ref = title + '|L' + s.line;
          break;
        }
      }
    } else {
      this.beats.push({ title, act, plotline: plot, order: this.beats.length });
    }
    // Debug: show matching result in status bar
    let dbg = '';
    this.parseScenes(this.editor.value).forEach(s => {
      const b = this._findBeatForScene(s.label, s.line);
      dbg += s.label.slice(0, 12) + ':' + (b ? 'idx=' + this.beats.indexOf(b) + ' act=' + b.act + ' sr=' + b.scene_ref : '?') + ' ';
    });
    const el = document.getElementById('dbg');
    if (el) el.textContent = dbg;
    // Ensure act exists in fw_acts
    const fwActs = this.getActs();
    if (!fwActs[act]) { fwActs[act] = []; this.saveActs(fwActs); }
    this.saveBeats(); this.renderBeats(); this.renderTimeline();
    this.updateScenes(this.editor.value);
    this.closeBeatModal();
  },

  closeBeatModal() {
    document.getElementById('beat-modal').style.display = 'none';
    this._editingBeatIdx = -1;
  },

  addBeat() { this.openBeatModal(-1); },
  editBeat(i) { this.openBeatModal(i); },
  deleteBeat(i) { this.beats.splice(i, 1); this.saveBeats(); this.renderBeats(); this.renderTimeline(); this.updateScenes(this.editor.value); },
  insertBeat(i) {
    const b = this.beats[i];
    if (!b) return;
    const ta = this.editor;
    const pos = ta.selectionStart;
    ta.value = ta.value.slice(0, pos) + (b.title || '') + '\n\n' + ta.value.slice(pos);
    this.update(); ta.focus();
  },
  saveBeats() { localStorage.setItem('fw_beats', JSON.stringify(this.beats)); },

  /* ── Auto-sync beats from scenes ── */
  syncBeatsFromScenes(text) {
    const lines = text.split('\n');
    const sceneData = [];
    let prev = 'ACTION';
    lines.forEach((line, i) => {
      const t = guessType(line, prev);
      if (t === 'SCENE') {
        const clean = line.trim().replace(/^\./, '');
        sceneData.push({ heading: clean, line: i });
      }
      if (t !== 'BLANK') prev = t;
    });
    let changed = false;
    // Remove auto beats with stale scene_ref (old format or deleted scenes)
    const currentRefs = new Set(sceneData.map(d => d.heading + '|L' + d.line));
    const oldLen = this.beats.length;
    this.beats = this.beats.filter(b => !b.auto || (b.scene_ref && currentRefs.has(b.scene_ref)));
    if (this.beats.length !== oldLen) changed = true;
    const remappedRefs = new Set();
    // Count heading occurrences to only remap stale for unique headings
    const headingCount = {};
    sceneData.forEach(d => { headingCount[d.heading] = (headingCount[d.heading] || 0) + 1; });
    sceneData.forEach(({ heading, line }) => {
      const uniqueRef = heading + '|L' + line;
      const existing = this.beats.find(b => b.scene_ref === uniqueRef);
      if (!existing) {
        // Only remap stale for unique headings (duplicates need their own beat)
        const isUnique = headingCount[heading] === 1;
        if (isUnique) {
          const stale = this.beats.find(b =>
            b.scene_ref && b.scene_ref.includes('|L') && b.title === heading && !remappedRefs.has(b.scene_ref)
          );
          if (stale) {
            remappedRefs.add(stale.scene_ref);
            stale.scene_ref = uniqueRef;
            changed = true;
            return;
          }
        }
        this.beats.push({ title: heading, act: 'Ato 1', desc: '', scene_ref: uniqueRef, order: this.beats.length, auto: true, plotline: 'Principal' });
        changed = true;
      }
    });
    // Ensure default act exists in fw_acts for auto-created beats
    const fwActs = this.getActs();
    if (!fwActs['Ato 1']) { fwActs['Ato 1'] = []; this.saveActs(fwActs); }
    if (changed) { this.saveBeats(); this.renderBeats(); this.renderTimeline(); this.updateScenes(this.editor.value); }
  },

  /* ── Timeline grid (atos × tramas) ── */
  toggleTimeline() {
    this.timelineVisible = !this.timelineVisible;
    this.renderTimeline();
  },

  renderTimeline() {
    const el = document.getElementById('timeline-bar');
    if (!el) return;
    if (!this.timelineVisible) { el.style.display = 'none'; return; }
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.innerHTML = '';

    const text = this.editor.value;
    const scenes = this.parseScenes(text);

    const acts = this.getActs();
    const actNames = Object.keys(acts).sort((a, b) => {
      const na = parseInt(a.match(/\d+/)) || 0;
      const nb = parseInt(b.match(/\d+/)) || 0;
      return na - nb;
    });
    const plotlines = ['Principal', 'A', 'B'];
    const actColors = {'Ato 1':'#569cd6','Ato 2':'#4ec9b0','Ato 3':'#dcdcaa','Ato 4':'#c586c0','Ato 5':'#d16969'};
    const plotColors = {'Principal':'#569cd6','A':'#ce9178','B':'#4ec9b0'};

    // Map scene → plotline (from matching beats)
    const scenePlot = {};
    scenes.forEach(s => {
      const beat = this._findBeatForScene(s.label, s.line);
      let pl = beat ? beat.plotline || 'Principal' : 'Principal';
      if (pl === 'C' || pl === 'D') pl = 'B';
      scenePlot[s.line] = pl;
    });

    // Map scene → act (from beats)
    const sceneAct = {};
    scenes.forEach(s => {
      const beat = this._findBeatForScene(s.label, s.line);
      sceneAct[s.line] = beat ? (beat.act || 'Ato 1') : null;
    });

    // Orphan beats: beats that don't match any scene
    const matchedLabels = new Set(scenes.map(s => s.label));
    const orphanBeats = this.beats.filter(b => !matchedLabels.has(b.title) && !matchedLabels.has(b.scene_ref));

    const numCols = actNames.length;
    if (numCols === 0 && orphanBeats.length === 0) {
      el.innerHTML = '<span style="padding:8px;color:var(--fg-sec);font-size:10pt">' + _('empty_timeline') + '</span>';
      return;
    }
    if (numCols === 0) {
      el.innerHTML = '<span style="padding:8px;color:var(--fg-sec);font-size:10pt">Sem atos para exibir</span>';
      return;
    }

    // Header row
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:grid;grid-template-columns:70px repeat(' + numCols + ',1fr);gap:2px;padding:2px 4px';
    const corner = document.createElement('div');
    corner.style.cssText = 'padding:3px;font-size:8pt;color:var(--fg-sec);font-weight:bold';
    corner.textContent = 'Trama\\Ato';
    headerRow.appendChild(corner);
    actNames.forEach(act => {
      const h = document.createElement('div');
      h.style.cssText = 'padding:3px;font-weight:bold;font-size:9pt;text-align:center;color:#fff;background:' + (actColors[act] || '#888') + ';border-radius:3px';
      h.textContent = act;
      headerRow.appendChild(h);
    });
    el.appendChild(headerRow);

    // Data rows
    plotlines.forEach(pl => {
      const row = document.createElement('div');
      row.style.cssText = 'display:grid;grid-template-columns:70px repeat(' + numCols + ',1fr);gap:2px;padding:2px 4px';
      const lbl = document.createElement('div');
      lbl.style.cssText = 'padding:3px;font-size:9pt;color:' + (plotColors[pl] || '#888') + ';font-weight:bold;display:flex;align-items:center';
      lbl.textContent = pl;
      row.appendChild(lbl);
      actNames.forEach(act => {
        const cell = document.createElement('div');
        cell.style.cssText = 'min-height:28px;background:var(--surface2);border-radius:3px;padding:3px;display:flex;flex-direction:column;gap:2px';
        // Scenes that match this act + plotline
        const cellScenes = scenes.filter(s => sceneAct[s.line] === act && scenePlot[s.line] === pl);
        cellScenes.forEach(s => {
          const sc = document.createElement('div');
          sc.style.cssText = 'padding:2px 4px;font-size:8pt;cursor:pointer;border-radius:2px;background:var(--surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
          sc.textContent = s.label;
          sc.title = s.label;
          sc.addEventListener('click', () => this.goToScene(s.line));
          cell.appendChild(sc);
        });
        // Orphan beats that match this act + plotline
        const cellBeats = orphanBeats.filter(b => {
          const ba = b.act || 'Ato 1';
          let bp = b.plotline || 'Principal';
          if (bp === 'C' || bp === 'D') bp = 'B';
          return ba === act && bp === pl;
        });
        cellBeats.forEach(b => {
          const sc = document.createElement('div');
          sc.style.cssText = 'padding:2px 4px;font-size:8pt;cursor:pointer;border-radius:2px;background:var(--surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;border:1px dashed ' + (plotColors[pl] || '#888');
          sc.textContent = (b.title || '?') + ' ⟡';
          sc.title = (b.title || '?') + ' (beat sem cena)';
          sc.addEventListener('click', () => document.querySelector('#right-tabs .tab[data-tab="beats"]').click());
          cell.appendChild(sc);
        });
        row.appendChild(cell);
      });
      el.appendChild(row);
    });
  },
  renderBeats() {
    const el2 = document.getElementById('beat-count');
    if (el2) el2.textContent = this.beats.length;
    const list = document.getElementById('beat-list');
    list.innerHTML = '';
    if (this.beats.length === 0) { list.innerHTML = '<div class="list-empty">' + _('empty_beats') + '</div>'; return; }
    const plotColors = {'Principal':'#569cd6','A':'#ce9178','B':'#4ec9b0'};
    this.beats.forEach((b, i) => {
      const div = document.createElement('div');
      div.className = 'beat-item';
      div.style.cssText = 'flex-direction:column;padding:6px 8px';
      div.draggable = true;
      div.dataset.idx = i;
      const pl = (b.plotline === 'C' || b.plotline === 'D') ? 'B' : (b.plotline || 'Principal');
      const color = plotColors[pl] || '#888';
      // Line 1: title
      const titleRow = document.createElement('div');
      titleRow.style.cssText = 'display:flex;align-items:center;gap:6px';
      titleRow.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + color + ';flex-shrink:0"></span>' +
        '<span style="font-size:10pt">' + (i + 1) + '. ' + esc(b.title || '?') + '</span>';
      div.appendChild(titleRow);
      // Line 2: plotline + action buttons
      const actionRow = document.createElement('div');
      actionRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:3px;padding-left:14px';
      actionRow.innerHTML =
        '<span style="font-size:8pt;color:' + color + '">' + esc(pl) + '</span>' +
        '<span style="flex:1"></span>' +
        '<span style="cursor:pointer;font-size:11pt" onclick="app.editBeat(' + i + ')">✎</span>' +
        '<span style="cursor:pointer;font-size:11pt" onclick="app.insertBeat(' + i + ')">↗</span>' +
        '<span style="color:#c00;cursor:pointer;font-size:11pt" onclick="app.deleteBeat(' + i + ')">✕</span>';
      div.appendChild(actionRow);
      list.appendChild(div);
    });
  },

  /* ── Title page ── */
  openTitle() {
    if (this.titleData) {
      ['title', 'credit', 'author', 'source', 'draft_date'].forEach(k => {
        document.getElementById('tp-' + k.replace('_', '-')).value = this.titleData[k] || '';
      });
      document.getElementById('tp-contact').value = this.titleData.contact || '';
    }
    document.getElementById('title-modal').style.display = 'flex';
  },
  saveTitle() {
    this.titleData = {};
    ['title', 'credit', 'author', 'source', 'draft_date'].forEach(k => {
      const el = document.getElementById('tp-' + k.replace('_', '-'));
      if (el && el.value.trim()) this.titleData[k] = el.value.trim();
    });
    const contact = document.getElementById('tp-contact');
    if (contact && contact.value.trim()) this.titleData.contact = contact.value.trim();
    localStorage.setItem('fw_title', JSON.stringify(this.titleData));
    this.closeTitle();
  },
  clearTitle() { this.titleData = null; localStorage.removeItem('fw_title'); this.closeTitle(); },
  closeTitle() { document.getElementById('title-modal').style.display = 'none'; },

  /* ── Find / Replace ── */
  openFind() {
    document.getElementById('find-modal').style.display = 'flex';
    document.getElementById('find-input').value = '';
    document.getElementById('find-input').focus();
    this.findDo();
  },
  closeFind() { document.getElementById('find-modal').style.display = 'none'; this.editor.focus(); },
  findDo() {
    const term = document.getElementById('find-input').value;
    this.findTerm = term;
    if (!term) { this.findMatches = []; this.findIdx = -1; document.getElementById('find-count').textContent = ''; return; }
    const cs = document.getElementById('find-case').checked;
    const text = this.editor.value;
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), cs ? 'g' : 'gi');
    this.findMatches = []; let m;
    while ((m = re.exec(text)) !== null) this.findMatches.push(m.index);
    this.findIdx = this.findMatches.length > 0 ? 0 : -1;
    document.getElementById('find-count').textContent = this.findMatches.length > 0 ? (this.findIdx + 1) + ' / ' + this.findMatches.length : _('find_noresults');
    if (this.findIdx >= 0) this.findGo(this.findIdx);
  },
  findGo(idx) {
    if (idx < 0 || idx >= this.findMatches.length) return;
    const pos = this.findMatches[idx];
    const ta = this.editor;
    ta.focus(); ta.selectionStart = pos;
    const termLen = document.getElementById('find-input').value.length;
    ta.selectionEnd = pos + termLen;
    ta.scrollTop = Math.max(0, (ta.value.slice(0, pos).split('\n').length) * 18 - 200);
    this.findIdx = idx;
    document.getElementById('find-count').textContent = (idx + 1) + ' / ' + this.findMatches.length;
  },
  findNext() {
    if (this.findMatches.length === 0) this.findDo();
    if (this.findMatches.length === 0) return;
    this.findIdx = (this.findIdx + 1) % this.findMatches.length;
    this.findGo(this.findIdx);
  },
  findPrev() {
    if (this.findMatches.length === 0) this.findDo();
    if (this.findMatches.length === 0) return;
    this.findIdx = (this.findIdx - 1 + this.findMatches.length) % this.findMatches.length;
    this.findGo(this.findIdx);
  },
  findReplace() {
    if (this.findIdx < 0 || this.findIdx >= this.findMatches.length) return;
    const ta = this.editor;
    const pos = this.findMatches[this.findIdx];
    const term = document.getElementById('find-input').value;
    const repl = document.getElementById('replace-input').value;
    const len = term.length;
    ta.value = ta.value.slice(0, pos) + repl + ta.value.slice(pos + len);
    this.findDo();
    this.findGo(this.findIdx);
  },
  findReplaceAll() {
    const term = document.getElementById('find-input').value;
    if (!term) return;
    const cs = document.getElementById('find-case').checked;
    const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), cs ? 'g' : 'gi');
    this.editor.value = this.editor.value.replace(re, document.getElementById('replace-input').value);
    this.update();
    this.findDo();
  },

  /* ── File I/O ── */
  newFile() {
    if (this.editor.value.trim()) {
      if (confirm(_('save_before_new'))) { this.saveProject(); }
      else if (!confirm(_('save_confirm'))) return;
    } else {
      if (!confirm(_('save_confirm'))) return;
    }
    this.editor.value = ''; this.fileName = null; this.beats = []; this.titleData = null;
    this.projectName = ''; localStorage.setItem('fw_beats', '[]');
    localStorage.removeItem('fw_title'); localStorage.removeItem('fw_char_data');
    localStorage.removeItem('fw_project_name'); localStorage.removeItem('fw_scene_colors');
    localStorage.removeItem('fw_acts'); localStorage.removeItem('fw_line_marks');
    this.renderBeats(); this.update(); this.updateProjectNameDisplay();
  },
  openFile() { document.getElementById('file-input').click(); },
  saveFile() {
    const blob = new Blob([this.editor.value], { type: 'text/plain;charset=utf-8' });
    const a = document.getElementById('download-link');
    a.href = URL.createObjectURL(blob); a.download = this.fileName || 'roteiro.fountain'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    this.isModified = false;
    this.updateIndicator();
  },

  saveProject() {
    const data = {
      name: this.projectName || 'roteiro',
      draft: this.editor.value,
      beats: this.beats,
      titleData: this.titleData,
      charData: JSON.parse(localStorage.getItem('fw_char_data') || '{}'),
      sceneColors: this.sceneColors,
      acts: this.getActs(),
      darkMode: this.darkMode,
      wordGoal: this.wordGoal,
      fontSize: this.fontSize,
      soundOn: this.soundOn,
      updated: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.getElementById('download-link');
    a.href = URL.createObjectURL(blob); a.download = (this.projectName || 'roteiro') + '.fountain.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  },

  openProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          this.editor.value = data.draft || '';
          this.beats = data.beats || [];
          this.titleData = data.titleData || null;
          this.projectName = data.name || '';
          this.sceneColors = data.sceneColors || {};
          if (data.darkMode !== undefined) { this.darkMode = data.darkMode; document.body.classList.toggle('dark', this.darkMode); }
          if (data.charData) localStorage.setItem('fw_char_data', JSON.stringify(data.charData));
          if (data.wordGoal !== undefined) { this.wordGoal = data.wordGoal; localStorage.setItem('fw_goal', String(data.wordGoal)); }
          if (data.fontSize !== undefined) { this.fontSize = data.fontSize; this.applyFontSize(); }
          if (data.soundOn !== undefined) { this.soundOn = data.soundOn; localStorage.setItem('fw_sound', data.soundOn ? 'true' : 'false'); }
          if (data.acts) localStorage.setItem('fw_acts', JSON.stringify(data.acts));
          localStorage.setItem('fw_title', JSON.stringify(this.titleData));
          localStorage.setItem('fw_beats', JSON.stringify(this.beats));
          localStorage.setItem('fw_project_name', this.projectName);
          localStorage.setItem('fw_scene_colors', JSON.stringify(this.sceneColors));
          this.fileName = file.name.replace(/\.fountain\.json$/, '.fountain');
          this.saveBeats();
          this.updateProjectNameDisplay();
          this.update();
          this.syncBeatsFromScenes(this.editor.value);
          this.renderBeats();
        } catch (err) { alert('Erro ao ler projeto: ' + err.message); }
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  },
  exportHTML() {
    const text = this.editor.value;
    let html;
    try { const r = Fountain.parse(text); html = r.html.script; } catch (e) { html = this.simpleRender(text); }
    const title = this.fileName || 'Roteiro';
    const full = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title><style>' +
      'body{font-family:"Courier New",monospace;font-size:12pt;line-height:1.2;max-width:800px;margin:40px auto;padding:60px 80px}' +
      'h3{font-weight:bold;text-transform:uppercase;margin:2.5em 0 0.25em}' +
      'h4{text-transform:uppercase;margin:0 0 0 37%}p{margin:1em 0}' +
      'p.parenthetical{margin-left:31%;margin-right:33%}.dialogue p{margin-left:20%;margin-right:20%}' +
      'h2{text-align:right;text-transform:uppercase;margin:2em 0}' +
      'mark{padding:0 2px}' +
      '</style></head><body>' +
      (this.titleData ? this.renderTitleHTML(this.titleData) + '<hr>' : '') + this.processHighlights(html) + '</body></html>';
    const blob = new Blob([full], { type: 'text/html;charset=utf-8' });
    const a = document.getElementById('download-link');
    a.href = URL.createObjectURL(blob); a.download = (this.fileName || 'roteiro').replace(/\.fountain$/, '') + '.html'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  },
  printPDF() {
    const text = this.editor.value;
    let scriptHtml;
    try { const r = Fountain.parse(text); scriptHtml = r.html.script; } catch (e) { scriptHtml = this.simpleRender(text); }
    const title = this.fileName || 'Roteiro';
    const html = '<!DOCTYPE html><html><head><title>' + title + '</title>' +
      '<style>@media print{@page{margin:0.75in}}body{font-family:"Courier New",monospace;font-size:12pt;line-height:1.2}' +
      'h3{font-weight:bold;text-transform:uppercase;margin:2.5em 0 0.25em}' +
      'h4{text-transform:uppercase;margin:0 0 0 37%}p{margin:1em 0}' +
      'p.parenthetical{margin-left:31%;margin-right:33%}.dialogue p{margin-left:20%;margin-right:20%}' +
      'h2{text-align:right;text-transform:uppercase;margin:2em 0}' +
      '</style></head><body><div id="print-area">' +
      (this.titleData ? this.renderTitleHTML(this.titleData) + '<hr>' : '') + this.processHighlights(scriptHtml) + '</div></body></html>';
    const w = window.open('', '', 'width=800,height=600');
    w.document.write(html); w.document.close(); w.focus();
    w.onafterprint = () => { w.close(); };
    setTimeout(() => { try { w.close(); } catch(e) {} }, 60000);
    w.print();
  },

  /* ── Line Marks ── */
  getCurrentLine() {
    const pos = this.editor.selectionStart;
    return this.editor.value.slice(0, pos).split('\n').length - 1;
  },

  getLineMarks() {
    return JSON.parse(localStorage.getItem('fw_line_marks') || '{}');
  },

  saveLineMarks(marks) {
    localStorage.setItem('fw_line_marks', JSON.stringify(marks));
  },

  markHighlight(type) {
    const line = this.getCurrentLine();
    const marks = this.getLineMarks();
    if (marks[line] === type) {
      delete marks[line];
    } else {
      marks[line] = type;
    }
    this.saveLineMarks(marks);
    this.updateScenes(this.editor.value);
    this.updateMarkButtonStates();
  },

  updateMarkButtonStates() {
    const line = this.getCurrentLine();
    const marks = this.getLineMarks();
    const current = marks[line] || '';
    const buttons = document.querySelectorAll('.hl-btn');
    buttons.forEach(btn => {
      const onclick = btn.getAttribute('onclick');
      if (!onclick) return;
      const type = onclick.match(/markHighlight\('([!*?])'\)/);
      if (type && type[1] === current) {
        btn.style.boxShadow = '0 0 0 2px #000';
        btn.style.outline = '2px solid #000';
      } else {
        btn.style.boxShadow = '';
        btn.style.outline = '';
      }
    });
  },

  /* ── Statistics ── */
  openStats() {
    const text = this.editor.value;
    const lines = text.split('\n');
    const total = lines.length;
    const words = text.split(/\s+/).filter(w => w).length;
    const chars = text.length;

    let typeCount = {}; let prev = 'ACTION';
    lines.forEach(line => {
      const t = guessType(line, prev);
      typeCount[t] = (typeCount[t] || 0) + 1;
      if (t !== 'BLANK' && t !== 'ACTION') prev = t;
    });

    let charSpeech = {}; prev = 'ACTION';
    lines.forEach(line => {
      const t = guessType(line, prev);
      if (t === 'CHARACTER') {
        const name = line.trim().toUpperCase();
        charSpeech[name] = (charSpeech[name] || 0) + 1;
      }
      if (t !== 'BLANK') prev = t;
    });

    const scenes = typeCount['SCENE'] || 0;
    const dialogues = typeCount['DIALOGUE'] || 0;
    const actions = typeCount['ACTION'] || 0;
    const dPct = total > 0 ? Math.round(dialogues / total * 100) : 0;
    const aPct = total > 0 ? Math.round(actions / total * 100) : 0;

    let html = '<div style="font-size:10pt;line-height:1.6">';
    html += '<p><b>Palavras:</b> ' + words + '</p>';
    html += '<p><b>Caracteres:</b> ' + chars + '</p>';
    html += '<p><b>Cenas:</b> ' + scenes + '</p>';
    html += '<p><b>Diálogo:</b> ' + dPct + '% das linhas</p>';
    html += '<p><b>Ação:</b> ' + aPct + '% das linhas</p>';
    html += '<p><b>Personagens:</b> ' + Object.keys(charSpeech).length + '</p>';
    html += '<hr style="border:none;border-top:1px solid var(--border);margin:8px 0">';
    html += '<p><b>Top Personagens (por falas):</b></p>';
    const top = Object.entries(charSpeech).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (top.length === 0) html += '<p style="color:var(--fg-sec)">Nenhum personagem</p>';
    else top.forEach(([name, count]) => {
      html += '<div style="display:flex;gap:8px"><span style="flex:1;font-weight:bold">' + name + '</span><span>' + count + ' falas</span></div>';
    });
    html += '</div>';
    document.getElementById('stats-body').innerHTML = html;
    document.getElementById('stats-modal').style.display = 'flex';
  },

  closeStats() { document.getElementById('stats-modal').style.display = 'none'; },

  openHelp() { document.getElementById('help-modal').style.display = 'flex'; },
  closeHelp() { document.getElementById('help-modal').style.display = 'none'; },

  /* ── Character editing ── */
  openChar(name) {
    const data = JSON.parse(localStorage.getItem('fw_char_data') || '{}');
    const c = data[name] || {};
    document.getElementById('ce-name').value = name;
    document.getElementById('ce-age').value = c.age || '';
    document.getElementById('ce-archetype').value = c.archetype || '';
    document.getElementById('ce-physical').value = c.physical || '';
    document.getElementById('ce-personality').value = c.personality || '';
    document.getElementById('ce-biography').value = c.biography || '';
    document.getElementById('ce-goal').value = c.goal || '';
    document.getElementById('ce-fear').value = c.fear || '';
    document.getElementById('char-modal').style.display = 'flex';
  },

  saveChar() {
    const name = document.getElementById('ce-name').value;
    if (!name) return;
    const data = JSON.parse(localStorage.getItem('fw_char_data') || '{}');
    data[name] = {
      age: document.getElementById('ce-age').value,
      archetype: document.getElementById('ce-archetype').value,
      physical: document.getElementById('ce-physical').value,
      personality: document.getElementById('ce-personality').value,
      biography: document.getElementById('ce-biography').value,
      goal: document.getElementById('ce-goal').value,
      fear: document.getElementById('ce-fear').value,
    };
    localStorage.setItem('fw_char_data', JSON.stringify(data));
    this.closeChar();
  },

  deleteChar() {
    const name = document.getElementById('ce-name').value;
    if (!name) return;
    const data = JSON.parse(localStorage.getItem('fw_char_data') || '{}');
    delete data[name];
    localStorage.setItem('fw_char_data', JSON.stringify(data));
    this.closeChar();
  },

  closeChar() { document.getElementById('char-modal').style.display = 'none'; },

  /* ── Word Goal ── */
  openGoal() {
    document.getElementById('goal-input').value = this.wordGoal || '';
    document.getElementById('goal-modal').style.display = 'flex';
  },
  saveGoal() {
    const val = parseInt(document.getElementById('goal-input').value);
    if (val > 0) { this.wordGoal = val; localStorage.setItem('fw_goal', String(val)); }
    this.closeGoal();
    this.updateGoalDisplay();
  },
  clearGoal() { this.wordGoal = 0; localStorage.removeItem('fw_goal'); this.closeGoal(); this.updateGoalDisplay(); },
  closeGoal() { document.getElementById('goal-modal').style.display = 'none'; },
  updateGoalDisplay() {
    const el = document.getElementById('stat-goal');
    if (!el) return;
    if (!this.wordGoal) { el.style.display = 'none'; return; }
    const words = this.editor.value.split(/\s+/).filter(w => w).length;
    const pct = Math.min(100, Math.round(words / this.wordGoal * 100));
    el.style.display = 'inline';
    el.innerHTML = '🎯 ' + pct + '% (' + words + '/' + this.wordGoal + ')';
  },

  /* ── Productivity ── */
  trackProductivity() {
    const today = new Date().toISOString().slice(0, 10);
    const words = this.editor.value.split(/\s+/).filter(w => w).length;
    const data = JSON.parse(localStorage.getItem('fw_productivity') || '{}');
    data[today] = words;
    // Keep last 30 days
    const keys = Object.keys(data).sort();
    if (keys.length > 30) { delete data[keys[0]]; }
    localStorage.setItem('fw_productivity', JSON.stringify(data));
  },

  renderProductivity() {
    const el = document.getElementById('productivity-chart');
    if (!el) return;
    const data = JSON.parse(localStorage.getItem('fw_productivity') || '{}');
    const keys = Object.keys(data).sort().slice(-7);
    if (keys.length === 0) { el.innerHTML = 'Sem dados'; return; }
    const max = Math.max(1, ...keys.map(k => data[k]));
    let html = '<div style="display:flex;gap:3px;align-items:end;height:60px;padding:4px">';
    keys.forEach(k => {
      const h = Math.round((data[k] / max) * 50);
      const short = k.slice(5);
      html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center">';
      html += '<div style="width:100%;background:var(--accent);height:' + h + 'px;border-radius:2px 2px 0 0;min-height:2px"></div>';
      html += '<span style="font-size:6pt;color:var(--fg-sec)">' + short + '</span></div>';
    });
    html += '</div>';
    el.innerHTML = html;
  },

  /* ── Theme + Focus ── */
  toggleTheme() { this.darkMode = !this.darkMode; document.body.classList.toggle('dark', this.darkMode); localStorage.setItem('fw_dark', this.darkMode ? 'true' : 'false'); },

  /* ── Language ── */
  toggleLang() {
    const newLang = lang === 'pt-BR' ? 'en' : 'pt-BR';
    localStorage.setItem('fw_lang', newLang);
    location.reload();
  },

  translateUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      let text = _(key);
      const match = el.textContent.match(/^([\u{1F000}-\u{1FFFF}]|[\u2600-\u27BF]|[\u{2700}-\u{27BF}]|[⬇📋🌗▶⏹🖨📑✓▶⏸🍅⏰🔊🔇🖍📊🎯💾📂📄👁🔍🎬⏱])/u);
      if (match) text = match[1] + ' ' + text;
      if (el.id !== 'menu-drawer') el.textContent = text;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = _(el.dataset.i18nPlaceholder);
    });
    document.getElementById('lang-btn').textContent = lang === 'pt-BR' ? 'PT' : 'EN';
    document.title = 'Fountain Writer';
    this.populateMenu();
  },

  /* ── Mobile menu ── */
  toggleMenu() {
    const overlay = document.getElementById('menu-overlay');
    overlay.classList.toggle('open');
    document.body.classList.toggle('menu-open');
  },

  populateMenu() {
    const drawer = document.getElementById('menu-drawer');
    if (!drawer) return;
    // Clone toolbar buttons (skip separators, spacers, timer)
    const html = [];
    document.querySelectorAll('#toolbar > button:not(#menu-btn)').forEach(btn => {
      if (btn.style.display === 'none') return;
      const onclick = btn.getAttribute('onclick');
      const text = btn.textContent;
      if (onclick && text) {
        html.push(`<button onclick="${onclick};app.toggleMenu()">${text}</button>`);
      }
    });
    drawer.innerHTML = html.join('');
  },
  toggleFocus() {
    this.focusOn = !this.focusOn;
    document.body.classList.toggle('focus-mode', this.focusOn);
    if (this.focusOn) { this.editor.focus(); }
  },

  /* ── Project name ── */
  updateProjectNameDisplay() {
    const el = document.getElementById('project-name');
    if (!el) return;
    if (this.projectName) el.textContent = '📁 ' + this.projectName;
    else el.textContent = '📁 Sem título';
  },

  editProjectName() {
    const name = prompt('Nome do projeto:', this.projectName || '');
    if (name === null) return;
    this.projectName = name.trim();
    localStorage.setItem('fw_project_name', this.projectName);
    this.updateProjectNameDisplay();
    this.updateIndicator();
  },

  /* ── Selection word count ── */
  setupSelectionCount() {
    this.editor.addEventListener('mouseup', () => this.updateSelectionCount());
    this.editor.addEventListener('keyup', () => this.updateSelectionCount());
  },

  updateSelectionCount() {
    const el = document.getElementById('stat-selection');
    if (!el) return;
    const start = this.editor.selectionStart;
    const end = this.editor.selectionEnd;
    if (start === end) { el.style.display = 'none'; return; }
    const sel = this.editor.value.slice(start, end);
    const words = sel.split(/\s+/).filter(w => w).length;
    el.style.display = 'inline';
    el.textContent = _('stat_selecao') + ': ' + words + ' ' + _('stat_palavras').toLowerCase().replace('{n}', '').replace(':', '').trim();
  },

  /* ── Zoom ── */
  applyFontSize() {
    this.editor.style.fontSize = this.fontSize + 'pt';
    localStorage.setItem('fw_font_size', String(this.fontSize));
  },

  zoomIn() { this.fontSize = Math.min(24, this.fontSize + 1); this.applyFontSize(); },
  zoomOut() { this.fontSize = Math.max(8, this.fontSize - 1); this.applyFontSize(); },
  zoomReset() { this.fontSize = 12; this.applyFontSize(); },

  /* ── Sound effects ── */
  toggleSound() {
    this.soundOn = !this.soundOn;
    localStorage.setItem('fw_sound', this.soundOn ? 'true' : 'false');
    const btn = document.getElementById('sound-btn');
    if (btn) btn.textContent = this.soundOn ? '🔊 ' + _('tb_sound') : '🔇 ' + _('tb_sound');
  },

  playTick() {
    if (!this.soundOn) return;
    try {
      if (!this._audioContext) this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = this._audioContext;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.05;
      osc.start();
      osc.stop(ctx.currentTime + 0.015);
    } catch (e) {}
  },

  /* ── Keyboard ── */
  handleKey(e) {
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); this.saveProject(); }
    if (e.ctrlKey && e.key === 'o') { e.preventDefault(); this.openProject(); }
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); this.newFile(); }
    if (e.ctrlKey && (e.key === 'h' || e.key === 'f')) { e.preventDefault(); this.openFind(); }
    if (e.key === 'F11') { e.preventDefault(); this.toggleFocus(); }
    if (e.ctrlKey && e.key === 'b') { e.preventDefault(); this.wrapSelection('**', '**'); }
    if (e.ctrlKey && e.key === 'i') { e.preventDefault(); this.wrapSelection('*', '*'); }
    if (e.ctrlKey && e.key === 'u') { e.preventDefault(); this.wrapSelection('_', '_'); }
    if (e.ctrlKey && e.key === '1') { e.preventDefault(); this.markHighlight('!'); }
    if (e.ctrlKey && e.key === '2') { e.preventDefault(); this.markHighlight('*'); }
    if (e.ctrlKey && e.key === '3') { e.preventDefault(); this.markHighlight('?'); }
    if (e.ctrlKey && e.key === '=') { e.preventDefault(); this.zoomIn(); }
    if (e.ctrlKey && e.key === '-') { e.preventDefault(); this.zoomOut(); }
    if (e.ctrlKey && e.key === '0') { e.preventDefault(); this.zoomReset(); }
    // Enter → sync beats immediately (scene heading complete)
    if (e.key === 'Enter') {
      this.syncBeatsFromScenes(this.editor.value);
    }
  },

  wrapSelection(before, after) {
    const ta = this.editor;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) return;
    const selected = ta.value.slice(start, end);
    ta.value = ta.value.slice(0, start) + before + selected + after + ta.value.slice(end);
    ta.focus();
    ta.selectionStart = start;
    ta.selectionEnd = end + before.length + after.length;
    this.update();
  },

  /* ── Timer ── */
  toggleTimerMode() {
    this.timerMode = this.timerMode === 'writing' ? 'pomodoro' : 'writing';
    document.getElementById('timer-mode-btn').textContent = this.timerMode === 'writing' ? '⏱ ' + _('tb_timer') : '🍅 Pomodoro';
    this.timerSec = 0;
    this.pomodoroSec = 25 * 60;
    this.timerOn = false;
    document.getElementById('timer-start-btn').textContent = '▶';
    this.displayTimer();
  },

  toggleTimer() {
    this.timerOn = !this.timerOn;
    document.getElementById('timer-start-btn').textContent = this.timerOn ? '⏸' : '▶';
    if (this.timerOn) this.tick();
  },

  resetTimer() {
    this.timerOn = false;
    this.timerSec = 0;
    this.pomodoroSec = 25 * 60;
    document.getElementById('timer-start-btn').textContent = '▶';
    this.displayTimer();
  },

  /* ── Copy ── */
  copyScript() {
    navigator.clipboard.writeText(this.editor.value).then(() => {
      const btn = document.getElementById('copy-btn');
      if (btn) { btn.textContent = '✓'; setTimeout(() => { btn.textContent = '📋'; }, 2000); }
    }).catch(() => {});
  },

  tick() {
    if (this.timerMode === 'writing') {
      this.timerSec++;
    } else {
      this.pomodoroSec--;
      if (this.pomodoroSec <= 0) {
        this.pomodoroSec = 25 * 60;
        this.timerOn = false;
        this.playTick();
        this.displayTimer();
        return;
      }
    }
    this.displayTimer();
    if (this.timerOn) setTimeout(() => this.tick(), 1000);
  },

  displayTimer() {
    const el = document.getElementById('timer-display');
    if (!el) return;
    if (this.timerMode === 'writing') {
      const h = Math.floor(this.timerSec / 3600);
      const r = this.timerSec % 3600;
      const m = Math.floor(r / 60);
      const s = r % 60;
      if (h > 0)
        el.textContent = '⏱ ' + h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
      else
        el.textContent = '⏱ ' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    } else {
      const m = Math.floor(this.pomodoroSec / 60);
      const s = this.pomodoroSec % 60;
      const label = this.pomodoroSec > 0 ? '🍅 ' : '⏰ ';
      el.textContent = label + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
  },

  /* ── Auto-save ── */
  initAutoSave() { setInterval(() => { localStorage.setItem('fw_draft', this.editor.value); }, 10000); },

  /* ── Auto-backup ── */
  initBackup() {
    setInterval(() => {
      const text = this.editor.value;
      if (!text.trim()) return;
      const backups = JSON.parse(localStorage.getItem('fw_backups') || '[]');
      backups.push({ text, name: this.fileName || 'roteiro', time: Date.now() });
      if (backups.length > 10) backups.splice(0, backups.length - 10);
      localStorage.setItem('fw_backups', JSON.stringify(backups));
    }, 300000); // 5 minutes
  },

  openBackups() {
    const backups = JSON.parse(localStorage.getItem('fw_backups') || '[]');
    let html = '';
    if (backups.length === 0) {
      html = '<p style="color:var(--fg-sec)">' + _('backup_none') + '</p>';
    } else {
      html = '<div style="font-size:10pt;max-height:300px;overflow-y:auto">';
      for (let i = backups.length - 1; i >= 0; i--) {
        const b = backups[i];
        const date = new Date(b.time);
        const label = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        const preview = esc(b.text.split('\n').slice(0, 3).join(' | ').slice(0, 80));
        html += '<div style="padding:6px 0;border-bottom:1px solid var(--border)">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center">';
        html += '<span style="font-weight:bold">' + label + '</span>';
        html += '<button onclick="app.restoreBackup(' + i + ')" style="font-size:9pt;padding:2px 6px">' + _('backup_restore') + '</button>';
        html += '</div><div style="color:var(--fg-sec);font-size:9pt">' + preview + '</div></div>';
      }
      html += '</div>';
    }
    document.getElementById('backup-body').innerHTML = html;
    document.getElementById('backup-modal').style.display = 'flex';
  },

  restoreBackup(idx) {
    const backups = JSON.parse(localStorage.getItem('fw_backups') || '[]');
    if (idx < 0 || idx >= backups.length) return;
    if (!confirm(_('backup_restore_confirm'))) return;
    this.editor.value = backups[idx].text;
    this.fileName = backups[idx].name;
    this.update();
    this.closeBackups();
  },

  closeBackups() { document.getElementById('backup-modal').style.display = 'none'; },
};

/* ── Helper ── */
function guessType(text, prev) {
  const c = text.trim();
  if (!c) return 'BLANK';
  if (c.startsWith('!')) return 'ACTION';
  if (c.startsWith('@')) return 'CHARACTER';
  if (c.startsWith('>') && !c.endsWith('<')) return 'TRANSITION';
  if (c.startsWith('.')) return 'SCENE';
  if (c.startsWith('>') && c.endsWith('<')) return 'CENTER';
  if (/^(INT|EXT|EST|I\/E)[.\s]/i.test(c)) return 'SCENE';
  if (/^[A-ZÀ-Ú][A-ZÀ-Ú\s]{1,20}(TO|PARA):$/.test(c)) return 'TRANSITION';
  if (/^[A-ZÀ-Ú][A-ZÀ-Ú0-9\s\(\)\.\-']+$/.test(c) && !/^(INT|EXT|EST|I\/E)[.\s]/i.test(c)) return 'CHARACTER';
  if (/^\s*\(.*\)\s*$/.test(c)) return 'PARENTHETICAL';
  if (prev === 'CHARACTER' || prev === 'PARENTHETICAL' || prev === 'DIALOGUE') return 'DIALOGUE';
  return 'ACTION';
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;').replace(/"/g,'&quot;'); }

/* ── File input handler ── */
document.getElementById('file-input').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => { app.editor.value = ev.target.result; app.fileName = file.name; app.update(); app.syncBeatsFromScenes(app.editor.value); };
  reader.readAsText(file, 'UTF-8');
  e.target.value = '';
});

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => app.init());
