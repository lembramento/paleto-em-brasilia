"use strict";

// Autenticação do painel via Google, em três paradas numa função só:
//   /api/auth?acao=entrar   → manda para a tela de consentimento do Google
//   /api/auth?acao=retorno  → o Google volta aqui com o código; vira sessão
//   /api/auth?acao=quem     → diz quem está logado (o painel chama ao abrir)
//   /api/auth?acao=sair     → apaga a sessão
//
// Só e-mails listados em ADMIN_EMAILS entram. O segredo do Google e o token do
// GitHub ficam apenas aqui no servidor; o navegador nunca os vê.

const crypto = require("crypto");
const {
  assinarSessao, lerSessao, definirCookie, limparCookie,
  autorizado, emailsAutorizados
} = require("./_lib");

const ESCOPO = "openid email profile";

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
      if (!sessao || !autorizado(sessao.email)) return res.status(401).json({ autenticado: false });
      return res.status(200).json({ autenticado: true, email: sessao.email, nome: sessao.nome || "" });
    }

    if (acao === "sair") {
      limparCookie(res);
      return res.status(200).json({ ok: true });
    }

    if (acao === "entrar") {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) return res.status(500).send("GOOGLE_CLIENT_ID não configurado");

      // "state" amarra o retorno a este navegador: sem ele, um terceiro poderia
      // completar o login por você (CSRF no fluxo OAuth).
      const state = crypto.randomBytes(16).toString("hex");
      res.setHeader("Set-Cookie",
        `pb_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.searchParams.set("client_id", clientId);
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
    // Configuração incompleta é o erro mais provável aqui — sinaliza sem vazar detalhe.
    const faltando = emailsAutorizados().length === 0 ? " (ADMIN_EMAILS vazio)" : "";
    return res.status(500).json({ erro: "falha na autenticação" + faltando });
  }
};
