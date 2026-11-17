# IFlashcard 

Aplicação web responsiva voltada para estudantes de qualquer área, inspirada no método Anki de repetição espaçada e alinhada à identidade visual do **Instituto Federal do Rio de Janeiro (IFRJ)**.

## Decisão Arquitetural: Confiabilidade sem IA Generativa

Por regra de precisão, o sistema **não utiliza Inteligência Artificial** para gerar perguntas ou respostas. Todo o conteúdo provém de bases revisadas (**Open Trivia DB**) ou da autoria do estudante, eliminando riscos de alucinações ou sintaxes incorretas.

## Tecnologias Utilizadas

- **Front-end:** HTML5, CSS3, Vanilla JS (ES6+) e Bootstrap 5
- **Gráficos:** Chart.js
- **Autenticação & Banco de Dados:** Firebase Authentication (Google e E-mail/Senha) + Cloud Firestore
- **APIs Externas:** Open Trivia DB e EmailJS REST API
- **Hospedagem:** GitHub Pages

## Estrutura de Pastas

Cada tela, dentro de `app/`, possui sua própria pasta com HTML, CSS e JS. Os estilos e scripts compartilhados ficam em `css/` e `js/`.

```text
iflashcard/
├── index.html              # Redireciona para app/login/login.html
├── css/
│   ├── global.css          # Tema IFRJ: variáveis de cor do Bootstrap + poucos ajustes
│   └── flashcard.css       # Efeito 3D do flashcard (Explorar e Revisão)
├── js/
│   ├── app-ui.js           # Toasts e envio manual de e-mail (EmailJS)
│   ├── auth-guard.js       # Protege as telas, preenche o menu e o sino de pendências
│   ├── layout.js           # Navbar e rodapé compartilhados pelas telas internas
│   ├── utils.js            # Funções utilitárias (ex.: escaparHTML)
│   └── firebase-config.js
├── scripts/
│   └── notificacao-diaria.js  # Lembrete diário automático (rodado pelo GitHub Actions)
├── app/
│   ├── login/          (login.html, login.css, login.js)
│   ├── dashboard/      (dashboard.html, dashboard.css, dashboard.js)
│   ├── explorar/       (explorar.html, explorar.css, explorar.js)
│   ├── bibliotecas/    (bibliotecas.html, bibliotecas.css, bibliotecas.js)
│   ├── revisao/        (revisao.html, revisao.css, revisao.js)
│   └── sobre/          (sobre.html, sobre.css, sobre.js)
└── README.md
```

## Como executar

Abra a pasta do projeto no VS Code e rode `index.html` com a extensão **Live Server** (os módulos ES e o Firebase exigem `http://`, não `file://`). No Firebase Console, ative **Authentication → E-mail/senha e Google**, crie o **Cloud Firestore** e adicione `127.0.0.1`/`localhost` em **Authorized domains**.
