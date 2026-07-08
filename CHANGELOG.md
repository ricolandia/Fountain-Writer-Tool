# Changelog

## v2.2.0 (2026-07-08)

### ✨ Novidades
- **Ficha do Filme** — logline, sinopse, argumento, gênero, duração, público-alvo
- **Estrutura da História** — McKee: ideia governante, valor central, premissa, força antagônica, dilema, tipo de trama, perguntas guiadas
- **PWA** — instalável como app, service worker com cache offline
- **12 templates Excalidraw** — Diagrama de Relações, Linha do Tempo, Arco de Personagem
- **Toolbar reorganizada** — grupos lógicos por função

### 🔧 Melhorias
- Nome padronizado para **Fonte** (em vez de "Fountain Writer")
- Modal de apoio ☕ (Pix, PayPal, GitHub, licença MIT)
- i18n completo: 129 chaves PT/EN, todos os modais traduzidos
- Favicon + apple-touch-icon
- Layout mobile da Ficha adaptado (empilhado, sem scroll horizontal)
- Timeline com `minmax(110px,1fr)` para scroll horizontal no mobile
- CI/CD: GitHub Actions para build de release

### 🐛 Correções
- Cronograma do Projeto Cultural não era salvo ao clicar "Salvar Dados"
- Emoji duplicado no header do Excalidraw
- Traduções faltando nos modais de beat, personagem e excalidraw
- "Fountain Writer" renomeado para "Fonte" em todo o código
