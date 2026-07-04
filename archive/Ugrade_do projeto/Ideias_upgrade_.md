Claro! Vamos aos recursos que tornam cada um desses aplicativos uma ferramenta profissional.

### 🏆 Final Draft (O Padrão Ouro)
*   **Formatação Automática**: Aplica os padrões da indústria.
*   **Ferramentas de Estrutura**: O **Outline Editor** permite planejar visualmente com beats e páginas, e o **Beat Board** funciona como um quadro de beats interativo.
*   **Produção e Colaboração**: Gera relatórios e possui ferramentas de colaboração.
*   **Novidades (v13)**: Inclui metas de escrita, estatísticas, visualização "máquina de escrever" e tutoriais "Idea to Draft".

### 🎬 Movie Magic Screenwriter (O Veterano Premiado)
*   **NaviDoc™**: Sistema inovador que exibe o roteiro lado a lado com o esboço, cartões de cena e anotações.
*   **Poder para Produção**: Gera relatórios de produção, rastreia revisões e possui integração com softwares de planejamento.
*   **Versatilidade e Importação**: Mais de 100 modelos (TV, quadrinhos...) e um importador inteligente que aceita até PDFs.
*   **Colaboração**: Possui ferramenta de co-escrita online chamada **iPartner™**.

### ⚡️ Fade In (O Moderno e Acessível)
*   **Estável e Compatível**: Suporta múltiplos formatos (Final Draft, Celtx, Fountain).
*   **Foco na Escrita**: Possui tela cheia sem distrações e modo de escrita focado.
*   **Ferramentas de Reescrita**: O **Dialogue Tuner** foca no diálogo de um personagem, e há ferramentas para evitar palavras repetidas.
*   **Organização**: Permite organização e codificação por cores de elementos da história.

### 🤝 Arc Studio Pro (O Foco em Colaboração)
*   **Colaboração em Tempo Real**: Vários autores no mesmo documento, com convites por e-mail e comentários diretos.
*   **Estruturação Visual**: Possui um "Plot Board" com beats (cartões) organizados via *drag and drop* e um quadro branco digital para personagens e locais.
*   **Segurança**: Salvamento automático na nuvem e histórico de edições para recuperar versões anteriores.

### ✍️ WriterDuet (O Rei da Co-escrita)
*   **Colaboração Síncrona e Assíncrona**: Edição em tempo real com cursores coloridos ou edição offline com atualizações posteriores.
*   **Comunicação Integrada**: Comentários inline e chat de vídeo dentro do projeto.
*   **Controle de Versões**: Histórico de alterações por linha e por autor.

### 🎥 Celtx (O All-in-One de Pré-Produção)
*   **Integração com Pré-Produção**: Com um clique, gera listas de cenas, objetos (*breakdowns*) e planeja locações.
*   **Ferramentas de Produção**: Cria *call sheets*, listas de planos, rastreia orçamento e revisões.

### 📚 Scrivener (O Organizador de Pesquisas)
*   **Gestão de Pesquisa**: Permite organizar pesquisas, notas e imagens junto com o roteiro.
*   **Modo Roteiro**: Formata automaticamente para o padrão da indústria.
*   **Visão Panorâmica**: O "Corkboard" (quadro de cortiça) oferece uma visão geral da estrutura.

### 🗺️ Plottr (O Planejador Visual)
*   **Estruturas Prontas**: Oferece mais de 40 modelos de estrutura narrativa.
*   **Planejamento Visual**: Linha do tempo com *cards* organizados por *drag and drop* e gerenciamento de subtramas e arcos de personagens.

Espero que este detalhamento ajude na sua escolha! Se precisar de mais informações sobre algum deles, é só me perguntar.


---

Que projeto ambicioso! O ecossistema open-source tem algumas bases sólidas que podem te inspirar (ou servir de ponto de partida). Aqui estão os principais projetos e como eles se alinham com sua visão:

### 🏗️ Projetos Open-Source para Servir de Base

*   **Story Architect (STARC)**: O mais próximo da sua visão. É o sucessor do KIT Scenarist e já possui módulos de pesquisa, mapa mental, estatísticas de personagens e suporte a múltiplos episódios. O roadmap inclui mapas de relacionamento e quadros de beat (*corkboards*) na versão Pro. Feito em **C++/Qt**.
*   **OpenDraft**: Alternativa moderna e completa ao Final Draft. Já tem formatação profissional, **Beat Board** com cartões *drag-and-drop*, **perfis de personagens** e controle de versão. É multiplataforma (Web/Desktop/Mobile) e usa **TypeScript** (desconhecido).
*   **Anvilory**: Planejador de histórias com foco em **visualização**. Possui **mapa de relacionamento** com conexões coloridas, fichas de personagem com foto e biografia, e suporte a sagas. Feito em **Kotlin Multiplatform**.
*   **Manuskript**: Ótimo para o fluxo "da ideia ao texto". Permite escrever cena a cena, mover partes como peças de quebra-cabeça e criar fichas de personagem. Feito em **Python/Qt**.
*   **Beat**: Focado em integrar **esboço (*outline*) e escrita** na mesma tela. Minimalista e sem distrações. Feito em **Swift** para macOS.

### 💡 Funcionalidades que Você Pode Combinar

*   **Mapa de Relacionamento**: Anvilory e STARC (em desenvolvimento).
*   **Beat Board / Outline**: OpenDraft e STARC (em desenvolvimento).
*   **Fichas de Personagem**: OpenDraft, Anvilory e STARC.
*   **Timeline de Plot e Subplots**: O plugin "Radial Timeline" para Obsidian é um ótimo exemplo.

### 🛠️ Guia para Começar a Desenvolver

*   **Formatação de Roteiro**: Use o padrão **Fountain** (texto puro) para facilitar a importação/exportação.
*   **Tecnologia (Escolha uma)**:
    *   **C++/Qt**: Mais performance (usado pelo STARC).
    *   **Kotlin Multiplatform**: Código unificado para desktop e Android (usado pelo Anvilory).
    *   **TypeScript com Electron**: Web e desktop com uma base de código (similar ao OpenDraft).
    *   **Python com Qt**: Rápido para prototipar (usado pelo Manuskript).
*   **Arquitetura**: Pense em módulos (ex: "Pesquisa", "Escrita", "Estatísticas") para manter o projeto organizado.

Boa sorte no desenvolvimento! Se precisar de mais ajuda com algum aspecto técnico, é só perguntar.


---

Para criar uma alternativa open-source que realmente se destaque, o ideal é combinar o que cada ferramenta faz de melhor. Aqui está um apanhado dos recursos mais valiosos que você pode incluir no seu projeto.

### 🧠 Planejamento e Estruturação
*   **Story Map (Final Draft)**: Visão hierárquica da história (Atos → Sequências → Cenas), permitindo navegar e reorganizar a estrutura com *drag and drop*.
*   **NaviDoc™ (Movie Magic)**: Painel dividido para visualizar o roteiro lado a lado com o esboço, anotações ou cenas.
*   **Plot Board (Arc Studio Pro)**: Estrutura a história com "batidas" (*beats*) visíveis na mesma janela do roteiro, com código de cores por trama ou personagem.
*   **Timeline com Plotlines (Plottr)**: Linha do tempo visual para acompanhar trama principal, subtramas e arcos de personagens simultaneamente.
*   **Outline Editor (Final Draft)**: Organiza as "batidas" do Beat Board em uma estrutura cronológica com múltiplas "pistas" (*lanes*).

### 👥 Personagens e Mundo
*   **Fichas Detalhadas (STARC/Anvilory)**: Perfis com biografia, relacionamentos, referências visuais e arcos de desenvolvimento.
*   **Mapa de Relacionamento (Anvilory/STARC)**: Visualização interativa das conexões entre personagens.
*   **Gerenciamento de Localizações (Arc Studio/Celtx)**: Banco de dados de locais com descrições e referências.
*   **World Building (Scrivener/Manuskript)**: Módulos dedicados para contexto, pesquisa, referências visuais e notas de apoio.

### ✍️ Escrita e Revisão
*   **Fountain Compatibilidade**: Suporte ao formato de texto puro para importação/exportação universal.
*   **Focus Mode (Final Draft)**: Ambiente de escrita sem distrações.
*   **Dialogue Tuner (Fade In)**: Visualiza e edita todo o diálogo de um personagem em um único lugar.
*   **Corkboard (Scrivener)**: Visão geral da estrutura com "índex cards" virtuais para cada cena.
*   **Revisões e Versionamento**: Controle de versões, bloqueio de cenas/páginas e comparação de rascunhos.

### 🎬 Produção e Pré-Produção
*   **Breakdown Automático (Celtx)**: Identifica automaticamente personagens, adereços e locais em cada cena.
*   **Relatórios de Produção (Final Draft/Celtx)**: Gera listas de cenas, relatórios de personagens e calendários de produção.
*   **Ferramentas de Orçamento e Agenda (Celtx)**: Planejamento financeiro e *stripboards* para dias de filmagem.

### ✨ Extras que Fazem a Diferença
*   **Gerador de Nomes (STARC)**: Para batizar personagens rapidamente.
*   **Gerador de Logline (STARC)**: Ajuda a sintetizar a ideia central.
*   **Suporte a Séries (STARC/Plottr)**: Gerencia múltiplos episódios em um único projeto.
*   **Metas de Escrita (Final Draft/WriterDuet)**: Define metas diárias de páginas ou palavras.

### 💎 Como Priorizar
Para um MVP (Produto Viável Mínimo), foque no essencial:
1.  **Editor de Roteiro** com formatação automática (padrão Fountain).
2.  **Outline/Beat Board** para estruturação visual.
3.  **Fichas de Personagem** e **gerenciamento de localizações**.
4.  **Timeline** para visualizar trama e subtramas.

Depois, expanda com **mapa de relacionamento**, **ferramentas de produção** e **geradores** criativos.

Boa sorte com o desenvolvimento! Se precisar de ajuda para decidir a ordem das funcionalidades ou detalhes técnicos, é só perguntar.



---

Aqui está o roteiro de desenvolvimento completo, dividido em fases lógicas. Comece pelo **MVP (Versão 1)**, que entrega valor imediato, e evolua para a **Versão 3**, que rivaliza com os softwares pagos.

---

### 🚀 Versão 1 – MVP (O Alicerce)
*Foco: Escrever, formatar e organizar o básico sem travamentos.*

| Recurso | Breve Descrição |
| :--- | :--- |
| **Editor Fountain nativo** | O coração do app. Escreve em texto puro com formatação automática em tempo real (Personagem, Ação, Diálogo, Transição). |
| **Visualização Paginada** | Pré-visualização do roteiro com contagem de páginas no padrão industrial (1 página ≈ 1 minuto de filme). |
| **Navegador de Cenas (Outline)** | Lista hierárquica de cenas (com títulos e resumos) para clicar e saltar diretamente para qualquer parte do roteiro. |
| **Fichas Básicas de Personagem** | Cadastro com Nome, Idade, Descrição Física e Personalidade, linkado automaticamente ao roteiro. |
| **Gerenciamento de Localizações** | Cadastro de Cenários (Interno/Externo, Endereço, Descrição) para manter consistência. |
| **Importação/Exportação .fountain** | Salva e abre arquivos de texto puro, garantindo interoperabilidade com outros apps. |
| **Exportação para PDF** | Gera PDF com formatação profissional para leitura ou impressão. |
| **Sistema de Temas (Dark/Light)** | Interface confortável para escrever dia ou noite. |

---

### 🧠 Versão 2 – O Planejador Visual
*Foco: Estruturar a história antes de escrever, com mapas e timelines.*

| Recurso | Breve Descrição |
| :--- | :--- |
| **Beat Board (Quadro de Batidas)** | Quadro estilo *corkboard* com cards coloridos (Eventos/Batidas). Organize por *drag-and-drop* e agrupe em Atos. |
| **Timeline Multifios (Plot/Subplots)** | Linha do tempo interativa horizontal. Visualize a trama principal e 3~4 subtramas simultaneamente, com cores diferentes. |
| **Mapa de Relacionamento** | Grafos interativos mostrando conexões (Amor, Ódio, Família, Trabalho) entre personagens. Clique em um nó para ver a ficha. |
| **Story Map (Estrutura Hierárquica)** | Visão em árvore (Atos → Sequências → Cenas). Arraste cenas entre sequências para reestruturar a narrativa. |
| **Corkboard de Cenas (Scrivener)** | Cards visuais para cada cena, mostrando resumo, personagens presentes e local. Ótimo para ter uma visão macro do roteiro. |
| **Fichas Avançadas de Personagem** | Adiciona: Arco de transformação, Motivações, Medos, e galeria de imagens de referência. |
| **Modo Sem Distrações (Focus Mode)** | Tela cheia com fundo escuro, mostrando apenas o parágrafo atual (inspirado no Fade In). |
| **Diálogo Tuner (Filtro por Personagem)** | Visualize todos os diálogos de um personagem específico em uma única lista para ajustar sua voz. |
| **Gerador de Nomes e Loglines** | Sugestões criativas para batizar personagens e sintetizar a premissa do filme em 1 frase. |
| **Exportação/Importação .fdx** | Suporte ao formato nativo do Final Draft para troca de arquivos com produtores. |

---

### 🏆 Versão 3 – Pré-Produção e Poder Profissional
*Foco: Sair do papel e ir para as gravações, com dados e relatórios.*

| Recurso | Breve Descrição |
| :--- | :--- |
| **Breakdown Automático (Stripboard)** | Scaneia o roteiro e lista automaticamente tudo que cada cena precisa: Elenco, Figurino, Adereços, Efeitos e Locais. |
| **Relatórios de Produção** | Gera listas inteligentes: *Relatório de Cenas* (por local ou personagem), *Lista de Elenco*, e *Calendário de Dias*. |
| **Scheduling (Stripboard)** | Organize as cenas por dia de gravação arrastando tiras coloridas, otimizando locações e elenco. |
| **Orçamento Base** | Atribua custos estimados por cena (Elenco, Equipe, Locação) e veja o total do projeto. |
| **Suporte a Séries/Temporadas** | Gerencie múltiplos episódios no mesmo projeto, com timelines gerais por temporada. |
| **Controle de Revisões (Versionamento)** | Histórico completo de alterações. Compare versões anteriores do roteiro lado a lado. |
| **Anotações e Comentários Offline** | Adicione notas fixadas em cenas ou linhas específicas (sem necessidade de nuvem, apenas local). |
| **Estatísticas Avançadas** | Dashboard com: tempo de leitura, repetição de palavras, porcentagem de diálogo vs. ação, e métricas de página por ato. |
| **Pesquisa Global com Filtros** | Busque qualquer palavra no roteiro, personagens ou locais, com filtros por tipo de elemento. |
| **Exportação Multicanal** | Exporte para formatos de produção (CSV para planilhas, HTML para web, e RTF para editores de texto). |

---

### 💎 Dica de Arquitetura
Para unificar tudo isso, mantenha o **Fountain** como a *fonte da verdade* para o texto. Use um banco de dados local (SQLite ou JSON) para guardar os metadados (fichas, beats, relacionamentos, cores da timeline). Assim, seu app nunca "quebra" o roteiro, e você pode sincronizar os dados visuais com as marcações especiais (ex: `{{char:João}}`) dentro do texto.

Boa construção! Se quiser ajuda para definir a stack técnica (Electron + Vue/React, ou Qt nativo), é só me chamar!
