/* ── Fonte v2 — app.js ── */
function safeJSON(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : JSON.parse(fallback); }
  catch(e) { console.warn('Fonte: erro ao ler', key, e); return JSON.parse(fallback); }
}
const app = {
  beats: safeJSON('fw_beats', '[]'),
  titleData: safeJSON('fw_title', 'null'),
  fileName: null, previewMode: 'editor', darkMode: false, focusOn: false,
  findTerm: '', findMatches: [], findIdx: -1, timerSec: 0, timerOn: false,
  isModified: false, timerMode: 'writing', pomodoroSec: 25 * 60,
  wordGoal: parseInt(localStorage.getItem('fw_goal') || '0'),
  sceneColors: safeJSON('fw_scene_colors', '{}'),
  timelineVisible: false,
  projectName: localStorage.getItem('fw_project_name') || '',
  fontSize: parseInt(localStorage.getItem('fw_font_size') || '12'),
  soundOn: localStorage.getItem('fw_sound') === 'true',
  viewMode: 'roteiro',
  sceneView: 'list',
  projetoData: safeJSON('fw_projeto', 'null'),
  _audioContext: null,
  _fileHandle: null,
  _sceneActMap: {},
  _orcListenersAttached: false,
  _editingBeatIdx: -1,
  _prevText: null,

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
    let timer, acTimer;
    this.editor.addEventListener('input', () => {
      clearTimeout(timer); clearTimeout(acTimer);
      timer = setTimeout(() => { this.update(); this.trackProductivity(); }, 100);
      acTimer = setTimeout(() => { this._showAutocomplete(); }, 150);
      this.playTick();
    });
    this.editor.addEventListener('mouseup', () => { this.updateMarkButtonStates(); this.updateCurrentAct(); });
    this.editor.addEventListener('keyup', () => { this.updateMarkButtonStates(); this.updateCurrentAct(); });
    this.editor.addEventListener('keydown', e => this.handleKey(e));

    // Drag reorder via Sortable-like manual implementation
    this.initBeatDragReorder();
    this.initDarkMode();
    this.applyFontSize();
    this.displayTimer();
    this.setupSelectionCount();
    this.renderProductivity();
    this.initAutoSave();
    this.initBackup();
    this._setupExcalidrawListener();
    window.addEventListener('beforeunload', e => {
      if (this.isModified) { e.preventDefault(); e.returnValue = ''; }
    });
    this._initOutroToggles();
    this.update();
    this.syncBeatsFromScenes(this.editor.value);
    this.renderBeats();
  },

  /* ── Updates ── */
  update() {
    const text = this.editor.value;
    this._resyncLineAnchors(this._prevText, text);
    this._prevText = text;
    localStorage.setItem('fw_draft', text);
    this.isModified = true;
    this.updateIndicator();
    this.autoAssignScenes(text);
    this.updateScenes(text);
    this.updateStats(text);
    this.updatePreview(text);
    this.renderTimeline();
    this.updateCurrentAct();
    const activeTab = document.querySelector('#right-tabs .tab.active');
    const tab = activeTab ? activeTab.dataset.tab : 'beats';
    if (tab === 'chars' || tab === 'locs') this.renderCharsLocs(text);
  },

  /* ── Line-anchor resync (scene colors + line marks) ──
   * sceneColors and fw_line_marks key their data by raw line NUMBER. If
   * lines are inserted/deleted above a colored scene or a highlighted
   * line, that line number now points at different content — the color or
   * mark silently "drifts" onto the wrong line. This compares the previous
   * text to the new text, finds the common unchanged prefix/suffix of
   * lines, and shifts anchors that fall in the untouched regions by the
   * right offset. Anchors that fall inside the actually-edited region are
   * dropped (safer than guessing where they went) instead of drifting. */
  _resyncLineAnchors(oldText, newText) {
    if (oldText === null || oldText === newText) return;
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const oldLen = oldLines.length, newLen = newLines.length;
    const maxCommon = Math.min(oldLen, newLen);
    let prefix = 0;
    while (prefix < maxCommon && oldLines[prefix] === newLines[prefix]) prefix++;
    let suffix = 0;
    const maxSuffix = maxCommon - prefix;
    while (suffix < maxSuffix && oldLines[oldLen - 1 - suffix] === newLines[newLen - 1 - suffix]) suffix++;
    const delta = newLen - oldLen;
    const remap = (oldLine) => {
      if (oldLine < prefix) return oldLine;
      if (oldLine >= oldLen - suffix) return oldLine + delta;
      return null; // inside the edited region — no longer trustworthy
    };

    let colorsChanged = false;
    const newColors = {};
    Object.entries(this.sceneColors).forEach(([lineStr, color]) => {
      const nl = remap(parseInt(lineStr, 10));
      if (nl !== null && nl >= 0) newColors[nl] = color;
      if (nl === null || String(nl) !== lineStr) colorsChanged = true;
    });
    if (colorsChanged) {
      this.sceneColors = newColors;
      localStorage.setItem('fw_scene_colors', JSON.stringify(this.sceneColors));
    }

    const marks = this.getLineMarks();
    let marksChanged = false;
    const newMarks = {};
    Object.entries(marks).forEach(([lineStr, type]) => {
      const nl = remap(parseInt(lineStr, 10));
      if (nl !== null && nl >= 0) newMarks[nl] = type;
      if (nl === null || String(nl) !== lineStr) marksChanged = true;
    });
    if (marksChanged) this.saveLineMarks(newMarks);
  },

  /* Precise anchor remap for scene/act drag-reorder: `lineMap` gives the
   * exact old-line → new-line correspondence (built from the block move
   * itself, not guessed via text diffing). Anchors on lines outside any
   * moved block (not expected here, but possible for stray content) are
   * dropped rather than left pointing at the wrong scene. */
  _remapAnchorsByLineMap(lineMap) {
    let colorsChanged = false;
    const newColors = {};
    Object.entries(this.sceneColors).forEach(([lineStr, color]) => {
      const nl = lineMap.get(parseInt(lineStr, 10));
      if (nl !== undefined) newColors[nl] = color; else colorsChanged = true;
    });
    if (colorsChanged) {
      this.sceneColors = newColors;
      localStorage.setItem('fw_scene_colors', JSON.stringify(this.sceneColors));
    }
    const marks = this.getLineMarks();
    const newMarks = {};
    let marksChanged = false;
    Object.entries(marks).forEach(([lineStr, type]) => {
      const nl = lineMap.get(parseInt(lineStr, 10));
      if (nl !== undefined) newMarks[nl] = type; else marksChanged = true;
    });
    if (marksChanged) this.saveLineMarks(newMarks);
  },

  updateIndicator() {
    const name = this.projectName || this.fileName || _('tb_project_name');
    document.title = 'Fonte — ' + name + (this.isModified ? ' •' : '');
    const el = document.getElementById('save-indicator');
    if (el) el.textContent = this.isModified ? '💾' : '✓ ' + _('tb_saved');
  },

  updateScenes(text) {
    const scenes = this.parseScenes(text);
    document.getElementById('scene-count').textContent = scenes.length;
    this._sceneActMap = {};
    scenes.forEach(s => {
      const beat = this._findBeatForScene(s.label, s.line);
      this._sceneActMap[s.line] = beat ? (beat.act || 'Ato 1') : null;
    });
    const el = document.getElementById('dbg');
    if (el) {
      const saved = localStorage.getItem('fw_project_saved');
      el.textContent = this.beats.length + ' ' + _('tb_beats').toLowerCase() + (!saved ? ' | 💾 ' + _('save_reminder') : '');
    }
    // Only the visible view needs rebuilding — the hidden one gets a
    // fresh render the moment toggleSceneView() switches to it, so there's
    // no point paying for both DOM trees on every keystroke (real cost on
    // scripts with hundreds of scenes: this used to build 2x the <li>/card
    // elements, one set of which was never shown).
    if (this.sceneView === 'list') this.renderSceneList(scenes);
    else this.renderSceneCards(scenes);
    const listEl = document.getElementById('scene-list');
    const boardEl = document.getElementById('scene-corkboard');
    if (listEl) listEl.style.display = this.sceneView === 'list' ? '' : 'none';
    if (boardEl) boardEl.style.display = this.sceneView === 'corkboard' ? '' : 'none';
  },

  toggleSceneView() {
    this.sceneView = this.sceneView === 'list' ? 'corkboard' : 'list';
    const btn = document.getElementById('view-toggle');
    if (btn) btn.textContent = this.sceneView === 'list' ? '⊞' : '⊟';
    this.updateScenes(this.editor.value);
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
    // Render acts in fixed numeric order (Ato 1, Ato 2, ...), never by
    // scene position — dragging a scene must not reshuffle act headers.
    this._sortActs(Object.keys(actFirstLine)).forEach(actName => {
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
    sep.innerHTML = '<span>' + esc(actName) + '</span><span class="act-remove" style="cursor:pointer;color:var(--fg-sec);font-size:7pt" title="' + _('act_remove') + '">✕</span>';
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
      (plot ? ' <span style="font-size:7pt;color:' + (plotColors[plot] || '#888') + '">[' + plot + ']</span>' : '');
    li.dataset.line = s.line;
    li.addEventListener('click', e => {
      if (e.target.closest('.act-remove')) return;
      this.goToScene(s.line);
    });
    return li;
  },

  renderSceneCards(scenes) {
    const board = document.getElementById('scene-corkboard');
    if (!board) return;
    board.innerHTML = '';
    if (scenes.length === 0) { board.innerHTML = '<div style="padding:8px;font-size:9pt;color:var(--fg-sec)">' + _('empty_scenes') + '</div>'; return; }

    const plotColors = {'Principal':'#569cd6','A':'#ce9178','B':'#4ec9b0'};
    const actColors = {'Ato 1':'#569cd6','Ato 2':'#4ec9b0','Ato 3':'#dcdcaa','Ato 4':'#c586c0','Ato 5':'#d16969'};

    // Same grouping as renderSceneList: preserve text order within each act
    const actGroups = {};
    const actFirstLine = {};
    scenes.forEach((s, i) => {
      const a = this._sceneActMap[s.line];
      if (a) {
        if (!actGroups[a]) { actGroups[a] = []; actFirstLine[a] = s.line; }
        actGroups[a].push(i);
      }
    });

    const addActHeader = (actName) => {
      const header = document.createElement('div');
      header.className = 'corkboard-act';
      header.style.borderLeft = '3px solid ' + (actColors[actName] || '#888');
      header.textContent = actName;
      board.appendChild(header);
    };
    const addGrid = (idxs) => {
      const grid = document.createElement('div');
      grid.className = 'corkboard-grid';
      idxs.forEach(idx => grid.appendChild(this._makeSceneCard(scenes[idx], idx, plotColors)));
      board.appendChild(grid);
    };

    // Fixed numeric order (Ato 1, Ato 2, ...) — matches renderSceneList,
    // so dragging a card never reshuffles which act appears first.
    this._sortActs(Object.keys(actFirstLine)).forEach(actName => {
      addActHeader(actName);
      addGrid(actGroups[actName]);
    });

    // Unassigned scenes (no beat) at the end
    const unassignedIdxs = [];
    scenes.forEach((s, i) => { if (!this._sceneActMap[s.line]) unassignedIdxs.push(i); });
    if (unassignedIdxs.length) addGrid(unassignedIdxs);

    // Empty acts at the end (header only, no cards)
    this._sortActs(Object.keys(this.getActs())).forEach(actName => {
      if (actFirstLine[actName] === undefined) addActHeader(actName);
    });
  },

  _makeSceneCard(s, i, plotColors) {
    const card = document.createElement('div');
    card.className = 'corkboard-card';
    card.dataset.line = s.line;
    const color = this.sceneColors[s.line];
    const marks = this.getLineMarks();
    const beat = this._findBeatForScene(s.label, s.line);
    let plot = beat ? beat.plotline || 'Principal' : '';
    if (plot === 'C' || plot === 'D') plot = 'B';
    const actColors = {'Ato 1':'#569cd6','Ato 2':'#4ec9b0','Ato 3':'#dcdcaa','Ato 4':'#c586c0','Ato 5':'#d16969'};
    const act = beat ? beat.act : null;

    card.style.borderTop = '3px solid ' + (color || actColors[act] || '#888');
    if (marks[s.line]) {
      const mc = {'!':'#fff3b0', '*':'#c8e6c9', '?':'#ffcdd2'};
      card.style.backgroundColor = mc[marks[s.line]] || '';
    }

    card.innerHTML = '<div class="card-num">' + (i + 1) + '</div>' +
      '<div class="card-title">' + esc(s.label) + '</div>' +
      (plot ? '<span class="card-plot" style="color:' + (plotColors[plot] || '#888') + '">[' + plot + ']</span>' : '') +
      (beat && beat.desc ? '<div class="card-desc">' + esc(beat.desc.slice(0, 80)) + '</div>' : '');
    card.addEventListener('click', () => this.goToScene(s.line));
    return card;
  },

  goToScene(line) {
    const lines2 = this.editor.value.split('\n');
    let n = 0;
    for (let j = 0; j < line; j++) { n += lines2[j].length + 1; }
    this.editor.selectionStart = n;
    this.editor.selectionEnd = n;
    this.editor.focus();
    this.editor.scrollTop = Math.max(0, Math.floor(line * (parseFloat(getComputedStyle(this.editor).lineHeight) || 18)) - 200);
  },

  _findBeatForScene(label, line) {
    const ref = label + '|L' + line;
    // Exact scene_ref match first: it's the only unambiguous key when
    // multiple scenes share the same heading. Only fall back to matching
    // by title/legacy scene_ref when no beat is precisely linked to this
    // scene's line — otherwise duplicate-titled scenes could resolve to
    // whichever beat happens to come first in the array.
    return this.beats.find(b => b.scene_ref === ref) ||
      this.beats.find(b => b.title === label || b.scene_ref === label);
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

  /* ── Acts ── */
  getActs() {
    let acts = safeJSON('fw_acts', 'null');
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
    const acts = this.getActs();
    // Always the next sequential number after the highest existing act —
    // acts start at 1-7, so this adds 8, 9, 10... in order, never a
    // free-text name that could break the fixed numeric ordering.
    const nums = Object.keys(acts).map(name => parseInt((name.match(/\d+/) || ['0'])[0], 10));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    const name = 'Ato ' + next;
    if (acts[name]) return;
    acts[name] = [];
    this.saveActs(acts);
    this.updateScenes(this.editor.value);
  },

  /* Same "next act" as addAct(), but also writes the "# Ato N" marker
   * into the script at the cursor — addAct() only creates an empty act
   * in the sidebar, it was never a way to tell the text where that act
   * actually begins. */
  insertActMarker() {
    const acts = this.getActs();
    const nums = Object.keys(acts).map(name => parseInt((name.match(/\d+/) || ['0'])[0], 10));
    const next = (nums.length ? Math.max(...nums) : 0) + 1;
    const actName = 'Ato ' + next;
    if (!acts[actName]) { acts[actName] = []; this.saveActs(acts); }

    const marker = '# ' + actName;
    const pos = this.editor.selectionStart;
    const text = this.editor.value;
    const before = text.slice(0, pos);
    const after = text.slice(pos);
    // Fountain treats blank-line-separated text as its own block, so pad
    // with newlines only where the surrounding text doesn't already
    // have them — avoids doubling up if the cursor is already on a
    // blank line.
    const gapBefore = before.length === 0 ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const gapAfter = after.length === 0 ? '' : after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n';
    this.editor.value = before + gapBefore + marker + gapAfter + after;
    const newPos = (before + gapBefore + marker).length;
    this.editor.focus();
    this.editor.selectionStart = this.editor.selectionEnd = newPos;
    this.update();
    this.syncBeatsFromScenes(this.editor.value);
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

    // Build block→act mapping from BEATS (always current, never stale).
    // Uses _findBeatForScene (label+line) instead of matching by title
    // alone, which is ambiguous whenever two scenes share the same heading.
    const blockToAct = {};
    blocks.forEach((b, i) => {
      blockToAct[i] = null;
      const label = lines[b.line].trim().replace(/^\./, '').slice(0, 60);
      const beat = this._findBeatForScene(label, b.line);
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
    const lineMap = new Map();
    newOrderIdxs.forEach((oldIdx, newIdx) => {
      const act = blockToAct[oldIdx];
      if (act) {
        if (!rebuilt[act]) rebuilt[act] = [];
        rebuilt[act].push(newBlocks[newIdx].line);
      }
      // Every line inside this block shifted by the same offset as its
      // block's start — map them all so scene colors/highlights follow
      // their scene instead of staying at the old absolute line number.
      const oldBlock = blocks[oldIdx], newBlock = newBlocks[newIdx];
      for (let j = 0; j < oldBlock.end - oldBlock.line; j++) {
        lineMap.set(oldBlock.line + j, newBlock.line + j);
      }
    });
    for (const aname of Object.keys(acts)) { if (!rebuilt[aname]) rebuilt[aname] = []; }
    this._remapAnchorsByLineMap(lineMap);
    this.saveActs(rebuilt);
    this._prevText = this.editor.value;
    this.updateScenes(this.editor.value);
  },

  /* ── Single scene move ── */
  moveScene(fromLine, toLine) {
    const lines = this.editor.value.split('\n');
    const blocks = this.getSceneBlocks(lines);
    if (blocks.length <= 1) return;

    // Build block→act mapping from BEATS (always current). Uses
    // _findBeatForScene (label+line) instead of matching by title alone,
    // which is ambiguous whenever two scenes share the same heading.
    const blockToAct = {};
    blocks.forEach((b, i) => {
      blockToAct[i] = null;
      const label = lines[b.line].trim().replace(/^\./, '').slice(0, 60);
      const beat = this._findBeatForScene(label, b.line);
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
    const lineMap = new Map();
    newOrder.forEach((oldIdx, newIdx) => {
      const act = blockToAct[oldIdx];
      if (act) {
        if (!rebuilt[act]) rebuilt[act] = [];
        rebuilt[act].push(newBlocks[newIdx].line);
      }
      const oldBlock = blocks[oldIdx], newBlock = newBlocks[newIdx];
      for (let j = 0; j < oldBlock.end - oldBlock.line; j++) {
        lineMap.set(oldBlock.line + j, newBlock.line + j);
      }
    });
    for (const aname of Object.keys(acts)) { if (!rebuilt[aname]) rebuilt[aname] = []; }
    this._remapAnchorsByLineMap(lineMap);
    this.saveActs(rebuilt);
    this._prevText = this.editor.value;
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

  /* Footer act indicator — the writer's own request: know which act the
   * cursor is in without opening the scene list. Finds the nearest scene
   * at or before the cursor and looks up its beat's act, same source of
   * truth the scene list and corkboard already read from. */
  updateCurrentAct() {
    const el = document.getElementById('stat-act');
    if (!el) return;
    const text = this.editor.value;
    const cursorLine = text.slice(0, this.editor.selectionStart).split('\n').length - 1;
    const lines = text.split('\n').slice(0, cursorLine + 1);
    let prevType = 'ACTION';
    let current = null;
    lines.forEach((line, i) => {
      const t = guessType(line, prevType);
      if (t === 'SCENE') current = { heading: line.trim().replace(/^\./, ''), line: i };
      if (t !== 'BLANK') prevType = t;
    });
    if (!current) { el.textContent = ''; el.style.display = 'none'; return; }
    const beat = this._findBeatForScene(current.heading, current.line);
    if (beat && beat.act) { el.textContent = '📍 ' + beat.act; el.style.display = ''; }
    else { el.textContent = ''; el.style.display = 'none'; }
  },

  updateStats(text) {
    const w = text.split(/\s+/).filter(x => x).length;
    const c = text.length;
    const lines = text.split('\n');
    let prevType = 'ACTION';
    let s = 0;
    lines.forEach(line => {
      const t = guessType(line, prevType);
      if (t === 'SCENE') s++;
      if (t !== 'BLANK') prevType = t;
    });
    const pages = Math.max(1, Math.round(lines.length / 55));
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

  renderTitleHTML(data, sections) {
    if (!data) return '';
    sections = sections || { titlePage: true, filmSheet: true, structure: true };
    const clean = (s) => esc(s.replace(/:$/, ''));
    let r = '<div style="text-align:center;margin-bottom:3em">';

    // Tab 1: Title page
    const tpKeys = ['title','credit','author','source','draft_date','contact'];
    const hasTp = sections.titlePage && tpKeys.some(k => data[k]);
    if (hasTp) {
      tpKeys.forEach(k => {
        const v = data[k];
        if (!v) return;
        const isTitle = k === 'title';
        v.split('\n').forEach((line, i) => {
          if (isTitle) {
            r += '<p style="text-align:center;margin:0.1em 0;font-size:1.4em;font-weight:bold">' + esc(line) + '</p>';
          } else {
            const prefix = i === 0 ? '<span style="color:#888;font-size:0.8em">' + clean(_('tp_' + k)) + '</span><br>' : '';
            r += '<p style="text-align:center;margin:0.1em 0">' + prefix + esc(line) + '</p>';
          }
        });
      });
    }

    // Tab 2: Film sheet
    const fichaKeys = ['logline','sinopse','argumento','genero','duracao','publico'];
    const hasFicha = sections.filmSheet && fichaKeys.some(k => data[k]);
    if (hasFicha) {
      r += '<hr style="margin:1.5em 0"><h3 style="text-align:center;font-size:1em">' + esc(_('tab_ficha')) + '</h3>';
      fichaKeys.forEach(k => {
        const v = data[k];
        if (!v) return;
        const label = clean(_('tp_' + k));
        if (k === 'logline' || k === 'sinopse' || k === 'argumento') {
          r += '<p style="margin:0.5em 0"><span style="color:#888;font-size:0.8em">' + label + '</span><br>' + esc(v) + '</p>';
        } else {
          r += '<p style="margin:0.3em 0"><span style="color:#888;font-size:0.8em">' + label + ': </span>' + esc(v) + '</p>';
        }
      });
    }

    // Tab 3: Structure
    const selKeys = ['tom','tema','ideia_governante','valor_central','premissa',
      'forca_antagonica','tipo_conflito','tipo_trama','dilema','tipo_final'];
    const qKeys = [['pergunta_1','q_mundo'],['pergunta_2','q_perturba'],['pergunta_3','q_decide'],['pergunta_4','q_obstaculos'],
      ['pergunta_5','q_descoberta'],['pergunta_6','q_crise'],['pergunta_7','q_desafio'],['pergunta_8','q_resolucao']];
    const hasEst = sections.structure && (selKeys.some(k => data[k]) || qKeys.some(([k]) => data[k]));
    if (hasEst) {
      r += '<hr style="margin:1.5em 0"><h3 style="text-align:center;font-size:1em">' + esc(_('section_estrutura')) + '</h3>';
      selKeys.forEach(k => {
        let v = data[k];
        if (!v) return;
        if (v === 'Outro' && data['outro_' + k]) v = data['outro_' + k];
        r += '<p style="margin:0.3em 0"><span style="color:#888;font-size:0.8em">' + clean(_('tp_' + k)) + ': </span>' + esc(v) + '</p>';
      });
      qKeys.forEach(([k, ik]) => {
        const v = data[k];
        if (!v) return;
        r += '<p style="margin:0.5em 0"><span style="color:#888;font-size:0.8em">' + esc(_(ik)) + '</span><br>' + esc(v) + '</p>';
      });
    }

    return r + '</div>';
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
    this._editingBeatIdx = index;
    const b = index >= 0 && index < this.beats.length ? this.beats[index] : null;
    document.getElementById('beat-title').value = b ? b.title : '';
    document.getElementById('beat-act').value = b ? (b.act || 'Ato 1') : 'Ato 1';
    document.getElementById('beat-plot').value = b && b.plotline ? b.plotline : 'Principal';
    this._renderBeatComments(b ? (b.comments || []) : []);
    document.getElementById('beat-modal').style.display = 'flex';
    document.getElementById('beat-title').focus();
  },

  _renderBeatComments(comments) {
    const el = document.getElementById('beat-comments');
    el.innerHTML = '';
    if (!comments || comments.length === 0) { el.innerHTML = '<p style="color:var(--fg-sec)">Sem comentários.</p>'; return; }
    comments.slice().reverse().forEach(c => {
      el.innerHTML += '<div style="padding:3px 0;border-bottom:1px solid var(--border)">' +
        '<b>' + esc(c.author || 'Autor') + '</b> ' +
        '<span style="color:var(--fg-sec)">' + esc(c.time || '') + '</span><br>' +
        esc(c.text) + '</div>';
    });
  },

  addBeatComment() {
    const text = document.getElementById('beat-comment-input').value.trim();
    const idx = this._editingBeatIdx;
    if (!text || idx < 0 || idx >= this.beats.length) return;
    if (!this.beats[idx].comments) this.beats[idx].comments = [];
    this.beats[idx].comments.push({
      author: this.projectName || 'Autor',
      text,
      time: new Date().toLocaleString(lang)
    });
    document.getElementById('beat-comment-input').value = '';
    this._renderBeatComments(this.beats[idx].comments);
  },

  saveBeatModal() {
    const title = document.getElementById('beat-title').value.trim();
    const act = document.getElementById('beat-act').value.trim() || 'Ato 1';
    const plot = document.getElementById('beat-plot').value;
    if (!title) return;
    const idx = this._editingBeatIdx;
    if (idx >= 0 && idx < this.beats.length) {
      // Preserve the scene this beat is already linked to (scene_ref's line
      // number never changes here). Re-deriving scene_ref by searching the
      // text for a scene whose label matches the (possibly just-edited)
      // title breaks as soon as two scenes share a heading: it always finds
      // the FIRST matching occurrence in the document, silently relinking
      // the beat to the wrong scene and orphaning the real one — which is
      // what caused the act update to land on the wrong scene and the
      // orphaned scene to be re-created as a duplicate beat on next sync.
      this.beats[idx].title = title;
      this.beats[idx].act = act;
      this.beats[idx].plotline = plot;
    } else {
      this.beats.push({ title, act, plotline: plot, order: this.beats.length });
    }
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
  openBeatGuide() { document.getElementById('beat-guide-modal').style.display = 'flex'; },
  closeBeatGuide() { document.getElementById('beat-guide-modal').style.display = 'none'; },
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
    // "# Ato N" on its own line marks "from here on, this act" — the
    // writer's way of telling the app about an act change without
    // leaving the page. It resets prev to ACTION so dialogue context
    // from before the marker doesn't leak into the line after it.
    const markerActs = {}; // scene line -> act name governed by a marker
    let currentMarkerAct = null;
    let prev = 'ACTION';
    lines.forEach((line, i) => {
      const markerMatch = line.trim().match(/^#\s*(?:ato\s*)?(\d+)\s*$/i);
      if (markerMatch) { currentMarkerAct = 'Ato ' + markerMatch[1]; prev = 'ACTION'; return; }
      const t = guessType(line, prev);
      if (t === 'SCENE') {
        const clean = line.trim().replace(/^\./, '');
        sceneData.push({ heading: clean, line: i });
        if (currentMarkerAct) markerActs[i] = currentMarkerAct;
      }
      if (t !== 'BLANK') prev = t;
    });
    let changed = false;
    // Remove auto beats with stale scene_ref (old format or deleted scenes)
    const currentRefs = new Set(sceneData.map(d => d.heading + '|L' + d.line));
    const oldLen = this.beats.length;
    this.beats = this.beats.filter(b => !b.auto || (b.scene_ref && currentRefs.has(b.scene_ref)));
    if (this.beats.length !== oldLen) changed = true;
    // Track by object identity (not by scene_ref string) so beats with no
    // scene_ref yet (manually pre-planned beats) can also be matched once,
    // without colliding on the shared "undefined" key.
    const remappedBeats = new Set();
    // Count heading occurrences to only remap stale for unique headings
    const headingCount = {};
    sceneData.forEach(d => { headingCount[d.heading] = (headingCount[d.heading] || 0) + 1; });
    // Tracks the act of the most recent scene seen so far as we walk the
    // document top to bottom (sceneData is already in line order). A
    // brand-new scene with no marker above it inherits this instead of
    // always defaulting to Ato 1 — so typing straight through Act 2 keeps
    // landing new scenes in Act 2. Only the very first scene in the whole
    // script, with no marker and no previous scene, falls back to the
    // first act.
    let lastAct = null;
    sceneData.forEach(({ heading, line }) => {
      const uniqueRef = heading + '|L' + line;
      const existing = this.beats.find(b => b.scene_ref === uniqueRef);
      if (existing) {
        // A marker is authoritative: if one governs this scene and
        // disagrees with the beat's current act, the marker wins — that's
        // the whole point of writing it in the text.
        if (markerActs[line] && existing.act !== markerActs[line]) {
          existing.act = markerActs[line];
          changed = true;
        }
        if (existing.act) lastAct = existing.act;
        return;
      }
      // Only remap stale for unique headings (duplicates need their own beat)
      const isUnique = headingCount[heading] === 1;
      if (isUnique) {
        // Candidates: a beat whose scene moved (has an old scene_ref that
        // no longer matches any current scene) OR a manually-created
        // "planning" beat that was never linked to a scene at all
        // (scene_ref undefined) — both should adopt this scene instead of
        // spawning a duplicate auto beat.
        const stale = this.beats.find(b =>
          b.title === heading && !remappedBeats.has(b) &&
          (!b.scene_ref || b.scene_ref.includes('|L'))
        );
        if (stale) {
          remappedBeats.add(stale);
          stale.scene_ref = uniqueRef;
          changed = true;
          if (markerActs[line]) stale.act = markerActs[line];
          if (stale.act) lastAct = stale.act;
          return;
        }
      }
      const inferredAct = markerActs[line] || lastAct || this._sortActs(Object.keys(this.getActs()))[0] || 'Ato 1';
      this.beats.push({ title: heading, act: inferredAct, desc: '', scene_ref: uniqueRef, order: this.beats.length, auto: true, plotline: 'Principal' });
      changed = true;
      lastAct = inferredAct;
    });
    // Ensure default act exists in fw_acts for auto-created beats, and
    // that any act referenced by a "# Ato N" marker actually exists —
    // typing "# Ato 9" should create Ato 9 on the fly, same as clicking
    // the 🎬 button would.
    const fwActs = this.getActs();
    if (!fwActs['Ato 1']) { fwActs['Ato 1'] = []; changed = true; }
    Object.values(markerActs).forEach(actName => {
      if (!fwActs[actName]) { fwActs[actName] = []; changed = true; }
    });
    this.saveActs(fwActs);
    if (changed) { this.saveBeats(); this.renderBeats(); this.renderTimeline(); this.updateScenes(this.editor.value); }
  },

  /* ── Timeline grid (atos × tramas) ── */
  toggleTimeline() {
    this.timelineVisible = !this.timelineVisible;
    this.renderTimeline();
  },

  toggleTimelineHeight() {
    document.getElementById('timeline-bar').classList.toggle('expanded');
    document.getElementById('app').classList.toggle('timeline-expanded');
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
      el.innerHTML = '<span style="padding:8px;color:var(--fg-sec);font-size:10pt">' + _('timeline_empty') + '</span>';
      return;
    }

    // Header row
    const headerRow = document.createElement('div');
    headerRow.style.cssText = 'display:grid;grid-template-columns:70px repeat(' + numCols + ',minmax(110px,1fr));gap:2px;padding:2px 4px';
    const corner = document.createElement('div');
    corner.style.cssText = 'padding:3px;font-size:8pt;color:var(--fg-sec);font-weight:bold';
    corner.textContent = _('timeline_header');
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
      row.style.cssText = 'display:grid;grid-template-columns:70px repeat(' + numCols + ',minmax(110px,1fr));gap:2px;padding:2px 4px';
      const lbl = document.createElement('div');
      lbl.style.cssText = 'padding:3px;font-size:9pt;color:' + (plotColors[pl] || '#888') + ';font-weight:bold;display:flex;align-items:center';
      lbl.textContent = pl;
      row.appendChild(lbl);
      actNames.forEach(act => {
        const cell = document.createElement('div');
          cell.style.cssText = 'min-height:36px;background:var(--surface2);border-radius:3px;padding:3px;display:flex;flex-direction:column;gap:2px';
        // Scenes that match this act + plotline
        const cellScenes = scenes.filter(s => sceneAct[s.line] === act && scenePlot[s.line] === pl);
        cellScenes.forEach(s => {
          const sc = document.createElement('div');
          sc.style.cssText = 'padding:4px 6px;font-size:9pt;cursor:pointer;border-radius:2px;background:var(--surface);white-space:nowrap;overflow:hidden;text-overflow:ellipsis';
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
          sc.title = (b.title || '?') + _('beat_no_scene');
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
    const dl = document.getElementById('beat-draft-label');
    if (dl) dl.style.display = this.beats.length > 0 ? 'inline' : 'none';
    const list = document.getElementById('beat-list');
    list.innerHTML = '';
    if (this.beats.length === 0) { list.innerHTML = '<div class="list-empty">' + _('empty_beats') + '</div>'; return; }
    const plotColors = {'Principal':'#569cd6','A':'#ce9178','B':'#4ec9b0'};
    // Built the same way syncBeatsFromScenes builds scene_ref — full
    // heading, not parseScenes()'s 60-char-truncated label — otherwise
    // any scene heading over 60 chars never matches and its beat shows
    // as "draft" even though it's genuinely linked.
    const lines = this.editor.value.split('\n');
    const sceneRefs = new Set();
    let prevType = 'ACTION';
    lines.forEach((line, i) => {
      const t = guessType(line, prevType);
      if (t === 'SCENE') sceneRefs.add(line.trim().replace(/^\./, '') + '|L' + i);
      if (t !== 'BLANK') prevType = t;
    });
    this.beats.forEach((b, i) => {
      const div = document.createElement('div');
      div.className = 'beat-item';
      div.style.cssText = 'flex-direction:column;padding:6px 8px';
      div.draggable = true;
      div.dataset.idx = i;
      const pl = (b.plotline === 'C' || b.plotline === 'D') ? 'B' : (b.plotline || 'Principal');
      const color = plotColors[pl] || '#888';
      const hasScene = b.scene_ref && sceneRefs.has(b.scene_ref);
      // Line 1: title
      const titleRow = document.createElement('div');
      titleRow.style.cssText = 'display:flex;align-items:center;gap:6px';
      const dotStyle = hasScene
        ? 'display:inline-block;width:8px;height:8px;border-radius:50%;background:' + color + ';flex-shrink:0'
        : 'display:inline-block;width:8px;height:8px;border-radius:50%;border:2px dashed ' + color + ';flex-shrink:0';
      const prefix = hasScene ? (i + 1) + '. ' : '📝 ';
      titleRow.innerHTML = '<span style="' + dotStyle + '"></span>' +
        '<span style="font-size:11pt">' + prefix + esc(b.title || '?') + '</span>';
      div.appendChild(titleRow);
      // Line 2: plotline + action buttons
      const actionRow = document.createElement('div');
      actionRow.style.cssText = 'display:flex;align-items:center;gap:4px;margin-top:3px;padding-left:14px';
      actionRow.innerHTML =
        '<span style="font-size:8pt;color:' + color + '">' + esc(pl) + '</span>' +
        '<span style="flex:1"></span>' +
        '<span style="cursor:pointer;font-size:13pt" onclick="app.editBeat(' + i + ')">✎</span>' +
        '<span style="cursor:pointer;font-size:13pt" onclick="app.insertBeat(' + i + ')">↗</span>' +
        '<span style="color:#c00;cursor:pointer;font-size:13pt" onclick="app.deleteBeat(' + i + ')">✕</span>';
      div.appendChild(actionRow);
      list.appendChild(div);
    });
  },

  /* ── Title page / Film sheet / Story structure ── */
  /* ── Título / Ficha / Estrutura (página inteira) ── */
  toggleTitulo() {
    const editorWrap = document.getElementById('textarea-wrap');
    const previewWrap = document.getElementById('preview-wrap');
    const projetoForm = document.getElementById('projeto-form');
    const tituloForm = document.getElementById('titulo-form');
    const leftPane = document.getElementById('pane-left');
    const rightPane = document.getElementById('pane-right');
    const isTitulo = tituloForm.style.display === 'block';
    if (isTitulo) {
      tituloForm.style.display = 'none';
      leftPane.style.display = '';
      rightPane.style.display = '';
      if (this.previewMode === 'editor') { editorWrap.style.display = 'block'; }
      else if (this.previewMode === 'preview') { previewWrap.style.display = 'block'; }
      else { editorWrap.style.display = 'block'; previewWrap.style.display = 'block'; }
    } else {
      editorWrap.style.display = 'none';
      previewWrap.style.display = 'none';
      projetoForm.style.display = 'none';
      tituloForm.style.display = 'block';
      leftPane.style.display = 'none';
      rightPane.style.display = 'none';
      this.carregarTitulo();
    }
  },

  /* ── Projeto Cultural ── */
  toggleProjeto() {
    this.viewMode = this.viewMode === 'roteiro' ? 'projeto' : 'roteiro';
    const btn = document.getElementById('projeto-btn');
    btn.textContent = this.viewMode === 'projeto' ? '✏ ' + _('tb_roteiro') : '📋 ' + _('tb_projeto');
    const editorWrap = document.getElementById('textarea-wrap');
    const previewWrap = document.getElementById('preview-wrap');
    const projetoForm = document.getElementById('projeto-form');
    const tituloForm = document.getElementById('titulo-form');
    const rightPane = document.getElementById('pane-right');
    const leftPane = document.getElementById('pane-left');
    if (this.viewMode === 'projeto') {
      editorWrap.style.display = 'none';
      previewWrap.style.display = 'none';
      tituloForm.style.display = 'none';
      projetoForm.style.display = 'block';
      rightPane.style.display = 'none';
      leftPane.style.display = 'none';
      this.carregarProjeto();
      if (!this._orcListenersAttached) {
        document.querySelectorAll('#projeto-form input[id^="proj-orc-"][id$="valor"]').forEach(el => {
          el.addEventListener('input', () => this._atualizarOrcTotal());
        });
        this._orcListenersAttached = true;
      }
    } else {
      editorWrap.style.display = 'block';
      previewWrap.style.display = (this.previewMode === 'preview' || this.previewMode === 'split') ? 'block' : 'none';
      projetoForm.style.display = 'none';
      rightPane.style.display = '';
      leftPane.style.display = '';
    }
  },

  /* ── Help tabs ── */
  selHelpTab(tab) {
    document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.help-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('help-tab-' + tab).classList.add('active');
    document.querySelector('.help-tab[onclick*="' + tab + '"]').classList.add('active');
  },

  selTitleTab(tab) {
    document.querySelectorAll('.page-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.page-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    document.querySelector('.page-tab[data-tab="' + tab + '"]').classList.add('active');
  },

  carregarTitulo() {
    const d = this.titleData || {};
    const fields = ['title','credit','author','source','draft_date','contact',
      'logline','sinopse','argumento','genero','duracao','publico',
      'tom','tema','ideia_governante','valor_central','premissa',
      'forca_antagonica','tipo_conflito','tipo_trama','dilema','tipo_final',
      'pergunta_1','pergunta_2','pergunta_3','pergunta_4','pergunta_5','pergunta_6','pergunta_7','pergunta_8'];
    fields.forEach(k => {
      const el = document.getElementById('tp-' + k.replace(/_/g, '-'));
      if (el) el.value = d[k] !== undefined ? d[k] : '';
    });
    ['tema','ideia_governante','premissa'].forEach(k => {
      const el = document.getElementById('tp-outro-' + k.replace(/_/g, '-'));
      if (el) {
        el.value = d['outro_' + k] || '';
        el.style.display = d[k] === 'Outro' ? 'block' : 'none';
      }
    });
  },

  salvarTitulo() {
    this.titleData = {};
    const fields = ['title','credit','author','source','draft_date','contact',
      'logline','sinopse','argumento','genero','duracao','publico',
      'tom','tema','ideia_governante','valor_central','premissa',
      'forca_antagonica','tipo_conflito','tipo_trama','dilema','tipo_final',
      'pergunta_1','pergunta_2','pergunta_3','pergunta_4','pergunta_5','pergunta_6','pergunta_7','pergunta_8'];
    fields.forEach(k => {
      const el = document.getElementById('tp-' + k.replace(/_/g, '-'));
      if (el && el.value && el.value.toString().trim()) this.titleData[k] = el.value.toString().trim();
    });
    ['tema','ideia_governante','premissa'].forEach(k => {
      if (this.titleData[k] === 'Outro') {
        const el = document.getElementById('tp-outro-' + k.replace(/_/g, '-'));
        if (el && el.value.trim()) this.titleData['outro_' + k] = el.value.trim();
      }
    });
    localStorage.setItem('fw_title', JSON.stringify(this.titleData));
  },

  limparTitulo() {
    this.titleData = null;
    localStorage.removeItem('fw_title');
    const tituloForm = document.getElementById('titulo-form');
    if (tituloForm.style.display === 'block') this.toggleTitulo();
  },

  printTitleSheet() {
    this.salvarTitulo();
    const d = this.titleData || {};
    const title = d.title || _('title_header');
    const body = this.renderTitleHTML(d);
    const css = 'body{font-family:"Courier New",monospace;font-size:12pt;line-height:1.4;max-width:700px;margin:40px auto;padding:40px 60px;color:#1a1a18}' +
      'h3{margin-top:1.5em;text-align:center;font-size:1.1em}' +
      'p{margin:0.5em 0}' +
      'hr{border:none;border-top:1px solid #ccc;margin:1.5em 0}' +
      '@media print{@page{margin:0.6in;size:A4}}';
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title><style>' + css + '</style></head><body>' + body + '</body></html>';
    const w = window.open('', '', 'width=800,height=600');
    w.document.write(html); w.document.close(); w.focus();
    w.onafterprint = () => { w.close(); };
    setTimeout(() => { try { w.close(); } catch(e) {} }, 60000);
    w.print();
  },

  /* ── "Outro" toggle for select+custom fields ── */
  _initOutroToggles() {
    document.querySelectorAll('[id^="tp-outro-"]').forEach(el => {
      const sel = document.getElementById('tp-' + el.id.slice(9));
      if (sel) {
        sel.addEventListener('change', () => {
          el.style.display = sel.value === 'Outro' ? 'block' : 'none';
          if (sel.value !== 'Outro') el.value = '';
        });
      }
    });
  },

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
    ta.scrollTop = Math.max(0, (ta.value.slice(0, pos).split('\n').length) * (parseFloat(getComputedStyle(ta).lineHeight) || 18) - 200);
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



  carregarProjeto() {
    const d = this.projetoData || {};
    const map = {
      'proj-nome':'nome','proj-proponente':'proponente','proj-cpf':'cpf',
      'proj-segmento':'segmento','proj-produto':'produto','proj-valor':'valor','proj-periodo':'periodo',
      'proj-resumo':'resumo','proj-obj-geral':'objGeral','proj-obj-espec':'objEspec','proj-justificativa':'justificativa',
      'proj-equipe-direcao':'eqDirecao','proj-equipe-animacao':'eqAnimacao','proj-equipe-arte':'eqArte',
      'proj-equipe-trilha':'eqTrilha','proj-equipe-producao':'eqProducao',
      'proj-div-redes':'divRedes','proj-div-imprensa':'divImprensa','proj-div-material':'divMaterial',
      'proj-acess-libras':'acessLibras','proj-acess-audio':'acessAudio','proj-acess-legendas':'acessLegendas','proj-acess-sessoes':'acessSessoes',
      'proj-conta-social':'contaSocial','proj-conta-cultural':'contaCultural','proj-conta-imagem':'contaImagem',
      'proj-orc-pre-desc':'orcPreDesc','proj-orc-pre-valor':'orcPreValor',
      'proj-orc-prod-desc':'orcProdDesc','proj-orc-prod-valor':'orcProdValor',
      'proj-orc-pos-desc':'orcPosDesc','proj-orc-pos-valor':'orcPosValor',
      'proj-orc-div-desc':'orcDivDesc','proj-orc-div-valor':'orcDivValor',
      'proj-orc-adm-desc':'orcAdmDesc','proj-orc-adm-valor':'orcAdmValor',
      'proj-dist-publico':'distPublico','proj-dist-metas':'distMetas','proj-dist-municipios':'distMunicipios','proj-dist-festivais':'distFestivais',
      'proj-mid-cartaz-formato':'midCartazFormato','proj-mid-cartaz-esp':'midCartazEsp',
      'proj-mid-flyer-formato':'midFlyerFormato','proj-mid-flyer-esp':'midFlyerEsp',
      'proj-mid-social-formato':'midSocialFormato','proj-mid-social-esp':'midSocialEsp',
      'proj-mid-press-formato':'midPressFormato','proj-mid-press-esp':'midPressEsp',
      'proj-pitch-tagline':'pitchTagline','proj-pitch-comp':'pitchComp','proj-pitch-diferencial':'pitchDiferencial',
      'proj-pitch-similares':'pitchSimilares','proj-pitch-texto':'pitchTexto','proj-pitch-elenco':'pitchElenco'
    };
    Object.entries(map).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (!el) return;
      const val = d[key];
      if (el.type === 'checkbox') el.checked = !!val;
      else el.value = val || '';
    });
    this._atualizarOrcTotal();
    this._renderCronograma();
  },

  _renderCronograma() {
    const grid = document.getElementById('proj-cronograma');
    if (!grid) return;
    const etapas = ['Pré-Produção','Produção','Pós-Produção','Divulgação','Exibições/Oficina','Prestação de Contas'];
    const data = (this.projetoData && this.projetoData.cronograma) || [];
    // Default all false
    const crono = etapas.map((_, i) => data[i] ? [...data[i]] : Array(12).fill(false));

    grid.innerHTML = '';
    // Header
    const hdr = document.createElement('div');
    hdr.style.cssText = 'font-weight:bold;color:var(--fg-sec)';
    hdr.textContent = 'Etapa / Mês';
    grid.appendChild(hdr);
    for (let m = 1; m <= 12; m++) {
      const d = document.createElement('div');
      d.style.cssText = 'text-align:center;font-weight:bold;color:var(--fg-sec)';
      d.textContent = m;
      grid.appendChild(d);
    }
    // Rows
    etapas.forEach((etapa, i) => {
      const label = document.createElement('div');
      label.style.cssText = 'font-size:8pt';
      label.textContent = etapa;
      grid.appendChild(label);
      for (let m = 0; m < 12; m++) {
        const cell = document.createElement('div');
        cell.style.cssText = 'border-radius:2px;min-height:20px;cursor:pointer;background:' + (crono[i][m] ? 'var(--accent)' : 'transparent') + ';border:1px solid var(--border)';
        cell.dataset.stage = i;
        cell.dataset.month = m;
        cell.addEventListener('click', () => {
          crono[i][m] = !crono[i][m];
          cell.style.background = crono[i][m] ? 'var(--accent)' : 'transparent';
          if (this.projetoData) {
            this.projetoData.cronograma = crono;
            localStorage.setItem('fw_projeto', JSON.stringify(this.projetoData));
          }
        });
        grid.appendChild(cell);
      }
    });
  },

  _atualizarOrcTotal() {
    const ids = ['proj-orc-pre-valor','proj-orc-prod-valor','proj-orc-pos-valor','proj-orc-div-valor','proj-orc-adm-valor'];
    const total = ids.reduce((sum, id) => {
      const raw = (document.getElementById(id)?.value || '0').trim();
      const normalized = raw.replace(/\./g, '').replace(',', '.');
      const v = parseFloat(normalized);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    const el = document.getElementById('proj-orc-total');
      const locale = lang === 'pt-BR' ? 'pt-BR' : 'en-US';
      if (el) el.textContent = 'Total: R$ ' + total.toLocaleString(locale, {minimumFractionDigits:2});
  },

  salvarProjeto() {
    const getVal = (id) => {
      const el = document.getElementById(id);
      if (!el) return '';
      if (el.type === 'checkbox') return el.checked;
      return el.value;
    };
    const cronoSalvo = this.projetoData ? this.projetoData.cronograma : null;
    this.projetoData = {
      nome: getVal('proj-nome'), proponente: getVal('proj-proponente'), cpf: getVal('proj-cpf'),
      segmento: getVal('proj-segmento'), produto: getVal('proj-produto'), valor: getVal('proj-valor'), periodo: getVal('proj-periodo'),
      resumo: getVal('proj-resumo'), objGeral: getVal('proj-obj-geral'), objEspec: getVal('proj-obj-espec'), justificativa: getVal('proj-justificativa'),
      eqDirecao: getVal('proj-equipe-direcao'), eqAnimacao: getVal('proj-equipe-animacao'), eqArte: getVal('proj-equipe-arte'),
      eqTrilha: getVal('proj-equipe-trilha'), eqProducao: getVal('proj-equipe-producao'),
      divRedes: getVal('proj-div-redes'), divImprensa: getVal('proj-div-imprensa'), divMaterial: getVal('proj-div-material'),
      acessLibras: getVal('proj-acess-libras'), acessAudio: getVal('proj-acess-audio'), acessLegendas: getVal('proj-acess-legendas'), acessSessoes: getVal('proj-acess-sessoes'),
      contaSocial: getVal('proj-conta-social'), contaCultural: getVal('proj-conta-cultural'), contaImagem: getVal('proj-conta-imagem'),
      orcPreDesc: getVal('proj-orc-pre-desc'), orcPreValor: getVal('proj-orc-pre-valor'),
      orcProdDesc: getVal('proj-orc-prod-desc'), orcProdValor: getVal('proj-orc-prod-valor'),
      orcPosDesc: getVal('proj-orc-pos-desc'), orcPosValor: getVal('proj-orc-pos-valor'),
      orcDivDesc: getVal('proj-orc-div-desc'), orcDivValor: getVal('proj-orc-div-valor'),
      orcAdmDesc: getVal('proj-orc-adm-desc'), orcAdmValor: getVal('proj-orc-adm-valor'),
      distPublico: getVal('proj-dist-publico'), distMetas: getVal('proj-dist-metas'), distMunicipios: getVal('proj-dist-municipios'), distFestivais: getVal('proj-dist-festivais'),
      midCartazFormato: getVal('proj-mid-cartaz-formato'), midCartazEsp: getVal('proj-mid-cartaz-esp'),
      midFlyerFormato: getVal('proj-mid-flyer-formato'), midFlyerEsp: getVal('proj-mid-flyer-esp'),
      midSocialFormato: getVal('proj-mid-social-formato'), midSocialEsp: getVal('proj-mid-social-esp'),
      midPressFormato: getVal('proj-mid-press-formato'), midPressEsp: getVal('proj-mid-press-esp'),
      pitchTagline: getVal('proj-pitch-tagline'), pitchComp: getVal('proj-pitch-comp'),
      pitchDiferencial: getVal('proj-pitch-diferencial'), pitchSimilares: getVal('proj-pitch-similares'),
      pitchTexto: getVal('proj-pitch-texto'), pitchElenco: getVal('proj-pitch-elenco')
    };
    if (cronoSalvo) this.projetoData.cronograma = cronoSalvo;
    localStorage.setItem('fw_projeto', JSON.stringify(this.projetoData));
    this.isModified = true;
    this.updateIndicator();
  },

  exportProjetoPDF() {
    this.salvarProjeto();
    const d = this.projetoData || {};
    const e = (v) => esc(v || '');
    const s = (v) => v ? _('export_sim') : _('export_nao');
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + _('proj_title') + '</title>' +
      '<style>body{font-family:Arial,sans-serif;font-size:11pt;margin:40px}h1{font-size:14pt}h2{font-size:12pt;margin-top:20px}' +
      'table{width:100%;border-collapse:collapse;margin:10px 0}td,th{border:1px solid #ccc;padding:6px;text-align:left}th{background:#eee}' +
      '</style></head><body>' +
      '<h1>' + _('proj_title') + '</h1>' +
      '<h2>' + _('proj_section1') + '</h2>' +
      '<table><tr><td><b>' + _('export_nome') + ':</b> ' + e(d.nome) + '</td><td><b>' + _('export_proponente') + ':</b> ' + e(d.proponente) + '</td></tr>' +
      '<tr><td><b>CPF/CNPJ:</b> ' + e(d.cpf) + '</td><td><b>' + _('export_segmento') + ':</b> ' + e(d.segmento) + '</td></tr>' +
      '<tr><td><b>' + _('export_produto') + ':</b> ' + e(d.produto) + '</td><td><b>' + _('export_valor') + ':</b> R$ ' + e(d.valor) + '</td></tr></table>' +
      '<h2>' + _('proj_section2') + '</h2><p><b>' + _('export_resumo') + ':</b> ' + e(d.resumo) + '</p>' +
      '<p><b>' + _('export_objetivo_geral') + ':</b> ' + e(d.objGeral) + '</p>' +
      '<p><b>' + _('export_objetivos_espec') + ':</b> ' + e(d.objEspec) + '</p>' +
      '<p><b>' + _('export_justificativa') + ':</b> ' + e(d.justificativa) + '</p>' +
      '<h2>' + _('proj_section3') + '</h2><p><b>' + _('export_direcao') + ':</b> ' + e(d.eqDirecao) + '<br><b>' + _('export_animacao') + ':</b> ' + e(d.eqAnimacao) + '<br><b>' + _('export_arte') + ':</b> ' + e(d.eqArte) + '<br><b>' + _('export_trilha') + ':</b> ' + e(d.eqTrilha) + '<br><b>' + _('export_producao') + ':</b> ' + e(d.eqProducao) + '</p>' +
      '<h2>' + _('proj_section4') + '</h2><p><b>' + _('proj_div_redes') + ':</b> ' + e(d.divRedes) + '<br><b>' + _('proj_div_imprensa') + ':</b> ' + e(d.divImprensa) + '<br><b>' + _('proj_div_material') + ':</b> ' + e(d.divMaterial) + '</p>' +
      '<h2>' + _('proj_section5') + '</h2><p><b>' + _('proj_acess_libras') + ':</b> ' + s(d.acessLibras) + ' | <b>' + _('proj_acess_audio') + ':</b> ' + s(d.acessAudio) + ' | <b>' + _('proj_acess_legendas') + ':</b> ' + s(d.acessLegendas) + '</p><p><b>' + _('proj_acess_sessoes') + ':</b> ' + e(d.acessSessoes) + '</p>' +
      '<h2>' + _('proj_section6') + '</h2><p><b>' + _('proj_conta_social') + ':</b> ' + e(d.contaSocial) + '<br><b>' + _('proj_conta_cultural') + ':</b> ' + e(d.contaCultural) + '<br><b>' + _('proj_conta_imagem') + ':</b> ' + e(d.contaImagem) + '</p>' +
      '<h2>' + _('proj_section7') + '</h2><table><tr><th>' + _('proj_orc_rubrica') + '</th><th>' + _('proj_orc_desc') + '</th><th>' + _('proj_orc_valor') + '</th></tr>' +
      '<tr><td>' + _('proj_orc_pre') + '</td><td>' + e(d.orcPreDesc) + '</td><td>R$ ' + e(d.orcPreValor) + '</td></tr>' +
      '<tr><td>' + _('proj_orc_prod') + '</td><td>' + e(d.orcProdDesc) + '</td><td>R$ ' + e(d.orcProdValor) + '</td></tr>' +
      '<tr><td>' + _('proj_orc_pos') + '</td><td>' + e(d.orcPosDesc) + '</td><td>R$ ' + e(d.orcPosValor) + '</td></tr>' +
      '<tr><td>' + _('proj_orc_div') + '</td><td>' + e(d.orcDivDesc) + '</td><td>R$ ' + e(d.orcDivValor) + '</td></tr>' +
      '<tr><td>' + _('proj_orc_adm') + '</td><td>' + e(d.orcAdmDesc) + '</td><td>R$ ' + e(d.orcAdmValor) + '</td></tr></table>' +
      '<h2>' + _('proj_section9') + '</h2><p><b>' + _('proj_dist_publico') + ':</b> ' + e(d.distPublico) + '<br><b>' + _('proj_dist_metas') + ':</b> ' + e(d.distMetas) + '<br><b>' + _('proj_dist_municipios') + ':</b> ' + e(d.distMunicipios) + '<br><b>' + _('proj_dist_festivais') + ':</b> ' + e(d.distFestivais) + '</p>' +
      '<h2>' + _('proj_section10') + '</h2><table><tr><th>' + _('proj_mid_tipo') + '</th><th>' + _('proj_mid_formato') + '</th><th>' + _('proj_mid_espec') + '</th></tr>' +
      '<tr><td>' + _('proj_mid_cartaz') + '</td><td>' + e(d.midCartazFormato) + '</td><td>' + e(d.midCartazEsp) + '</td></tr>' +
      '<tr><td>' + _('proj_mid_flyer') + '</td><td>' + e(d.midFlyerFormato) + '</td><td>' + e(d.midFlyerEsp) + '</td></tr>' +
      '<tr><td>' + _('proj_mid_social') + '</td><td>' + e(d.midSocialFormato) + '</td><td>' + e(d.midSocialEsp) + '</td></tr>' +
      '<tr><td>' + _('proj_mid_press') + '</td><td>' + e(d.midPressFormato) + '</td><td>' + e(d.midPressEsp) + '</td></tr></table>' +
      '<h2>' + _('proj_section11') + '</h2><p><b>' + _('proj_pitch_tagline') + ':</b> ' + e(d.pitchTagline) + '<br><b>' + _('proj_pitch_comp') + ':</b> ' + e(d.pitchComp) + '<br><b>' + _('proj_pitch_diferencial') + ':</b> ' + e(d.pitchDiferencial) + '<br><b>' + _('proj_pitch_similares') + ':</b> ' + e(d.pitchSimilares) + '<br><b>' + _('proj_pitch_texto') + ':</b> ' + e(d.pitchTexto) + '<br><b>' + _('proj_pitch_elenco') + ':</b> ' + e(d.pitchElenco) + '</p>' +
      '<p style="text-align:center;margin-top:40px;color:#999;font-size:9pt">' + _('export_gerado_por') + '</p>' +
      '</body></html>';
    const w = window.open('', '', 'width=800,height=600');
    w.document.write(html); w.document.close(); w.focus();
    w.print();
  },

  /* ── File I/O ── */
  async newFile() {
    if (this.editor.value.trim()) {
      if (confirm(_('save_before_new'))) { await this.saveProject(); }
      else if (!confirm(_('save_confirm'))) return;
    } else {
      if (!confirm(_('save_confirm'))) return;
    }
    this.editor.value = ''; this.fileName = null; this.beats = []; this.titleData = null;
    this._prevText = null;
    this.projectName = ''; localStorage.setItem('fw_beats', '[]');
    localStorage.removeItem('fw_title'); localStorage.removeItem('fw_char_data');
    localStorage.removeItem('fw_project_name'); localStorage.removeItem('fw_scene_colors');
    localStorage.removeItem('fw_acts'); localStorage.removeItem('fw_line_marks');
    this.projetoData = null; localStorage.removeItem('fw_projeto');
    this._excalidrawScene = { elements: [], appState: {} };
    this.renderBeats(); this.update();
  },
  openFile() { document.getElementById('file-input').click(); },
  saveFile() {
    const blob = new Blob([this.editor.value], { type: 'text/plain;charset=utf-8' });
    const a = document.getElementById('download-link');
        a.href = URL.createObjectURL(blob); a.download = this.fileName || (lang === 'pt-BR' ? 'roteiro' : 'script') + '.fountain'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    this.isModified = false;
    this.updateIndicator();
  },

  async saveProject() {
    const data = {
      name: this.projectName || 'roteiro',
      draft: this.editor.value,
      beats: this.beats,
      titleData: this.titleData,
      charData: safeJSON('fw_char_data', '{}'),
      sceneColors: this.sceneColors,
      acts: this.getActs(),
      lineMarks: this.getLineMarks(),
      projeto: this.projetoData,
      darkMode: this.darkMode,
      wordGoal: this.wordGoal,
      fontSize: this.fontSize,
      soundOn: this.soundOn,
      timelineVisible: this.timelineVisible,
      previewMode: this.previewMode,
      viewMode: this.viewMode,
      focusOn: this.focusOn,
      lang: lang,
      updated: new Date().toISOString()
    };
    const defaultName = this.projectName || (lang === 'pt-BR' ? 'roteiro' : 'script');
    const name = defaultName + '.fountain.json';
    if (window.showSaveFilePicker && this._fileHandle) {
      try {
        const writable = await this._fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        this.isModified = false; this.updateIndicator();
        localStorage.setItem('fw_project_saved', 'true'); return;
      } catch (e) { this._fileHandle = null; }
    }
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: name,
          types: [{ description: 'Fountain JSON', accept: { 'application/json': ['.json'] } }]
        });
        this._fileHandle = handle;
        const writable = await handle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
      } catch (e) { return; }
    } else {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.getElementById('download-link');
      a.href = URL.createObjectURL(blob); a.download = name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    }
    this.isModified = false; this.updateIndicator();
    localStorage.setItem('fw_project_saved', 'true');
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
          this._excalidrawScene = { elements: [], appState: {} };
          this.editor.value = data.draft || '';
          this._prevText = null;
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
          if (data.lineMarks) localStorage.setItem('fw_line_marks', JSON.stringify(data.lineMarks));
          if (data.timelineVisible !== undefined) this.timelineVisible = data.timelineVisible;
          if (data.focusOn) { this.focusOn = data.focusOn; document.body.classList.toggle('focus-mode', this.focusOn); }
          if (data.lang) { lang = data.lang; localStorage.setItem('fw_lang', lang); }
          if (data.previewMode !== undefined) this.previewMode = data.previewMode;
          if (data.viewMode !== undefined) this.viewMode = data.viewMode;
          if (data.projeto !== undefined) { this.projetoData = data.projeto; localStorage.setItem('fw_projeto', JSON.stringify(data.projeto)); }
          localStorage.setItem('fw_title', JSON.stringify(this.titleData));
          localStorage.setItem('fw_beats', JSON.stringify(this.beats));
          localStorage.setItem('fw_project_name', this.projectName);
          localStorage.setItem('fw_scene_colors', JSON.stringify(this.sceneColors));
          const defaultFileName = lang === 'pt-BR' ? 'roteiro' : 'script';
      this.fileName = file.name.replace(/\.(?:fountain\.)?json$/, '.fountain');
          this.saveBeats();
          this.update();
          this.syncBeatsFromScenes(this.editor.value);
          this.renderBeats();
        } catch (err) { alert(_('err_import') + ': ' + err.message); }
      };
      reader.readAsText(file, 'UTF-8');
    };
    input.click();
  },
  /* Shared by exportHTML/printPDF (and updatePreview has its own inline
   * copy, since it also needs result.html.title_page). Centralizing this
   * is what the exportHTML/printPDF drift bug above was really about:
   * two copies of the same fallback logic, one of which stops getting
   * updates. */
  _renderScriptHtml(text) {
    try { return Fountain.parse(text).html.script; }
    catch (e) { return this.simpleRender(text); }
  },

  /* Base rules shared by both standalone-HTML outputs; forPrint layers on
   * the page-break/pagination rules that only make sense for a paginated
   * document, not a scrolling HTML page. Same selectors can appear twice
   * — CSS just adds the extra declarations, so this stays simple string
   * concatenation instead of conditional interpolation inside each rule. */
  _scriptStylesheet(forPrint) {
    let css =
      'body{font-family:"Courier New",monospace;font-size:12pt;line-height:1.2}' +
      'h3{font-weight:bold;text-transform:uppercase;margin:2.5em 0 0.25em}' +
      'h4{text-transform:uppercase;margin:0 0 0 37%}' +
      'p{margin:1em 0}' +
      'p.parenthetical{margin-left:31%;margin-right:33%}' +
      '.dialogue p{margin-left:20%;margin-right:20%}' +
      'h2{text-align:right;text-transform:uppercase;margin:2em 0}' +
      'p.section{text-align:center;font-weight:bold;text-transform:uppercase;margin:3em 0}' +
      'p.synopsis{display:none}' +
      '.dual-dialogue{display:flex;gap:4%}' +
      '.dual-dialogue .dialogue{flex:1}' +
      '.dual-dialogue .dialogue p{margin-left:0;margin-right:0}' +
      '.dual-dialogue h4{margin-left:0;text-align:center}';
    if (forPrint) {
      css +=
        '@media print{@page{margin:0.75in;size:A4}}' +
        'h3{page-break-after:avoid;break-after:avoid}' +
        'h4{page-break-after:avoid;break-after:avoid;page-break-inside:avoid}' +
        'p{orphans:2;widows:2}' +
        'p.parenthetical{page-break-after:avoid;break-after:avoid}' +
        '.dialogue{page-break-before:avoid;break-before:avoid}' +
        'h2{page-break-before:avoid;break-before:avoid}' +
        '.dual-dialogue .dialogue{page-break-inside:avoid}' +
        'hr{border:none;page-break-after:always;break-after:page;margin:0}';
    }
    return css;
  },

  openExportModal() {
    document.getElementById('export-modal').style.display = 'flex';
  },
  closeExportModal() {
    document.getElementById('export-modal').style.display = 'none';
  },
  _getExportSections() {
    return {
      titlePage: document.getElementById('exp-include-title').checked,
      filmSheet: document.getElementById('exp-include-ficha').checked,
      structure: document.getElementById('exp-include-estrutura').checked,
    };
  },
  doExportHTML() {
    const sec = this._getExportSections();
    this.closeExportModal();
    const html = this._renderScriptHtml(this.editor.value);
    const title = this.fileName || 'Roteiro';
    const titleHtml = this.titleData ? this.renderTitleHTML(this.titleData, sec) : '';
    const full = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title><style>' +
      'body{max-width:800px;margin:40px auto;padding:60px 80px}' +
      this._scriptStylesheet(false) +
      '</style></head><body>' +
      (titleHtml ? titleHtml + '<hr>' : '') + this.processHighlights(html) + '</body></html>';
    const blob = new Blob([full], { type: 'text/html;charset=utf-8' });
    const a = document.getElementById('download-link');
    a.href = URL.createObjectURL(blob); a.download = (this.fileName || 'roteiro').replace(/\.fountain$/, '') + '.html'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 500);
  },
  doExportPDF() {
    const sec = this._getExportSections();
    this.closeExportModal();
    const scriptHtml = this._renderScriptHtml(this.editor.value);
    const title = this.fileName || 'Roteiro';
    const titleHtml = this.titleData ? this.renderTitleHTML(this.titleData, sec) : '';
    const html = '<!DOCTYPE html><html><head><title>' + title + '</title><style>' +
      this._scriptStylesheet(true) +
      '</style></head><body><div id="print-area">' +
      (titleHtml ? titleHtml + '<hr>' : '') + this.processHighlights(scriptHtml) + '</div></body></html>';
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
    return safeJSON('fw_line_marks', '{}');
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
    html += '<p><b>' + _('stats_top_chars') + '</b></p>';
    const top = Object.entries(charSpeech).sort((a, b) => b[1] - a[1]).slice(0, 8);
    if (top.length === 0) html += '<p style="color:var(--fg-sec)">' + _('empty_chars') + '</p>';
    else top.forEach(([name, count]) => {
      html += '<div style="display:flex;gap:8px"><span style="flex:1;font-weight:bold">' + esc(name) + '</span><span>' + count + _('stats_lines') + '</span></div>';
    });
    html += '</div>';
    document.getElementById('stats-body').innerHTML = html;
    document.getElementById('stats-modal').style.display = 'flex';
  },

  closeStats() { document.getElementById('stats-modal').style.display = 'none'; },
  openHelp() { document.getElementById('help-modal').style.display = 'flex'; },

  closeHelp() { document.getElementById('help-modal').style.display = 'none'; },

  openApoio() { document.getElementById('apoio-modal').style.display = 'flex'; },
  closeApoio() { document.getElementById('apoio-modal').style.display = 'none'; },

  copiarPix() {
    const chave = 'ricardograca@ricolandia.com';
    navigator.clipboard.writeText(chave).then(() => {
      const el = document.querySelector('[onclick*="copiarPix"]');
      const orig = el.textContent;
      el.textContent = '✓ Copiado!';
      setTimeout(() => { el.textContent = orig; }, 2000);
    }).catch(() => {});
  },

  openExcalidraw() {
    const hasScene = this._excalidrawScene && this._excalidrawScene.elements && this._excalidrawScene.elements.length > 0;
    document.getElementById('excalidraw-placeholder').style.display = hasScene ? 'none' : 'flex';
    document.getElementById('excalidraw-iframe').style.display = hasScene ? 'block' : 'none';
    document.getElementById('excalidraw-modal').style.display = 'flex';
    if (hasScene) {
      const iframe = document.querySelector('#excalidraw-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'LOAD_SCENE', scene: this._excalidrawScene }, '*');
      }
    }
  },
  excalidrawStart() {
    this._excalidrawScene = { elements: [], appState: {} };
    document.getElementById('excalidraw-placeholder').style.display = 'none';
    const iframe = document.getElementById('excalidraw-iframe');
    iframe.style.display = 'block';
    iframe.src = 'index.excalidraw.html';
  },
  closeExcalidraw() {
    if (!confirm(_('excalidraw_unsaved'))) return;
    document.getElementById('excalidraw-modal').style.display = 'none';
  },
  toggleExcalidrawFullscreen() {
    const modal = document.querySelector('.excalidraw-modal');
    const btn = document.getElementById('excalidraw-fullscreen-btn');
    modal.classList.toggle('excalidraw-fullscreen');
    btn.textContent = modal.classList.contains('excalidraw-fullscreen') ? '✕' : '⛶';
  },
  _excalidrawScene: { elements: [], appState: {} },

  _setupExcalidrawListener() {
    window.addEventListener('message', (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'EXCALIDRAW_READY') {
        const iframe = document.querySelector('#excalidraw-modal iframe');
        if (iframe) {
          iframe.contentWindow.postMessage({ type: 'LOAD_SCENE', scene: this._excalidrawScene }, '*');
        }
      }
      if (e.data.type === 'SCENE_DATA') {
        this._excalidrawScene = e.data.scene || null;
      }
    });
  },
  openFountainGuide() {
    document.getElementById('help-modal').style.display = 'flex';
    this.selHelpTab('fountain');
  },

  /* ── Character editing ── */
  openChar(name) {
    const data = safeJSON('fw_char_data', '{}');
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
    const data = safeJSON('fw_char_data', '{}');
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
    const data = safeJSON('fw_char_data', '{}');
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
    const data = safeJSON('fw_productivity', '{}');
    data[today] = words;
    // Keep last 30 days
    const keys = Object.keys(data).sort();
    if (keys.length > 30) { delete data[keys[0]]; }
    localStorage.setItem('fw_productivity', JSON.stringify(data));
  },

  renderProductivity() {
    const el = document.getElementById('productivity-chart');
    if (!el) return;
    const data = safeJSON('fw_productivity', '{}');
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
      el.innerHTML = text;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = _(el.dataset.i18nPlaceholder);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = _(el.dataset.i18nTitle);
      el.setAttribute('aria-label', _(el.dataset.i18nTitle));
    });
    document.getElementById('lang-btn').textContent = lang === 'pt-BR' ? 'PT' : 'EN';
    document.title = 'Fonte';
    const pixRow = document.getElementById('pix-entry');
    if (pixRow) pixRow.closest('p').style.display = lang === 'pt-BR' ? 'block' : 'none';
    if (typeof structureOpts !== 'undefined') this.populateStructureSelects();
  },

  populateStructureSelects() {
    const idx = lang === 'pt-BR' ? 0 : 1;
    Object.keys(structureOpts).forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      Array.from(sel.options).forEach(opt => {
        if (!opt.value) return;
        const pair = structureOpts[id].find(p => p[0] === opt.value);
        if (pair) opt.textContent = pair[idx];
      });
    });
  },

  /* ── Focus mode ── */
  toggleFocus() {
    this.focusOn = !this.focusOn;
    document.body.classList.toggle('focus-mode', this.focusOn);
    if (this.focusOn) { this.editor.focus(); }
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
    if (e.ctrlKey && e.key === '1') { e.preventDefault(); this.markHighlight('!'); }
    if (e.ctrlKey && e.key === '2') { e.preventDefault(); this.markHighlight('*'); }
    if (e.ctrlKey && e.key === '3') { e.preventDefault(); this.markHighlight('?'); }
    if (e.ctrlKey && e.key === '=') { e.preventDefault(); this.zoomIn(); }
    if (e.ctrlKey && e.key === '-') { e.preventDefault(); this.zoomOut(); }
    if (e.ctrlKey && e.key === '0') { e.preventDefault(); this.zoomReset(); }
    const ac = document.getElementById('autocomplete-box');
    if (ac.style.display !== 'none') {
      const items = ac.querySelectorAll('.ac-item');
      let hover = ac.querySelector('.hover');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = hover ? hover.nextElementSibling : items[0];
        if (next) { if (hover) hover.classList.remove('hover'); next.classList.add('hover'); }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = hover ? hover.previousElementSibling : items[items.length - 1];
        if (prev) { if (hover) hover.classList.remove('hover'); prev.classList.add('hover'); }
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (hover) hover.click();
      } else if (e.key === 'Escape') {
        this._hideAutocomplete();
      }
      return;
    }
    if (e.key === 'Enter') {
      this.syncBeatsFromScenes(this.editor.value);
    }
  },

  _getCharacterNamesMap(text) {
    const chars = {};
    const lines = text.split('\n');
    let prev = 'ACTION';
    lines.forEach(line => {
      const t = guessType(line, prev);
      if (t === 'CHARACTER') { const n = line.trim().toUpperCase(); chars[n] = (chars[n] || 0) + 1; }
      if (t !== 'BLANK') prev = t;
    });
    return chars;
  },

  _showAutocomplete() {
    const ta = this.editor;
    const line = ta.value.slice(0, ta.selectionStart).split('\n').length - 1;
    const lines = ta.value.split('\n');
    const currentLine = lines[line] || '';
    const prevType = line > 0 ? guessType(lines[line - 1], 'ACTION') : 'ACTION';
    const curType = guessType(currentLine, prevType);
    const text = currentLine.trim();
    if (curType !== 'CHARACTER' || !text || text.length < 1) { this._hideAutocomplete(); return; }
    const chars = this._getCharacterNamesMap(ta.value);
    const matching = Object.keys(chars).filter(n => n.startsWith(text)).sort((a, b) => chars[b] - chars[a]);
    if (matching.length === 0 || (matching.length === 1 && matching[0] === text)) { this._hideAutocomplete(); return; }
    const box = document.getElementById('autocomplete-box');
    box.innerHTML = '';
    matching.forEach(name => {
      const div = document.createElement('div');
      div.className = 'ac-item';
      div.innerHTML = '<span>' + esc(name) + '</span><span class="ac-count">' + chars[name] + '</span>';
      div.addEventListener('mousedown', e => { e.preventDefault(); this._insertAutocomplete(name); });
      div.addEventListener('mouseenter', () => { box.querySelectorAll('.hover').forEach(el => el.classList.remove('hover')); div.classList.add('hover'); });
      box.appendChild(div);
    });
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 18;
    const lineTop = line * lh - ta.scrollTop;
    const wrap = ta.closest('#textarea-wrap');
    const padLeft = parseFloat(getComputedStyle(wrap).paddingLeft) || 60;
    const availableBelow = wrap.clientHeight - lineTop - lh;
    if (availableBelow > 120) {
      box.style.top = (lineTop + lh + 2) + 'px';
    } else {
      box.style.top = Math.max(0, lineTop - 120) + 'px';
    }
    box.style.left = padLeft + 'px';
    box.style.display = 'block';
  },

  _hideAutocomplete() {
    document.getElementById('autocomplete-box').style.display = 'none';
  },

  _insertAutocomplete(name) {
    const ta = this.editor;
    const line = ta.value.slice(0, ta.selectionStart).split('\n').length - 1;
    const lines = ta.value.split('\n');
    const before = lines.slice(0, line).join('\n');
    const after = lines.slice(line + 1).join('\n');
    const prefix = before ? '\n' : '';
    const suffix = after ? '\n' : '';
    ta.value = before + prefix + name + suffix + after;
    const pos = (before + prefix + name).length;
    ta.selectionStart = ta.selectionEnd = pos;
    this._hideAutocomplete();
    this.update();
  },

  shareProject() {
    const data = {
      name: this.projectName || _('tb_project_name'),
      draft: this.editor.value,
      beats: this.beats,
      titleData: this.titleData,
      updated: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const file = new File([blob], (this.projectName || (lang === 'pt-BR' ? 'roteiro' : 'script')) + '.fountain.json', { type: 'application/json' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Fonte - ' + (this.projectName || 'Roteiro') }).catch(() => {});
    } else {
      const a = document.getElementById('download-link');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      this._showToast();
    }
  },

  _showToast() {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = _('tb_share_toast');
    el.style.display = 'block';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { el.style.display = 'none'; }, 4000);
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
    clearTimeout(this._timerHandle);
    document.getElementById('timer-start-btn').textContent = '▶';
    this.displayTimer();
  },

  toggleTimer() {
    this.timerOn = !this.timerOn;
    document.getElementById('timer-start-btn').textContent = this.timerOn ? '⏸' : '▶';
    // Without this, pausing doesn't cancel the tick() already scheduled a
    // second out — resuming before it fires starts a second parallel
    // chain, and the counter starts incrementing twice as fast per cycle.
    clearTimeout(this._timerHandle);
    if (this.timerOn) this.tick();
  },

  resetTimer() {
    this.timerOn = false;
    this.timerSec = 0;
    this.pomodoroSec = 25 * 60;
    clearTimeout(this._timerHandle);
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
    if (this.timerOn) this._timerHandle = setTimeout(() => this.tick(), 1000);
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
  initAutoSave() {
    setInterval(() => {
      try {
        localStorage.setItem('fw_draft', this.editor.value);
        this.saveBeats();
        this.saveActs(this.getActs());
      } catch (e) { console.warn('Fonte: auto-save falhou', e); }
    }, 10000);
  },

  /* ── Auto-backup ── */
  initBackup() {
    setInterval(() => {
      const text = this.editor.value;
      if (!text.trim()) return;
      try {
        const backups = safeJSON('fw_backups', '[]');
        backups.push({
          text, beats: this.beats, acts: this.getActs(),
          sceneColors: this.sceneColors, lineMarks: this.getLineMarks(),
          name: this.fileName || 'roteiro', time: Date.now()
        });
        if (backups.length > 10) backups.splice(0, backups.length - 10);
        localStorage.setItem('fw_backups', JSON.stringify(backups));
      } catch (e) { console.warn('Fonte: backup falhou', e); }
    }, 300000); // 5 minutes
  },

  openBackups() {
    const backups = safeJSON('fw_backups', '[]');
    let html = '';
    if (backups.length === 0) {
      html = '<p style="color:var(--fg-sec)">' + _('backup_none') + '</p>';
    } else {
      html = '<div style="font-size:10pt;max-height:300px;overflow-y:auto">';
      for (let i = backups.length - 1; i >= 0; i--) {
        const b = backups[i];
        const date = new Date(b.time);
        const label = date.toLocaleDateString(lang) + ' ' + date.toLocaleTimeString(lang);
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
    const backups = safeJSON('fw_backups', '[]');
    if (idx < 0 || idx >= backups.length) return;
    if (!confirm(_('backup_restore_confirm'))) return;
    this.editor.value = backups[idx].text;
    this._prevText = null;
    this.fileName = backups[idx].name;
    if (backups[idx].beats) { this.beats = backups[idx].beats; this.saveBeats(); }
    if (backups[idx].acts) { this.saveActs(backups[idx].acts); }
    // Older backups (before this field existed) have no colors/marks
    // saved at all — reset to empty rather than leave the CURRENT
    // draft's colors/highlights keyed to line numbers that likely mean
    // something completely different in the restored (older) text.
    this.sceneColors = backups[idx].sceneColors || {};
    localStorage.setItem('fw_scene_colors', JSON.stringify(this.sceneColors));
    this.saveLineMarks(backups[idx].lineMarks || {});
    this.update();
    this.renderBeats();
    this.closeBackups();
  },

  closeBackups() { document.getElementById('backup-modal').style.display = 'none'; },
};

/* ── Helper ── */
function guessType(text, prev) {
  const c = text.trim();
  if (!c) return 'BLANK';

  // Fountain 1.1 force markers
  if (c.startsWith('!')) return 'ACTION';
  if (c.startsWith('@')) return 'CHARACTER';
  if (c.startsWith('>') && c.endsWith('<')) return 'CENTER';

  // Force scene / transition (Fountain 1.1)
  if (c.startsWith('.') && !/^\.{2,}/.test(c)) return 'SCENE';
  if (c.startsWith('>') && !c.endsWith('<')) return 'TRANSITION';

  // Sections: # Title, ## Subtitle, etc. — lib nativa
  if (Fountain.regex.section.test(c)) return 'ACTION';

  // Scene heading: INT/EXT/EST/I/E — lib nativa
  if (Fountain.regex.scene_heading.test(c)) return 'SCENE';

  // Transitions: CUT TO:, FADE OUT., etc. — lib nativa
  if (Fountain.regex.transition.test(c)) return 'TRANSITION';

  // Parenthetical — lib nativa
  if (Fountain.regex.parenthetical.test(c)) return 'PARENTHETICAL';

  // Non-printing elements: must be checked before dialogue to prevent
  // context leak (synopsis after CHARACTER would become "DIALOGUE").
  // Synopses: = text — lib nativa
  if (Fountain.regex.synopsis.test(c)) return 'ACTION';
  // Notes: [[ text ]] — lib nativa
  if (Fountain.regex.note.test(c)) return 'ACTION';
  // Page breaks: ===
  if (Fountain.regex.page_break.test(c)) return 'ACTION';
  // Boneyard delimiters
  if (/^\/\*$|^\*\/$/.test(c)) return 'ACTION';

  // Character name (keep caseiro — lib version expects 2 lines)
  if (/^[A-ZÀ-Ú][A-ZÀ-Ú0-9\s\(\)\.\-']+$/.test(c)) return 'CHARACTER';

  // Dialogue follows character/parenthetical/dialogue
  if (prev === 'CHARACTER' || prev === 'PARENTHETICAL' || prev === 'DIALOGUE') return 'DIALOGUE';

  return 'ACTION';
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/'/g,'&#39;').replace(/"/g,'&quot;'); }

/* ── File input handler ── */
document.getElementById('file-input').addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 50 * 1024 * 1024) {
    alert(_('err_file_size'));
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => { app.editor.value = ev.target.result; app._prevText = null; app.fileName = file.name; app.update(); app.syncBeatsFromScenes(app.editor.value); };
  reader.readAsText(file, 'UTF-8');
  e.target.value = '';
});

/* ── Boot ── */
document.addEventListener('DOMContentLoaded', () => app.init());

/* ── Service Worker (PWA) ── */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
