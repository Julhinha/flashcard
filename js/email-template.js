// Conteúdo do e-mail de lembrete, compartilhado entre:
//   - o botão manual do site (js/email-ui.js, carregado como <script> no navegador)
//   - o job diário do GitHub Actions (scripts/notificacao-diaria.js, via require)
// Assim os dois enviam exatamente os mesmos textos e os mesmos template_params.
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === "object" && module.exports) module.exports = api;
  else raiz.EmailTemplate = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  // Link do botão do e-mail: sempre a tela de login do projeto
  const LINK_LOGIN =
    "https://julhinha.github.io/flashcard/app/login/login.html";

  // Textos prontos: um único template do EmailJS serve para os dois tipos de e-mail.
  // decisao = { tipo: "revisao_pendente" } ou { tipo: "inatividade", diasInativo }
  function montarMensagemdeEmail(decisao, pendentes) {
    if (decisao.tipo === "inatividade") {
      return {
        assunto: "IFlashcard: sentimos sua falta!",
        mensagem: "Sentimos sua falta! Retome seus estudos de onde parou.",
        destaque: `Faz ${decisao.diasInativo} dias que você não acessa o IFlashcard.`,
        botao: "Voltar a Estudar",
        cor_destaque: "#2F9E41",
      };
    }
    return {
      assunto: `IFlashcard: você tem ${pendentes} card(s) para revisar!`,
      mensagem: "Sua fila de repetição espaçada está aguardando por você.",
      destaque: `${pendentes} flashcard(s) pendente(s) para revisão!`,
      botao: "Revisar Meus Cards Agora",
      cor_destaque: "#dc3545",
    };
  }

  // template_params completos enviados ao EmailJS (idênticos no site e no job)
  function montarParametrosdeEmail({ email, nome, pendentes, decisao }) {
    return {
      to_email: email,
      to_name: nome,
      cards_pendentes: pendentes,
      link_revisao: LINK_LOGIN,
      tipo: decisao.tipo,
      dias_inativo: decisao.diasInativo ?? 0,
      ...montarMensagemdeEmail(decisao, pendentes),
    };
  }

  return { montarMensagemdeEmail, montarParametrosdeEmail };
});
