# Fonte — Editor de Roteiros Fountain

![Fonte icon](imagens/fonte-icon.svg)

**Editor Fountain em HTML/CSS/JS puro. Zero dependências. Funciona em qualquer navegador.**

Autor: **Ricardo A. B. Graça** — [ricolandia.com](https://www.ricolandia.com)

---

## Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| **Editor** | Textarea com auto-save a cada 10s (localStorage) |
| **Preview** | Live rendering Fountain (CHARACTER 37%, DIALOGUE 20%) |
| **Corkboard** | Visualização em cards (toggle ⊞/⊟) |
| **Sidebar de cenas** | Lista com separadores visuais de ato (Ato 1–7 fixos) |
| **Atribuição por beat** | Muda o ato da cena pelo modal do beat |
| **Beats** | CRUD com plotline (Principal/A/B), inserção no texto (↗), drag reorder |
| **Comentários** | Comentários por beat (autor + timestamp) |
| **Timeline** | Grid atos × tramas, com expandir tela cheia (⤢) |
| **Personagens** | Extraídos automaticamente, com editor de perfil |
| **Locais** | Extraídos automaticamente do texto |
| **Find/Replace** | Case-sensitive, replace all |
| **Folha de rosto** | Título, crédito, autor, fonte, data, contato |
| **Ficha do Filme** | Logline, sinopse, argumento, gênero, duração, público-alvo |
| **Estrutura da História** | McKee: ideia governante, valor central, premissa, força antagônica, dilema, tipo de trama, perguntas guiadas |
| **Imprimir ficha** | Gera PDF da ficha do filme + estrutura |
| **PWA** | Instalável como app, service worker com cache offline |
| **Side-by-side** | Editor / Preview / Split (👁) |
| **Temas** | Claro (creme/papel) / escuro |
| **Idiomas** | Português / English (recarrega) |
| **Export HTML** | Download .html formatado |
| **Export PDF** | Via impressão do navegador (com page-breaks) |
| **⬇ Fountain** | Download .fountain (texto puro) |
| **📄 Importar** | Importa .fountain (texto puro) |
| **📂 Abrir** | Abre projeto .fountain.json |
| **💾 Salvar** | Salva projeto completo .json |
| **Pomodoro** | Timer de escrita + Pomodoro 25min |
| **Metas diárias** | Meta de palavras com progresso |
| **Highlights** | Marcação colorida por linha (Ctrl+1/2/3) |
| **Auto-backup** | A cada 5min, 10 versões, com restore |
| **Estatísticas** | Cenas, palavras, top personagens |
| **Gráfico** | Produtividade dos últimos 7 dias |
| **Som** | Efeito sonoro de teclas (toggle) |
| **Zoom** | Ctrl+=/-/0 para ajustar fonte |
| **Foco** | F11: esconde painéis, só o editor |
| **Atalhos** | Ctrl+B/I/U (bold/italic/underline) |
| **Marcador 📍** | Insere `# Ato N` no texto com um clique |
| **Indicador de ato** | Mostra o ato atual na barra de status |

## 🧩 Quadro de Planejamento Visual (Excalidraw)

Editor visual completo para planejar seu roteiro. Funciona offline, 100% local.

**12 templates prontos:**

| Template | Descrição |
|----------|-----------|
| **3 Atos** | Colunas para cada ato com cartões de cena |
| **Jornada do Herói** | 12 estágios clássicos |
| **Mapa de Personagens** | Relações entre personagens |
| **Save the Cat** | 15 beats numerados por página |
| **Story Circle (Harmon)** | 8 passos em círculo |
| **Quadro de Cenas** | Corkboard estilo index cards |
| **Estrutura de TV** | Teaser + Atos + Tag |
| **Batman Chart** | Grid atos × tramas |
| **Mood Board** | Paleta de cores, referências, inspiração |
| **Diagrama de Relações** | Mapa de conexões entre personagens com setas |
| **Linha do Tempo** | Cenas posicionadas no eixo temporal com trilhas de subtrama |
| **Arco de Personagem** | Curva emocional com pontos narrativos chave |

Para usar: abra o 🧩 Quadro → no Excalidraw, use **Open** → escolha um template `.excalidraw`.

## 💾 Sobre Salvar

O Fonte usa dois sistemas de persistência:

| Método | O que salva | Quando |
|---|---|---|
| **localStorage** | Texto + beats + atos | Auto-save a cada 10s |
| **Backup** | Texto + beats + atos + cores + marcações | A cada 5min (10 versões) |
| **💾 Salvar** | Projeto completo .json | Manual |

**💾 Salvar no Chrome/Edge/Opera:**
- 1ª vez: abre diálogo "Salvar como" (escolha a pasta)
- 2ª vez em diante: salva **no mesmo arquivo**, sem perguntar

**💾 Salvar no Firefox/Safari:**
- Sempre baixa o .fountain.json para a pasta de Downloads

**Proteção contra perda de dados:**
- Antes de fechar/recarregar, se houver alterações, o navegador pergunta "Tem certeza?"
- Lembrete "💾 Salve seu projeto" na barra de status até o primeiro save
- Backups restauráveis via botão 💾 Backups

## Como usar

### Opção 1 — Navegador (recomendado)

```bash
python3 serve.py
# Abrir http://localhost:8000/web/index.html
```

Ou abrir `web/index.html` direto no navegador (alguns recursos podem precisar de servidor HTTP).

### Opção 2 — Deploy estático

Copie a pasta `deploy/` para qualquer servidor HTTP estático (FTP, Nginx, Apache).

### Opção 3 — Docker (API opcional para PDF/HTML)

```bash
cd web
docker compose up -d
# http://localhost:8000
```

## Sincronização via nuvem (Dropbox, OneDrive, Google Drive)

1. Coloque a pasta `Fonte/` dentro da sua pasta de nuvem
2. Crie uma subpasta (ex: `roteiros/`)
3. Ao salvar (💾), escolha essa pasta como destino
4. O navegador lembra e salva sempre no mesmo lugar
5. Seus roteiros sincronizam em todos os dispositivos

## Tecnologias

HTML5, CSS3, JavaScript (ES6+), Excalidraw (UMD bundle offline), localStorage, File System Access API.

## Imagens

![Fonte](imagens/2-0/Fountain_Writer_2-0_1.webp)
*Editor com sidebar de cenas e timeline*

![Fonte preview](imagens/2-0/Fountain_Writer_2-0_2.webp)
*Preview ao vivo com formatação Fountain*
