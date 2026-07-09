# Como migrar seus roteiros para o Fountain

Este guia explica como trazer seus roteiros de outros formatos para o **Fonte**
usando o formato aberto **Fountain** — sem perder dados e preservando seus
arquivos originais.

---

## Por que Fountain?

Fountain é um formato de texto puro para roteiros. Diferente de `.fdx` (Final Draft)
ou `.celtx` (Celtx), ele:

- **Não é proprietário** — você não depende de nenhum software para ler ou editar
- **É texto puro** — funciona em qualquer editor, versionamento (Git) e ocupa pouco espaço
- **É o futuro** — suportado por Fade In, Slugline, Highland, WriterDuet e dezenas de outros

---

## 1. Migrar do Final Draft (.fdx)

### Método recomendado: exportar do Final Draft

1. Abra seu roteiro no **Final Draft**
2. Vá em **File → Export → Fountain**
3. Salve o arquivo `.fountain`
4. Abra no **Fonte** usando 📄 **Importar**

### Método alternativo (sem Final Draft)

Use o conversor online gratuito:

1. Acesse [fountain.io/convert](https://fountain.io/convert) (ferramenta do próprio Fountain)
2. Envie seu `.fdx`
3. Baixe o `.fountain` convertido
4. Abra no **Fonte**

### Se nada disso funcionar

O formato `.fdx` é XML e cada versão do Final Draft muda o schema.
Se seus roteiros são muito antigos, experimente:

- **Fade In** (trial gratuito) — abre `.fdx` e exporta para `.fountain`
- **WriterDuet** (versão web gratuita) — importa `.fdx`, exporta `.fountain`

---

## 2. Migrar do Celtx (.celtx)

### Método recomendado: abrir no Celtx e exportar

1. Abra seu roteiro no **Celtx** (versão desktop)
2. Vá em **File → Export as → Fountain**
3. Salve o `.fountain`
4. Abra no **Fonte**

### Se não tiver mais o Celtx

O formato `.celtx` na verdade é um HTML disfarçado. Você pode:

1. Renomear `.celtx` para `.html`
2. Abrir no navegador
3. Copiar o texto do roteiro
4. Colar no **Fonte** e ajustar a formatação manualmente

---

## 3. Migrar de outros formatos

| Formato | Como converter |
|---------|---------------|
| **Fade In (.fadein)** | File → Export → Fountain |
| **Highland (.highland)** | Já é Fountain (renomeie para `.fountain`) |
| **Slugline (.fountain)** | Já é Fountain |
| **WriterDuet** | Export → Fountain (.fountain) |
| **Scrivener** | File → Export → Fountain |
| **Trelby** | File → Export → Fountain |
| **Adobe Story** | Export → Final Draft (.fdx) → depois siga o passo 1 |
| **Google Docs** | Complemento "Fountain" → ferramenta de formatação |

---

## 4. Preservar seus dados no Fonte

O **Fonte** salva projetos no formato `.fountain.json` — que inclui:

- O texto do roteiro em Fountain
- Beats, personagens e locais
- Folha de rosto, ficha do filme e estrutura
- Dados do Projeto Cultural
- Estatísticas e configurações

Para exportar apenas o texto puro (compatível com qualquer outro editor):

```
⬇ Fountain → roteiro.fountain
```

Para salvar o projeto completo (todos os dados do Fonte):

```
💾 Salvar → projeto.fountain.json
```

---

## 5. Preservação a longo prazo

Vantagens de usar Fountain para arquivar seus roteiros:

- Legível em qualquer computador sem software especial
- Funciona com Git (controle de versão nativo)
- Ocupa KB (um longa-metragem tem ~80 KB em Fountain)
- Conversível para PDF/HTML/HTML de roteiro a qualquer momento
- Seu roteiro não fica preso a nenhum ecossistema
