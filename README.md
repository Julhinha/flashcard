# TI Flashcards 

Aplicação web responsiva voltada para estudantes e profissionais de Tecnologia da Informação, inspirada no método Anki de repetição espaçada e alinhada à identidade visual do **Instituto Federal do Rio de Janeiro (IFRJ)**.

## Decisão Arquitetural: Confiabilidade sem IA Generativa

Por regra de precisão, o sistema **não utiliza Inteligência Artificial** para gerar perguntas ou respostas. Todo o conteúdo técnico provém de bases revisadas (**QuizAPI.io v2**) ou da autoria do estudante, eliminando riscos de alucinações ou sintaxes incorretas.

## Tecnologias Utilizadas

- **Front-end:** HTML5, CSS3, Vanilla JS (ES6+) e Bootstrap 5
- **Gráficos:** Chart.js
- **Autenticação & Banco de Dados:** Firebase Authentication (Google e E-mail/Senha) + Cloud Firestore
- **APIs Externas:** QuizAPI.io (v2) e EmailJS REST API
- **Hospedagem:** GitHub Pages

## Estrutura de Pastas

Cada tela, dentro de `app/`, possui sua própria pasta com HTML, CSS e JS. Os estilos e scripts compartilhados ficam em `css/` e `js/`.

```text
flashcards-ti/
├── index.html              # Redireciona para app/login/login.html
├── css/
│   ├── global.css          # Tema IFRJ: variáveis de cor do Bootstrap + poucos ajustes
│   └── flashcard.css       # Efeito 3D do flashcard (Explorar e Revisão)
├── js/
│   ├── app-ui.js           # Toasts e utilitários globais
│   └── firebase-config.js
├── app/
│   ├── login/          (login.html, login.css, login.js)
│   ├── dashboard/      (dashboard.html, dashboard.css, dashboard.js)
│   ├── explorar/       (explorar.html, explorar.css, explorar.js)
│   ├── bibliotecas/    (bibliotecas.html, bibliotecas.css, bibliotecas.js)
│   ├── revisao/        (revisao.html, revisao.css, revisao.js)
│   └── sobre/          (sobre.html, sobre.css, sobre.js)
└── README.md
```
