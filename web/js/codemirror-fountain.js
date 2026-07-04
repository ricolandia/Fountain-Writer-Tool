CodeMirror.defineMode("fountain", function() {
  const HEADING   = /^(INT|EXT|EST|I\/E)[.\s]/i;
  const TRANS     = /^[A-ZÀ-Ú\s]+(TO|PARA):$/;
  const CHAR      = /^[A-ZÀ-Ú][A-ZÀ-Ú0-9\s\(\)\.\-']+$/;
  const PAREN     = /^\s*\(.*\)\s*$/;
  const CENTER    = /^>.*<$/;
  const FORCE_ACT = /^!/;
  const FORCE_CHAR= /^@/;
  const FORCE_TRANS= /^>/;
  const FORCE_SCENE = /^\./;

  return {
    startState: function() { return { prev: 'action', force: null }; },

    token: function(stream, state) {
      if (stream.sol()) { state.force = null; }

      const line = stream.string.trim();

      if (line === '') {
        state.prev = 'blank';
        stream.skipToEnd();
        return null;
      }

      if (state.force) {
        state.prev = state.force;
        state.force = null;
        stream.skipToEnd();
        return state.prev;
      }

      if (line.startsWith('!')) {
        stream.skipToEnd();
        state.prev = 'action';
        return 'keyword action-force';
      }
      if (line.startsWith('@')) {
        stream.skipToEnd();
        state.prev = 'character';
        return 'def character-force';
      }
      if (line.startsWith('>') && line.endsWith('<')) {
        stream.skipToEnd();
        state.prev = 'action';
        return 'keyword centered';
      }
      if (line.startsWith('>')) {
        stream.skipToEnd();
        state.prev = 'transition';
        return 'keyword transition-force';
      }
      if (line.startsWith('.')) {
        stream.skipToEnd();
        state.prev = 'scene';
        return 'tag scene-force';
      }

      if (HEADING.test(line)) {
        stream.skipToEnd();
        state.prev = 'scene';
        return 'tag scene';
      }

      if (line.endsWith(':') && TRANS.test(line)) {
        stream.skipToEnd();
        state.prev = 'transition';
        return 'keyword transition';
      }

      if (CHAR.test(line) && !HEADING.test(line)) {
        stream.skipToEnd();
        state.prev = 'character';
        return 'def character';
      }

      if (PAREN.test(line)) {
        stream.skipToEnd();
        state.prev = 'parenthetical';
        return 'comment parenthetical';
      }

      if (state.prev === 'character' || state.prev === 'parenthetical' || state.prev === 'dialogue') {
        state.prev = 'dialogue';
        stream.skipToEnd();
        return 'string dialogue';
      }

      stream.skipToEnd();
      state.prev = 'action';
      return null;
    }
  };
});

CodeMirror.defineMIME("text/x-fountain", "fountain");
