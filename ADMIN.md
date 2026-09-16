# Painel de edição

Endereço: **paletoembrasilia.com.br/admin**

O painel edita o conteúdo do site sem passar por código. Cada gravação vira um
commit no repositório, e a Vercel republica o site sozinha em um ou dois
minutos. Como tudo fica versionado, qualquer alteração pode ser desfeita.

---

## Parte 1 — Ligar o painel (uma vez só)

Enquanto as variáveis abaixo não existirem na Vercel, `/admin` mostra a tela de
entrada mas o login não conclui.

### 1. Token do GitHub

1. Em **github.com → Settings → Developer settings → Personal access tokens →
   Fine-grained tokens → Generate new token**.
2. Repositório: apenas **lembramento/paleto-em-brasilia**.
3. Permissão: **Contents → Read and write** (só essa).
4. Validade: defina um prazo e anote — quando vencer, o painel para de gravar e
   é só gerar outro e atualizar a variável.

### 2. Variáveis na Vercel

No projeto → **Settings → Environment Variables**, cadastre para *Production*:

| Variável | Valor |
|---|---|
| `ADMIN_EMAILS` | `palletoembrasilia@gmail.com` (dois L em "palleto" — é assim mesmo). Outros e-mails entram separados por vírgula |
| `SESSION_SECRET` | texto aleatório longo, de 40 caracteres ou mais |
| `GITHUB_TOKEN` | token do passo 1 |
| `GITHUB_REPO` | `lembramento/paleto-em-brasilia` |
| `GITHUB_BRANCH` | `main` |

Depois de salvar, faça um **Redeploy** — variáveis novas só valem para o próximo
deploy.

Para conferir se as funções subiram: **Deployments → (último) → Functions**.
Devem aparecer `api/auth`, `api/conteudo` e `api/upload`.

**A senha não fica na Vercel.** Ela é cadastrada no próprio painel, no primeiro
acesso, e guardada como hash em `admin-credenciais.json` na raiz do repositório
— fora de `site/`, que é a única pasta publicada, então o arquivo nunca é
servido como página.

### 3. Primeiro acesso: cadastrar a senha

Assim que o deploy terminar, abra `/admin`. Como ainda não existe senha, o
painel mostra a tela de **cadastro**: informe um e-mail da lista, escolha uma
senha e confirme.

Na sequência aparece o **código de recuperação**, uma única vez. Guarde-o antes
de continuar: é ele que destrava o painel se a senha for esquecida.

> **Faça esse cadastro logo depois do deploy.** Entre o site entrar no ar e a
> senha ser cadastrada, existe uma janela em que qualquer pessoa que souber um
> e-mail da lista e chegar em `/admin` poderia cadastrar a senha antes de vocês.
> A janela fecha no instante em que vocês cadastram.

### Trocar a senha e o código

Dentro do painel, aba **Senha**: trocar a senha (pedindo a atual) e gerar um
código de recuperação novo, que invalida o anterior. Vale para todo mundo na
hora — sem passar pela Vercel.

### Esqueceu a senha

Na tela de entrada, **Esqueci a senha**: e-mail + código de recuperação + senha
nova. O código usado é queimado e um novo aparece na tela — guarde também.

Se perderem a senha **e** o código, o jeito é apagar `admin-credenciais.json` no
GitHub: o painel volta a oferecer o cadastro do zero.

### Sobre a senha

A senha é **uma só, compartilhada** por quem tem acesso:

- **Use uma frase longa**, não uma palavra. O painel exige 10 caracteres,
  atrasa cada tentativa errada e bloqueia por 15 minutos após 8 erros seguidos,
  mas esse bloqueio vive na memória de cada instância da Vercel: quem insistir
  de vários lugares contorna. O comprimento da senha é o que protege de fato.
- **Não dá para saber quem editou o quê.** Os commits saem com o e-mail de quem
  entrou, mas qualquer pessoa da lista pode usar qualquer e-mail da lista, já
  que a senha é a mesma.
- **Quando alguém sair da banda**, troque a senha e gere um código novo — tirar
  o e-mail da lista não basta, porque a senha continua valendo para os outros.

### Dar acesso a outra pessoa da banda

Some o e-mail dela em `ADMIN_EMAILS`, faça Redeploy e passe a senha.

### Opcional: login com Google

O painel também aceita entrar com Google, e o botão aparece sozinho na tela de
entrada se as duas variáveis existirem: `GOOGLE_CLIENT_ID` e
`GOOGLE_CLIENT_SECRET`, criadas em **console.cloud.google.com → APIs e serviços
→ Credenciais → ID do cliente OAuth**, tipo *Aplicativo da Web*, com estes URIs
de redirecionamento:

- `https://paletoembrasilia.com.br/api/auth?acao=retorno`
- `https://www.paletoembrasilia.com.br/api/auth?acao=retorno`

Com o Google ligado, cada pessoa entra com a própria conta e não existe senha
compartilhada — é o caminho mais seguro quando a banda quiser migrar.

## Parte 2 — Usar o painel

Entre em `/admin` com o e-mail autorizado e a senha. As alterações de todas as
abas são gravadas juntas pelo botão **Salvar alterações**, no rodapé.

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

### Senha

Trocar a senha compartilhada e gerar um novo código de recuperação. Ver a
Parte 1.

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
