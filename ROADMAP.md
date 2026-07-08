# Fonte — Roadmap

## Estratégia de distribuição

| Formato | Público | Quando usar |
|---|---|---|
| **Web** (`index.html`) | Qualquer dispositivo | Abrir direto no navegador — funciona offline |
| **Server** (`python3 serve.py`) | Rede local / Docker | Servir para outros dispositivos na rede |
| **PWA** (instalável) | Mobile (Android/iOS) + Desktop (Chrome/Edge) | Adicionar à tela inicial — offline, atualiza automático |
| **Desktop** (PyWebView) | Windows / Linux / macOS | Quem prefere executável nativo sem navegador |

---

## v2.3 — Desktop (PyWebView + GitHub Actions)

**Objetivo:** Gerar executáveis para Windows, Linux e macOS automaticamente via CI.

| Arquivo | Tipo |
|---|---|
| `desktop/desktop.py` | Entry point PyWebView — abre web/index.html em janela nativa |
| `desktop/requirements.txt` | Dependência: pywebview |
| `.github/workflows/build.yml` | CI/CD: 3 jobs (win/linux/mac), PyInstaller → Release |
| `web/index.html` | Adicionar aviso de PWA + desktop no ❓ Ajuda |

**Como funciona:**
- `desktop.py` carrega `web/index.html` local via WebView do sistema
- GitHub Actions roda a cada tag `v*`, empacota com PyInstaller
- Publica 3 artefatos na Release: `.exe` (Win), binário (Linux), `.app` (macOS)

---

## v2.4 — PWA Mobile + Instruções

**Objetivo:** Garantir que usuários de celular saibam instalar o app.

| Item | Descrição |
|---|---|
| **Android** | Chrome → ⋮ → "Adicionar à tela inicial" |
| **iOS** | Safari → Compartilhar → "Adicionar à tela de início" |
| **Desktop** | Chrome/Edge → ⋮ → "Instalar Fonte" |
| **Instruções** | Texto claro no modal ❓ Ajuda com os passos para cada plataforma |

*(Zero código novo — o PWA já está implementado com service worker + manifest)*

---

## v2.5 — Polimento e Correções

Baseado na auditoria (`AUDITORIA.md`):
- Itens que falharem nos testes manuais
- Pequenas melhorias de UX apontadas pelo uso real
- i18n dos modais informacionais restantes (help, fguide, beat-guide)

---

## Status

- [ ] **v2.3** — Desktop (PyWebView + GitHub Actions)
- [ ] **v2.4** — PWA Mobile + Instruções
- [ ] **v2.5** — Polimento pós-auditoria
