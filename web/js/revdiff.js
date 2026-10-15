/* Fonte — revisões (o que mudou desde o início da revisão)
 *
 * O padrão da indústria marca as PÁGINAS alteradas com uma cor por rodada
 * (branco → azul → rosa → amarelo → verde → goldenrod → ...): é assim que a
 * equipe vê o que mudou desde a última entrega.
 *
 * Como o Fonte sabe o que mudou: quando o roteirista INICIA uma revisão, o app
 * guarda um resumo do roteiro daquele momento (um hash por BLOCO do parser —
 * ação, personagem+diálogo, título de cena, ...). Depois, comparar é rodar um
 * diff entre o resumo guardado e os blocos atuais.
 *
 * Por que por BLOCO e não por linha: os blocos já são a unidade do parser, o
 * que dispensa mapear número de linha (o app reescreve o texto em várias
 * passagens antes de tokenizar) e evita marcar como "revisado" o que só mudou
 * de posição. Granularidade resultante = parágrafo.
 *
 * Guardar HASHES (e não o texto) mantém o `.fountain.json` pequeno: ~1 número
 * por bloco. O risco de colisão é o de sempre em hash de 32 bits: num raríssimo
 * empate, um bloco revisado deixaria de ser marcado — nunca o contrário.
 *
 * Módulo puro (sem DOM): roda no `node --test`.
 */
const Revision = (function () {

    /* FNV-1a 32 bits. */
    function hashText(str) {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
        }
        return h >>> 0;
    }

    /* Chave do bloco: o TIPO entra junto do texto — virar uma ação em título de
     * cena (ou o inverso) é uma revisão, mesmo com o texto igual. */
    function blockKey(block) {
        return block.type + '\u0000' + (block.text === undefined ? '' : block.text);
    }

    function blockHashes(blocks) {
        return blocks.map(b => hashText(blockKey(b)));
    }

    /* Myers O(ND) — devolve os índices de B que CASARAM em ordem (o que sobra é
     * revisado), ou null quando estourou o teto `cap` (num roteiro totalmente
     * diferente o algoritmo para em vez de travar a página). */
    function matchIndices(a, b, cap) {
        const n = a.length, m = b.length;
        if (n === 0 || m === 0) return new Set();
        const max = Math.min(cap, n + m);
        const offset = max;
        const v = new Int32Array(2 * max + 1);
        const trace = [];
        let found = false;

        for (let d = 0; d <= max && !found; d++) {
            for (let k = -d; k <= d; k += 2) {
                let x;
                if (k === -d || (k !== d && v[offset + k - 1] < v[offset + k + 1])) x = v[offset + k + 1];
                else x = v[offset + k - 1] + 1;
                let y = x - k;
                while (x < n && y < m && a[x] === b[y]) { x++; y++; }
                v[offset + k] = x;
                if (x >= n && y >= m) { found = true; break; }
            }
            trace.push(v.slice());                 // trace[d] = V depois de d
        }
        if (!found) return null;

        /* Volta do fim para o começo coletando as diagonais (linhas iguais). */
        const matched = new Set();
        let x = n, y = m;
        for (let d = trace.length - 1; d >= 0; d--) {
            const vd = d > 0 ? trace[d - 1] : null;
            const k = x - y;
            let prevX = 0, prevY = 0;
            if (d > 0) {
                let prevK;
                if (k === -d || (k !== d && vd[offset + k - 1] < vd[offset + k + 1])) prevK = k + 1;
                else prevK = k - 1;
                prevX = vd[offset + prevK];
                prevY = prevX - prevK;
            }
            while (x > prevX && y > prevY) { matched.add(y - 1); x--; y--; }
            x = prevX; y = prevY;
        }
        return matched;
    }

    /* Prefixo/sufixo comuns — usado como plano B quando o diff estoura o teto. */
    function fallbackMatched(a, b) {
        const matched = new Set();
        const maxCommon = Math.min(a.length, b.length);
        let prefix = 0;
        while (prefix < maxCommon && a[prefix] === b[prefix]) { matched.add(prefix); prefix++; }
        let suffix = 0;
        while (suffix < maxCommon - prefix && a[a.length - 1 - suffix] === b[b.length - 1 - suffix]) {
            matched.add(b.length - 1 - suffix); suffix++;
        }
        return matched;
    }

    /* Compara a linha de base (hashes guardados) com os blocos de agora.
     * Devolve os índices REVISADOS (nos blocos atuais). */
    function diff(baselineHashes, blocks, options) {
        const o = options || {};
        const cap = Number.isFinite(Number(o.cap)) && Number(o.cap) >= 1 ? Math.floor(o.cap) : 4000;
        const base = Array.isArray(baselineHashes) ? baselineHashes : [];
        const current = blockHashes(blocks || []);

        let matched, approximate = false;
        if (base.length + current.length > 200000) {
            matched = fallbackMatched(base, current);      // roteiro gigante: nem tenta
            approximate = true;
        } else {
            matched = matchIndices(base, current, cap);
            if (matched === null) {
                /* Estourou o teto: usa prefixo/sufixo comuns e diz que o
                 * resultado é aproximado (esse modo erra marcando MAIS, que é o
                 * lado seguro para uma revisão). */
                matched = fallbackMatched(base, current);
                approximate = true;
            }
        }

        const revised = new Set();
        for (let i = 0; i < current.length; i++) if (!matched.has(i)) revised.add(i);

        return {
            revised,
            approximate,
            stats: {
                blocks: current.length,
                revised: revised.size,
                removed: base.length - matched.size,
            },
        };
    }

    /* Rótulo amigável do bloco (para debug/teste e para a mensagem do modal). */
    function describeBlock(block) {
        if (!block) return '';
        const t = block.text === undefined ? '' : String(block.text).replace(/\s+/g, ' ').trim();
        return t.length > 60 ? t.slice(0, 57) + '…' : t;
    }

    /* Sequência de cores das rodadas de revisão — a da indústria (papel
     * colorido, uma cor por rodada). "Branca" é o roteiro original: o branco
     * não apareceria no PDF, então a marca sai PRETA (é assim que a primeira
     * rodada é marcada no papel também). */
    const COLORS = [
        { id: 'branca',    hex: '#000000', pt: 'Branca',    en: 'White' },
        { id: 'azul',      hex: '#2f6fbd', pt: 'Azul',      en: 'Blue' },
        { id: 'rosa',      hex: '#d94f8c', pt: 'Rosa',      en: 'Pink' },
        { id: 'amarela',   hex: '#c9a800', pt: 'Amarela',   en: 'Yellow' },
        { id: 'verde',     hex: '#2e8b57', pt: 'Verde',     en: 'Green' },
        { id: 'goldenrod', hex: '#a87900', pt: 'Goldenrod', en: 'Goldenrod' },
        { id: 'buff',      hex: '#b99a5b', pt: 'Buff',      en: 'Buff' },
        { id: 'salmao',    hex: '#e06c5a', pt: 'Salmão',    en: 'Salmon' },
        { id: 'cereja',    hex: '#c0304a', pt: 'Cereja',    en: 'Cherry' },
    ];

    function colorById(id) {
        return COLORS.filter(c => c.id === id)[0] || COLORS[0];
    }

    function nextColor(id) {
        let i = -1;
        for (let k = 0; k < COLORS.length; k++) if (COLORS[k].id === id) i = k;
        return COLORS[(i + 1) % COLORS.length].id;
    }

    return { diff, blockHashes, hashText, blockKey, describeBlock,
             COLORS, colorById, nextColor };
})();
