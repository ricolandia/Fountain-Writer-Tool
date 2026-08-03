# Fonte — Editor de Roteiros Profissional

**Crie, organize e exporte seus roteiros no formato Fountain. Grátis. Offline. Zero dependências.**

![Fonte icon](imagens/fonte-icon.svg)

> ### 🌐 A versão web é universal — menos de 5 MB — com TODAS as funções
> O zip web (ou a PWA online) contém **tudo**: editor, Excalidraw, Projeto Cultural,
> beats, timeline, backups, i18n. Não é uma versão reduzida — funciona offline em
> qualquer dispositivo, sem instalação. As versões desktop (Windows/Linux/macOS)
> são opcionais para quem prefere app nativo.

---

## ✨ O que é

O **Fonte** é um editor de roteiros completo que funciona de 5 formas:
**navegador** (sem instalação), **PWA** (instala como app no celular/desktop),
**zip universal** (offline total), **desktop nativo** (Windows/Linux/macOS) e
**servidor próprio**.

Sem cadastro, sem servidor obrigatório, sem telemetria. Seus dados ficam no seu
dispositivo. Criado por um roteirista, para roteiristas.

---

## 🎯 Para quem é

- **Roteiristas** que querem escrever no formato Fountain sem complicação
- **Produtores culturais** que precisam estruturar projetos para leis de incentivo
- **Estudantes de cinema** que buscam uma ferramenta gratuita e funcional
- **Equipes criativas** que querem uma solução leve para compartilhar roteiros

---

## ⚡ O que você pode fazer

✍️ **Editor** com auto-save a cada 10s (localStorage)

👁️ **Preview ao vivo** — personagens 37%, diálogo 20%

🃏 **Corkboard** — visualização em cards com toggle ⊞/⊟

📇 **Sidebar de cenas** com separadores de ato

📌 **Beats** com plotlines (Principal/A/B), comentários e inserção no texto

🗺️ **Timeline**: grid atos × tramas com cenas por célula

👤 **Personagens e locais** extraídos automaticamente + auto-completar

🔍 **Find/Replace** com case-sensitive

📄 **Ficha do Filme** — Logline, sinopse, argumento, gênero, duração

📐 **Estrutura da História** — McKee: ideia governante, valor central, força antagônica, perguntas guiadas

🏛️ **Projeto Cultural** — 11 seções para leis de incentivo (Rouanet, LIC, ICMS), com Pitch

📲 **PWA** — Instalável como app, funciona offline, service worker

🧩 **Quadro de Planejamento Visual** — Excalidraw com 12 templates, integrado ao projeto (salva e restaura)

📄 **Export** HTML, PDF, Fountain e projeto .json

📂 **Importa** .fountain e abre projetos .json

📤 **Compartilha** o projeto (Web Share API / download)

⏱️ **Pomodoro** 25min + cronômetro de escrita

🎯 **Metas diárias** de palavras com gráfico de progresso

🖍️ **Highlights** coloridos por linha (Ctrl+1/2/3)

💾 **Auto-backup** a cada 5min, 5 versões, com restore

📊 **Estatísticas**: cenas, palavras, top personagens

📈 **Gráfico** de produtividade dos últimos 7 dias

🌐 **Trabalhar** em português ou inglês

🔒 **100% offline** — seus dados nunca saem do dispositivo

---

## 🖥 Desktop nativo (novo)

O Fonte agora tem versão **desktop nativa** para Windows, Linux e macOS —
compilada automaticamente via GitHub Actions a cada release.

- Janela nativa com menus (Arquivo/Visualizar/Ajuda)
- Atalhos Ctrl+N/O/S/Q, Ctrl+T (tema), Ctrl+L (idioma), F11 (foco)
- Diálogos de salvar/abrir nativos do sistema
- **Excalidraw 100% integrado** — desenhe, salve no projeto e restaure ao reabrir
- Mesmas funções da versão web

---

## 🚀 Como usar

**Opção 1 — Web online (recomendado, mais rápido):**
[https://www.ricolandia.com/editor-roteiros-gratuito/Demo/index.html](https://www.ricolandia.com/editor-roteiros-gratuito/Demo/index.html)
Acesse pelo navegador (celular ou computador) e, se quiser, instale como PWA.

**Opção 2 — Zip universal (100% offline):**
Baixe o `Fonte-web.zip` na [página de Releases](https://github.com/ricolandia/Fountain-Writer-Tool/releases),
extraia e abra `index.html`. **~2 MB, com todas as funções.**

**Opção 3 — Desktop nativo:**
Baixe o zip do seu sistema (Windows/Linux/macOS) na página de Releases, extraia e execute.

**Opção 4 — Instalar como PWA:**
Após abrir no navegador:
- **Android (Chrome):** ⋮ → Instalar Fonte
- **iPhone/iPad (Safari):** Compartilhar → Adicionar à tela de início

**Opção 5 — Servidor próprio / Docker:**
```bash
python3 serve.py        # servidor local simples
# ou
cd web && docker compose up -d   # API PDF/HTML opcional
```

---

## 💻 Compatibilidade

| Navegador | 💾 Salvar sem perguntar | Funcionalidades |
|---|---|---|
| **Chrome** 86+ | ✅ | Completas |
| **Edge** 86+ | ✅ | Completas |
| **Opera** 72+ | ✅ | Completas |
| **Firefox** | ❌ (baixa o arquivo) | Completas |
| **Safari** | ❌ (baixa o arquivo) | Completas |

| Sistema | Desktop nativo |
|---|---|
| **Windows** | ✅ .exe |
| **Linux** | ✅ binário |
| **macOS** | ✅ .app |

---

## 📦 O que vem no .zip (web)

```
web/
├── index.html              ← Página principal
├── index.excalidraw.html   ← Quadro de planejamento visual
├── css/app.css             ← Estilos (claro/escuro)
├── js/app.js               ← Todo o código (~2650 linhas)
├── js/i18n.js              ← Traduções PT-BR / EN
├── js/fountain-parser.js   ← Parser Fountain
├── lib/excalidraw-embed.js ← Excalidraw UMD (offline, patcheado)
├── lib/excalidraw-assets/  ← Assets do Excalidraw (vendorizado)
├── templates/              ← 12 templates .excalidraw
├── manifest.json           ← PWA manifest
├── sw.js                   ← Service Worker (cache offline)
└── icons/                  ← Ícones PWA (192x192, 512x512)
```

---

## Autor

**Ricardo A. B. Graça** — [ricolandia.com](https://www.ricolandia.com)

Roteirista e desenvolvedor. Este projeto nasceu da necessidade de uma ferramenta
leve, gratuita e offline para escrever roteiros e estruturar projetos culturais.

---

*Fonte v2.4.0 — Editor de roteiros Fountain com ficha do filme, estrutura da história,
Projeto Cultural, Excalidraw integrado, PWA e desktop nativo. Baixe o zip universal
(~2 MB, todas as funções) ou o executável do seu sistema.*
