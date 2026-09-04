/* =====================================================================
   Torre de Controle — camada de dados e regras compartilhadas
   (usado por index.html e cadastro.html; carregar depois de supabase.js)
   ===================================================================== */

/* ---------- Formatação ---------- */
const brl = new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'});
const num = new Intl.NumberFormat('pt-BR');
const parseMoney = s => { const n = parseFloat(String(s).replace(/\./g,'').replace(',','.').replace(/[^0-9.-]/g,'')); return isFinite(n) ? n : NaN; };
const onlyDigits = s => String(s).replace(/\D/g,'');

/* ---------- Rótulos ---------- */
const TIPO_LABEL = {geral:'Carga geral', granel_solido:'Granel sólido', granel_liquido:'Granel líquido', frigorificada:'Frigorificada', conteinerizada:'Conteinerizada', perigosa_geral:'Perigosa (geral)'};
const STATUS_LABEL = {cotacao:'Cotação', confirmado:'Confirmado', coleta:'Em coleta', rota:'Em rota', entregue:'Entregue', faturado:'Faturado', cancelado:'Cancelado'};
const STATUS_ORDER = ['cotacao','confirmado','coleta','rota','entregue','faturado'];

/* ---------- Validação de documentos ---------- */
function cpfValido(v){
  const c = onlyDigits(v); if(c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const dv = n => { let s = 0; for(let i=0;i<n;i++) s += +c[i]*(n+1-i); const r = (s*10)%11; return r===10?0:r; };
  return dv(9) === +c[9] && dv(10) === +c[10];
}
function cnpjValido(v){
  const c = onlyDigits(v); if(c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = len => { const w = len===12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let s = 0; for(let i=0;i<len;i++) s += +c[i]*w[i]; const r = s%11; return r<2?0:11-r; };
  return calc(12) === +c[12] && calc(13) === +c[13];
}
function placaValida(v){
  const p = onlyDigits(v).length ? v.toUpperCase().replace(/[^A-Z0-9]/g,'') : '';
  return /^[A-Z]{3}[0-9]{4}$/.test(p) || /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(p);
}
function fmtCnpj(v){ const c = onlyDigits(v).slice(0,14); return c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2}).*/, '$1.$2.$3/$4-$5').replace(/[-/.]+$/,''); }
function fmtCpf(v){ const c = onlyDigits(v).slice(0,11); return c.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2}).*/, '$1.$2.$3-$4').replace(/[-.]+$/,''); }
function fmtDoc(v){ return onlyDigits(v).length > 11 ? fmtCnpj(v) : fmtCpf(v); }

/* =====================================================================
   Tabela de coeficientes do piso mínimo — REFERÊNCIA, não oficial.
   PISO[tipoCarga][eixos] = { ccd: R$/km, cc: R$ }
   Substitua pelos números da tabela ANTT vigente (Tabela A, lotação)
   antes de usar os valores para decisão comercial.
   ===================================================================== */
const PISO = {
  geral:            {2:{ccd:3.09,cc:349},3:{ccd:3.84,cc:377},4:{ccd:4.44,cc:405},5:{ccd:5.02,cc:433},6:{ccd:5.53,cc:461},7:{ccd:6.30,cc:489},8:{ccd:6.83,cc:517},9:{ccd:7.36,cc:545}},
  granel_solido:    {2:{ccd:3.01,cc:322},3:{ccd:3.74,cc:348},4:{ccd:4.32,cc:374},5:{ccd:4.88,cc:400},6:{ccd:5.37,cc:426},7:{ccd:6.12,cc:452},8:{ccd:6.63,cc:478},9:{ccd:7.14,cc:504}},
  granel_liquido:   {2:{ccd:3.20,cc:363},3:{ccd:3.98,cc:392},4:{ccd:4.60,cc:421},5:{ccd:5.20,cc:450},6:{ccd:5.73,cc:479},7:{ccd:6.53,cc:508},8:{ccd:7.08,cc:537},9:{ccd:7.63,cc:566}},
  frigorificada:    {2:{ccd:3.52,cc:399},3:{ccd:4.38,cc:431},4:{ccd:5.06,cc:463},5:{ccd:5.72,cc:495},6:{ccd:6.30,cc:527},7:{ccd:7.18,cc:559},8:{ccd:7.79,cc:591},9:{ccd:8.40,cc:623}},
  conteinerizada:   {2:{ccd:3.12,cc:352},3:{ccd:3.88,cc:380},4:{ccd:4.48,cc:408},5:{ccd:5.07,cc:436},6:{ccd:5.58,cc:464},7:{ccd:6.36,cc:492},8:{ccd:6.90,cc:520},9:{ccd:7.43,cc:548}},
  perigosa_geral:   {2:{ccd:3.66,cc:452},3:{ccd:4.55,cc:487},4:{ccd:5.26,cc:522},5:{ccd:5.94,cc:557},6:{ccd:6.55,cc:592},7:{ccd:7.46,cc:627},8:{ccd:8.09,cc:662},9:{ccd:8.72,cc:697}}
};
const PISO_REF = 'Referência — confira em calculadorafrete.antt.gov.br';

function calcPiso({tipoCarga, eixos, distancia, incluirRetorno}){
  const row = PISO[tipoCarga] && PISO[tipoCarga][eixos];
  const dist = parseFloat(String(distancia).replace(',','.'));
  if(!row || !isFinite(dist) || dist <= 0) return null;
  const desloc = dist * row.ccd;
  const retorno = incluirRetorno ? 0.92 * dist * row.ccd : 0;
  return { ccd: row.ccd, cc: row.cc, dist, retorno, total: desloc + retorno + row.cc };
}
/* Situação em relação ao piso mínimo — compara com o valor PAGO AO MOTORISTA,
   não com o valor cobrado do cliente. É quem executa o transporte que o piso
   protege (empresa é corretora de frete: cobra do cliente, paga o motorista,
   fica com a diferença). */
function situacao(pagoMotorista, piso){
  if(piso == null || !isFinite(pagoMotorista)) return {cls:'neutral', txt:'—'};
  const r = pagoMotorista / piso;
  if(r >= 1.0)  return {cls:'ok',   txt:'Conforme'};
  if(r >= 0.97) return {cls:'warn', txt:'No limite'};
  return {cls:'bad', txt:'Abaixo do piso'};
}

/* Margem da corretagem: o que fica para a empresa em cada frete. */
function margem(f){
  if(!isFinite(f.valorFrete) || !isFinite(f.valorMotorista)) return null;
  const valor = f.valorFrete - f.valorMotorista;
  const pct = f.valorFrete > 0 ? (valor / f.valorFrete) * 100 : null;
  return { valor, pct };
}

/* =====================================================================
   Repositório de fretes (Supabase). Mapeia camelCase <-> snake_case.
   ===================================================================== */
function toRow(f){
  return {
    origem:f.origem, destino:f.destino, distancia:f.distancia, previsao:f.previsao || null,
    tipo_carga:f.tipoCarga, eixos:f.eixos ? parseInt(f.eixos,10) : null, veiculo:f.veiculo || null,
    peso:f.peso ?? null, valor_mercadoria:f.valorMercadoria ?? null,
    remetente:f.remetente, remetente_doc:f.remetenteDoc || null,
    destinatario:f.destinatario, destinatario_doc:f.destinatarioDoc || null,
    tomador:f.tomador || null, contato_tel:f.contatoTel || null,
    valor_frete:f.valorFrete, valor_motorista:f.valorMotorista, status:f.status || 'confirmado',
    motorista:f.motorista || null, motorista_cpf:f.motoristaCpf || null,
    placa_cavalo:f.placaCavalo || null, placa_reboque:f.placaReboque || null,
    obs:f.obs || null, inclui_retorno:!!f.incluiRetorno, piso_ref:f.pisoRef ?? null
  };
}
function fromRow(r){
  return {
    id:r.id, numero:r.numero, criadoEm:r.criado_em,
    origem:r.origem, destino:r.destino, distancia:r.distancia, previsao:r.previsao,
    tipoCarga:r.tipo_carga, eixos:r.eixos, veiculo:r.veiculo, peso:r.peso, valorMercadoria:r.valor_mercadoria,
    remetente:r.remetente, remetenteDoc:r.remetente_doc, destinatario:r.destinatario, destinatarioDoc:r.destinatario_doc,
    tomador:r.tomador, contatoTel:r.contato_tel, valorFrete:r.valor_frete, valorMotorista:r.valor_motorista, status:r.status,
    motorista:r.motorista, motoristaCpf:r.motorista_cpf, placaCavalo:r.placa_cavalo, placaReboque:r.placa_reboque,
    obs:r.obs, incluiRetorno:r.inclui_retorno, pisoRef:r.piso_ref
  };
}
const store = {
  async list(){
    const { data, error } = await sb.from('fretes').select('*').order('criado_em', { ascending:false });
    if (error) throw error;
    return data.map(fromRow);
  },
  async create(frete){
    const { data, error } = await sb.from('fretes').insert(toRow(frete)).select().single();
    if (error) throw error;
    return fromRow(data);
  },
  async remove(id){
    const { error } = await sb.from('fretes').delete().eq('id', id);
    if (error) throw error;
  }
};

/* =====================================================================
   Estados e cidades (IBGE) + distância estimada (Nominatim/OpenStreetMap)
   ---------------------------------------------------------------------
   - Lista de UFs: fixa (não muda).
   - Cidades por UF: API pública do IBGE, cacheada no localStorage
     (a lista de municípios de um estado praticamente não muda).
   - Distância: geocodifica as duas cidades (Nominatim, também cacheado)
     e calcula a distância em linha reta (haversine) corrigida por um
     fator médio de sinuosidade de rota (ROAD_FACTOR). É uma ESTIMATIVA
     para agilizar o cadastro — o campo de distância continua editável
     para quem quiser informar o km exato da rota.
   ===================================================================== */
const UF_LIST = [
  {sigla:'AC',nome:'Acre'},{sigla:'AL',nome:'Alagoas'},{sigla:'AP',nome:'Amapá'},{sigla:'AM',nome:'Amazonas'},
  {sigla:'BA',nome:'Bahia'},{sigla:'CE',nome:'Ceará'},{sigla:'DF',nome:'Distrito Federal'},{sigla:'ES',nome:'Espírito Santo'},
  {sigla:'GO',nome:'Goiás'},{sigla:'MA',nome:'Maranhão'},{sigla:'MT',nome:'Mato Grosso'},{sigla:'MS',nome:'Mato Grosso do Sul'},
  {sigla:'MG',nome:'Minas Gerais'},{sigla:'PA',nome:'Pará'},{sigla:'PB',nome:'Paraíba'},{sigla:'PR',nome:'Paraná'},
  {sigla:'PE',nome:'Pernambuco'},{sigla:'PI',nome:'Piauí'},{sigla:'RJ',nome:'Rio de Janeiro'},{sigla:'RN',nome:'Rio Grande do Norte'},
  {sigla:'RS',nome:'Rio Grande do Sul'},{sigla:'RO',nome:'Rondônia'},{sigla:'RR',nome:'Roraima'},{sigla:'SC',nome:'Santa Catarina'},
  {sigla:'SP',nome:'São Paulo'},{sigla:'SE',nome:'Sergipe'},{sigla:'TO',nome:'Tocantins'}
];
const ROAD_FACTOR = 1.35; // linha reta -> estimativa de km de rodovia

async function getCidades(uf){
  const cacheKey = 'tc_cidades_' + uf;
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}
  const r = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios?orderBy=nome`);
  if (!r.ok) throw new Error('IBGE: falha ao carregar cidades de ' + uf);
  const nomes = (await r.json()).map(m => m.nome);
  try { localStorage.setItem(cacheKey, JSON.stringify(nomes)); } catch {}
  return nomes;
}

async function getCoordCidade(cidade, uf){
  const key = 'tc_geo_' + uf + '_' + cidade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  try {
    const cached = localStorage.getItem(key);
    if (cached) return JSON.parse(cached);
  } catch {}
  const q = encodeURIComponent(`${cidade}, ${uf}, Brazil`);
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${q}`);
  if (!r.ok) return null;
  const rows = await r.json();
  if (!rows.length) return null;
  const coord = { lat: parseFloat(rows[0].lat), lon: parseFloat(rows[0].lon) };
  try { localStorage.setItem(key, JSON.stringify(coord)); } catch {}
  return coord;
}

function haversineKm(lat1, lon1, lat2, lon2){
  const R = 6371, rad = Math.PI/180;
  const dLat = (lat2-lat1)*rad, dLon = (lon2-lon1)*rad;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*rad)*Math.cos(lat2*rad)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* Retorna { km, estimado:true } ou null se alguma cidade não foi geocodificada. */
async function distanciaEstimada(origemCidade, origemUf, destinoCidade, destinoUf){
  const [a, b] = await Promise.all([
    getCoordCidade(origemCidade, origemUf),
    getCoordCidade(destinoCidade, destinoUf)
  ]);
  if (!a || !b) return null;
  const km = haversineKm(a.lat, a.lon, b.lat, b.lon) * ROAD_FACTOR;
  return { km: Math.round(km), estimado: true };
}
