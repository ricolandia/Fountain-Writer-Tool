# Auditoria — Fonte v2.2.0

Checklist de verificação para versão estável.

## Como testar

```bash
cd /home/ricardo/Documentos/31_APPS_GITHUB/Fountain-Writer-Tool/web/
python3 -m http.server 8000
# Abrir http://localhost:8000
# Para testar PWA, usar http (não file://)
```

---

## 1. Editor Fountain

- [ ] Preview ao vivo reflete o texto digitado
- [ ] Temas claro/escuro funcionam e persistem (🌗)
- [ ] Zoom Ctrl+=/-/0 funciona e persiste
- [ ] Highlights (Ctrl+1/2/3) marcam a linha correta
- [ ] Highlights persistem após reload
- [ ] Marcador 📍 insere `# Ato N` na posição correta
- [ ] Indicador de ato na barra muda conforme o cursor
- [ ] Auto-save a cada ~10s salva no localStorage
- [ ] Som das teclas toggle liga/desliga
- [ ] Modo foco (F11) esconde painéis corretamente
- [ ] Dual dialogue, parenthetical, transitions renderizam
- [ ] `= sinopse` e `[[nota]]` não aparecem no preview
- [ ] Diálogo duplo formatado lado a lado

## 2. Beats

- [ ] CRUD: criar, editar, deletar beat
- [ ] Plotlines (Principal/A/B) funcionam e colorem
- [ ] Comentários por beat (autor + timestamp)
- [ ] Drag reorder funciona
- [ ] ↗ Inserir no texto insere na posição do cursor
- [ ] Beat vinculado a cena ↔ bolinha sólida
- [ ] Beat sem cena ↔ bolinha tracejada + 📝
- [ ] Persistência após reload
- [ ] Modal beat: todos os campos (título, ato, trama, comentário) salvam e restauram
- [ ] i18n: modal beat traduz PT/EN

## 3. Timeline

- [ ] Grid atos × tramas exibe cenas corretamente
- [ ] Cores dos atos e plotlines aplicadas
- [ ] Orphan beats aparecem com borda tracejada
- [ ] ⤢ expandir timeline funciona
- [ ] Clicar em cena na timeline leva à linha no editor
- [ ] Timeline escondida quando não há atos (mensagem "Sem beats")
- [ ] Mobile: scroll horizontal com `minmax(110px,1fr)`
- [ ] Timeline visível/invisível via 📊 Trama

## 4. Ficha do Filme + Estrutura

- [ ] 📄 Ficha abre como página inteira (esconde side panes)
- [ ] 3 abas: Folha de Rosto / Ficha do Filme / Estrutura
- [ ] Todos os 30 campos salvam em `titleData`
- [ ] Campos "Outro" (tema, ideia, premissa) mostram input custom
- [ ] Dados persistem após reload (localStorage)
- [ ] 💾 Salvar salva no localStorage
- [ ] 🗑 Limpar limpa tudo e volta ao editor
- [ ] 🖨 Gerar PDF abre impressão com dados das 3 abas
- [ ] Dados renderizam no preview/export HTML/PDF do roteiro
- [ ] Dados inclusos no `.fountain.json` (saveProject)
- [ ] Dados restaurados ao abrir projeto .json
- [ ] i18n: Ficha traduzida PT/EN

## 5. Projeto Cultural

- [ ] 📋 Projeto abre como página inteira (esconde side panes)
- [ ] 10 seções colapsáveis funcionam
- [ ] 💾 Salvar Dados salva no localStorage
- [ ] 🖨 Exportar PDF abre janela de impressão com layout tabelado
- [ ] Dados inclusos no `.fountain.json`
- [ ] Dados restaurados ao abrir projeto
- [ ] Orçamento auto-soma valores

## 6. Excalidraw (🧩 Quadro)

- [ ] Modal abre com iframe
- [ ] 12 templates carregam corretamente
- [ ] ⛶ Fullscreen funciona
- [ ] Assets vendorizados carregam offline
- [ ] ✕ Fechar modal funciona
- [ ] i18n: header traduzido (sem emoji duplicado)

## 7. Import / Export

- [ ] 📄 Importar `.fountain` carrega texto
- [ ] 📂 Abrir `.fountain.json` restaura: draft, beats, titleData, projeto, chars, configurações
- [ ] 💾 Salvar `.fountain.json` inclui todos os campos
- [ ] ⬇ Fountain baixa texto puro
- [ ] 📑 HTML exporta com folha de rosto
- [ ] 🖨 PDF abre janela de impressão com folha de rosto
- [ ] 🖨 Gerar PDF (ficha) abre janela de impressão

## 8. PWA

- [ ] Service worker registra (via `http://localhost`, não `file://`)
- [ ] Manifest.json com ícones válidos (192x192, 512x512)
- [ ] Botão "Instalar" aparece no navegador
- [ ] App carrega offline após instalação
- [ ] Cache runtime (Excalidraw assets) após primeira visita
- [ ] Guard `location.protocol.startsWith('http')` evita erro em file://

## 9. i18n

- [ ] PT → EN: toolbar, modais, fichas traduzem
- [ ] EN → PT: toolbar, modais, fichas traduzem
- [ ] 129 chaves PT = 129 chaves EN (✅ verificado)
- [ ] 100 `data-i18n` no HTML têm chave correspondente (✅ verificado)
- [ ] 7 `data-i18n-placeholder` têm chave (✅ verificado)
- [ ] 1 `data-i18n-title` tem chave (✅ verificado)
- [ ] Placeholders traduzem ao trocar idioma
- [ ] Botão ☕ Apoie traduz (PT: Apoie / EN: Support)

## 10. Mobile (≤768px)

- [ ] Side panes escondidas, botões 🎬 Cenas e 📋 Beats aparecem
- [ ] Ficha empilhada (label em cima, input embaixo, sem overflow)
- [ ] Timeline com scroll horizontal (colunas ≥110px)
- [ ] Modais ocupam largura total com margem
- [ ] Toolbar não corta no topo (fix `100vh` → `100%`)
- [ ] Toolbar wraps em múltiplas linhas sem quebrar

## 11. Personagens / Locais

- [ ] Extração automática do texto (aba PERS)
- [ ] Extração automática de locais (aba LOC)
- [ ] Editar personagem: nome, idade, arquétipo, física, personalidade, biografia, objetivo, medo
- [ ] Dados persistem após reload
- [ ] i18n: labels do modal personagem traduzidos

## 12. Backups / Estatísticas / Metas / Timer

- [ ] Auto-backup a cada 5min (10 versões)
- [ ] Restaurar backup substitui texto no editor
- [ ] Estatísticas: cenas, palavras, personagens, duração estimada
- [ ] Seleção conta palavras selecionadas
- [ ] Gráfico de produtividade 7 dias
- [ ] Meta diária salva e restaura
- [ ] Pomodoro 25min / cronômetro de escrita alternam
- [ ] Timer exibe no display e notifica ao final

## 13. Toolbar / Navegação

- [ ] Botão 📄 Ficha alterna entre editor e ficha
- [ ] Botão 📋 Projeto alterna entre editor e projeto
- [ ] Ficha e Projeto não ficam abertos simultaneamente
- [ ] Toolbar reorganizada: grupos lógicos
- [ ] Link ☕ Apoie abre modal com Pix, PayPal, GitHub, licença MIT

## 14. Salvamento e Persistência

- [ ] localStorage mantém dados após refresh (draft, beats, config)
- [ ] Salvar projeto .json inclui metadados de versão
- [ ] Abrir projeto .json restaura configurações (tema, fonte, metas)
- [ ] Indicador 💾 na barra mostra estado de salvamento

---

## Resumo

| Área | Itens | ✅ | ❌ |
|---|---|---|---|
| 1. Editor | 13 | | |
| 2. Beats | 10 | | |
| 3. Timeline | 8 | | |
| 4. Ficha | 12 | | |
| 5. Projeto Cultural | 6 | | |
| 6. Excalidraw | 6 | | |
| 7. Import/Export | 7 | | |
| 8. PWA | 6 | | |
| 9. i18n | 7 | | |
| 10. Mobile | 6 | | |
| 11. Personagens | 5 | | |
| 12. Utilitários | 9 | | |
| 13. Toolbar | 5 | | |
| 14. Persistência | 4 | | |
| **Total** | **108** | | |

---

## Resultados da auditoria automatizada (Jul/2026)

### ✅ Verificado por análise de código
| Item | Status |
|---|---|
| Sintaxe JS (app.js, i18n.js, fountain-parser.js, sw.js) | ✅ 4/4 |
| i18n: 129 chaves PT = 129 EN | ✅ |
| HTML: 100 `data-i18n`, 7 placeholder, 1 data-i18n-title — todos com chave | ✅ |
| Fountain parse: cenas, diálogos, transições, rubricas | ✅ |
| HTML: 188 divs abertas = 188 fechadas | ✅ |
| PWA: guard `location.protocol.startsWith('http')` | ✅ |
| Timeline: `minmax(110px,1fr)` aplicado nas 2 grids | ✅ |
| Deploy: todos os arquivos presentes (12 templates, lib/ 6.7MB, icons/) | ✅ |
| SW guard | ✅ |

### ⚠️ Necessita teste manual no navegador
| Área | O que testar |
|---|---|
| Preview | CHARACTER 37%, DIALOGUE 20%, temas, zoom |
| Beats | CRUD, drag, plotlines, comentários, inserção no texto |
| Timeline | Cores dos atos, clicar leva à cena, expandir |
| Ficha | Salvar/recarregar/imprimir, dados no .json |
| Projeto | Export PDF, 10 seções, orçamento auto-soma |
| Excalidraw | 12 templates, fullscreen, offline |
| PWA | Registrar via localhost, instalar, offline |
| Mobile | Ficha empilhada, timeline scroll, toolbar |
| Import/Export | .fountain.json ida e volta |
| Backups | Restaurar, 10 versões |
| Pomodoro | Timer, reset, alternar modos |

### 🔴 Referências "Fountain Writer" restantes (não críticas)
| Arquivo | Linha |
|---|---|
| `web/server.py` | FastAPI title (backend opcional) |
| `web/README.md` | Doc separada da raiz |
