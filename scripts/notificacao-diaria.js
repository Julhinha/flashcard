// Lembrete diário de revisão por e-mail.
//
// Roda no GitHub Actions (o Node já vem instalado no runner). NÃO usa npm nem
// package.json: só `fetch` e `crypto`, que são nativos do Node 18+.
//
// REGRA DE NEGÓCIO (por usuário):
//   1. Só recebe e-mail quem ativou "notificações diárias" (notificacoes_email == true).
//   2. Com cards pendentes de revisão  -> envia 1 lembrete por dia.
//   3. Sem cards pendentes             -> NÃO envia, EXCETO se o usuário ficou 10 dias
//                                         ou mais sem acessar o sistema: nesse caso envia
//                                         um aviso de inatividade (no máx. 1 a cada 10 dias).
//
// Fluxo: autentica no Google com a conta de serviço do Firebase, lê os usuários no
// Firestore, aplica a regra acima e, quando cabe, envia pelo EmailJS e grava
// ultimo_email_enviado_em em usuarios/{uid}. O último acesso (ultimo_acesso_em) é
// gravado pelo front-end (js/auth-guard.js) a cada visita.
//
// Variáveis de ambiente:
//   FIREBASE_SERVICE_ACCOUNT  (obrigatória) JSON completo da conta de serviço
//   EMAILJS_PRIVATE_KEY       (obrigatória, exceto em DRY_RUN) Private Key do EmailJS
//   EMAILJS_SERVICE_ID / EMAILJS_TEMPLATE_ID / EMAILJS_PUBLIC_KEY  (opcionais)
//   SITE_URL                  (opcional) padrão: GitHub Pages do repositório
//   DRY_RUN=1                 (opcional) só lista o que seria enviado

"use strict";
const crypto = require("node:crypto");

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;
const DIAS_INATIVIDADE = 10; // dias sem acessar até receber o aviso de inatividade
const INTERVALO_PENDENTES_MS = 20 * HORA_MS; // evita duplicar com o envio do dashboard
const INTERVALO_INATIVIDADE_MS = DIAS_INATIVIDADE * DIA_MS; // aviso de inatividade a cada 10 dias
const PAUSA_ENTRE_ENVIOS_MS = 1100; // o EmailJS limita a ~1 requisição por segundo

const EMAILJS = {
  serviceId: process.env.EMAILJS_SERVICE_ID || "service_6uzztj7",
  templateId: process.env.EMAILJS_TEMPLATE_ID || "template_15h0lxf",
  publicKey: process.env.EMAILJS_PUBLIC_KEY || "ZtM6CKm2vtxsn8yhU",
  privateKey: process.env.EMAILJS_PRIVATE_KEY,
};

const pausa = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const base64url = (dados) => Buffer.from(dados).toString("base64url");

// ---------------------------------------------------------------
// Lógica pura (regra de negócio)
// ---------------------------------------------------------------
function contarPendentes(flashcards, agoraIso) {
  return flashcards.filter((c) => (c.proxima_revisao || "") <= agoraIso).length;
}

function enviadoDentroDe(ultimoEnvioIso, agoraMs, intervaloMs) {
  if (!ultimoEnvioIso) return false;
  const ultimo = new Date(ultimoEnvioIso).getTime();
  return !Number.isNaN(ultimo) && agoraMs - ultimo < intervaloMs;
}

// Decide se o usuário (que já ativou as notificações) recebe e-mail agora.
// Retorna { enviar, tipo?, diasInativo?, motivo? }.
function decidirEnvio({ pendentes, ultimoAcessoIso, ultimoEnvioIso, agoraMs }) {
  if (pendentes > 0) {
    if (enviadoDentroDe(ultimoEnvioIso, agoraMs, INTERVALO_PENDENTES_MS)) {
      return { enviar: false, motivo: "já recebeu e-mail nas últimas 20 h" };
    }
    return { enviar: true, tipo: "revisao_pendente" };
  }

  // Sem cards pendentes: só avisa se o usuário sumiu há DIAS_INATIVIDADE dias ou mais
  const ultimoAcesso = ultimoAcessoIso ? new Date(ultimoAcessoIso).getTime() : NaN;
  if (Number.isNaN(ultimoAcesso)) {
    return { enviar: false, motivo: "sem cards pendentes e sem registro de último acesso" };
  }
  const diasInativo = Math.floor((agoraMs - ultimoAcesso) / DIA_MS);
  if (diasInativo < DIAS_INATIVIDADE) {
    return { enviar: false, motivo: `sem cards pendentes (último acesso há ${diasInativo} dia(s))` };
  }
  if (enviadoDentroDe(ultimoEnvioIso, agoraMs, INTERVALO_INATIVIDADE_MS)) {
    return { enviar: false, motivo: `aviso de inatividade já enviado nos últimos ${DIAS_INATIVIDADE} dias` };
  }
  return { enviar: true, tipo: "inatividade", diasInativo };
}

// Textos prontos: um único template do EmailJS serve para os dois tipos de e-mail.
function montarMensagem(decisao, pendentes) {
  if (decisao.tipo === "inatividade") {
    return {
      assunto: "TI Flashcards: sentimos sua falta!",
      mensagem: "Sentimos sua falta! Retome seus estudos de onde parou.",
      destaque: `Faz ${decisao.diasInativo} dias que você não acessa o TI Flashcards.`,
      botao: "Voltar a Estudar",
      cor_destaque: "#0d6efd",
    };
  }
  return {
    assunto: `TI Flashcards: você tem ${pendentes} card(s) para revisar!`,
    mensagem: "Sua fila de repetição espaçada (Anki) está aguardando por você.",
    destaque: `${pendentes} flashcard(s) pendente(s) para revisão hoje!`,
    botao: "Revisar Meus Cards Agora",
    cor_destaque: "#dc3545",
  };
}

function urlDoSite() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const [dono, repo] = (process.env.GITHUB_REPOSITORY || "").split("/");
  return dono && repo ? `https://${dono.toLowerCase()}.github.io/${repo}` : "";
}

// ---------------------------------------------------------------
// Autenticação Google (JWT assinado com a chave da conta de serviço)
// ---------------------------------------------------------------
function criarJwt(conta, agoraSeg) {
  const cabecalho = { alg: "RS256", typ: "JWT" };
  const corpo = {
    iss: conta.client_email,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: agoraSeg,
    exp: agoraSeg + 3600,
  };
  const dados = `${base64url(JSON.stringify(cabecalho))}.${base64url(JSON.stringify(corpo))}`;
  const assinatura = crypto.createSign("RSA-SHA256").update(dados).sign(conta.private_key);
  return `${dados}.${base64url(assinatura)}`;
}

async function obterToken(conta) {
  const resposta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: criarJwt(conta, Math.floor(Date.now() / 1000)),
    }),
  });
  if (!resposta.ok) {
    throw new Error(`Falha ao autenticar no Google (${resposta.status}): ${await resposta.text()}`);
  }
  return (await resposta.json()).access_token;
}

// ---------------------------------------------------------------
// Firestore via REST
// ---------------------------------------------------------------
function montarConsulta(colecao, campo, valor, camposRetornados) {
  const consulta = {
    from: [{ collectionId: colecao }],
    where: {
      fieldFilter: { field: { fieldPath: campo }, op: "EQUAL", value: valor },
    },
  };
  if (camposRetornados) {
    consulta.select = { fields: camposRetornados.map((fieldPath) => ({ fieldPath })) };
  }
  return { structuredQuery: consulta };
}

function lerValor(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  return null;
}

function lerCampos(fields = {}) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, lerValor(v)]));
}

async function consultar(ctx, consulta) {
  const resposta = await fetch(`${ctx.base}:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(consulta),
  });
  if (!resposta.ok) throw new Error(`Firestore ${resposta.status}: ${await resposta.text()}`);
  // Resultados vazios vêm como itens sem "document"
  return (await resposta.json())
    .filter((item) => item.document)
    .map((item) => ({
      id: item.document.name.split("/").pop(),
      dados: lerCampos(item.document.fields),
    }));
}

async function gravarUltimoEnvio(ctx, uid, iso) {
  const url = `${ctx.base}/usuarios/${encodeURIComponent(uid)}?updateMask.fieldPaths=ultimo_email_enviado_em`;
  const resposta = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${ctx.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: { ultimo_email_enviado_em: { stringValue: iso } } }),
  });
  if (!resposta.ok) throw new Error(`Firestore ${resposta.status}: ${await resposta.text()}`);
}

// ---------------------------------------------------------------
// EmailJS
// ---------------------------------------------------------------
async function enviarEmail({ email, nome, pendentes, linkRevisao, decisao, textos }) {
  const resposta = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: EMAILJS.serviceId,
      template_id: EMAILJS.templateId,
      user_id: EMAILJS.publicKey,
      accessToken: EMAILJS.privateKey, // exigido em chamadas fora do navegador
      template_params: {
        to_email: email,
        to_name: nome,
        cards_pendentes: pendentes,
        link_revisao: linkRevisao,
        tipo: decisao.tipo,
        dias_inativo: decisao.diasInativo ?? 0,
        ...textos,
      },
    }),
  });
  if (!resposta.ok) throw new Error(`EmailJS ${resposta.status}: ${await resposta.text()}`);
}

// ---------------------------------------------------------------
// Execução
// ---------------------------------------------------------------
async function main() {
  const dryRun = process.env.DRY_RUN === "1";

  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error("Defina o secret FIREBASE_SERVICE_ACCOUNT (JSON da conta de serviço).");
  }
  if (!dryRun && !EMAILJS.privateKey) {
    throw new Error("Defina o secret EMAILJS_PRIVATE_KEY (EmailJS > Account > API keys).");
  }

  let conta;
  try {
    conta = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT não é um JSON válido (cole o arquivo inteiro).");
  }

  const ctx = {
    base: `https://firestore.googleapis.com/v1/projects/${conta.project_id}/databases/(default)/documents`,
    token: await obterToken(conta),
  };
  const linkRevisao = `${urlDoSite()}/app/revisao/revisao.html`;
  const agora = new Date();

  // Regra 1: só quem ativou as notificações diárias
  const usuarios = await consultar(
    ctx,
    montarConsulta("usuarios", "notificacoes_email", { booleanValue: true }),
  );
  console.log(`${usuarios.length} usuário(s) com notificações diárias ativadas.${dryRun ? " [DRY RUN]" : ""}`);

  let enviados = 0;
  let falhas = 0;

  for (const { id: uid, dados: perfil } of usuarios) {
    try {
      const cards = await consultar(
        ctx,
        montarConsulta("flashcards", "usuario_id", { stringValue: uid }, ["proxima_revisao"]),
      );
      const pendentes = contarPendentes(cards.map((c) => c.dados), agora.toISOString());

      // Regras 2 e 3: pendências ou inatividade de 10 dias
      const decisao = decidirEnvio({
        pendentes,
        ultimoAcessoIso: perfil.ultimo_acesso_em,
        ultimoEnvioIso: perfil.ultimo_email_enviado_em,
        agoraMs: agora.getTime(),
      });
      if (!decisao.enviar) {
        console.log(`- ${uid}: ${decisao.motivo}, ignorado.`);
        continue;
      }

      if (!perfil.email) {
        console.warn(`- ${uid}: sem e-mail no perfil, ignorado.`);
        continue;
      }

      const textos = montarMensagem(decisao, pendentes);
      if (dryRun) {
        console.log(`- ${uid}: enviaria "${decisao.tipo}" para ${perfil.email} (${pendentes} pendente(s)).`);
        continue;
      }

      await enviarEmail({
        email: perfil.email,
        nome: perfil.nome || perfil.email.split("@")[0],
        pendentes,
        linkRevisao,
        decisao,
        textos,
      });
      await gravarUltimoEnvio(ctx, uid, new Date().toISOString());
      enviados++;
      console.log(`- ${uid}: "${decisao.tipo}" enviado para ${perfil.email} (${pendentes} pendente(s)).`);
      await pausa(PAUSA_ENTRE_ENVIOS_MS);
    } catch (erro) {
      falhas++;
      console.error(`- ${uid}: falha ao processar: ${erro.message}`);
    }
  }

  console.log(`Concluído: ${enviados} enviado(s), ${falhas} falha(s).`);
  if (falhas > 0) process.exitCode = 1;
}

module.exports = {
  contarPendentes,
  decidirEnvio,
  montarMensagem,
  criarJwt,
  montarConsulta,
  lerCampos,
  main,
};

if (require.main === module) {
  main().catch((erro) => {
    console.error(`Erro fatal: ${erro.message}`);
    process.exit(1);
  });
}
