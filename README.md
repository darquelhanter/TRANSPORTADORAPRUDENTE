# Torre de Controle — Painel Operacional

Aplicação web para controle operacional de transportadora rodoviária de carga.
Protótipo em evolução.

## Páginas

| Arquivo | O que é |
|---|---|
| `login.html` | Entrada — autenticação por e-mail/senha (Supabase) |
| `index.html` | Painel operacional: OTD, sinistralidade, viagens em andamento, compliance (CT-e, MDF-e, CIOT, piso ANTT), atendimento WhatsApp, indicadores. Dados de demonstração. |
| `cadastro.html` | Cadastro de frete: formulário com validação, cálculo de referência do piso mínimo ANTT e lista de fretes (salvos no Supabase). |

## Estado atual

- ✅ Painel operacional (dados simulados) — responsivo e acessível
- ✅ Cadastro de frete + cálculo de referência do piso ANTT
- ✅ Login real e persistência dos fretes via **Supabase**
- ⚠️ Coeficientes CCD/CC do piso ANTT são de **referência** (`const PISO` em `cadastro.html`) — substituir pelos valores oficiais de <https://calculadorafrete.antt.gov.br>
- ⬜ WhatsApp Business API (Meta Cloud API) — próxima fase; hoje há botão `wa.me`

## Configuração

1. **Supabase** (login + banco): siga [`SETUP-SUPABASE.md`](SETUP-SUPABASE.md).
   Sem isso, as páginas mostram um aviso de "não configurado".
2. **Publicar (GitHub Pages)**: Settings → Pages → branch `main`, pasta `/ (root)`.
   Coloque a URL publicada em **Authentication → URL Configuration → Site URL** no Supabase.

Não requer Node — o cliente Supabase é carregado via CDN.
