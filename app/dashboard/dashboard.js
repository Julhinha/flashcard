// Dashboard: KPIs e gráficos (Chart.js) calculados a partir do Firestore
import { auth, db } from "../../js/firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

function setText(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

function desenharGraficos(cards, bibliotecas) {
  const contagem = { dificil: 0, bom: 0, facil: 0 };
  cards.forEach((c) => {
    const nivel = c.nivel_dominio in contagem ? c.nivel_dominio : "bom";
    contagem[nivel]++;
  });

  new Chart(document.getElementById("chartDominio"), {
    type: "doughnut",
    data: {
      labels: ["Difícil (Errei)", "Bom (Lembrei)", "Fácil (Dominei)"],
      datasets: [
        {
          data: [contagem.dificil, contagem.bom, contagem.facil],
          backgroundColor: ["#CD191E", "#1967D2", "#2F9E41"],
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { usePointStyle: true, padding: 16 },
        },
      },
    },
  });

  new Chart(document.getElementById("chartBibliotecas"), {
    type: "bar",
    data: {
      labels: bibliotecas.map((b) => b.nome),
      datasets: [
        {
          label: "Flashcards Salvos",
          data: bibliotecas.map(
            (b) => cards.filter((c) => c.biblioteca_id === b.id).length,
          ),
          backgroundColor: "#2F9E41",
          borderRadius: 8,
          barThickness: 32,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "#EEF1F4" } },
        x: { grid: { display: false } },
      },
    },
  });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return; // o auth-guard.js redireciona para o login
  try {
    const filtro = where("usuario_id", "==", user.uid);
    const [snapLibs, snapCards] = await Promise.all([
      getDocs(query(collection(db, "bibliotecas"), filtro)),
      getDocs(query(collection(db, "flashcards"), filtro)),
    ]);
    const bibliotecas = snapLibs.docs.map((d) => ({ id: d.id, ...d.data() }));
    const cards = snapCards.docs.map((d) => ({ id: d.id, ...d.data() }));

    const agora = new Date().toISOString();
    const pendentes = cards.filter((c) => (c.proxima_revisao || "") <= agora).length;

    setText("kpiTotalCards", cards.length);
    setText("kpiTotalDecks", bibliotecas.length);
    setText("kpiPendingCards", pendentes);
    setText("btnPendCount", pendentes);

    // Só permite estudar quando há revisões vencidas
    const temPendentes = pendentes > 0;
    document.getElementById("linkEstudarAgora").classList.toggle("d-none", !temPendentes);
    const btnRevisar = document.getElementById("btnRevisarPendentes");
    btnRevisar.classList.toggle("disabled", !temPendentes);
    btnRevisar.setAttribute("aria-disabled", String(!temPendentes));

    desenharGraficos(cards, bibliotecas);
  } catch (erro) {
    console.error("Erro ao carregar o dashboard:", erro);
    mostrarToast("Erro ao carregar dados do Firestore.", "danger");
  }
});

window.toggleNotificacaoEmail = async function (checkbox) {
  const ativo = checkbox.checked;
  try {
    await window.salvarPerfil({ notificacoes_email: ativo });
    mostrarToast(
      ativo
        ? "Lembretes automáticos por e-mail ATIVADOS."
        : "Lembretes automáticos por e-mail DESATIVADOS.",
      "success",
    );
  } catch (erro) {
    console.error("Erro ao salvar preferência de e-mail:", erro);
    checkbox.checked = !ativo;
    mostrarToast("Não foi possível salvar a preferência.", "danger");
  }
};
