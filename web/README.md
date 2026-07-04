# Fountain Writer — Editor de Roteiros

**Editor Fountain em HTML/CSS/JS puro. Zero dependências. Funciona em qualquer navegador.**

Autor: **Ricardo A. B. Graça** — [ricolandia.com](https://www.ricolandia.com)

---

## 🇧🇷 Português

### Funcionalidades

- Editor de texto puro com auto-save
- Preview ao vivo com formatação Fountain (CHARACTER 37%, DIALOGUE 20%)
- Navegador de cenas com cards visuais e drag reorder
- CRUD de beats com inserção no texto (↗)
- Characters e Locations extraídos automaticamente do texto
- Find/Replace com case-sensitive
- Folha de rosto (formulário salvo em localStorage)
- Side-by-side: editor / preview / split (👁)
- Temas claro/escuro
- Idioma Português / English
- Export HTML e PDF (via impressão do navegador)
- Pomodoro timer, metas diárias, highlights coloridos
- Auto-backup a cada 5 minutos com restore
- Timeline de beats por ato
- Estatísticas detalhadas
- Sonoplastia de teclas (toggle)
- Drag-and-drop nativo (beats, cards de cenas)

### Como usar

Abra `web/index.html` em qualquer navegador moderno.

### Deploy

**FTP / estático:** copie a pasta `web/` para o servidor.

**Docker:**
```bash
cd web
docker compose up -d
# Abre http://localhost:8000
```

### Tecnologias

HTML5, CSS3, JavaScript (ES6+), localStorage.

---

## 🇬🇧 English

### Features

- Plain text editor with auto-save
- Live preview with professional Fountain formatting (CHARACTER 37%, DIALOGUE 20%)
- Scene navigator with visual cards and drag reorder
- Beat CRUD with insert-into-text (↗)
- Characters and Locations auto-extracted from text
- Find/Replace with case-sensitive option
- Title page form (saved in localStorage)
- Side-by-side: editor / preview / split (👁)
- Light/Dark themes
- Language: English / Portuguese
- Export to HTML and PDF (browser print)
- Pomodoro timer, daily word goals, color highlights
- Auto-backup every 5 minutes with restore
- Beat timeline by act
- Detailed statistics
- Typewriter sound effects (toggle)
- Native drag-and-drop (beats, scene cards)

### Usage

Open `web/index.html` in any modern browser.

### Deploy

**FTP / static:** copy the `web/` folder to your server.

**Docker:**
```bash
cd web
docker compose up -d
# Opens http://localhost:8000
```

### Tech stack

HTML5, CSS3, JavaScript (ES6+), localStorage.
