// Componentes compartilhados (navbar e rodapé), para não repetir o HTML em cada tela.
//
// Uso: coloque a tag no lugar onde o componente deve aparecer. O script é síncrono,
// então o HTML já existe quando o auth-guard.js (módulo) preenche nome/e-mail e o sino.
//   <script src="../../js/layout.js" data-componente="navbar" data-pagina="dashboard"></script>
//   <script src="../../js/layout.js" data-componente="rodape"></script>
(function () {
  const script = document.currentScript;
  const componente = script.dataset.componente;
  const pagina = script.dataset.pagina;

  const LINKS = [
    { id: "dashboard", href: "../dashboard/dashboard.html", icone: "bi-speedometer2", texto: "Dashboard" },
    { id: "explorar", href: "../explorar/explorar.html", icone: "bi-compass", texto: "Explorar API" },
    { id: "bibliotecas", href: "../bibliotecas/bibliotecas.html", icone: "bi-collection", texto: "Minhas Bibliotecas" },
    { id: "revisao", href: "../revisao/revisao.html", icone: "bi-lightning-charge", texto: "Revisão Anki" },
    { id: "sobre", href: "../sobre/sobre.html", icone: "bi-info-circle", texto: "Sobre & Arquitetura" },
  ];

  function navbar() {
    const itens = LINKS.map(
      (l) => `
            <li class="nav-item">
              <a class="nav-link${l.id === pagina ? " active" : ""}" href="${l.href}">
                <i class="bi ${l.icone} me-1"></i> ${l.texto}
              </a>
            </li>`,
    ).join("");

    return `
    <!-- Navbar Institucional IFRJ -->
    <nav class="navbar navbar-expand-xl bg-white border-bottom sticky-top">
      <div class="container">
        <a class="navbar-brand d-flex align-items-center gap-2" href="../dashboard/dashboard.html">
          <!-- Logo SVG Modular IFRJ + Flashcards -->
          <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="13" cy="9" r="4" fill="#CD191E" />
            <rect x="19" y="14" width="16" height="20" rx="3" fill="#1E6B2B" opacity="0.75" transform="rotate(8 27 24)" />
            <rect x="9" y="14" width="18" height="22" rx="3" fill="#2F9E41" />
            <rect x="13" y="20" width="10" height="2" rx="1" fill="#FFFFFF" />
            <rect x="13" y="25" width="6" height="2" rx="1" fill="#FFFFFF" opacity="0.85" />
          </svg>
          <span class="fw-bold fs-5 text-primary">IF<span class="text-dark">lashcard</span></span>
          <span class="badge bg-primary-subtle text-primary-emphasis border border-success-subtle ms-1 fs-xs d-none d-sm-inline-block">IFRJ</span>
        </a>

        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarMain" aria-label="Abrir menu">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="navbarMain">
          <ul class="navbar-nav nav-pills flex-column flex-xl-row flex-xl-nowrap mb-2 mb-xl-0 ms-xl-2 gap-1">${itens}
          </ul>

          <!-- Sino de Notificações + Perfil -->
          <div class="d-flex align-items-center gap-2 mt-2 mt-xl-0 ms-xl-3 flex-shrink-0">
            <div class="dropdown">
              <button class="btn btn-light border position-relative rounded-circle p-2" type="button" data-bs-toggle="dropdown" aria-label="Notificações de revisão">
                <i class="bi bi-bell-fill text-secondary"></i>
                <span id="badgeNotificacoes" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">0</span>
              </button>
              <div class="dropdown-menu dropdown-menu-start dropdown-menu-xl-end dropdown-notificacoes shadow-sm p-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <span class="fw-bold small">Revisões Pendentes Hoje</span>
                  <span class="badge bg-danger-subtle text-danger" id="dropdownPendCount">0 cards</span>
                </div>
                <p class="small text-muted mb-3">Você possui flashcards vencidos aguardando revisão espaçada.</p>
                <div class="d-grid gap-2">
                  <a href="../revisao/revisao.html" class="btn btn-primary btn-sm">
                    <i class="bi bi-play-fill me-1"></i> Iniciar Revisão Agora
                  </a>
                  <button type="button" class="btn btn-outline-secondary btn-sm" onclick="dispararEmailLembrete()">
                    <i class="bi bi-envelope me-1"></i> Enviar Lembrete por E-mail
                  </button>
                </div>
              </div>
            </div>

            <div class="dropdown">
              <button class="btn btn-light border d-flex align-items-center rounded-circle p-2" aria-label="Perfil do usuário" type="button" data-bs-toggle="dropdown">
                <i class="bi bi-person-circle text-primary fs-5"></i>
              </button>
              <ul class="dropdown-menu dropdown-menu-start dropdown-menu-xl-end shadow-sm">
                <li><span class="dropdown-item-text fw-semibold pb-0" id="navUserName">Estudante IFRJ</span></li>
                <li><span class="dropdown-item-text small text-muted pt-0" id="navUserEmail"></span></li>
                <li><hr class="dropdown-divider" /></li>
                <li>
                  <a class="dropdown-item text-danger" href="../login/login.html" id="btnLogout">
                    <i class="bi bi-box-arrow-right me-2"></i>Sair
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>`;
  }

  function rodape() {
    return `
    <footer class="bg-white border-top py-3 mt-5">
      <div class="container d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 small text-muted">
        <div>
          <strong class="text-dark">IFlashcard</strong> — Projeto Web Acadêmico •
          <span class="text-primary fw-semibold">IFRJ</span>
        </div>
        <div>Arquitetura v3.0 • Sem IA Generativa • Dados via Open Trivia DB &amp; Firebase</div>
      </div>
    </footer>`;
  }

  const html = componente === "navbar" ? navbar() : componente === "rodape" ? rodape() : "";
  script.insertAdjacentHTML("beforebegin", html);
})();
