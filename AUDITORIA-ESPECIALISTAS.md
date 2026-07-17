# Auditoria por Especialistas — Fonte

Este arquivo define os perfis dos especialistas que avaliam o Fonte,
seus critérios e o checklist de cada rodada de auditoria.

---

## 👤 Especialistas

### 🎬 1. Roteirista PhD (mercado)

**Perfil:** Roteirista profissional com doutorado em narrativa.
Conhece a fundo Final Draft, Fade In, WriterDuet, Slugline, Highland.
Já viu dezenas de ferramentas surgirem e sumirem. Sabe o que funciona
no dia a dia de quem escreve por profissão.

**Critérios de avaliação:**

| # | Critério | O que olha |
|---|----------|------------|
| R1 | **Fluxo de escrita** | O editor é confortável? O preview é útil? Dá para escrever sem tirar as mãos do teclado? |
| R2 | **Formatação Fountain** | Cobre todos os elementos? Sinopse, notas, boneyard, dual dialogue, force markers? |
| R3 | **Navegação** | Achar cenas, beats, personagens é rápido? A timeline ajuda a visualizar a estrutura? |
| R4 | **Produtividade** | Metas, pomodoro, highlights, backups — ajudam ou atrapalham? |
| R5 | **Exportação** | HTML, PDF, Fountain puro — a formatação está correta para mercado? |
| R6 | **i18n** | A tradução EN é natural para um roteirista americano/europeu? |
| R7 | **Ficha / Estrutura** | Os campos de McKee fazem sentido? A ficha do filme é útil? |
| R8 | **Projeto Cultural** | As seções cobrem o necessário para leis de incentivo BR? |

---

### 👨‍💻 2. Programador Sênior (JS/Python/Node)

**Perfil:** Desenvolvedor full-stack com 10+ anos de experiência.
Especializado em JavaScript (ES6+), Node.js e Python.
Arquiteta sistemas, revisa código, otimiza performance.
Não perdoa gambiarras, edge cases não tratados ou código inseguro.

**Critérios de avaliação:**

| # | Critério | O que olha |
|---|----------|------------|
| P1 | **Sintaxe e robustez** | JS/Python compilam? Testes passam? Existem `catch` vazios ou `alert/confirm` hardcoded? |
| P2 | **Segurança** | XSS via `innerHTML`? Dados sensíveis expostos? `__proto__` pollution? |
| P3 | **Edge cases** | O que acontece se o localStorage estiver cheio? Se o JSON estiver corrompido? Se o File System Access falhar? |
| P4 | **Performance** | Quantas chamadas `split('\n')` por ciclo? Quantos `localStorage.setItem` sem try/catch? |
| P5 | **Manutenibilidade** | Código comentado? Funções pequenas e coesas? Duplicação? |
| P6 | **Compatibilidade** | Funciona no Firefox, Safari, Chrome? PWA offline funciona? |
| P7 | **Timers/Eventos** | `setInterval` são limpos? Listeners vazam? Race conditions? |
| P8 | **Dados** | Serialização/deserialização de `.fountain.json` é segura? Backups preservam estado completo? |

---

### 🎨 3. Designer de Interfaces (UI/UX)

**Perfil:** Designer de produtos digitais com experiência em ferramentas
criativas (Figma, Adobe XD). Foco em usabilidade, consistência visual,
acessibilidade e design responsivo. Trabalhou com apps de escrita e
produtividade.

**Critérios de avaliação:**

| # | Critério | O que olha |
|---|----------|------------|
| D1 | **Hierarquia visual** | Os elementos mais importantes estão em destaque? A leitura é natural (Z/F)? |
| D2 | **Consistência** | Botões, cores, fontes, espaçamentos seguem um padrão? |
| D3 | **Acessibilidade** | Contraste WCAG? `:focus-visible`? `aria-label`? Leitores de tela? |
| D4 | **Responsivo** | Funciona em celular (320px)? Tablet (768px)? Desktop (1920px)? |
| D5 | **Estados** | Loading, empty, error, sucesso — todos têm feedback visual? |
| D6 | **Micro-interações** | Hover, focus, transições — são suaves e informativas? |
| D7 | **Cores** | Paleta harmoniosa? Modo escuro consistente? Cores com significado semântico? |
| D8 | **Tipografia** | Fontes legíveis? Tamanhos adequados? Hierarquia de texto? |

---

### ✍️ 4. Redator Técnico (PT/EN)

**Perfil:** Redator e tradutor especializado em produtos digitais.
Nativo em português, fluente em inglês. Já traduziu softwares,
documentações e interfaces. Sabe a diferença entre "OK" e "Okay",
entre "Salvar" e "Gravar".

**Critérios de avaliação:**

| # | Critério | O que olha |
|---|----------|------------|
| T1 | **Tom de voz** | É consistente em todo o app? Amigável, profissional, direto? |
| T2 | **Clareza** | As labels são óbvias? Botões indicam claramente a ação? |
| T3 | **Consistência terminológica** | O mesmo conceito usa a mesma palavra sempre? (ex: "beat" nunca vira "batida") |
| T4 | **Naturalidade PT** | Soa como português real, não como tradução literal? |
| T5 | **Naturalidade EN** | Soa como inglês nativo, sem estrangeirismos desnecessários? |
| T6 | **Ortografia** | Acentos, crases, pontuação, plural — tudo correto? |
| T7 | **Ajuda e docs** | Os textos de ajuda explicam bem? O manual cobre o necessário? |
| T8 | **Microcópia** | Placeholders, tooltips, estados vazios, confirmações — são úteis? |

---

## 📋 Resultados das auditorias

| Data | Versão | 🎬 Roteirista | 👨‍💻 Programador | 🎨 Designer | ✍️ Redator | Ações |
|------|--------|:---:|:---:|:---:|:---:|-------|
| 2026-07-09 | v2.3.0 | 23/23 ✅ | 13/14 ✅ (1 ⚠️) | 14/14 ✅ | 13/13 ✅ | Nenhuma pendência crítica |
