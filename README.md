# IFlashcard

Aplicação web responsiva de **estudo por repetição espaçada**, inspirada no método Anki e alinhada à identidade visual do **Instituto Federal do Rio de Janeiro (IFRJ)**. O estudante cria bibliotecas (baralhos) de flashcards, importa questões de uma base pública e revisa os cartões em uma fila que o próprio sistema reagenda conforme o desempenho.

**Acesse a aplicação online:** [https://julhinha.github.io/flashcard/](https://julhinha.github.io/flashcard/)

> **Projeto acadêmico** desenvolvido e idealizado por **Guilherme Nascimento Monteiro do Carmo** e **Julia Araujo de Avellar** para a disciplina de **Desenvolvimento Web II** do IFRJ. Trata-se de um projeto desenvolvido com o objetivo de aprofundar os conhecimentos e práticas abordados na disciplina, sem fins comerciais.

## Sumário

1. [Visão geral](#visão-geral)
2. [Funcionalidades](#funcionalidades)
3. [Tecnologias](#tecnologias)
4. [Estrutura de pastas](#estrutura-de-pastas)
5. [Modelo de dados (Cloud Firestore)](#modelo-de-dados-cloud-firestore)
6. [Repetição espaçada](#repetição-espaçada)
7. [E-mails de lembrete](#e-mails-de-lembrete)
8. [Configuração do ambiente](#configuração-do-ambiente)
9. [Como executar localmente](#como-executar-localmente)
10. [Publicação e automações (GitHub Actions)](#publicação-e-automações-github-actions)
11. [Créditos](#créditos)

## Visão geral

O IFlashcard permite que o estudante:

- crie **bibliotecas** (baralhos) e cadastre flashcards manualmente;
- **importe questões** da Open Trivia DB para suas bibliotecas;
- **revise** os cartões vencidos, avaliando cada um como Difícil, Bom ou Fácil;
- acompanhe seu desempenho em **gráficos** no dashboard;
- receba **lembretes por e-mail** quando houver revisões pendentes.

## Funcionalidades

| Tela               | Caminho            | Descrição                                                                                            |
| ------------------ | ------------------ | ---------------------------------------------------------------------------------------------------- |
| Login              | `app/login/`       | Acesso com Google ou e-mail e senha (Firebase Authentication).                                       |
| Dashboard          | `app/dashboard/`   | Indicadores, gráficos (Chart.js) e configuração das notificações por e-mail.                         |
| Explorar API       | `app/explorar/`    | Busca questões na Open Trivia DB por categoria e dificuldade e salva como flashcards.                |
| Minhas Bibliotecas | `app/bibliotecas/` | Criação, edição e exclusão de bibliotecas e de flashcards.                                           |
| Revisão            | `app/revisao/`     | Sessão de revisão espaçada, com atalhos de teclado (`Espaço` vira o cartão; `1`, `2` e `3` avaliam). |
| Sobre              | `app/sobre/`       | Arquitetura, metodologia e créditos.                                                                 |

As telas internas são protegidas por `js/auth-guard.js`, que redireciona para o login quando não há sessão ativa.

## Tecnologias

- **Front-end:** HTML5, CSS3, JavaScript puro (ES6+, módulos ES) e Bootstrap 5.
- **Gráficos:** Chart.js.
- **Autenticação e banco de dados:** Firebase Authentication (Google e e-mail/senha) e Cloud Firestore.
- **APIs externas:** Open Trivia DB (questões) e EmailJS REST API (e-mails).
- **Automação e hospedagem:** GitHub Actions e GitHub Pages.

O projeto **não usa Node.js, npm nem etapa de build** no front-end. As bibliotecas são carregadas por CDN. O Node só é necessário para executar o script de lembrete diário, e o GitHub Actions já o fornece.

## Estrutura de pastas

Cada tela, dentro de `app/`, possui sua própria pasta com HTML, CSS e JS. Os estilos e scripts compartilhados ficam em `css/` e `js/`.

```text
iflashcard/
├── index.html                  # Redireciona para app/login/login.html
├── env.local.js                # Credenciais locais (NÃO versionado; ver "Configuração do ambiente")
├── css/
│   ├── global.css              # Tema IFRJ: variáveis de cor do Bootstrap e poucos ajustes
│   └── flashcard.css           # Efeito 3D do flashcard (Explorar e Revisão)
├── js/
│   ├── firebase-config.js      # Inicializa o Firebase (Auth e Firestore)
│   ├── auth-guard.js           # Protege as telas, preenche o menu e o sino de pendências
│   ├── layout.js               # Navbar e rodapé compartilhados pelas telas internas
│   ├── email-ui.js             # Toasts, configuração do EmailJS e envio manual de e-mail
│   ├── email-template.js       # Textos e parâmetros do e-mail (usado pelo site e pelo job diário)
│   └── utils.js                # Funções utilitárias (ex.: escaparHTML)
├── scripts/
│   └── notificacao-diaria.js   # Lembrete diário automático (rodado pelo GitHub Actions)
├── .github/workflows/
│   ├── deploy-pages.yml        # Publica o site no GitHub Pages (injeta os secrets)
│   └── notificacao-diaria.yml  # Agenda o lembrete diário (08:00 de Brasília)
├── app/
│   ├── login/                  (login.html, login.css, login.js)
│   ├── dashboard/              (dashboard.html, dashboard.css, dashboard.js)
│   ├── explorar/               (explorar.html, explorar.css, explorar.js)
│   ├── bibliotecas/            (bibliotecas.html, bibliotecas.css, bibliotecas.js)
│   ├── revisao/                (revisao.html, revisao.css, revisao.js)
│   └── sobre/                  (sobre.html, sobre.css, sobre.js)
└── README.md
```

## Modelo de dados (Cloud Firestore)

O Cloud Firestore é o banco de dados NoSQL do Firebase, organizado em coleções de documentos. O sistema usa três coleções:

**`usuarios/{uid}`** — um documento por usuário, com o `uid` do Firebase Authentication como identificador.

| Campo                         | Descrição                                                          |
| ----------------------------- | ------------------------------------------------------------------ |
| `usuario_id`, `email`, `nome` | Dados básicos do usuário.                                          |
| `notificacoes_email`          | `true` quando o usuário ativou os lembretes diários.               |
| `ultimo_acesso_em`            | Data do último acesso (ISO 8601). Base da regra de inatividade.    |
| `ultimo_email_enviado_em`     | Data do último e-mail enviado (ISO 8601). Evita envios duplicados. |

**`bibliotecas/{id}`** — baralhos do usuário.

| Campo                         | Descrição                      |
| ----------------------------- | ------------------------------ |
| `usuario_id`, `usuario_email` | Dono da biblioteca.            |
| `nome`, `descricao`           | Dados informados pelo usuário. |
| `criado_em`                   | Data de criação (ISO 8601).    |

**`flashcards/{id}`** — cartões de estudo.

| Campo                               | Descrição                                                 |
| ----------------------------------- | --------------------------------------------------------- |
| `usuario_id`, `usuario_email`       | Dono do cartão.                                           |
| `biblioteca_id`                     | Biblioteca à qual o cartão pertence.                      |
| `frente`, `verso`                   | Pergunta e resposta.                                      |
| `origem`                            | `API` (importado da Open Trivia DB) ou `Manual`.          |
| `dificuldade`, `tag`                | Metadados do cartão (preenchidos na importação pela API). |
| `nivel_dominio`                     | Última avaliação: `dificil`, `bom` ou `facil`.            |
| `total_revisoes`                    | Quantidade de revisões realizadas.                        |
| `ultima_revisao`, `proxima_revisao` | Datas da última e da próxima revisão (ISO 8601).          |
| `criado_em`                         | Data de criação (ISO 8601).                               |

As consultas filtram sempre por `usuario_id`, de modo que cada usuário só carrega os próprios dados.

## Repetição espaçada

Ao revisar um cartão, o estudante avalia sua lembrança e o campo `proxima_revisao` é atualizado:

| Avaliação       | Próxima revisão |
| --------------- | --------------- |
| Difícil (errei) | em 10 minutos   |
| Bom (lembrei)   | em 3 dias       |
| Fácil (dominei) | em 7 dias       |

Um cartão é considerado **pendente** quando `proxima_revisao` é anterior ou igual ao momento atual. Cartões recém-criados nascem pendentes.

## E-mails de lembrete

Os e-mails usam o EmailJS e têm o mesmo conteúdo em dois caminhos, ambos baseados em `js/email-template.js`:

- **Envio manual:** botões do dashboard e do sino de notificações (`dispararEmailLembrete`, em `js/email-ui.js`).
- **Envio diário automático:** `scripts/notificacao-diaria.js`, executado pelo GitHub Actions.

Regras do envio automático, por usuário:

1. Só recebe e-mail quem ativou as notificações diárias (`notificacoes_email == true`).
2. Com cartões pendentes, recebe **1 lembrete por dia**.
3. Sem cartões pendentes, **não** recebe e-mail, exceto se ficar **10 dias ou mais** sem acessar o sistema. Nesse caso recebe um aviso de inatividade, no máximo 1 a cada 10 dias.

O botão do e-mail leva sempre à tela de login do projeto. O endereço está fixo na constante `LINK_LOGIN`, em `js/email-template.js`.

### Variáveis do template do EmailJS

Um único template atende os dois tipos de e-mail. Ele deve usar estas variáveis:

| Variável                                   | Conteúdo                                                         |
| ------------------------------------------ | ---------------------------------------------------------------- |
| `to_email`, `to_name`                      | Destinatário.                                                    |
| `cards_pendentes`                          | Quantidade de cartões pendentes.                                 |
| `link_revisao`                             | Link do botão (tela de login do projeto).                        |
| `tipo`                                     | `revisao_pendente` ou `inatividade`.                             |
| `dias_inativo`                             | Dias sem acesso (usado no aviso de inatividade).                 |
| `assunto`, `mensagem`, `destaque`, `botao` | Textos do e-mail.                                                |
| `cor_destaque`                             | Cor do destaque (vermelho para revisão, verde para inatividade). |

## Configuração do ambiente

O projeto usa três serviços externos, já criados e mantidos pela equipe: **Firebase**, **EmailJS** e **GitHub**. Quem for trabalhar no projeto **não cria** novos projetos nem contas: solicita acesso aos serviços abaixo e copia os valores de configuração existentes. Nenhuma credencial deve ser versionada.

### Acessos necessários

| Serviço               | Acesso a solicitar          | Para quê                                                                                  |
| --------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| Repositório no GitHub | Colaborador do repositório  | Clonar, enviar alterações e, para administradores, gerenciar os secrets e o GitHub Pages. |
| Firebase (Console)    | Membro do projeto existente | Consultar a configuração do app Web, os dados do Firestore e os métodos de login.         |
| EmailJS               | Acesso à conta existente    | Consultar o _Service ID_, o _Template ID_, as chaves e o template dos e-mails.            |

### Variáveis do front-end

Os valores abaixo já existem nos projetos da equipe. Peça-os a um administrador ou consulte-os nos painéis indicados.

| Variável                       | Serviço  | Onde obter                                                               |
| ------------------------------ | -------- | ------------------------------------------------------------------------ |
| `FIREBASE_API_KEY`             | Firebase | Console do Firebase → Configurações do projeto → Seus aplicativos (Web). |
| `FIREBASE_AUTH_DOMAIN`         | Firebase | Mesmo local.                                                             |
| `FIREBASE_PROJECT_ID`          | Firebase | Mesmo local.                                                             |
| `FIREBASE_STORAGE_BUCKET`      | Firebase | Mesmo local.                                                             |
| `FIREBASE_MESSAGING_SENDER_ID` | Firebase | Mesmo local.                                                             |
| `FIREBASE_APP_ID`              | Firebase | Mesmo local.                                                             |
| `EMAILJS_SERVICE_ID`           | EmailJS  | Painel do EmailJS → Email Services.                                      |
| `EMAILJS_TEMPLATE_ID`          | EmailJS  | Painel do EmailJS → Email Templates.                                     |
| `EMAILJS_PUBLIC_KEY`           | EmailJS  | Painel do EmailJS → Account → API keys.                                  |

**Em desenvolvimento local**, as variáveis ficam no arquivo `env.local.js`, na raiz do projeto. Ele está no `.gitignore`, por isso não vem com o clone: cada pessoa o cria com os valores do projeto existente.

```js
// env.local.js (ignorado pelo Git)
window.ENV_LOCAL = {
  // Firebase
  FIREBASE_API_KEY: "sua-chave",
  FIREBASE_AUTH_DOMAIN: "seu-projeto.firebaseapp.com",
  FIREBASE_PROJECT_ID: "seu-projeto",
  FIREBASE_STORAGE_BUCKET: "seu-projeto.firebasestorage.app",
  FIREBASE_MESSAGING_SENDER_ID: "000000000000",
  FIREBASE_APP_ID: "1:000000000000:web:xxxxxxxxxxxxxxxx",

  // EmailJS
  EMAILJS_SERVICE_ID: "service_xxxxxxx",
  EMAILJS_TEMPLATE_ID: "template_xxxxxxx",
  EMAILJS_PUBLIC_KEY: "sua-chave-publica",
};
```

**Em produção**, o `env.local.js` não existe. Nos arquivos `js/firebase-config.js` e `js/email-ui.js`, cada valor tem um _placeholder_ no formato `__NOME_DA_VARIAVEL__`. O workflow de publicação troca cada placeholder pelo secret de mesmo nome (ver [Publicação e automações](#publicação-e-automações-github-actions)).

### Observações sobre os serviços

- **Firebase Authentication:** os métodos de login em uso são **E-mail/senha** e **Google**. Se o login local acusar domínio não autorizado, um administrador deve incluir o domínio usado (por exemplo, `localhost` ou `127.0.0.1`) em **Authentication → Configurações → Domínios autorizados**.
- **Cloud Firestore:** as coleções `usuarios`, `bibliotecas` e `flashcards` são descritas em [Modelo de dados](#modelo-de-dados-cloud-firestore). Todo ambiente local usa o mesmo banco do projeto, então **evite apagar ou alterar dados que não sejam seus**.
- **EmailJS:** o template dos e-mails deve conter as variáveis listadas em [E-mails de lembrete](#variáveis-do-template-do-emailjs). Os envios feitos em testes são e-mails reais.

## Como executar localmente

Pré-requisitos: VS Code com a extensão **Live Server** e os acessos descritos na seção anterior.

1. Clone o repositório.
2. Crie o arquivo `env.local.js` na raiz, conforme o modelo em [Variáveis do front-end](#variáveis-do-front-end), com os valores fornecidos pela equipe.
3. Abra a pasta no VS Code e execute `index.html` com o **Live Server**.

O Live Server é necessário porque os módulos ES e o Firebase exigem `http://`, e não `file://`. Qualquer outro servidor HTTP estático também serve.

Para testar o script de lembrete diário localmente (sem enviar e-mails), use o modo de simulação. Ele exige Node.js 18 ou superior e o JSON da conta de serviço do Firebase, que deve ser solicitado a um administrador:

```bash
FIREBASE_SERVICE_ACCOUNT="$(cat caminho/para/serviceAccount.json)" DRY_RUN=1 node scripts/notificacao-diaria.js
```

Arquivos de conta de serviço (`serviceAccount*.json`) estão no `.gitignore` e nunca devem ser versionados.

## Publicação e automações (GitHub Actions)

Os dois workflows leem credenciais de **Settings → Secrets and variables → Actions** do repositório.

| Secret                                                                                                                                          | Usado por                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID` | Publicação do site.                                                                                                                       |
| `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`, `EMAILJS_PUBLIC_KEY`                                                                               | Publicação do site e lembrete diário.                                                                                                     |
| `EMAILJS_PRIVATE_KEY`                                                                                                                           | Lembrete diário (EmailJS → Account → API keys → _Private Key_).                                                                           |
| `FIREBASE_SERVICE_ACCOUNT`                                                                                                                      | Lembrete diário (JSON completo da conta de serviço, gerado em Configurações do projeto → Contas de serviço → _Gerar nova chave privada_). |

**Publicação (`deploy-pages.yml`):** a cada _push_ na branch `main`, copia `index.html`, `app/`, `css/` e `js/` para uma pasta temporária, substitui os placeholders pelos secrets e publica no GitHub Pages. O pipeline falha se algum secret estiver ausente ou se restar algum placeholder. Para usar, ative em **Settings → Pages** a fonte **GitHub Actions**.

**Lembrete diário (`notificacao-diaria.yml`):** executa todos os dias às 11:00 UTC (08:00 em Brasília) e também pode ser disparado manualmente na aba **Actions** (_Run workflow_), com a opção de apenas simular (`dry_run`).

## Créditos

Projeto desenvolvido para a disciplina de **Desenvolvimento Web II**, no **Instituto Federal do Rio de Janeiro (IFRJ)**.

- Guilherme Nascimento Monteiro do Carmo
- Julia Araujo de Avellar
