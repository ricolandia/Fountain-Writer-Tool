# Manual do Usuário — Fonte

Editor de roteiros no formato **Fountain**. Grátis · Offline · Sem cadastro.

> **Criado por Ricardo A. B. Graça** — roteirista e desenvolvedor.
> Este app nasceu da necessidade de um editor de roteiros gratuito,
> feito **por um roteirista para roteiristas** — não por uma empresa
> querendo lucrar com seu trabalho.
>
> 🌐 [ricolandia.com](https://www.ricolandia.com)
>
> **Links:**
> - 🌐 **Online:** [ricolandia.com/editor-roteiros-gratuito/Demo](https://www.ricolandia.com/editor-roteiros-gratuito/Demo/index.html)
> - 📦 **Zip:** [github.com/ricolandia/Fountain-Writer-Tool/releases](https://github.com/ricolandia/Fountain-Writer-Tool/releases)
> - 🐙 **Código:** [github.com/ricolandia/Fountain-Writer-Tool](https://github.com/ricolandia/Fountain-Writer-Tool)

---

## Índice

1. [Introdução](#1-introdução)
2. [Instalação](#2-instalação)
3. [Primeiros passos](#3-primeiros-passos)
4. [Editor de roteiro](#4-editor-de-roteiro)
5. [Navegação](#5-navegação)
6. [Personagens e locais](#6-personagens-e-locais)
7. [Ficha do Filme e Estrutura](#7-ficha-do-filme-e-estrutura)
8. [Projeto Cultural](#8-projeto-cultural)
9. [Quadro de Planejamento (Excalidraw)](#9-quadro-de-planejamento-excalidraw)
10. [Produtividade](#10-produtividade)
11. [Exportação](#11-exportação)
12. [Idiomas](#12-idiomas)
13. [PWA — Instalar como app](#13-pwa--instalar-como-app)
14. [Perguntas frequentes](#14-perguntas-frequentes)

---

## 1. Introdução

O **Fonte** é um editor de roteiros completo no formato **Fountain**. Ele é:

- **Feito por um roteirista** — criado por Ricardo A. B. Graça, roteirista e desenvolvedor, que sentiu na pele a falta de ferramentas gratuitas e de qualidade. Este não é um produto de uma empresa — é uma ferramenta feita **por alguém que escreve roteiros**, para ajudar outros roteiristas.
- **100% gratuito** — sem propagandas, sem versão paga, sem limites
- **Offline** — depois de carregar, funciona sem internet
- **Sem cadastro** — não precisa criar conta, não coleta dados
- **Universal** — funciona em Windows, Linux, macOS, Android, iOS
- **Zero dependências** — um arquivo HTML + JavaScript, sem frameworks

### O que é Fountain?

Fountain é um formato de texto puro para roteiros. Você escreve como num bloco de notas, e o Fonte formata automaticamente. Exemplo:

```
INT. ESCRITÓRIO - DIA

JOÃO (CEO)
Precisamos de resultados!

EXT. PARQUE - DIA

MARIA (SEC)
Ele nem me olha mais...
```

Isso vira automaticamente um roteiro formatado com cenas, personagens e diálogos.

---

## 2. Instalação

### 🌐 Online (recomendado)

Acesse pelo navegador e instale como app:

**[https://www.ricolandia.com/editor-roteiros-gratuito/Demo/index.html](https://www.ricolandia.com/editor-roteiros-gratuito/Demo/index.html)**

No Chrome/Edge: ⋮ → **Instalar Fonte**

### 📦 Zip universal

Baixe o `Fonte-web.zip` na [página de Releases](https://github.com/ricolandia/Fountain-Writer-Tool/releases), extraia e abra `index.html`.

Funciona em qualquer sistema. Pode colocar numa pasta sincronizada (Dropbox, OneDrive) para acessar de vários computadores.

### 🖥 Servidor local

```bash
python3 serve.py
# Abrir http://localhost:8000/web/index.html
```

Ou simplesmente abrir `web/index.html` no navegador.

---

## 3. Primeiros passos

Ao abrir o Fonte, você vê:

```
┌──────────────────────────────────────────────────────────┐
│ 📄 Novo 📂 Abrir 💾 Salvar  │  📑 HTML 🖨 PDF │ ...     │
├─────────────┬────────────────────────────┬───────────────┤
│   CENAS     │  INT. ESCRITÓRIO - DIA     │   BEATS       │
│  1. INT...  │                            │   ○ Beat 1    │
│  2. EXT...  │  JOÃO (CEO)               │   ○ Beat 2    │
│  3. INT...  │  Precisamos de resultados! │               │
│             │                            │               │
└─────────────┴────────────────────────────┴───────────────┘
│ Cen:3  Pal:1250  Ato 1  📊 Trama  🎯 Meta         💾 │
└──────────────────────────────────────────────────────────┘
```

**Toolbar (barra superior):**
- 📄 **Novo** / 📂 **Abrir** / 💾 **Salvar** — gerenciamento de projetos
- 📄 **Importar** — importa arquivo `.fountain` (texto puro)
- ⬇ **Fountain** — exporta texto puro
- 📑 **HTML** / 🖨 **PDF** — exporta roteiro formatado
- 👁 — alterna entre editor, preview dividido e preview
- 🔍 — busca/substitui
- 📄 **Ficha** — folha de rosto, ficha do filme, estrutura
- 📊 **Stats** — estatísticas do roteiro
- 🎯 **Meta** — meta diária de palavras
- 💾 **Backups** — restaurar backup automático
- 📋 **Projeto** — módulo Projeto Cultural
- 🧩 **Quadro** — Excalidraw (planejamento visual)
- 🌗 — alternar tema claro/escuro
- PT/EN — alternar idioma
- ❓ — ajuda

---

## 4. Editor de roteiro

### Formatação Fountain

| Elemento | Como escrever | Exemplo |
|---|---|---|
| **Cabeçalho de cena** | `INT/LOCAL - DIA` ou `.CENA` | `INT. CASA - DIA` |
| **Personagem** | Nome em maiúsculas, linha sozinha | `JOÃO` |
| **Diálogo** | Linha abaixo do personagem | `Olá, mundo!` |
| **Rubrica** | Entre parênteses | `(sorrindo)` |
| **Transição** | `CUT TO:` ou `> FADE OUT` | `CORTE PARA:` |
| **Centralizado** | `> texto <` | `> O FIM <` |
| **Forçar ação** | `! texto` | `!Barulho de passos.` |
| **Forçar personagem** | `@ nome` | `@João Silva` |
| **Sinopse** | `= texto` | `= João chega em casa` |
| **Nota de produção** | `[[ texto ]]` | `[[efeito sonoro]]` |
| **Comentário** | `/* texto */` | `/* revisar depois */` |
| **Quebra de página** | `===` | `===` |
| **Diálogo duplo** | `^` após nome | `JOÃO ^` / `MARIA ^` |

### Auto-save

O texto é salvo automaticamente no navegador a cada **10 segundos**. Você pode fechar a página e reabrir que o texto continua lá.

### Preview

Clique em 👁 para alternar entre:
- **Editor** — só o texto
- **Split** — editor + preview lado a lado
- **Preview** — só a visualização formatada

### Atalhos de teclado

| Atalho | Ação |
|---|---|
| `Ctrl+S` | Salvar projeto |
| `Ctrl+O` | Abrir projeto |
| `Ctrl+N` | Novo projeto |
| `Ctrl+F` / `Ctrl+H` | Buscar / Substituir |
| `F11` | Modo foco |
| `Ctrl+1` | Highlight amarelo (revisar) |
| `Ctrl+2` | Highlight verde (ok) |
| `Ctrl+3` | Highlight vermelho (problema) |
| `Ctrl+=` | Aumentar fonte |
| `Ctrl+-` | Diminuir fonte |
| `Ctrl+0` | Resetar fonte |

---

## 5. Navegação

### Cenas

O painel esquerdo lista todas as cenas do roteiro, organizadas por ato. Clique em uma cena para ir diretamente a ela no editor.

Use **⊞** / **⊟** para alternar entre lista e corkboard (cards visuais).

### Beats

O painel direito exibe os beats (cartões de planejamento). Cada beat pode ser vinculado a uma cena.

**● Bolinha sólida:** beat vinculado a uma cena
**◯ Bolinha tracejada:** beat de rascunho (sem cena)

Use a timeline (📊 **Trama**) para ver beats organizados por ato × trama.

---

## 6. Personagens e locais

Personagens e locais são **extraídos automaticamente** do texto do roteiro. Basta escrever, e eles aparecem na aba correspondente.

Clique em um personagem para editar seu perfil (idade, arquétipo, física, personalidade, biografia, objetivo, medo).

### Auto-completar

Ao digitar o nome de um personagem (em maiúsculas), o Fonte sugere nomes já usados no roteiro. Use ⬇/⬆ para navegar e Enter para completar.

---

## 7. Ficha do Filme e Estrutura

Clique em 📄 **Ficha** para abrir o formulário completo com 3 abas:

### Folha de Rosto
Título, crédito, autor, fonte, data, contato.

### Ficha do Filme
Logline, sinopse, argumento, gênero, duração, público-alvo.

### Estrutura da História
Baseada nos conceitos de Robert McKee:
- Tom, tema, ideia governante
- Valor central, premissa
- Força antagônica, tipo de conflito, tipo de trama
- Dilema dramático, tipo de final
- 8 perguntas guiadas (mundo → perturbação → decisão → obstáculos → descoberta → crise → desafio → resolução)

Os dados da ficha são inclusos no `.fountain.json` e restaurados ao abrir o projeto.

---

## 8. Projeto Cultural

Módulo para leis de incentivo à cultura brasileiras (Rouanet, LIC, ICMS). São 11 seções colapsáveis:

1. Dados do Proponente e Projeto
2. Perfil do Projeto
3. Equipe Principal
4. Plano de Divulgação e Mídia
5. Acessibilidade e Democratização
6. Contrapartidas
7. Orçamento Detalhado (com soma automática)
8. Cronograma de Execução
9. Plano de Distribuição
10. Especificações Técnicas das Peças
11. Pitch (tagline, comparação, diferencial, pitch narrativo, elenco)

Os dados são salvos no `.fountain.json` e exportáveis em PDF.

---

## 9. Quadro de Planejamento (Excalidraw)

O 🧩 **Quadro** abre um editor visual completo para planejar seu roteiro:

### Templates

12 templates prontos disponíveis em `web/templates/`:
- **3 Atos** — colunas para cada ato
- **Jornada do Herói** — 12 estágios
- **Mapa de Personagens** — relações entre personagens
- **Save the Cat** — 15 beats
- **Story Circle** — 8 passos
- **Quadro de Cenas** — corkboard visual
- **Estrutura de TV** — teaser + atos + tag
- **Batman Chart** — grid atos × tramas
- **Mood Board** — paleta de inspiração
- **Diagrama de Relações** — conexões com setas
- **Linha do Tempo** — eixo temporal com subtramas
- **Arco de Personagem** — curva emocional

Para usar: abra o Quadro → no Excalidraw, clique em **Open** → escolha um template `.excalidraw`.

### + Novo desenho

Cria um novo quadro em branco. O desenho anterior é preservado na memória. Use os botões de **Export** do próprio Excalidraw para salvar o desenho como arquivo `.excalidraw` no disco.

### Aviso ao fechar

Ao fechar o Quadro com alterações não salvas, o Fonte pergunta se você quer descartar as mudanças. Se preferir manter, exporte o desenho antes de fechar.

---

## 10. Produtividade

### Meta diária

🎯 **Meta** — defina quantas palavras quer escrever por dia. A barra de status mostra o progresso.

### Pomodoro / Cronômetro

⏱ **Escrita** — cronômetro simples. 🍅 **Pomodoro** — 25 minutos de foco, com notificação ao final.

### Highlights

Selecione uma linha e use:
- `Ctrl+1` — 🟡 Revisar (amarelo)
- `Ctrl+2` — 🟢 OK (verde)
- `Ctrl+3` — 🔴 Problema (vermelho)

### Gráfico de produtividade

Mostra as palavras escritas nos últimos 7 dias. Visível na barra de status.

### Backups automáticos

A cada **5 minutos**, o Fonte salva uma cópia do texto (até 5 versões). Para restaurar, clique em 💾 **Backups**.

---

## 11. Exportação

| Formato | Como fazer | O que inclui |
|---|---|---|
| **Fountain (.fountain)** | ⬇ Fountain | Só o texto puro |
| **HTML** | 📑 HTML | Abre modal com checkboxes para escolher: Folha de Rosto, Ficha do Filme, Estrutura |
| **PDF** | 🖨 PDF | Abre a impressão do navegador. Mesmas opções do HTML |
| **Projeto (.fountain.json)** | 💾 Salvar | Tudo: texto, beats, ficha, projeto cultural, cena do Excalidraw, backups |

---

## 12. Idiomas

Clique em **PT** / **EN** na barra de ferramentas para alternar entre português e inglês. O app recarrega automaticamente.

Estão traduzidos:
- Toda a interface (botões, labels, modais)
- Os dropdowns da Estrutura (gênero, tom, tema, etc.)
- O Guia Fountain e o modal de Ajuda
- O modal de Beats

---

## 13. PWA — Instalar como app

O Fonte pode ser instalado como aplicativo no seu celular ou computador:

### Chrome / Edge / Brave

⋮ → **Instalar Fonte** (ou "Adicionar à tela inicial")

### Samsung Internet

⋮ → **Adicionar página a** → **Tela inicial**

### Firefox Android

⋮ → **Adicionar à tela inicial**

### iOS (Safari)

Compartilhar → **Adicionar à tela de início**

### Firefox Desktop

Só funciona no navegador (sem botão Instalar). Use o zip ou o servidor local.

---

## 14. Perguntas frequentes

### Onde ficam meus dados?
Tudo fica no seu navegador (localStorage) e/ou no arquivo `.fountain.json` que você salva no seu computador. Nenhum dado é enviado para servidor.

### Preciso de internet?
Só na primeira vez para carregar o app. Depois funciona totalmente offline.

### Como migrar do Final Draft?
Abra seu `.fdx` no Final Draft e exporte como Fountain (File → Export → Fountain). Depois importe o `.fountain` no Fonte.

Veja o guia completo em `MIGRAR-ROTEIROS.md`.

### Como compartilhar um projeto?
Clique em 📤 **Compartilhar**. No celular, abre o compartilhamento nativo (WhatsApp, email). No computador, baixa o arquivo `.fountain.json` — você anexa manualmente.

### Perdi meus dados. E agora?
Verifique os backups (💾 **Backups**). O Fonte mantém as 5 versões mais recentes do texto.

### O Excalidraw não mostra meu desenho ao reabrir o projeto?
O desenho é salvo dentro do `.fountain.json`, mas pode não carregar automaticamente ao reabrir o modal. Use o Export do Excalidraw para salvar o desenho como `.excalidraw` se quiser preservá-lo.

### Consigo usar no celular?
Sim. Acesse o link online ou extraia o zip no celular. A interface se adapta (painéis como overlay, modais em tela cheia).

### O que é o Projeto Cultural?
Um módulo para preencher propostas culturais para leis de incentivo brasileiras (Rouanet, LIC, ICMS). São 11 seções com exportação em PDF.

---

## Licença

MIT — livre para usar, modificar e distribuir.

---

*Manual gerado em Julho/2026 para a versão v2.3.0 do Fonte.*
