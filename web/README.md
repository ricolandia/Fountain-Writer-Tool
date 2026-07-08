# Fonte — Editor de Roteiros

**Editor Fountain em HTML/CSS/JS puro. Zero dependências. Funciona em qualquer navegador.**

Autor: **Ricardo A. B. Graça** — [ricolandia.com](https://www.ricolandia.com)

---

## 🇧🇷 Português

### Funcionalidades

- Editor de texto Fountain com live preview (CHARACTER 37%, DIALOGUE 20%)
- **Sidebar de cenas** com separadores visuais de ato (Ato 1–7 fixos, com ✕ para remover)
- **Atribuição de cena a ato via beat** — muda o ato no modal do beat, sidebar atualiza
- **CRUD de beats** com plotline (Principal / A / B), inserção no texto (↗), drag reorder
- **Timeline grid** — atos × tramas, mostra cenas em cada célula
- Characters e Locations extraídos automaticamente do texto
- Find/Replace com case-sensitive
- Folha de rosto (formulário salvo em localStorage)
- Side-by-side: editor / preview / split (👁)
- Temas claro/escuro (detecção automática + manual)
- Idioma Português / English (recarrega a página)
- Export HTML e PDF
- ⬇ Exportar `.fountain` (texto puro)
- 📄 Importar `.fountain` (texto puro)
- 📂 Abrir projeto `.fountain.json`
- Pomodoro timer + writing timer, metas diárias
- Highlights coloridos por linha (Ctrl+1/2/3)
- Auto-backup a cada 5 minutos com restore (últimos 10)
- Estatísticas detalhadas (cenas, palavras, top personagens)
- Typewriter sound effects (toggle)
- Productivity chart (últimos 7 dias)
- Atalhos de teclado: Ctrl+B/I/U (bold/italic/underline), Ctrl+=/-/0 (zoom)

### 💾 Salvar projeto

O Fonte usa dois sistemas de persistência:

| Método | O que salva | Quando |
|---|---|---|
| **localStorage** | Texto, beats, atos | Auto-save a cada 10s |
| **Backup** | Texto + beats + atos | A cada 5min (10 versões) |
| **💾 Salvar** | Projeto completo `.json` | Manual (download) |

**💾 Salvar (Chrome/Edge/Opera):**
- 1ª vez: abre diálogo "Salvar como" (escolha pasta)
- 2ª vez em diante: salva no mesmo arquivo, **sem perguntar**

**💾 Salvar (Firefox/Safari):**
- Sempre baixa o `.fountain.json` para a pasta de Downloads

**Proteção contra perda de dados:**
- Antes de fechar/recarregar, se houver alterações não salvas, o navegador pergunta "Tem certeza?"
- Lembrete na barra de status: "💾 Salve seu projeto" até o primeiro save
- Backups podem ser restaurados via 💾 Backups no toolbar

### Como usar

Abra `web/index.html` em qualquer navegador moderno.

### Deploy

**FTP / estático:** copie a pasta `deploy/` para o servidor.

**Docker:**
```bash
cd web
docker compose up -d
# Abre http://localhost:8000
```

### Tecnologias

HTML5, CSS3, JavaScript (ES6+), localStorage, File System Access API.

---

## 🇬🇧 English

### Features

- Fountain text editor with live preview (CHARACTER 37%, DIALOGUE 20%)
- **Scene sidebar** with visual act separators (Act 1–7 fixed, ✕ to remove)
- **Scene-to-act assignment via beat** — change act in beat modal, sidebar updates
- **Beat CRUD** with plotline (Principal / A / B), insert into text (↗), drag reorder
- **Timeline grid** — acts × plotlines, shows scenes in each cell
- Characters and Locations auto-extracted from text
- Find/Replace with case-sensitive option
- Title page form (saved in localStorage)
- Side-by-side: editor / preview / split (👁)
- Light/Dark themes (auto + manual)
- Language: English / Portuguese (page reloads)
- Export HTML and PDF
- ⬇ Export `.fountain` (plain text)
- 📄 Import `.fountain` (plain text)
- 📂 Open project `.fountain.json`
- Pomodoro timer + writing timer, daily word goals
- Line-based color highlights (Ctrl+1/2/3)
- Auto-backup every 5 minutes with restore (last 10)
- Detailed statistics (scenes, words, top characters)
- Typewriter sound effects (toggle)
- Productivity chart (last 7 days)
- Keyboard shortcuts: Ctrl+B/I/U (bold/italic/underline), Ctrl+=/-/0 (zoom)

### 💾 Save project

Fonte uses two persistence systems:

| Method | What it saves | When |
|---|---|---|
| **localStorage** | Text, beats, acts | Auto-save every 10s |
| **Backup** | Text + beats + acts | Every 5min (10 versions) |
| **💾 Save** | Full project `.json` | Manual (download) |

**💾 Save (Chrome/Edge/Opera):**
- 1st time: opens "Save as" dialog (choose folder)
- Subsequent times: saves to the same file, **no questions asked**

**💾 Save (Firefox/Safari):**
- Always downloads `.fountain.json` to Downloads folder

**Data loss prevention:**
- Before closing/reloading, if there are unsaved changes, the browser asks "Are you sure?"
- Status bar reminder: "💾 Save your project" until first save
- Backups can be restored via 💾 Backups in the toolbar

### Usage

Open `web/index.html` in any modern browser.

### Deploy

**FTP / static:** copy the `deploy/` folder to your server.

**Docker:**
```bash
cd web
docker compose up -d
# Opens http://localhost:8000
```

### Tech stack

HTML5, CSS3, JavaScript (ES6+), localStorage, File System Access API.
