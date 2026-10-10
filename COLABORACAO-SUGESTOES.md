# Fonte — Colaboração por sugestões (plano)

**Status:** planejado — **início previsto: 23–30/10/2026**
**Decisões (09/10/2026):** sem servidor · transporte por **e-mail** · modo
revisão na Fase 3 · relay: não especificar agora
**Espelho no Trilium:** nota mãe "Fonte - Roteiros" (`jYhCpn9RdK1U`) →
💬 Colaboração por Sugestões

Contribuição estilo "controle de alterações" do Word, **sem edição em tempo
real** e **sem servidor**.

---

## 1. O princípio que simplifica tudo

**Um escritor (o editor final) edita o texto; todos os outros só sugerem.**

Como o texto tem um único dono, não é preciso edição simultânea
(CRDT/OT seria caro e frágil). Sugestões são uma **camada de dados ao lado do
roteiro** — como beats e cores já são hoje — ancorada por cena + linha +
trecho citado.

## 2. Modelo de dados (dentro do `.fountain.json`, schema v2)

O `migrateProject()` já existe, então a v1 (sem sugestões) continua abrindo.

```json
"suggestions": [
  {
    "id": "sg-...",
    "scene_ref": "INT. CASA - DIA|L42",
    "line": 42,
    "type": "insert|replace|delete|comment",
    "quote": "trecho original",
    "text": "sugestão",
    "author": "Nome",
    "created": "2026-10-23T10:00:00Z",
    "status": "open|accepted|rejected",
    "thread": [{ "author": "...", "text": "...", "time": "..." }]
  }
]
```

**Âncora robusta** (o ponto crítico quando o arquivo viaja entre pessoas):
resolve por (a) `scene_ref` exato → (b) busca do trecho citado no bloco da
cena → (c) marca como "órfã" para revisão. A máquina já existe no app
(`_resyncLineAnchors` / `_remapAnchorsByLineMap`, criadas para cores e
marcações).

## 3. UX

- **Badge na cena:** `💬 N ▸` na lista de cenas — número de sugestões + seta
  que abre o painel daquela cena
- **Painel de sugestões** (nova aba ao lado de Beats/Pers/Loc): autor,
  trecho original, texto sugerido e ações **✅ Aceitar** (aplica no texto),
  **❌ Recusar** (fica salva com ícone), **💬 Comentar**, **📦 Arquivar**;
  filtros abertas/aceitas/recusadas
- **Autoria:** campo "Seu nome" salvo localmente, entra em cada sugestão
- **Onde mostrar (mais user-friendly para roteirista):**
  1. **Lista de cenas + painel** (Fase 1) — é onde o roteirista navega e resolve
  2. **Corkboard** (Fase 2) — o quadro de cenas é onde a história é reorganizada
  3. **Timeline** (Fase 2) — visão por ato/trama, útil na revisão estrutural
  (mesmo componente nos três; barato de incluir)

## 4. Transporte — por e-mail (decisão), sem servidor

1. **Botão 📤 Enviar sugestões** gera:
   - o pacote `roteiro-sugestoes-<autor>-<data>.json` (só as sugestões,
     arquivo pequeno)
   - um **HTML autocontido** (o líder lê sem o app)
   - um rascunho `mailto:` com assunto e instruções (o arquivo é anexado
     pelo usuário)
2. O líder **importa** o pacote: mescla por `id` (sem duplicar), mantém
   autor/data e mostra "3 novas sugestões de Ana"
3. **Alternativa pelo mesmo mecanismo:** pasta na nuvem
   (Dropbox/OneDrive/Drive) — regra de ouro: o líder é o único que salva o
   projeto; os outros colocam pacotes na pasta; o líder importa. Vale para
   mensageiro/USB também.

## 5. Fases e esforço

| Fase | Escopo | Esforço |
|---|---|---|
| **1 — Núcleo** | modelo + painel + badges + aceitar/recusar + âncoras + import/merge + testes | ~2–3 sessões (o grosso) |
| **2 — Transporte** | pacote, HTML para e-mail, mailto, guia na Ajuda; badges no corkboard/timeline | ~1 sessão |
| **3 — Modo revisão no preview** | tracked changes (inserções verdes, remoções riscadas) | ~1 sessão |
| **4 — Relay (opcional)** | servidor mínimo (token por projeto, dashboard, notificação) | projeto separado, ~2–3 sessões |

## 6. Riscos e mitigação

- **Conflito de arquivo na pasta da nuvem** (dois salvando o mesmo `.json`)
  → regra "um escritor só" + sugestões em pacotes separados
- **Sugestões órfãs** quando o texto muda muito → âncora tripla + aviso de
  revisão (nada se perde)
- **Escopo:** não é edição em tempo real; o modelo de sugestões é mais fiel
  ao fluxo real de roteiro (revisões)

## 7. O que ficou decidido

- ✅ Sem servidor
- ✅ Transporte por e-mail (nuvem como alternativa, mesmo mecanismo)
- ✅ Modo revisão no preview na Fase 3
- ✅ Relay: não especificar agora; registrar como opção futura
- ✅ Badges: lista de cenas + painel primeiro; corkboard/timeline na Fase 2
- 📅 Início previsto: 23–30/10/2026
