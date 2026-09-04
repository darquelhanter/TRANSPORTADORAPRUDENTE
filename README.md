# Torre de Controle — Painel Operacional

Aplicação web para controle operacional de transportadora rodoviária de carga.
Protótipo em evolução.

## Páginas

| Arquivo | O que é |
|---|---|
| `login.html` | Entrada — autenticação por e-mail/senha (Supabase) |
| `index.html` | Painel operacional: KPIs, andamento, compliance ANTT e indicadores calculados a partir dos fretes cadastrados. |
| `cadastro.html` | Cadastro de frete: rota (estado/cidade com distância estimada automaticamente), validação, cálculo de referência do piso mínimo ANTT, margem da corretagem e lista de fretes (salvos no Supabase). |
| `app.js` | Regras e dados compartilhados entre `index.html` e `cadastro.html` (piso ANTT, validação de documentos, estados/cidades, distância). |

## Estado atual

- ✅ Painel operacional ligado ao Supabase — responsivo e acessível, sem dados inventados
- ✅ Cadastro de frete: rota por estado/cidade (API do IBGE), distância estimada automaticamente
  (geocodificação OpenStreetMap/Nominatim + correção de rota), cálculo de referência do piso ANTT
- ✅ Corretagem: valor cobrado do cliente separado do valor pago ao motorista, com margem calculada
  (o piso ANTT compara com o valor pago ao motorista, não o cobrado)
- ✅ Login real e persistência dos fretes via **Supabase**
- ⚠️ Coeficientes CCD/CC do piso ANTT são de **referência** (`PISO` em `app.js`) — substituir pelos valores oficiais de <https://calculadorafrete.antt.gov.br>
- ⚠️ Distância é uma **estimativa** (linha reta × fator de rota) — editável; upgrade para distância de rota real possível com OpenRouteService (chave gratuita)
- ⬜ WhatsApp Business API (Meta Cloud API) — próxima fase; hoje há botão `wa.me`

## Configuração

1. **Supabase** (login + banco): siga [`SETUP-SUPABASE.md`](SETUP-SUPABASE.md).
   Sem isso, as páginas mostram um aviso de "não configurado".
2. **Publicar (GitHub Pages)**: Settings → Pages → branch `main`, pasta `/ (root)`.
   Coloque a URL publicada em **Authentication → URL Configuration → Site URL** no Supabase.

Não requer Node — o cliente Supabase é carregado via CDN.
