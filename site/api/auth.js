"use strict";

// Autenticação do painel. Dois caminhos, na mesma função:
//
//   e-mail + senha (ativo)
//     /api/auth?acao=senha   POST {email, senha} → cria a sessão
//
//   Google (opcional, liga sozinho se as variáveis existirem)
//     /api/auth?acao=entrar  → tela de consentimento do Google
//     /api/auth?acao=retorno → o Google volta aqui com o código
//
//   /api/auth?acao=quem → quem está logado (o painel chama ao abrir)
//   /api/auth?acao=sair → apaga a sessão
//
// Em ambos, entrar exige estar em ADMIN_EMAILS. A senha e o segredo do Google
// ficam só aqui no servidor; o navegador recebe apenas o cookie de sessão.

const crypto = require("crypto");
const {
  assinarSessao, lerSessao, definirCookie, limparCookie,
  autorizado, emailsAutorizados
} = require("./_lib");

const ESCOPO = "openid email profile";

// Freio de força bruta. Serverless não compartilha memória entre instâncias,
// então isto atrasa um ataque, não o impede — a defesa que vale mesmo é uma
// senha longa. Ver a nota em ADMIN.md.
const TENTATIVAS = new Map();
const LIMITE = 8;
const JANELA_MS = 15 * 60 * 1000;

function bloqueado(chave) {
  const reg = TENTATIVAS.get(chave);
  if (!reg) return false;
  if (Date.now() - reg.desde > JANELA_MS) { TENTATIVAS.delete(chave); return false; }
  return reg.erros >= LIMITE;
}

function registrarErro(chave) {
  const reg = TENTATIVAS.get(chave);
  if (!reg || Date.now() - reg.desde > JANELA_MS) {
    TENTATIVAS.set(chave, { erros: 1, desde: Date.now() });
  } else {
    reg.erros += 1;
  }
}

function iguais(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  // Tamanhos diferentes vazam informação em comparação direta; o hash iguala o
  // comprimento antes de comparar em tempo constante.
  const hx = crypto.createHash("sha256").update(x).digest();
  const hy = crypto.createHash("sha256").update(y).digest();
  return crypto.timingSafeEqual(hx, hy);
}

function espera(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function googleConfigurado() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function urlBase(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  const protocolo = req.headers["x-forwarded-proto"] || "https";
  return `${protocolo}://${host}`;
}

function redirecionarPara(req) {
  return `${urlBase(req)}/api/auth?acao=retorno`;
}

module.exports = async function handler(req, res) {
  const acao = (req.query && req.query.acao) || "quem";

  try {
    if (acao === "quem") {
      const sessao = lerSessao(req);
      if (!sessao || !autorizado(sessao.email)) {
        return res.status(401).json({ autenticado: false, google: googleConfigurado() });
      }
      return res.status(200).json({
        autenticado: true,
        email: sessao.email,
        nome: sessao.nome || "",
        google: googleConfigurado()
      });
    }

    if (acao === "sair") {
      limparCookie(res);
      return res.status(200).json({ ok: true });
    }

    /* ---------- E-MAIL + SENHA ---------- */
    if (acao === "senha") {
      if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ erro: "método não permitido" });
      }

      const senhaCerta = process.env.ADMIN_SENHA;
      if (!senhaCerta) {
        return res.status(500).json({ erro: "ADMIN_SENHA não está configurada na Vercel" });
      }
      if (emailsAutorizados().length === 0) {
        return res.status(500).json({ erro: "ADMIN_EMAILS não está configurada na Vercel" });
      }

      const { email, senha } = req.body || {};
      const origem = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "sem-ip";

      if (bloqueado(origem)) {
        return res.status(429).json({ erro: "tentativas demais — espere 15 minutos" });
      }

      // A verificação de e-mail e a de senha são avaliadas juntas para não
      // revelar qual das duas estava errada.
      const ok = autorizado(email) && iguais(senha || "", senhaCerta);

      if (!ok) {
        registrarErro(origem);
        await espera(700);
        return res.status(401).json({ erro: "e-mail ou senha incorretos" });
      }

      TENTATIVAS.delete(origem);
      definirCookie(res, assinarSessao({ email: String(email).toLowerCase(), nome: "" }), 60 * 60 * 12);
      return res.status(200).json({ ok: true });
    }

    /* ---------- GOOGLE ---------- */
    if (acao === "entrar") {
      if (!googleConfigurado()) return res.status(500).send("Login com Google não configurado");

      // "state" amarra o retorno a este navegador: sem ele, um terceiro poderia
      // completar o login por você (CSRF no fluxo OAuth).
      const state = crypto.randomBytes(16).toString("hex");
      res.setHeader("Set-Cookie",
        `pb_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID);
      url.searchParams.set("redirect_uri", redirecionarPara(req));
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", ESCOPO);
      url.searchParams.set("state", state);
      url.searchParams.set("prompt", "select_account");
      return res.redirect(302, url.toString());
    }

    if (acao === "retorno") {
      const { code, state } = req.query || {};
      const esperado = (req.headers.cookie || "")
        .split(";").map((p) => p.trim())
        .find((p) => p.startsWith("pb_state="));

      if (!code || !state || !esperado || esperado.slice("pb_state=".length) !== state) {
        return res.redirect(302, "/admin/?erro=estado");
      }

      const resposta = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID || "",
          client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
          redirect_uri: redirecionarPara(req),
          grant_type: "authorization_code"
        })
      });

      if (!resposta.ok) return res.redirect(302, "/admin/?erro=troca");

      const dados = await resposta.json();
      // O id_token veio direto do Google por TLS nesta requisição servidor a
      // servidor, então o payload é confiável sem verificar a assinatura.
      const partes = String(dados.id_token || "").split(".");
      if (partes.length !== 3) return res.redirect(302, "/admin/?erro=token");

      let perfil;
      try {
        perfil = JSON.parse(Buffer.from(partes[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
      } catch (e) {
        return res.redirect(302, "/admin/?erro=token");
      }

      if (!perfil.email_verified || !autorizado(perfil.email)) {
        return res.redirect(302, "/admin/?erro=acesso");
      }

      definirCookie(res, assinarSessao({ email: perfil.email, nome: perfil.name || "" }), 60 * 60 * 12);
      return res.redirect(302, "/admin/");
    }

    return res.status(400).json({ erro: "ação desconhecida" });
  } catch (e) {
    return res.status(500).json({ erro: "falha na autenticação" });
  }
};
