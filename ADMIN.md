# Painel de edição

Endereço: **paletoembrasilia.com.br/admin**

O painel edita o conteúdo do site sem passar por código. Cada gravação vira um
commit no repositório, e a Vercel republica o site sozinha em um ou dois
minutos. Como tudo fica versionado, qualquer alteração pode ser desfeita.

---

## Parte 1 — Ligar o painel (uma vez só)

Enquanto os três itens abaixo não existirem, `/admin` mostra a tela de entrada
mas o login não conclui.

### 1. Credencial do Google

1. Acesse **console.cloud.google.com** com a conta da banda e crie um projeto
   (nome livre, ex.: "Site Paletó").
2. Menu **APIs e serviços → Tela de permissão OAuth**. Tipo **Externo**, nome do
   app "Painel Paletó em Brasília", e-mail de suporte e de contato: o da banda.
   Publique o app (senão só contas de teste entram).
3. Menu **Credenciais → Criar credenciais → ID do cliente OAuth**, tipo
   **Aplicativo da Web**. Em **URIs de redirecionamento autorizados**, cole os
   dois:
   - `https://paletoembrasilia.com.br/api/auth?acao=retorno`
   - `https://www.paletoembrasilia.com.br/api/auth?acao=retorno`
4. Guarde o **ID do cliente** e a **chave secreta**.

### 2. Token do GitHub

1. Em **github.com → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. Repositório: apenas **lembramento/paleto-em-brasilia**.
3. Permissão: **Contents → Read and write** (só essa).
4. Validade: defina um prazo e anote — quando vencer, o painel para de gravar e
   é só gerar outro e atualizar a variável.

### 3. Variáveis na Vercel

No projeto → **Settings → Environment Variables**, cadastre para *Production*:

| Variável | Valor |
|---|---|
| `GOOGLE_CLIENT_ID` | ID do cliente do passo 1 |
| `GOOGLE_CLIENT_SECRET` | chave secreta do passo 1 |
| `SESSION_SECRET` | texto aleatório longo, de 40 caracteres ou mais |
| `ADMIN_EMAILS` | e-mails autorizados, separados por vírgula |
| `GITHUB_TOKEN` | token do passo 2 |
| `GITHUB_REPO` | `lembramento/paleto-em-brasilia` |
| `GITHUB_BRANCH` | `main` |

Depois de salvar, faça um **Redeploy** — variáveis novas só valem para o próximo
deploy.

Para conferir se as funções subiram: **Deployments → (último) → Functions**.
Devem aparecer `api/auth`, `api/conteudo` e `api/upload`.

### Dar acesso a outra pessoa da banda

Some o e-mail dela em `ADMIN_EMAILS`, separado por vírgula, e faça Redeploy.
Nada mais: ela entra com a própria conta Google. Para tirar o acesso, remova o
e-mail e faça Redeploy — a sessão dela cai em até 12 horas.

---

## Parte 2 — Usar o painel

Entre em `/admin`, clique em **Entrar com Google** e escolha a conta autorizada.
As alterações de todas as abas são gravadas juntas pelo botão **Salvar
alterações**, no rodapé.

### Lançamento

O interruptor mais importante do site é **Em que fase está**:

- **Vai sair** — a capa perde a tarja de plataformas, o Articulista volta a
  dizer que "existe um material" e o botão do single abre o fluxo de e-mail,
  que termina no link de pré-save.
- **Já lançado** — a tarja aparece na capa com as plataformas, o single ganha o
  botão "Ouvir agora" e o fluxo passa a mandar ouvir.

Ou seja, para o próximo single: mude para **Vai sair**, atualize número, título,
data, capa e o **link de pré-save**. No dia em que sair, mude para **Já
lançado**, cole o **smart link** e os links de cada plataforma.

As plataformas aparecem na tarja da capa na ordem da lista, e as setas ↑ ↓
reordenam. Plataforma sem link cai no smart link.

### Pronunciamentos

Os vídeos do Articulista. No campo de vídeo pode colar a URL inteira do YouTube
— o painel extrai o ID sozinho. Linha sem vídeo fica apagada no site, no estado
de registro selado. O interruptor do topo esconde a seção inteira.

### Links, Imagens, Textos do site

Links do rodapé e das seções; troca das imagens (JPG, PNG, WebP ou AVIF, até
3 MB); e todos os textos da página, cada um com português e inglês.

Nos textos, **campo em branco volta ao texto original** do site. O painel só
guarda o que foi alterado.

### Deck de imprensa

Os textos dos slides de `imprensa.html`, agrupados por slide, com o texto
original em cinza acima de cada campo. Aceita HTML simples — `<br>` para quebra
de linha, `<strong>` para negrito. Como nos textos do site, campo em branco
mantém o original.

---

## Limites, e o que ainda depende de código

- **A publicação não é instantânea.** Salvar grava no repositório; a Vercel leva
  de um a dois minutos para republicar. Recarregar o site logo depois ainda
  mostra o conteúdo antigo.
- **Duas pessoas editando ao mesmo tempo:** quem salvar depois recebe um aviso
  de que o conteúdo mudou e precisa recarregar o painel. Nada é sobrescrito em
  silêncio.
- **O painel edita conteúdo, não estrutura.** Criar uma seção nova, mudar layout,
  cores ou o comportamento de uma página continua sendo trabalho de código.
- **Imagens enviadas ficam em** `site/img/uploads/` e nunca são apagadas
  automaticamente — trocar uma imagem deixa a anterior no repositório.
