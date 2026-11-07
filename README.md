# Lisa — assistente pessoal open source

A Lisa é uma assistente pessoal com interface HUD, que conversa por **texto e voz**, conhece as
suas **tarefas, notas e código**, vê a sua **tela e câmera** quando você deixa, escreve código
num editor ao vivo e desenha fluxogramas. Junto vem o **Abacato**, um sistema de quadros de
tarefas e documentação (uma alternativa ao Trello) que a Lisa lê e altera por você.

Tudo foi pensado para cada pessoa hospedar e personalizar a **sua** Lisa: nada de dado pessoal
no código. Quem você é, quem mora com você, as suas cidades, os seus quadros e a personalidade
dela ficam em arquivos e variáveis que você mesmo preenche.

---

## O que vem neste repositório

| Pasta | O que é |
| --- | --- |
| `/` (raiz) | **A Lisa**: app Next.js 15 (React 19), com as rotas de API, o HUD, a voz e o cérebro (RAG). |
| `Abacatosys/abacato/` | **O Abacato**: quadros, cards, documentos, painéis públicos e a "Lisa Task". App Next.js separado, no mesmo banco. |
| `db/` | O banco da Lisa (Supabase/Postgres + pgvector), em arquivos `.sql`. |
| `workers/lisa-cron/` | Worker da Cloudflare que agenda a sincronização e as notificações push. |
| `vscode-extension/lisa-code/` | Extensão do VS Code: a Lisa dentro do editor. |
| `servidor/` | Scripts para rodar a Lisa num servidor seu, em casa (o "modo casa"). |
| `scripts/` | Testes (`npm run *-check`), indexação, migração e backup. |
| `docs/ARQUITETURA.md` | Como as peças funcionam por dentro e o mapa das rotas. |

## O que ela faz

- **Conversa por texto e voz.** Respostas em streaming (Gemini), voz que começa a falar na
  primeira frase, microfone com "segure para falar", conversa livre e a palavra "Lisa" para chamar.
- **Cérebro (RAG).** Indexa os quadros (Abacato ou Trello), as notas e repositórios do GitHub em
  embeddings (pgvector) e responde com base neles, citando de onde veio.
- **Ações nas tarefas.** Cria, edita, conclui, move e exclui cards do Abacato pela conversa,
  sempre pedindo confirmação.
- **Olhos e ouvidos (opcionais).** Modo Tela (vê o que você compartilha), Modo Observância
  (câmera), Modo Escuta e Modo Tomar nota.
- **Código.** Editor ao vivo que digita o código com a explicação, pair programming com Monaco,
  leitura de repositórios e a extensão **Lisa Code** para o VS Code.
- **ProcessMap.** Fluxogramas, mapas mentais e diagramas (BPMN, C4, infraestrutura, schema SQL).
- **Painéis.** Kanban, dashboard (também em AR), tarefas do trabalho a partir de uma planilha,
  Map of Deploy (o que está no ar), notícias, clima, Sentinela (chamados), uso dos usuários.
- **Modo Rádio, jogos e o "Mundo da Lisa"**, para quando você quer uma pausa.
- **Visuais.** Esfera de pontos, Rosto, avatar 3D e outros, com temas de cor.
- **Abacato.** Quadros com colunas e cards, prazos e recorrência, documentos e pastas, comentários,
  painéis públicos de acompanhamento, workspaces e a sua própria assistente.

## Requisitos

- **Node.js 20.6 ou mais novo** (recomendado 22+).
- **Um projeto Supabase** (o gratuito serve), na nuvem ou instalado por você.
- **Uma chave do Gemini** ([Google AI Studio](https://aistudio.google.com/apikey)).
- Opcionais: Groq (transcrição de fala), Trello, GitHub, Cloudflare (para publicar).

---

## Instalação

### 1. Baixar e instalar as dependências

```bash
git clone https://github.com/seu-usuario/lisa-assistente.git
cd lisa-assistente
npm install
cd Abacatosys/abacato && npm install && cd ../..
```

### 2. Criar o banco no Supabase

No **SQL Editor** do seu projeto, rode os arquivos nesta ordem (todos podem rodar mais de uma vez):

1. Lisa: `db/schema.sql` → `db/config.sql` → `db/notas.sql` → `db/fluxogramas.sql` →
   `db/fluxogramas_versoes.sql` → `db/mvp_usuarios.sql` → `db/uso_dos_usuarios.sql`
2. Abacato: `Abacatosys/abacato/db/schema.sql` e depois os numerados, em ordem
   (`002-...` até o último).
3. Opcional: `db/cron.sql`, para o Supabase agendar a sincronização (troque os marcadores
   `COLE-AQUI-...` e o endereço do seu deploy antes de rodar). Quem publica na Cloudflare pode
   usar o `workers/lisa-cron` no lugar.

> Prefere o terminal? Com o `.env.local` preenchido (passo 4): `npm run migrar -- db/schema.sql`
> (o script usa o endpoint `/pg/query`, disponível no Supabase instalado por você; na nuvem, use o
> SQL Editor).

### 3. Criar o seu login

No Supabase: **Authentication → Users → Add user**, com e-mail e senha (marque para confirmar
automaticamente). É com ele que você entra na Lisa. No Abacato, a conta é própria
(`node Abacatosys/abacato/scripts/criar-usuario.mjs "voce@exemplo.com" "Seu nome"`), ou entra pelo
menu **Lisa Task** da Lisa com a mesma conta.

### 4. Configurar as variáveis

```bash
cp .env.example .env.local
cp Abacatosys/abacato/.env.example Abacatosys/abacato/.env.local
```

Preencha pelo menos: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_JWT_SECRET` e `GEMINI_API_KEY` (na Lisa) e `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY` e `ABACATO_SESSAO_SECRET` (no Abacato). Cada variável está explicada
dentro do `.env.example`.

> A Lisa confere a sessão com o **JWT Secret** do projeto (assinatura HS256). Ele fica em
> Settings → API (ou JWT Keys, nos projetos mais novos).

### 5. Rodar

```bash
npm run dev                                   # a Lisa em http://localhost:3000
cd Abacatosys/abacato && npm run dev          # o Abacato em http://localhost:3001
```

### 6. Ensinar a Lisa

Crie um quadro no Abacato (o nome padrão do quadro principal é **"Quarto de Guerra"**, ou troque
em `NEXT_PUBLIC_QUADRO_PRINCIPAL`) e aperte **SYNC** no topo da Lisa: ela indexa os quadros e as
notas. Depois é perguntar: *"o que eu tenho para esta semana?"*.

---

## Personalização

| O quê | Onde |
| --- | --- |
| **Personalidade** (tom, humor, exemplos) | `persona.md`. Entra quando o **Modo Persona** está ligado. |
| **Quem é você** (nome, trabalho, rotina, preferências) | `contexto/*.md`. Copie `contexto/_exemplo.md` para `contexto/sobre-mim.md` e preencha. Todo `.md` dali (menos os que começam com `_`) entra em toda conversa. |
| **Quem pode ver tudo** | `LISA_ADMINS`. Vazio = todos são admin (a Lisa completa). Com e-mails, os demais usam a versão limitada. |
| **O quadro principal** | `NEXT_PUBLIC_QUADRO_PRINCIPAL` |
| **Apelidos de quadro** ("o que tem no quarto?") | `LISA_APELIDOS_DE_QUADRO` |
| **De onde vêm as tarefas** (Abacato ou Trello) | Tela `/boards` → "Fonte dos quadros" (o padrão é o Abacato). |
| **Quem mora com você** (o Modo Observância cumprimenta pelo nome) | `LISA_CASA` |
| **Cidades do clima e fuso** | `LISA_CIDADES_DO_TEMPO`, `LISA_FUSO` |
| **Músicas do Modo Rádio** | `radio/playlist.txt` |
| **Avatar 3D com esqueleto** | `public/models/rigado/` (ver o `LEIA-ME.txt` de lá) |
| **Cores e visual** | Na própria tela (temas de cor e "Visual da Lisa" em `/visual`). |
| **Modelos de IA, voz, cotas** | `GEMINI_*`, `GROQ_*`, `RAG_*` no `.env.example` |

`persona.md`, `contexto/` e `radio/playlist.txt` entram no **build**: depois de editar, rode
`npm run dev` de novo ou publique outra vez.

---

## Publicar

### Cloudflare Workers (o caminho usado pelo projeto)

```bash
npx wrangler login
npm run publicar                              # a Lisa (OpenNext + wrangler deploy)
cd Abacatosys/abacato && npm run publicar     # o Abacato
```

- Cadastre as variáveis do `.env.local` no painel (Workers → Settings → Variables), ou como
  segredos com `npx wrangler secret put NOME`. O `keep_vars` do `wrangler.jsonc` impede que um
  deploy apague o que está no painel.
- Domínio próprio: descomente as `routes` nos `wrangler.jsonc`.
- Agendamento: publique `workers/lisa-cron` (troque o `LISA_URL` no `wrangler.jsonc` dele e
  cadastre `CRON_SECRET`, `INGEST_SECRET` e, para push, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` e
  `VAPID_SUBJECT`), ou use o `db/cron.sql`.

> O projeto usa Next 15 com o adaptador `@opennextjs/cloudflare`; por isso o `cf:build` leva
> `--dangerouslyUseUnsupportedNextVersion`.

### Outras opções

- **Vercel:** importe o repositório, cadastre as mesmas variáveis e agende a sincronização pelo
  `db/cron.sql` (o plano gratuito da Vercel não roda cron de minutos; ver `docs/ARQUITETURA.md`,
  seção "SYNC").
- **Um servidor seu (em casa):** veja `servidor/README.md` — Node, Caddy com HTTPS, túnel da
  Cloudflare, tela remota e backup criptografado (`scripts/backup/LEIA-ME.md`).

---

## Testes

Os testes ficam em `scripts/` e rodam sem rede nem banco, na maioria:

```bash
npm run fala-check        # voz (fala ao vivo, pedaços, fila)
npm run auth-check        # login, sessão e o que cada papel alcança
npm run mvp-check         # a versão limitada (usuário que não é admin)
npm run fluxogramas-check # ProcessMap
```

A lista completa está no `package.json`. Os que usam `--env-file=.env.local` falam com o banco de
verdade; os do Abacato marcados com `ABACATO_URL` precisam dele rodando (`npm run dev`).

---

## Segurança e privacidade

- **Nunca versione o `.env.local`** nem a pasta `.wrangler/` (ela guarda as variáveis em texto
  puro). O `.gitignore` já cuida dos dois.
- A **`SUPABASE_SERVICE_ROLE_KEY`** ignora o RLS: só no servidor, nunca em `NEXT_PUBLIC_*`.
- O que está em `contexto/*.md`, `LISA_CASA`, nas notas e nos quadros **vai para o provedor de IA**
  (Gemini/Groq) quando a Lisa responde. Coloque só o que você aceita compartilhar; evite
  documentos, senhas, dados bancários e de saúde.
- Câmera e microfone só ligam quando você liga os modos. Se a Lisa observa a casa, avise quem mora
  com você — e respeite as leis de proteção de dados do seu país (no Brasil, a LGPD).
- Se uma chave vazar, gere outra no painel do serviço e troque nas variáveis.

---

## Créditos e licença

Código sob a licença **MIT** (ver [LICENSE](LICENSE)). Modelos, bibliotecas e dados de terceiros
estão em [CREDITOS.md](CREDITOS.md), com as licenças de cada um.
