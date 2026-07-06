const Fountain = (function () {

    const regex = {
        title_page:            /^((?:title|credit|author[s]?|source|notes|draft date|date|contact|copyright)\:)/gim,
        scene_heading:         /^((?:\*{0,3}_?)?(?:(?:int|ext|est|i\/e)[. ]).+)|^(?:\.(?!\.+))(.+)/i,
        scene_number:          / *#(.+)# */,
        transition:            /^((?:FADE (?:TO BLACK|OUT)|CUT TO BLACK)\.|.+ TO\:)|^(?:> *)(.+)/,
        dialogue:              /^([A-ZÀ-Ú*_]+[0-9A-ZÀ-Ú (._\-')]*)(\^?)?(?:\n(?!\n+))([\s\S]+)/,
        parenthetical:         /^(\(.+\))$/,
        centered:              /^(?:> *)(.+)(?: *<)(\n.+)*/g,
        section:               /^(#+)(?: *)(.*)/,
        synopsis:              /^(?:=(?!=+) *)(.*)/,
        note:                  /^(?:\[{2}(?!\[+))(.+)(?:\]{2}(?!\[+))$/,
        note_inline:           /(?:\[{2}(?!\[+))([\s\S]+?)(?:\]{2}(?!\[+))/g,
        boneyard:              /(^\/\*|^\*\/)$/g,
        page_break:            /^={3,}$/,
        line_break:            /^ {2}$/,
        bold_italic_underline: /(_{1}\*{3}(?=.+\*{3}_{1})|\*{3}_{1}(?=.+_{1}\*{3}))(.+?)(\*{3}_{1}|_{1}\*{3})/g,
        bold_underline:        /(_{1}\*{2}(?=.+\*{2}_{1})|\*{2}_{1}(?=.+_{1}\*{2}))(.+?)(\*{2}_{1}|_{1}\*{2})/g,
        italic_underline:      /(?:_{1}\*{1}(?=.+\*{1}_{1})|\*{1}_{1}(?=.+_{1}\*{1}))(.+?)(\*{1}_{1}|_{1}\*{1})/g,
        bold_italic:           /(\*{3}(?=.+\*{3}))(.+?)(\*{3})/g,
        bold:                  /(\*{2}(?=.+\*{2}))(.+?)(\*{2})/g,
        italic:                /(\*{1}(?=.+\*{1}))(.+?)(\*{1})/g,
        underline:             /(_{1}(?=.+_{1}))(.+?)(_{1})/g,
        splitter:              /\n{2,}/g,
        cleaner:               /^\n+|\n+$/,
        standardizer:          /\r\n|\r/g,
        whitespacer:           /^\t+|^ {3,}/gm,
    };

    const INLINE_ORDER = [
        'underline','italic','bold','bold_italic',
        'italic_underline','bold_underline','bold_italic_underline'
    ];

    const inlineReplace = {
        note:                 '<!-- $1 -->',
        line_break:           '<br />',
        bold_italic_underline:'<span class="bold italic underline">$2</span>',
        bold_underline:       '<span class="bold underline">$2</span>',
        italic_underline:     '<span class="italic underline">$2</span>',
        bold_italic:          '<span class="bold italic">$2</span>',
        bold:                 '<span class="bold">$2</span>',
        italic:               '<span class="italic">$2</span>',
        underline:            '<span class="underline">$2</span>',
    };

    function lexer(text) {
        if (!text) return text;
        text = text
            .replace(regex.note_inline, inlineReplace.note)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/\\\*/g, '[STAR]')
            .replace(/\\_/g,  '[UL]')
            .replace(/\n/g,   inlineReplace.line_break);
        for (const key of INLINE_ORDER) {
            if (regex[key].test(text)) text = text.replace(regex[key], inlineReplace[key]);
        }
        return text.replace(/\[STAR\]/g, '*').replace(/\[UL\]/g, '_').trim();
    }

    function parse(script) {
        const blocks = script
            .replace(regex.boneyard,     '\n$1\n')
            .replace(regex.standardizer, '\n')
            .replace(regex.cleaner,      '')
            .replace(regex.whitespacer,  '')
            .split(regex.splitter);

        const tokens   = [];
        let dualRight  = false;

        for (let i = blocks.length - 1; i >= 0; i--) {
            const line = blocks[i];
            let match;

            if (regex.title_page.test(line)) {
                const pairs = line
                    .replace(regex.title_page, '\n$1')
                    .split(regex.splitter)
                    .reverse();
                for (const pair of pairs) {
                    const parts = pair.replace(regex.cleaner, '').split(/:\n*/);
                    tokens.push({
                        type: parts[0].trim().toLowerCase().replace(' ', '_'),
                        text: (parts[1] || '').trim()
                    });
                }
                continue;
            }

            // Force markers (Fountain 1.1)
            if (line.startsWith('!')) {
                tokens.push({ type: 'action', text: line.slice(1).trim() });
                continue;
            }
            if (line.startsWith('@')) {
                tokens.push({ type: 'character', text: line.slice(1).trim() });
                continue;
            }
            if (line.startsWith('>') && !line.endsWith('<')) {
                tokens.push({ type: 'transition', text: line.slice(1).trim() });
                continue;
            }
            if (line.startsWith('.') && !line.startsWith('..')) {
                tokens.push({ type: 'scene_heading', text: line.slice(1).trim() });
                continue;
            }

            if ((match = line.match(regex.scene_heading))) {
                let text = match[1] || match[2];
                if (text.endsWith('  ')) continue;
                let sceneNum;
                const sn = text.match(regex.scene_number);
                if (sn) { sceneNum = sn[1]; text = text.replace(regex.scene_number, ''); }
                tokens.push({ type: 'scene_heading', text, scene_number: sceneNum });
                continue;
            }

            if ((match = line.match(/^(?:> *)(.+)(?: *<)$/))) {
                tokens.push({ type: 'centered', text: match[1] });
                continue;
            }

            if ((match = line.match(regex.transition))) {
                tokens.push({ type: 'transition', text: match[1] || match[2] });
                continue;
            }

            if ((match = line.match(regex.dialogue)) && !match[1].endsWith('  ')) {
                if (match[2]) tokens.push({ type: 'dual_dialogue_end' });
                tokens.push({ type: 'dialogue_end' });

                const parts = match[3].split(/(\(.+\))(?:\n+)/).reverse();
                for (const part of parts) {
                    if (part.trim().length > 0) {
                        tokens.push({
                            type: regex.parenthetical.test(part.trim()) ? 'parenthetical' : 'dialogue',
                            text: part
                        });
                    }
                }

                tokens.push({ type: 'character', text: match[1].trim() });
                tokens.push({
                    type: 'dialogue_begin',
                    dual: match[2] ? 'right' : dualRight ? 'left' : undefined
                });
                if (dualRight) tokens.push({ type: 'dual_dialogue_begin' });
                dualRight = !!match[2];
                continue;
            }

            if ((match = line.match(regex.section))) {
                tokens.push({ type: 'section', text: match[2], depth: match[1].length });
                continue;
            }

            if ((match = line.match(regex.synopsis))) {
                tokens.push({ type: 'synopsis', text: match[1] });
                continue;
            }

            if ((match = line.match(regex.note))) {
                tokens.push({ type: 'note', text: match[1] });
                continue;
            }

            if ((match = line.match(regex.boneyard))) {
                tokens.push({ type: match[0][0] === '/' ? 'boneyard_begin' : 'boneyard_end' });
                continue;
            }

            if (regex.page_break.test(line)) { tokens.push({ type: 'page_break' }); continue; }
            if (regex.line_break.test(line)) { tokens.push({ type: 'line_break' }); continue; }

            tokens.push({ type: 'action', text: line });
        }

        const titleHtml  = [];
        const scriptHtml = [];
        let   title      = '';

        for (let i = tokens.length - 1; i >= 0; i--) {
            const t = tokens[i];
            if (t.text !== undefined) t.text = lexer(t.text);

            switch (t.type) {
                case 'title':
                    titleHtml.push(`<h1>${t.text}</h1>`);
                    title = t.text.replace('<br />', ' ').replace(/<[^>]*>/g, '');
                    break;
                case 'credit':    titleHtml.push(`<p class="credit">${t.text}</p>`);    break;
                case 'author':
                case 'authors':   titleHtml.push(`<p class="authors">${t.text}</p>`);   break;
                case 'source':    titleHtml.push(`<p class="source">${t.text}</p>`);    break;
                case 'notes':     titleHtml.push(`<p class="notes">${t.text}</p>`);     break;
                case 'draft_date':titleHtml.push(`<p class="draft-date">${t.text}</p>`);break;
                case 'date':      titleHtml.push(`<p class="date">${t.text}</p>`);      break;
                case 'contact':   titleHtml.push(`<p class="contact">${t.text}</p>`);   break;
                case 'copyright': titleHtml.push(`<p class="copyright">${t.text}</p>`); break;

                case 'scene_heading':
                    scriptHtml.push(`<h3${t.scene_number ? ` id="${t.scene_number}"` : ''}>${t.text}</h3>`);
                    break;
                case 'transition':
                    scriptHtml.push(`<h2>${t.text}</h2>`);
                    break;
                case 'dual_dialogue_begin':
                    scriptHtml.push('<div class="dual-dialogue">');
                    break;
                case 'dialogue_begin':
                    scriptHtml.push(`<div class="dialogue${t.dual ? ' ' + t.dual : ''}">`);
                    break;
                case 'character':
                    scriptHtml.push(`<h4>${t.text}</h4>`);
                    break;
                case 'parenthetical':
                    scriptHtml.push(`<p class="parenthetical">${t.text}</p>`);
                    break;
                case 'dialogue':
                    scriptHtml.push(`<p>${t.text}</p>`);
                    break;
                case 'dialogue_end':
                case 'dual_dialogue_end':
                    scriptHtml.push('</div>');
                    break;
                case 'section':
                    scriptHtml.push(`<p class="section" data-depth="${t.depth}">${t.text}</p>`);
                    break;
                case 'synopsis':
                    scriptHtml.push(`<p class="synopsis">${t.text}</p>`);
                    break;
                case 'note':
                    scriptHtml.push(`<!-- ${t.text} -->`);
                    break;
                case 'boneyard_begin': scriptHtml.push('<!-- ');  break;
                case 'boneyard_end':   scriptHtml.push(' -->');   break;
                case 'action':
                    scriptHtml.push(`<p class="action">${t.text}</p>`);
                    break;
                case 'centered':
                    scriptHtml.push(`<p class="centered">${t.text}</p>`);
                    break;
                case 'page_break':
                    scriptHtml.push('<hr />');
                    break;
                case 'line_break':
                    scriptHtml.push('<br />');
                    break;
            }
        }

        return {
            title,
            html: {
                title_page: titleHtml.join('\n'),
                script:     scriptHtml.join('\n'),
            }
        };
    }

    return { parse, regex };
})();
