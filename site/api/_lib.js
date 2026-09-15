"use strict";

// Utilidades compartilhadas pelas funções do painel: sessão assinada, guarda de
// autenticação e acesso ao GitHub. Nada aqui vai para o navegador — este arquivo
// só roda no servidor (o prefixo "_" impede a Vercel de expor como rota).

const crypto = require("crypto");

const COOKIE = "pb_sessao";
const DURACAO_MS = 1000 * 60 * 60 * 12; // 12 horas

function segredo() {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET não configurado");
  return s;
}

function base64url(buf) {
  return Buffer.from(buf).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deBase64url(str) {
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

// Sessão = payload em base64url + HMAC. Sem banco: o próprio cookie carrega
// quem é, e a assinatura impede adulteração.
function assinarSessao(dados) {
  const corpo = base64url(JSON.stringify({ ...dados, exp: Date.now() + DURACAO_MS }));
  const assinatura = base64url(crypto.createHmac("sha256", segredo()).update(corpo).digest());
  return `${corpo}.${assinatura}`;
}

function lerSessao(req) {
  const bruto = (req.headers.cookie || "")
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(COOKIE + "="));
  if (!bruto) return null;

  const valor = decodeURIComponent(bruto.slice(COOKIE.length + 1));
  const [corpo, assinatura] = valor.split(".");
  if (!corpo || !assinatura) return null;

  const esperada = base64url(crypto.createHmac("sha256", segredo()).update(corpo).digest());
  // Comparação em tempo constante: evita descobrir a assinatura byte a byte.
  const a = Buffer.from(assinatura);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const dados = JSON.parse(deBase64url(corpo).toString("utf8"));
    if (!dados.exp || dados.exp < Date.now()) return null;
    return dados;
  } catch (e) {
    return null;
  }
}

function definirCookie(res, valor, maxIdade) {
  const partes = [
    `${COOKIE}=${encodeURIComponent(valor)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxIdade}`
  ];
  res.setHeader("Set-Cookie", partes.join("; "));
}

function limparCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

// Lista de quem pode entrar. Sem isso, qualquer conta Google entraria.
function emailsAutorizados() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function autorizado(email) {
  const lista = emailsAutorizados();
  return lista.length > 0 && lista.includes(String(email || "").toLowerCase());
}

// Guarda para as rotas de conteúdo: devolve a sessão ou responde 401.
function exigirSessao(req, res) {
  const sessao = lerSessao(req);
  if (!sessao || !autorizado(sessao.email)) {
    res.status(401).json({ erro: "não autenticado" });
    return null;
  }
  return sessao;
}

// ---------- GitHub ----------
// O conteúdo mora no próprio repositório: cada gravação é um commit, o que dá
// histórico e desfazer de graça, e dispara o deploy na Vercel.

function repo() {
  const nome = process.env.GITHUB_REPO;
  if (!nome) throw new Error("GITHUB_REPO não configurado");
  return nome;
}

function ramo() {
  return process.env.GITHUB_BRANCH || "main";
}

async function github(caminho, opcoes = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN não configurado");

  const resposta = await fetch(`https://api.github.com${caminho}`, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "paleto-admin",
      ...(opcoes.headers || {})
    }
  });

  const texto = await resposta.text();
  let corpo = null;
  try { corpo = texto ? JSON.parse(texto) : null; } catch (e) { corpo = texto; }

  if (!resposta.ok) {
    const erro = new Error((corpo && corpo.message) || `GitHub ${resposta.status}`);
    erro.status = resposta.status;
    erro.corpo = corpo;
    throw erro;
  }
  return corpo;
}

// Caminhos são montados aqui, nunca vêm crus do navegador — ver validarArquivo.
function caminhoNoRepo(arquivo) {
  return `site/${arquivo}`;
}

async function lerArquivo(arquivo) {
  const url = `/repos/${repo()}/contents/${encodeURI(caminhoNoRepo(arquivo))}?ref=${encodeURIComponent(ramo())}`;
  try {
    const dados = await github(url);
    return {
      conteudo: Buffer.from(dados.content, "base64").toString("utf8"),
      sha: dados.sha
    };
  } catch (e) {
    if (e.status === 404) return null;
    throw e;
  }
}

async function gravarArquivo(arquivo, conteudoBase64, mensagem, sha, autor) {
  const url = `/repos/${repo()}/contents/${encodeURI(caminhoNoRepo(arquivo))}`;
  const corpo = {
    message: mensagem,
    content: conteudoBase64,
    branch: ramo()
  };
  // sha presente = atualização; ausente = criação. Se o arquivo mudou no
  // repositório desde a leitura, o GitHub recusa com 409 e o painel avisa.
  if (sha) corpo.sha = sha;
  if (autor) corpo.author = autor;

  return github(url, { method: "PUT", body: JSON.stringify(corpo) });
}

module.exports = {
  assinarSessao,
  lerSessao,
  definirCookie,
  limparCookie,
  autorizado,
  emailsAutorizados,
  exigirSessao,
  lerArquivo,
  gravarArquivo,
  repo,
  ramo
};
