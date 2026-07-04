# SESSION.md — Fountain Writer (Web)

Projeto: `/home/ricardo/Documentos/31_APPS_GITHUB/Fountain-Writer-Tool/web`
Stack: HTML5, CSS3, JavaScript (ES6+), localStorage

---

## Estrutura

```
web/
├── index.html              ← Página principal (textarea + preview + painéis)
├── css/
│   └── app.css             ← Tema claro/escuro + formatação Fountain
├── js/
│   ├── app.js              ← Lógica principal (~1100 linhas)
│   ├── fountain-parser.js  ← Parser Trilium
│   ├── codemirror-fountain.js ← (não usado — mantido para referência)
│   └── i18n.js             ← Internacionalização PT/EN
├── README.md               ← Documentação bilíngue
└── server.py               ← FastAPI (PDF export opcional)
```

---

## Funcionalidades

- Editor textarea puro com auto-save
- Preview ao vivo com parser Trilium (CHARACTER 37%, DIALOGUE 20%)
- Scene navigator (lista + cards) com drag reorder
- CRUD de beats com inserção no texto
- Characters/Locations extraídos automaticamente
- Find/Replace com case-sensitive
- Folha de rosto (formulário em localStorage)
- Título do projeto editável
- Side-by-side editor/preview/split
- Temas claro/escuro (automático + manual)
- Idioma Português/English (recarregamento)
- Export HTML/PDF (API ou window.print)
- Pomodoro timer + cronômetro de escrita
- Metas diárias de palavras
- Highlights coloridos (revisar/OK/problema)
- Auto-backup a cada 5 minutos com restore
- Timeline de beats por ato
- Estatísticas detalhadas
- Som de tecla (AudioContext singleton)
- Gráfico de produtividade (últimos 7 dias)
- Zoom editor (Ctrl++/-)
- Atalhos Markdown (Ctrl+B/I/U)
- Modo foco (F11)
- Ações por clique direito (forçar tipo de linha)
- Responsivo (mobile/tablet/desktop)

---

## Como executar

Abra `web/index.html` em qualquer navegador moderno.

---

## Bugs conhecidos / Melhorias pendentes

- Mobile: painéis beats/chars/locs e scene navigator inacessíveis
- deleteBeat sem confirmação
- Scene card drag pode usar índice stale
- Trocar idioma com texto não salvo perde até 10s
- Sem Escape para fechar modais
- `simpleRender` não trata `> texto <` (centered)
- `_()` só substitui primeiro `{n}`
- Dark mode manual não volta ao automático
- Botão 🔊/⏱ não atualiza menu mobile
