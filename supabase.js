/* =====================================================================
   Configuração do Supabase — Torre de Controle
   ---------------------------------------------------------------------
   Preencha os 2 valores abaixo com os dados do SEU projeto Supabase:
     Project Settings  ->  API  ->  Project URL   e   anon / public key
   A anon key PODE ficar no código do navegador — quem protege os dados
   são as políticas RLS no banco (ver db/schema.sql).
   ===================================================================== */
const SUPABASE_URL      = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA_ANON_KEY_AQUI';

const CONFIGURADO = !SUPABASE_URL.includes('SEU-PROJETO') && !SUPABASE_ANON_KEY.includes('AQUI');

/* Cliente (a lib vem do <script> do CDN, que expõe window.supabase) */
const sb = CONFIGURADO
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/* ---------------------------------------------------------------------
   auth — trocado facilmente se um dia sair do Supabase
   ------------------------------------------------------------------- */
const auth = {
  async session(){ return CONFIGURADO ? (await sb.auth.getSession()).data.session : null; },
  async user(){ const s = await this.session(); return s ? s.user : null; },
  async signIn(email, senha){
    const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
    return data;
  },
  async signUp(email, senha){
    const { data, error } = await sb.auth.signUp({ email, password: senha });
    if (error) throw error;
    return data;
  },
  async signOut(){ await sb.auth.signOut(); location.replace('login.html'); }
};

/* ---------------------------------------------------------------------
   guardPage() — chame no topo de cada página protegida.
   Esconde o conteúdo até confirmar a sessão; sem sessão -> login.
   Preenche [data-user-email] e liga [data-signout].
   ------------------------------------------------------------------- */
async function guardPage(){
  if (!CONFIGURADO){
    document.documentElement.innerHTML =
      '<body style="font-family:system-ui;background:#14171b;color:#e9e7e2;padding:40px;line-height:1.6">' +
      '<h1 style="font-family:system-ui">Supabase não configurado</h1>' +
      '<p>Edite <code>supabase.js</code> e preencha <code>SUPABASE_URL</code> e ' +
      '<code>SUPABASE_ANON_KEY</code>. Passo a passo em <code>SETUP-SUPABASE.md</code>.</p></body>';
    throw new Error('Supabase não configurado');
  }

  document.documentElement.style.visibility = 'hidden';

  const session = await auth.session();
  if (!session){
    location.replace('login.html');
    return new Promise(()=>{});           // trava até o redirect
  }

  document.documentElement.style.visibility = '';

  document.querySelectorAll('[data-user-email]').forEach(el => {
    el.textContent = session.user.email;
  });
  document.querySelectorAll('[data-signout]').forEach(el => {
    el.addEventListener('click', (e)=>{ e.preventDefault(); auth.signOut(); });
  });

  sb.auth.onAuthStateChange((event)=>{
    if (event === 'SIGNED_OUT') location.replace('login.html');
  });

  return session;
}
