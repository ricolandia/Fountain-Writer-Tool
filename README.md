# Fountain Writer

Editor de roteiros no formato **Fountain** — duas versões: **Desktop (PySide6)** e **Web (HTML/CSS/JS)**.

[![Forgejo MIRROR](https://img.shields.io/badge/Mirror-Forgejo-orange?logo=gitea)](https://repo.rizomatico.org/ricograca/Fountain-Writer-Tool)

---

## Escolha sua versão

| Versão | Stack | Como usar |
|--------|-------|-----------|
| **Desktop** (`desktop/`) | PySide6 (Qt6) | `pip install PySide6 reportlab` → `python3 desktop/main.py` |
| **Web** (`web/`) | HTML5 + CSS3 + JS | Abrir `web/index.html` no navegador |

---

## Desktop — `desktop/`

Editor desktop com syntax highlighting, navegador de cenas, beat board, busca/substituição, modo foco, export PDF, temas claro/escuro.

```
desktop/
├── main.py              ← Entry point
├── app/
│   ├── main_window.py   ← QMainWindow
│   ├── editor/          ← QPlainTextEdit, highlighter, line numbers
│   ├── dockers/         ← Scene navigator, beat board, character/location
│   ├── dialogs/         ← Find/replace, title page, help
│   ├── models/          ← Fountain parser + meta
│   └── core/            ← Config, i18n, theme, exporter
```

**Requisitos:** `pip install PySide6 reportlab`

```bash
python3 desktop/main.py
```

---

## Web — `web/`

Versão para navegador com preview ao vivo, pomodoro timer, timeline de beats, gráfico de produtividade, temas, i18n. Zero dependências (para uso local).

```
web/
├── index.html           ← Página principal
├── css/app.css          ← Tema claro/escuro
├── js/                  ← app.js, fountain-parser.js, i18n.js
├── server.py            ← FastAPI (PDF export opcional)
├── Dockerfile           ← Container da API
└── docker-compose.yml   ← Orquestração
```

**Uso local:** abrir `web/index.html` no navegador.

**API (PDF/HTML):**
```bash
cd web
docker compose up -d
# http://localhost:8000
```

---

## Recursos compartilhados

- `resources/lang/` — Traduções PT-BR / EN
- `resources/styles/` — QSS temas claro/escuro
- `imagens/` — Screenshots

---

## ⌨️ Atalhos (Desktop)

| Atalho | Ação |
|--------|------|
| `Ctrl+S` | Salvar |
| `Ctrl+O` | Abrir |
| `Ctrl+N` | Novo |
| `Ctrl+H/F` | Buscar e substituir |
| `F11` | Modo foco |
| `Esc` | Sair do modo foco |
| `Ctrl+↑/↓` | Rolar 55 linhas |

---

### Imagens

![Fountain Writer v2.0](imagens/2-0/Fountain_Writer_2-0_1.png)
![Fountain Writer v2.0 preview](imagens/2-0/Fountain_Writer_2-0_2.png)
