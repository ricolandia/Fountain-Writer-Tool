# Fonte — Roadmap

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

## v2.4 — PWA + Mobile

**Objetivo:** Garantir experiência PWA completa e documentar instalação.

| Item | Descrição |
|---|---|
| **Android** | PWA via navegador — adicionar à tela inicial |
| **iOS** | PWA via Safari — adicionar à tela inicial |
| **Documentação** | Instruções claras no modal ❓ Ajuda e no README |

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
- [ ] **v2.4** — PWA + Mobile docs
- [ ] **v2.5** — Polimento pós-auditoria
