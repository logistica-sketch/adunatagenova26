const SUPA_URL = 'https://hnntyognhrdfhcwtmywp.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubnR5b2duaHJkZmhjd3RteXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDYzNTAsImV4cCI6MjA4ODMyMjM1MH0.k6c29OskhaVUiK_rbbnoOKqDqjlwXiKL5UTouSr_L94';
const sb = supabase.createClient(SUPA_URL, SUPA_KEY);

let CU = null;
let _turni = [], _varchi = [], _volontari = [], _mezzi = [];
let _assCtx = {}; // contesto modale assegna



function togglePw() {
  const inp = document.getElementById('login-pass');
  const btn = document.getElementById('pw-toggle');
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
}

// ── NAVBAR DINAMICA ───────────────────────────────────────────
function buildNavbar() {
  const isFull = CU['TIPOLOGIA'] === 'ACCESSO FULL';
  const navbar = document.getElementById('navbar-full');

  const tabsFull = [
    { id:'dashboard',   label:'Dashboard' },
    { id:'sezioni',     label:'Volontari per Sezione' },
    { id:'griglia',     label:'Gestione Turni' },
    { id:'inserimento', label:'Inserimento Volontari' },
    { id:'mezzi',       label:'Inserimento Mezzi' },
    { id:'utility',     label:'Utility' },
  ];

  const tabsSez = [
    { id:'inserimento', label:'Inserimento Volontari' },
    { id:'mezzi',       label:'Inserimento Mezzi' },
    { id:'sezioni',     label:'I miei Volontari' },
    { id:'utility',     label:'Utility' },
  ];

  const tabs = isFull ? tabsFull : tabsSez;
  navbar.innerHTML = tabs.map(t =>
    `<button class="nav-tab" data-tab="${t.id}" onclick="showTab('${t.id}')">${t.label}</button>`
  ).join('');
}

// ── LOADING ───────────────────────────────────────────────────
function setLoading(on) {
  const bar = document.getElementById('loading-bar');
  bar.style.width = on ? '70%' : '100%';
  if (!on) setTimeout(() => { bar.style.width = '0'; }, 350);
}

// ── LOGIN ─────────────────────────────────────────────────────
async function doLogin() {
  const u = document.getElementById('login-user').value.trim();
  const p = document.getElementById('login-pass').value;
  const btn = document.getElementById('login-btn');
  if (!u || !p) { showLoginErr('Inserisci username e password'); return; }
  btn.textContent = 'Connessione…'; btn.disabled = true;
  setLoading(true);
  try {
    const { data, error } = await sb.from('UTENTI').select('*').eq('Nome Utente', u).eq('PASSWORD', p).single();
    if (error || !data) { showLoginErr('Username o password non corretti'); return; }
    CU = data;
    document.getElementById('login-screen').style.display = 'none';
    aggiornaDrawer();
    // Mostra AI FAB solo per ACCESSO FULL
    if (CU['TIPOLOGIA'] === 'ACCESSO FULL') {
      document.getElementById('ai-fab').style.display = 'flex';
    aggiornaDrawer();
      document.getElementById('ai-fab').classList.add('pulse');
    }
    document.getElementById('app').style.display = 'block';
    document.getElementById('topbar-name').textContent = data['Nome Utente'];
    document.getElementById('topbar-role').textContent = data['TIPOLOGIA'] === 'ACCESSO FULL' ? 'Accesso completo' : 'Sezione: ' + (data['SEZIONE'] || '—');
    buildNavbar();
    showTab(CU['TIPOLOGIA'] === 'ACCESSO FULL' ? 'dashboard' : 'inserimento');
  } catch(e) { showLoginErr('Errore di connessione'); }
  finally { btn.textContent = 'Accedi →'; btn.disabled = false; setLoading(false); }
}
function showLoginErr(msg) {
  const el = document.getElementById('login-err');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 4000);
}
document.getElementById('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
function doLogout() {
  CU = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('ai-fab').style.display = 'none';
  closeDrawer();
  document.getElementById('ai-panel').style.display = 'none';
  _aiHistory = []; _aiOpen = false;
  document.getElementById('login-user').value = '';
  document.getElementById('login-pass').value = '';
}

// ── TABS ──────────────────────────────────────────────────────
function showTab(name) {
  document.querySelectorAll('[id^="tab-"]').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const tab = document.getElementById('tab-' + name);
  if (tab) tab.style.display = '';
  document.querySelectorAll('.nav-tab[data-tab]').forEach(t => {
    if (t.dataset.tab === name) t.classList.add('active');
  });
  const renders = { dashboard: renderDashboard, sezioni: renderSezioni, griglia: renderGriglia, utenti: renderUtenti, inserimento: renderInserimento, mezzi: renderInserimentoMezzi, utility: renderUtility };
  if (renders[name]) renders[name]();
}

// ── MODAL ─────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.querySelectorAll('.modal-overlay').forEach(m =>
  m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); })
);
function showFormAlert(id, msg, type = 'ok') {
  const el = document.getElementById(id);
  el.textContent = msg; el.className = 'form-alert show ' + type;
  setTimeout(() => el.classList.remove('show'), 4000);
}

// ── HELPER ────────────────────────────────────────────────────
function percClass(p) { return p >= 100 ? '' : p >= 50 ? ' warn' : ' danger'; }
function percBadge(p) { return p >= 100 ? 'badge-green' : p >= 50 ? 'badge-orange' : 'badge-red'; }

// ══════════════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════════════
async function renderDashboard() {
  setLoading(true);
  try {
    const [{ data: turni }, { data: varchi }, { data: volontari }] = await Promise.all([
      sb.from('TURNI').select('*').order('Etichetta'),
      sb.from('VARCHI').select('*').order('VARCO'),
      sb.from('VOLONTARI').select('*'),
    ]);
    _turni = turni || []; _varchi = varchi || []; _volontari = volontari || [];

    const totSlot = _varchi.length * 2; // 25 varchi × 2 = 50 slot totali

    let tHTML = '';
    _turni.forEach(t => {
      // Logica posizionale: per ogni varco, i primi 2 per id sono principali
      let principali = 0;
      let completi = 0, parziali = 0, scoperti = 0;
      _varchi.forEach(v => {
        const nelVarco = _volontari
          .filter(x => x['TURNO'] === t['Etichetta'] && x['VARCO'] == v['VARCO'])
          .sort((a, b) => a.id - b.id);
        const nPrinc = Math.min(nelVarco.length, 2);
        principali += nPrinc;
        if (nPrinc >= 2) completi++;
        else if (nPrinc === 1) parziali++;
        else scoperti++;
      });
      const p = totSlot ? Math.round(principali / totSlot * 100) : 0;

      tHTML += `
        <div style="margin-bottom:22px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;flex-wrap:wrap;gap:6px">
            <div>
              <span style="font-size:15px;font-weight:700">${t['Etichetta']}</span>
              <span style="color:var(--testo3);font-weight:400;font-size:13px;margin-left:8px">${t['NOME TURNO']||''} · ${t['FASCIA ORARIA']||''}</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <span style="font-size:12px;color:var(--testo3)">
                ✅ ${completi}&nbsp;&nbsp;🟡 ${parziali}&nbsp;&nbsp;🔴 ${scoperti}
              </span>
              <span style="font-size:13px;color:var(--testo2);font-weight:500">${principali} / ${totSlot} vol.</span>
              <span class="badge ${percBadge(p)}" style="font-size:13px;padding:4px 12px">${p}%</span>
            </div>
          </div>
          <div class="prog-wrap" style="height:10px;border-radius:8px">
            <div class="prog-fill${percClass(p)}" style="width:${p}%;height:10px;border-radius:8px;transition:width 0.4s ease"></div>
          </div>
        </div>`;
    });
    document.getElementById('dash-turni-prog').innerHTML = tHTML || '<div class="empty-state"><p>Nessun turno trovato</p></div>';

  } catch(e) { console.error(e); }
  finally { setLoading(false); }
}


async function renderSezioni() {
  setLoading(true);
  try {
    const [{ data: varchi }, { data: volontari }, { data: mezzi }, { data: mezziTurni }, { data: turni }] = await Promise.all([
      sb.from('VARCHI').select('*').order('VARCO'),
      sb.from('VOLONTARI').select('*').order('NOME_COGNOME'),
      sb.from('MEZZI').select('*').order('TARGA'),
      sb.from('MEZZI_TURNI').select('*'),
      sb.from('TURNI').select('*').order('Etichetta'),
    ]);
    _varchi = varchi || []; _volontari = volontari || []; _turni = turni || []; _mezzi = mezzi || [];

    let sezioni;
    if (CU['TIPOLOGIA'] === 'ACCESSO SEZIONALE') {
      sezioni = [CU['SEZIONE']].filter(Boolean);
    } else {
      sezioni = [...new Set((varchi||[]).map(v => v['SEZIONI']).filter(Boolean))].sort();
    }

    const container = document.getElementById('sezioni-accordion');
    if (!sezioni.length) {
      container.innerHTML = '<div class="empty-state"><div class="ei">🗂️</div><p>Nessuna sezione trovata.</p></div>';
      return;
    }

    container.innerHTML = sezioni.map(sez => {
      const volSez  = (volontari||[]).filter(v => v['SEZIONE'] === sez);
      const mezSez  = (mezzi||[]).filter(m => m['SEZIONE'] === sez);
      const totVol  = volSez.length;
      const totMez  = mezSez.length;
      const isSezOpen = CU['TIPOLOGIA'] === 'ACCESSO SEZIONALE';
      const sezId = sez.replace(/[^a-zA-Z0-9]/g,'_');

      // Lista volontari
      const volHTML = totVol ? volSez.map(v => {
        const turnoLabel = v['TURNO'] ? _turni.find(t=>t['Etichetta']===v['TURNO']) : null;
        const turnoStr = turnoLabel ? `${v['TURNO']} – ${turnoLabel['FASCIA ORARIA']||''}` : (v['TURNO']||'—');
        return `<div class="vol-list-item">
          <div>
            <div class="vli-nome">${v['NOME_COGNOME']}${v['NON_PC']?' &nbsp;<span class="badge badge-orange" title="Non è di Protezione Civile">NON PC</span>':''}</div>
            <div class="vli-meta">Turni: ${turnoStr}${v['JOLLY']?' &nbsp;<span class="badge badge-orange">EXTRA</span>':''}</div>
            <div class="vli-tel">CF: <span style="font-family:'Geist Mono',monospace;letter-spacing:0.5px">${v['CODICE_FISCALE']||'—'}</span></div>
            <div class="vli-tel">Telefono: ${v['TELEFONO']||'—'}</div>
          </div>
          <div class="vli-actions">
            <button class="btn btn-ghost btn-sm" onclick="openEditVolontario(${v.id})">✏️ Modifica</button>
            <button class="btn btn-danger btn-sm" onclick="deleteVolontario(${v.id},'${v['NOME_COGNOME'].replace(/'/g,"\'")}')">✕</button>
          </div>
        </div>`;
      }).join('') : '<div style="padding:20px;color:var(--testo3);font-size:13px">Nessun volontario registrato.</div>';

      // Lista mezzi
      const mezHTML = totMez ? mezSez.map(m => {
        const turniM = (mezziTurni||[]).filter(mt=>mt['MEZZO_ID']===m.id).map(mt=>mt['TURNO']);
        return `<div class="mezzo-list-item">
          <div>
            <div class="mli-targa">${m['TARGA']} – ${m['MARCA']||''} ${m['MODELLO']||''}</div>
            <div class="mli-desc">${m['TIPOLOGIA']||''}</div>
            <div class="mli-turni">Turni: ${turniM.length ? turniM.join(', ') : '—'}</div>
          </div>
          <div class="vli-actions">
            <button class="btn btn-ghost btn-sm" onclick="showTab('mezzi');setTimeout(()=>editMezzo(${m.id}),500)">✏️ Modifica</button>
            <button class="btn btn-danger btn-sm" onclick="deleteMezzoFromSez(${m.id},'${m['TARGA']}')">✕</button>
          </div>
        </div>`;
      }).join('') : '<div style="padding:20px;color:var(--testo3);font-size:13px">Nessun mezzo registrato.</div>';

      return `<div class="accordion-sez">
        <div class="accordion-sez-header" onclick="toggleAccordion('${sezId}')">
          <span class="accordion-arrow ${isSezOpen?'open':'closed'}" id="arrow-${sezId}">▼</span>
          <span class="accordion-sez-nome">${sez}</span>
          <span class="accordion-sez-count">${totVol} volontar${totVol===1?'io':'i'} · ${totMez} mezz${totMez===1?'o':'i'}</span>
        </div>
        <div class="accordion-sez-body ${isSezOpen?'open':''}" id="body-${sezId}">
          <div class="sez-tabs">
            <div class="sez-tab active" id="tab-vol-${sezId}" onclick="switchSezTab('${sezId}','vol')">👥 Volontari (${totVol})</div>
            <div class="sez-tab" id="tab-mez-${sezId}" onclick="switchSezTab('${sezId}','mez')">🚗 Mezzi (${totMez})</div>
          </div>
          <div id="panel-vol-${sezId}">${volHTML}</div>
          <div id="panel-mez-${sezId}" style="display:none">${mezHTML}</div>
        </div>
      </div>`;
    }).join('');

  } catch(e) { console.error(e); }
  finally { setLoading(false); }
}

function toggleAccordion(sezId) {
  const body  = document.getElementById('body-' + sezId);
  const arrow = document.getElementById('arrow-' + sezId);
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  arrow.classList.toggle('open', !isOpen);
  arrow.classList.toggle('closed', isOpen);
}

function switchSezTab(sezId, tab) {
  document.getElementById('panel-vol-' + sezId).style.display = tab === 'vol' ? '' : 'none';
  document.getElementById('panel-mez-' + sezId).style.display = tab === 'mez' ? '' : 'none';
  document.getElementById('tab-vol-' + sezId).className = 'sez-tab' + (tab==='vol'?' active':'');
  document.getElementById('tab-mez-' + sezId).className = 'sez-tab' + (tab==='mez'?' active':'');
}

async function deleteVolontario(id, nome) {
  if (!confirm(`Eliminare il volontario "${nome}"?`)) return;
  setLoading(true);
  try {
    await sb.from('VOLONTARI').delete().eq('id', id);
    await renderSezioni();
  } catch(e) { alert('Errore: ' + e.message); }
  finally { setLoading(false); }
}

async function deleteMezzoFromSez(id, targa) {
  if (!confirm(`Eliminare il mezzo "${targa}"?`)) return;
  setLoading(true);
  try {
    await sb.from('MEZZI_TURNI').delete().eq('MEZZO_ID', id);
    await sb.from('MEZZI').delete().eq('id', id);
    await renderSezioni();
  } catch(e) { alert('Errore: ' + e.message); }
  finally { setLoading(false); }
}

// ══════════════════════════════════════════════════════════════
//  GESTIONE TURNI
// ══════════════════════════════════════════════════════════════
let _turnoAttivo = null;
let _dragData = null;
let _mezziTurni = [];

async function renderGriglia() {
  setLoading(true);
  try {
    const [{ data: turni }, { data: varchi }, { data: volontari }, { data: mezziTurni }, { data: mezzi }] = await Promise.all([
      sb.from('TURNI').select('*').order('Etichetta'),
      sb.from('VARCHI').select('*').order('VARCO'),
      sb.from('VOLONTARI').select('*'),
      sb.from('MEZZI_TURNI').select('*, MEZZI(*)'),
      sb.from('MEZZI').select('*'),
    ]);
    _turni = turni || []; _varchi = varchi || [];
    _volontari = volontari || []; _mezzi = mezzi || [];
    _mezziTurni = mezziTurni || [];

    // Selettore turni
    if (!_turnoAttivo && _turni.length) _turnoAttivo = _turni[0]['Etichetta'];
    document.getElementById('turno-selector').innerHTML = _turni.map(t =>
      `<button class="turno-btn${_turnoAttivo === t['Etichetta'] ? ' active' : ''}"
        onclick="cambioTurno('${t['Etichetta']}')">
        ${t['Etichetta']}
        <span style="font-size:10px;opacity:0.75;display:block">${(t['FASCIA ORARIA']||'').replace(' - ',' –')}</span>
      </button>`
    ).join('');

    renderTurnoAttivo();
  } catch(e) { console.error(e); }
  finally { setLoading(false); }
}

function cambioTurno(et) {
  _turnoAttivo = et;
  document.querySelectorAll('.turno-btn').forEach(b => b.classList.remove('active'));
  event.currentTarget.classList.add('active');
  renderTurnoAttivo();
}

function renderTurnoAttivo() {
  const turno = _turnoAttivo;
  const volTurno   = _volontari.filter(v => v['TURNO'] === turno);
  const mezziTurno = _mezziTurni.filter(mt => mt['TURNO'] === turno);

  // Logica extra basata sulla POSIZIONE nel varco (non sul flag JOLLY nel DB):
  // i primi 2 volontari per varco = principali, dal 3° in poi = extra
  // Usiamo id di inserimento (id crescente) come ordine
  function splitVarco(varcoNum) {
    const tutti = volTurno.filter(x => x['VARCO'] == varcoNum).sort((a,b) => a.id - b.id);
    return { principali: tutti.slice(0, 2), extra: tutti.slice(2) };
  }

  let completi=0, parziali=0, scoperti=0, surplus=0, totPrinc=0, totExtra=0;
  _varchi.forEach(v => {
    const { principali, extra } = splitVarco(v['VARCO']);
    if (principali.length >= 2) completi++;
    else if (principali.length === 1) parziali++;
    else scoperti++;
    if (extra.length > 0) surplus++;
    totPrinc += principali.length;  // solo i primi 2 per varco
    totExtra += extra.length;       // dal 3° in poi
  });
  const totSlot = _varchi.length * 2;
  const pCop = totSlot ? Math.round(totPrinc / totSlot * 100) : 0;

  document.getElementById('turno-stats').innerHTML = `
    <div class="ts-card"><div class="ts-num">${_varchi.length}</div><div class="ts-label">Tot. Varchi</div></div>
    <div class="ts-card"><div class="ts-num blu">${totPrinc} / ${totSlot}</div><div class="ts-label">Slot coperti</div></div>
    <div class="ts-card"><div class="ts-num blu">${mezziTurno.length}</div><div class="ts-label">Mezzi</div></div>
    <div class="ts-card"><div class="ts-num verde">${completi}</div><div class="ts-label">Completi</div></div>
    <div class="ts-card"><div class="ts-num arancio">${parziali}</div><div class="ts-label">Parziali</div></div>
    <div class="ts-card"><div class="ts-num rosso">${scoperti}</div><div class="ts-label">Scoperti</div></div>
    <div class="ts-card"><div class="ts-num arancio">${totExtra}</div><div class="ts-label">Extra</div></div>
  `;

  const tbody = document.getElementById('varchi-tbody');
  tbody.innerHTML = _varchi.map(v => {
    const { principali, extra } = splitVarco(v['VARCO']);
    const mezzoSlot = mezziTurno.find(mt => mt['MEZZI'] && mt['MEZZI']['VARCO'] == v['VARCO']);

    let statoHtml;
    if (extra.length > 0 && principali.length >= 2)
      statoHtml = `<span class="stato-surplus">SURPLUS</span>`;
    else if (principali.length >= 2)
      statoHtml = `<span class="stato-completo">COMPLETO</span>`;
    else if (principali.length === 1)
      statoHtml = `<span class="stato-parziale">PARZIALE</span>`;
    else
      statoHtml = `<span class="stato-scoperto">SCOPERTO</span>`;

    const chipsP = principali.map(vol => `
      <div class="vol-chip-table" draggable="true" ondragstart="dragStart(event,'vol',${vol.id})">
        <div class="vc-nome">${vol['NOME_COGNOME']}</div>
        <div class="vc-sez">Sez: ${vol['SEZIONE'] || '—'}</div>
        <div class="vc-tel">${vol['TELEFONO'] || ''}</div>
        <button class="vc-remove" onclick="rimuoviVol(${vol.id})" title="Rimuovi dal varco">✕</button>
      </div>`).join('');

    const chipsE = extra.map(vol => `
      <div class="vol-chip-table extra" draggable="true" ondragstart="dragStart(event,'vol',${vol.id})">
        <div class="vc-nome">${vol['NOME_COGNOME']}</div>
        <div class="vc-sez">Sez: ${vol['SEZIONE'] || '—'}</div>
        <div class="vc-tel">${vol['TELEFONO'] || ''}</div>
        <div class="vc-badge-extra">EXTRA</div>
        <button class="vc-remove" onclick="rimuoviVol(${vol.id})" title="Rimuovi dal varco">✕</button>
      </div>`).join('');

    const slotVuoto = principali.length < 2
      ? `<div class="slot-drop-zone"
           ondragover="dragOver(event)" ondrop="dropOnVarco(event,${v['VARCO']},'${turno}')" ondragleave="dragLeave(event)"
           onclick="openAssegnaVol(${v['VARCO']},'${turno}','${(v['SEZIONI']||'').replace(/'/g,"\\'")}')">
           + Trascina volontario qui
         </div>` : '';

    const mezzoHtml = mezzoSlot
      ? `<div class="mezzo-chip" draggable="true" ondragstart="dragStart(event,'mezzo',${mezzoSlot.id})">
          <div class="mc-targa">${mezzoSlot['MEZZI']['TARGA']} – ${mezzoSlot['MEZZI']['MARCA']||''} ${mezzoSlot['MEZZI']['MODELLO']||''}</div>
          <div class="mc-tipo">${mezzoSlot['MEZZI']['TIPOLOGIA']||''}</div>
          <button class="mc-remove" onclick="rimuoviMezzo(${mezzoSlot.id})" title="Rimuovi">✕</button>
        </div>`
      : `<span class="nessun-mezzo" onclick="openAssegnaMezzo(${v['VARCO']},'${turno}','${(v['SEZIONI']||'').replace(/'/g,"\\'")}')">+ NESSUN MEZZO</span>`;

    return `<tr>
      <td class="td-varco">${v['VARCO']}</td>
      <td class="td-sezione">${v['SEZIONI'] || '—'}</td>
      <td class="td-volontari"
        ondragover="dragOver(event)"
        ondrop="dropOnVarco(event,${v['VARCO']},'${turno}')"
        ondragleave="dragLeave(event)">
        <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:flex-start">
          ${chipsP}${chipsE}${slotVuoto}
        </div>
      </td>
      <td class="td-mezzo">${mezzoHtml}</td>
      <td class="td-stato">${statoHtml}</td>
    </tr>`;
  }).join('');
}

// ── DRAG & DROP ───────────────────────────────────────────────
function dragStart(e, tipo, id) {
  _dragData = { tipo, id };
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.style.opacity = '0.5';
  setTimeout(() => { if(e.currentTarget) e.currentTarget.style.opacity = ''; }, 0);
}
function dragOver(e) {
  e.preventDefault();
  const td = e.currentTarget.closest('td');
  if (td) td.classList.add('slot-drop-target');
}
function dragLeave(e) {
  const td = e.currentTarget.closest('td');
  if (td) td.classList.remove('slot-drop-target');
}
async function dropOnVarco(e, varco, turno) {
  e.preventDefault();
  const td = e.currentTarget.closest ? e.currentTarget.closest('td') : e.currentTarget;
  if (td) td.classList.remove('slot-drop-target');
  if (!_dragData) return;
  setLoading(true);
  try {
    if (_dragData.tipo === 'vol') {
      // Conta quanti volontari ci sono già in questo varco+turno (escluso il volontario che stiamo spostando)
      const giàPresenti = _volontari.filter(v =>
        v['TURNO'] === turno && v['VARCO'] == varco && v.id !== _dragData.id
      ).length;
      // Se ci sono già 2 o più → il volontario spostato sarà EXTRA (JOLLY=true)
      // Se ce ne sono meno di 2 → sarà principale (JOLLY=false)
      const saràJolly = giàPresenti >= 2;
      await sb.from('VOLONTARI').update({
        VARCO: varco,
        TURNO: turno,
        JOLLY: saràJolly
      }).eq('id', _dragData.id);
    } else if (_dragData.tipo === 'mezzo') {
      const mt = _mezziTurni.find(m => m.id === _dragData.id);
      if (mt) await sb.from('MEZZI').update({ VARCO: varco }).eq('id', mt['MEZZO_ID']);
    }
    _dragData = null;
    await renderGriglia();
  } catch(err) { console.error(err); alert('Errore: ' + err.message); }
  finally { setLoading(false); }
}

// ── ASSEGNA VOLONTARIO ────────────────────────────────────────
async function openAssegnaVol(varco, turno, sezVarco) {
  _assCtx = { varco, turno };
  document.getElementById('modal-assegna-title').textContent = `Assegna Volontario – Varco ${varco}`;
  document.getElementById('assegna-info').innerHTML =
    `<strong>Varco:</strong> ${varco} &nbsp;·&nbsp; <strong>Turno:</strong> ${turno}<br><strong>Sezione:</strong> ${sezVarco || '—'}`;
  // Mostra volontari dello stesso turno che non hanno varco assegnato
  const disp = _volontari.filter(v => v['TURNO'] === turno && (!v['VARCO'] || v['JOLLY']));
  document.getElementById('assegna-sel').innerHTML = disp.length
    ? disp.map(v => `<option value="${v.id}">${v['NOME_COGNOME']} · ${v['SEZIONE'] || '—'}</option>`).join('')
    : '<option value="">— Nessun volontario disponibile —</option>';
  openModal('modal-assegna');
}

async function doAssegna() {
  const id = document.getElementById('assegna-sel').value;
  if (!id) { showFormAlert('assegna-alert', 'Seleziona un volontario', 'err'); return; }
  setLoading(true);
  try {
    // Conta quanti ci sono già nel varco destinazione
    const giàPresenti = _volontari.filter(v =>
      v['TURNO'] === _assCtx.turno && v['VARCO'] == _assCtx.varco && v.id !== parseInt(id)
    ).length;
    const saràJolly = giàPresenti >= 2;
    await sb.from('VOLONTARI').update({ VARCO: _assCtx.varco, JOLLY: saràJolly }).eq('id', id);
    closeModal('modal-assegna');
    await renderGriglia();
  } catch(e) { showFormAlert('assegna-alert', 'Errore: ' + e.message, 'err'); }
  finally { setLoading(false); }
}

async function rimuoviVol(id) {
  if (!confirm('Rimuovere il volontario da questo varco?')) return;
  setLoading(true);
  try {
    // Togli il varco — il volontario sparisce dalla griglia ma rimane nel DB
    await sb.from('VOLONTARI').update({ VARCO: null, JOLLY: true }).eq('id', id);
    await renderGriglia();
  } catch(e) { alert('Errore: ' + e.message); }
  finally { setLoading(false); }
}

// ── ASSEGNA MEZZO ─────────────────────────────────────────────
async function openAssegnaMezzo(varco, turno, sezVarco) {
  _assCtx = { varco, turno };
  document.getElementById('modal-assegna-mezzo-title').textContent = `Assegna Mezzo – Varco ${varco}`;
  document.getElementById('assegna-mezzo-info').innerHTML =
    `<strong>Varco:</strong> ${varco} &nbsp;·&nbsp; <strong>Turno:</strong> ${turno}<br><strong>Sezione:</strong> ${sezVarco || '—'}`;
  const occupatiIds = _mezziTurni.filter(mt => mt['TURNO'] === turno).map(mt => mt['MEZZO_ID']);
  const disp = _mezzi.filter(m => !occupatiIds.includes(m.id));
  document.getElementById('assegna-mezzo-sel').innerHTML = disp.length
    ? disp.map(m => `<option value="${m.id}">${m['TARGA']} · ${m['MARCA'] || ''} ${m['MODELLO'] || ''} · ${m['SEZIONE'] || '—'}</option>`).join('')
    : '<option value="">— Nessun mezzo disponibile —</option>';
  openModal('modal-assegna-mezzo');
}

async function doAssegnaMezzo() {
  const mezzoId = document.getElementById('assegna-mezzo-sel').value;
  if (!mezzoId) { showFormAlert('assegna-mezzo-alert', 'Seleziona un mezzo', 'err'); return; }
  setLoading(true);
  try {
    await sb.from('MEZZI').update({ VARCO: _assCtx.varco }).eq('id', parseInt(mezzoId));
    await sb.from('MEZZI_TURNI').insert({ MEZZO_ID: parseInt(mezzoId), TURNO: _assCtx.turno });
    closeModal('modal-assegna-mezzo');
    await renderGriglia();
  } catch(e) { showFormAlert('assegna-mezzo-alert', 'Errore: ' + e.message, 'err'); }
  finally { setLoading(false); }
}

async function rimuoviMezzo(mezziTurniId) {
  if (!confirm('Rimuovere il mezzo da questo turno?')) return;
  setLoading(true);
  try {
    await sb.from('MEZZI_TURNI').delete().eq('id', mezziTurniId);
    await renderGriglia();
  } catch(e) { alert('Errore: ' + e.message); }
  finally { setLoading(false); }
}

// ══════════════════════════════════════════════════════════════
//  UTENTI
// ══════════════════════════════════════════════════════════════
async function renderUtenti() {
  setLoading(true);
  try {
    const q = (document.getElementById('search-utenti')?.value || '').toLowerCase();
    const { data: list, error } = await sb.from('UTENTI').select('*').order('Nome Utente');
    if (error) throw error;
    const filtered = (list || []).filter(u =>
      !q || (u['Nome Utente']||'').toLowerCase().includes(q) || (u['SEZIONE']||'').toLowerCase().includes(q)
    );
    const tbody = document.getElementById('tbody-utenti');
    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="ei">👤</div><p>Nessun utente trovato.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = filtered.map((u, i) => `
      <tr>
        <td style="color:var(--testo3);font-size:12px">${String(i+1).padStart(2,'0')}</td>
        <td><strong>${u['Nome Utente']}</strong></td>
        <td>${u['SEZIONE'] ? `<span class="badge badge-grey">${u['SEZIONE']}</span>` : '<span style="color:var(--testo3)">—</span>'}</td>
        <td>${u['TIPOLOGIA'] === 'ACCESSO FULL' ? '<span class="tag-full">⭐ Accesso Full</span>' : '<span class="tag-sez">Sezionale</span>'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost" onclick="editUtente('${u.id}')">Modifica</button>
          ${u['Nome Utente'] !== CU['Nome Utente']
            ? `<button class="btn btn-danger" onclick="deleteUtente('${u.id}','${u['Nome Utente'].replace(/'/g,"\\'")}')">Rimuovi</button>`
            : '<span style="font-size:11px;color:var(--testo3);margin-left:8px">(attivo)</span>'}
        </td>
      </tr>`).join('');
  } catch(e) { console.error(e); }
  finally { setLoading(false); }
}

function toggleSezione() {
  const tipo = document.getElementById('utente-tipo').value;
  document.getElementById('field-sezione').style.display = tipo === 'ACCESSO FULL' ? 'none' : '';
}

function openNewUtente() {
  document.getElementById('utente-id').value = '';
  document.getElementById('utente-user').value = '';
  document.getElementById('utente-pass').value = '';
  document.getElementById('utente-tipo').value = 'ACCESSO SEZIONALE';
  document.getElementById('utente-sezione').value = '';
  document.getElementById('utente-alert').className = 'form-alert';
  document.getElementById('modal-utente-title').textContent = 'Aggiungi utente';
  toggleSezione(); openModal('modal-utente');
}

async function editUtente(id) {
  const { data: u } = await sb.from('UTENTI').select('*').eq('id', id).single();
  if (!u) return;
  document.getElementById('utente-id').value = u.id;
  document.getElementById('utente-user').value = u['Nome Utente'];
  document.getElementById('utente-pass').value = '';
  document.getElementById('utente-tipo').value = u['TIPOLOGIA'] || 'ACCESSO SEZIONALE';
  document.getElementById('utente-sezione').value = u['SEZIONE'] || '';
  document.getElementById('utente-alert').className = 'form-alert';
  document.getElementById('modal-utente-title').textContent = 'Modifica utente';
  toggleSezione(); openModal('modal-utente');
}

async function saveUtente() {
  const username = document.getElementById('utente-user').value.trim().toUpperCase();
  const pass     = document.getElementById('utente-pass').value;
  const tipo     = document.getElementById('utente-tipo').value;
  const sezione  = document.getElementById('utente-sezione').value.trim().toUpperCase() || null;
  const id       = document.getElementById('utente-id').value;
  if (!username) { showFormAlert('utente-alert','Username obbligatorio','err'); return; }
  if (!id && !pass) { showFormAlert('utente-alert','Password obbligatoria','err'); return; }
  if (tipo === 'ACCESSO SEZIONALE' && !sezione) { showFormAlert('utente-alert','Inserisci la sezione','err'); return; }
  const row = { 'Nome Utente': username, 'TIPOLOGIA': tipo, 'SEZIONE': tipo === 'ACCESSO FULL' ? null : sezione };
  if (pass) row['PASSWORD'] = pass;
  setLoading(true);
  try {
    if (id) { const { error } = await sb.from('UTENTI').update(row).eq('id', id); if (error) throw error; }
    else     { const { error } = await sb.from('UTENTI').insert(row); if (error) throw error; }
    closeModal('modal-utente'); renderUtenti();
  } catch(e) { showFormAlert('utente-alert','Errore: '+(e.message||e),'err'); }
  finally { setLoading(false); }
}

async function deleteUtente(id, username) {
  if (!confirm(`Eliminare l'utente "${username}"?`)) return;
  setLoading(true);
  try {
    const { error } = await sb.from('UTENTI').delete().eq('id', id);
    if (error) throw error;
    renderUtenti();
  } catch(e) { alert('Errore: '+e.message); }
  finally { setLoading(false); }
}

// ══════════════════════════════════════════════════════════════
//  INSERIMENTO VOLONTARI
// ══════════════════════════════════════════════════════════════

// Struttura dati form: { [etichettaTurno]: [ {nome, cf, tel, nonpc}, ... ] }
let _insData = {};

async function renderInserimento() {
  setLoading(true);
  try {
    const sezione = CU['SEZIONE'];
    document.getElementById('ins-sezione-label').textContent = 'Sezione: ' + (sezione || '—');

    const { data: turni } = await sb.from('TURNI').select('*').order('Etichetta');
    if (!turni || !turni.length) {
      document.getElementById('ins-turni-container').innerHTML = '<div class="empty-state"><div class="ei">🕐</div><p>Nessun turno trovato.</p></div>';
      return;
    }

    // Inizializza _insData se vuoto
    turni.forEach(t => {
      if (!_insData[t['Etichetta']]) _insData[t['Etichetta']] = [{ nome:'', cf:'', tel:'', nonpc:false }];
    });

    // Carica volontari già inseriti per questa sezione
    const { data: esistenti } = await sb.from('VOLONTARI').select('*').eq('SEZIONE', sezione);
    if (esistenti && esistenti.length) {
      turni.forEach(t => {
        const volTurno = esistenti.filter(v => v['TURNO'] === t['Etichetta']);
        if (volTurno.length) {
          _insData[t['Etichetta']] = volTurno.map(v => ({
            id: v.id,
            nome: v['NOME_COGNOME'] || '',
            cf:   v['CODICE_FISCALE'] || '',
            tel:  v['TELEFONO'] || '',
            nonpc: v['NON_PC'] || false
          }));
          // Assicura almeno 1 riga vuota per aggiungere
        }
      });
    }

    renderTurniForm(turni);
  } catch(e) { console.error(e); }
  finally { setLoading(false); }
}

function renderTurniForm(turni) {
  const container = document.getElementById('ins-turni-container');
  container.innerHTML = turni.map(t => {
    const et = t['Etichetta'];
    const vols = _insData[et] || [{ nome:'', cf:'', tel:'', nonpc:false }];
    return `
      <div class="turno-block">
        <div class="turno-block-header">
          <div>
            <div class="turno-block-title">${et} – ${t['NOME TURNO'] || ''}</div>
            <div class="turno-block-sub">${t['GIORNO'] || ''} · ${t['FASCIA ORARIA'] || ''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="badge ${vols.length >= 2 ? 'badge-green' : 'badge-orange'}">${vols.length} volontar${vols.length === 1 ? 'io' : 'i'}</span>
            ${vols.length > 2 ? `<span class="jolly-notice">⚡ ${vols.length - 2} jolly</span>` : ''}
          </div>
        </div>
        <div class="turno-block-body">
          <div id="vols-${et.replace(/ /g,'_')}">
            ${vols.map((v, i) => volEntryHTML(et, i, v)).join('')}
          </div>
          <button class="add-vol-btn" onclick="addVolEntry('${et}')">
            + Aggiungi volontario${vols.length >= 2 ? ' <span class="jolly-notice" style="margin-left:4px">⚡ jolly</span>' : ''}
          </button>
        </div>
      </div>`;
  }).join('');
}

function volEntryHTML(turno, idx, v) {
  const et = turno.replace(/ /g,'_');
  const isJolly = idx >= 2;
  return `
    <div class="vol-entry" id="entry-${et}-${idx}">
      <div class="vol-entry-header">
        <span class="vol-entry-num">
          Volontario ${idx + 1}
          ${isJolly ? '<span class="jolly-notice">⚡ jolly</span>' : ''}
        </span>
        ${idx > 0 ? `<button class="vol-entry-remove" onclick="removeVolEntry('${turno}',${idx})" title="Rimuovi">✕</button>` : ''}
      </div>
      <div class="vol-fields">
        <div class="field-group">
          <label>Nome e Cognome *</label>
          <input type="text" style="text-transform:uppercase"
            placeholder="Es. ROSSI MARIO"
            value="${v.nome || ''}"
            oninput="updateVol('${turno}',${idx},'nome',this.value)">
        </div>
        <div class="field-group">
          <label>Codice Fiscale</label>
          <input type="text" style="text-transform:uppercase"
            placeholder="Es. RSSMRA80A01H501Z"
            value="${v.cf || ''}"
            oninput="updateVol('${turno}',${idx},'cf',this.value)">
        </div>
        <div class="field-group">
          <label>Telefono</label>
          <input type="tel"
            placeholder="Es. 3331234567"
            value="${v.tel || ''}"
            oninput="updateVol('${turno}',${idx},'tel',this.value)">
        </div>
      </div>
      <div class="nonpc-row">
        <input type="checkbox" id="nonpc-${et}-${idx}"
          ${v.nonpc ? 'checked' : ''}
          onchange="updateVol('${turno}',${idx},'nonpc',this.checked)">
        <label for="nonpc-${et}-${idx}">Volontario NON di Protezione Civile</label>
      </div>
    </div>`;
}

function addVolEntry(turno) {
  if (!_insData[turno]) _insData[turno] = [];
  _insData[turno].push({ nome:'', cf:'', tel:'', nonpc:false });
  // Re-render solo il blocco del turno
  const et = turno.replace(/ /g,'_');
  const container = document.getElementById('vols-' + et);
  if (container) {
    const vols = _insData[turno];
    container.innerHTML = vols.map((v, i) => volEntryHTML(turno, i, v)).join('');
    // Aggiorna badge
    const badge = container.closest('.turno-block').querySelector('.turno-block-header .badge');
    if (badge) {
      badge.textContent = vols.length + ' volontar' + (vols.length === 1 ? 'io' : 'i');
      badge.className = 'badge ' + (vols.length >= 2 ? 'badge-green' : 'badge-orange');
    }
  }
}

function removeVolEntry(turno, idx) {
  if (!_insData[turno] || _insData[turno].length <= 1) return;
  _insData[turno].splice(idx, 1);
  const et = turno.replace(/ /g,'_');
  const container = document.getElementById('vols-' + et);
  if (container) container.innerHTML = _insData[turno].map((v, i) => volEntryHTML(turno, i, v)).join('');
}

function updateVol(turno, idx, field, val) {
  if (!_insData[turno]) return;
  if (_insData[turno][idx]) _insData[turno][idx][field] = val;
}

async function salvaVolontari() {
  const sezione = CU['SEZIONE'];
  if (!sezione) { showFormAlert('ins-alert', 'Account senza sezione assegnata', 'err'); return; }

  // Trova il varco della sezione
  const { data: varcoData } = await sb.from('VARCHI').select('VARCO').eq('SEZIONI', sezione).single();
  const varcoNum = varcoData ? varcoData['VARCO'] : null;

  setLoading(true);
  try {
    let totSalvati = 0;
    let totJolly = 0;

    for (const [turno, vols] of Object.entries(_insData)) {
      for (let i = 0; i < vols.length; i++) {
        const v = vols[i];
        if (!v.nome.trim()) continue; // salta righe vuote

        const isJolly = i >= 2; // dal 3° in poi è jolly
        const varcoAssegnato = isJolly ? null : varcoNum;

        const row = {
          'NOME_COGNOME':   v.nome.trim().toUpperCase(),
          'CODICE_FISCALE': v.cf.trim().toUpperCase() || null,
          'TELEFONO':       v.tel.trim() || null,
          'NON_PC':         v.nonpc || false,
          'SEZIONE':        sezione,
          'TURNO':          turno,
          'VARCO':          varcoAssegnato,
          'JOLLY':          isJolly,
        };

        if (v.id) {
          // Aggiorna esistente
          const { error } = await sb.from('VOLONTARI').update(row).eq('id', v.id);
          if (error) throw error;
        } else {
          // Inserisci nuovo
          const { data: ins, error } = await sb.from('VOLONTARI').insert(row).select().single();
          if (error) throw error;
          v.id = ins.id; // salva id per futuri update
        }

        isJolly ? totJolly++ : totSalvati++;
      }
    }

    showFormAlert('ins-alert', `✅ Salvati ${totSalvati} volontari assegnati${totJolly ? ' + ' + totJolly + ' jolly' : ''}.`, 'ok');
  } catch(e) {
    showFormAlert('ins-alert', 'Errore durante il salvataggio: ' + (e.message || e), 'err');
    console.error(e);
  } finally {
    setLoading(false);
  }
}


// ══════════════════════════════════════════════════════════════
//  INSERIMENTO MEZZI
// ══════════════════════════════════════════════════════════════
const SEZIONI_LIST = ['ACQUI TERME','ALESSANDRIA','AOSTA','ASTI','BIELLA','CASALE MONFERRATO','CEVA','CUNEO','DOMODOSSOLA','GENOVA','IMPERIA','INTRA','IVREA','LA SPEZIA','MONDOVI','NOVARA','OMEGNA','PINEROLO','SALUZZO','SAVONA','TORINO','VALSESIANA','VALSUSA','VERCELLI'];

async function renderInserimentoMezzi() {
  const sezione = CU['SEZIONE'];
  const isFull  = CU['TIPOLOGIA'] === 'ACCESSO FULL';
  document.getElementById('mezzi-sezione-label').textContent = 'Sezione: ' + (sezione || 'Tutte');

  setLoading(true);
  try {
    // Carica turni e mezzi
    const [{ data: turni }, { data: mezzi }, { data: mezziTurni }] = await Promise.all([
      sb.from('TURNI').select('*').order('Etichetta'),
      isFull
        ? sb.from('MEZZI').select('*').order('TARGA')
        : sb.from('MEZZI').select('*').eq('SEZIONE', sezione).order('TARGA'),
      sb.from('MEZZI_TURNI').select('*'),
    ]);
    _turni = turni || [];

    // Popola checkbox turni nel form
    document.getElementById('mezzo-turni-checks').innerHTML = (_turni).map(t => `
      <label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid var(--border);border-radius:var(--r);cursor:pointer;font-size:13px;font-weight:600;transition:all 0.15s;"
        onmouseover="this.style.borderColor='var(--verde)'" onmouseout="this.style.borderColor='var(--border)'">
        <input type="checkbox" value="${t['Etichetta']}" name="mezzo-turno"
          style="width:16px;height:16px;accent-color:var(--verde);cursor:pointer">
        ${t['Etichetta']} – ${t['NOME TURNO'] || t['FASCIA ORARIA'] || ''}
      </label>`).join('');

    // Popola sezioni nel form (solo full può scegliere)
    const selSez = document.getElementById('mezzo-sezione');
    if (isFull) {
      selSez.innerHTML = '<option value="">Seleziona una sezione</option>' +
        SEZIONI_LIST.map(s => `<option value="${s}">${s}</option>`).join('');
      document.getElementById('mezzo-sezione-wrap').style.display = '';
    } else {
      selSez.innerHTML = `<option value="${sezione}" selected>${sezione}</option>`;
      document.getElementById('mezzo-sezione-wrap').style.display = 'none';
    }

    // Popola tabella mezzi
    const tbody = document.getElementById('tbody-mezzi');
    if (!mezzi || !mezzi.length) {
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="ei">🚗</div><p>Nessun mezzo registrato.</p></div></td></tr>`;
      return;
    }
    tbody.innerHTML = mezzi.map(m => {
      const turniMezzo = (mezziTurni || []).filter(mt => mt['MEZZO_ID'] === m.id).map(mt => mt['TURNO']);
      return `<tr>
        <td><span class="mono" style="font-weight:700">${m['TARGA']}</span></td>
        <td>${m['MARCA'] || '—'} ${m['MODELLO'] || ''}</td>
        <td>${m['TIPOLOGIA'] ? `<span class="badge badge-blue">${m['TIPOLOGIA']}</span>` : '—'}</td>
        <td><span class="badge badge-grey">${m['SEZIONE'] || '—'}</span></td>
        <td style="font-size:12px">${turniMezzo.length ? turniMezzo.join(', ') : '<span style="color:var(--testo3)">Nessuno</span>'}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-ghost" onclick="editMezzo(${m.id})">Modifica</button>
          <button class="btn btn-danger" onclick="deleteMezzo(${m.id},'${m['TARGA']}')">Rimuovi</button>
        </td>
      </tr>`;
    }).join('');
  } catch(e) { console.error(e); }
  finally { setLoading(false); }
}

function openFormMezzo() {
  document.getElementById('mezzo-edit-id').value = '';
  document.getElementById('form-mezzo-title').textContent = 'Aggiungi nuovo mezzo';
  document.getElementById('mezzo-targa').value = '';
  document.getElementById('mezzo-marca').value = '';
  document.getElementById('mezzo-modello').value = '';
  document.getElementById('mezzo-tipologia').value = '';
  document.getElementById('mezzo-alert').className = 'form-alert';
  // Reset sezione
  if (CU['TIPOLOGIA'] !== 'ACCESSO FULL') {
    document.getElementById('mezzo-sezione').value = CU['SEZIONE'];
  } else {
    document.getElementById('mezzo-sezione').value = '';
  }
  // Reset checkboxes
  document.querySelectorAll('input[name="mezzo-turno"]').forEach(cb => cb.checked = false);
  document.getElementById('form-mezzo-wrap').style.display = '';
  document.getElementById('form-mezzo-wrap').scrollIntoView({ behavior:'smooth', block:'start' });
}

function chiudiFormMezzo() {
  document.getElementById('form-mezzo-wrap').style.display = 'none';
}

async function editMezzo(id) {
  setLoading(true);
  try {
    const [{ data: m }, { data: mt }] = await Promise.all([
      sb.from('MEZZI').select('*').eq('id', id).single(),
      sb.from('MEZZI_TURNI').select('*').eq('MEZZO_ID', id),
    ]);
    if (!m) return;
    document.getElementById('mezzo-edit-id').value = m.id;
    document.getElementById('form-mezzo-title').textContent = `Modifica mezzo – ${m['TARGA']}`;
    document.getElementById('mezzo-targa').value = m['TARGA'] || '';
    document.getElementById('mezzo-marca').value = m['MARCA'] || '';
    document.getElementById('mezzo-modello').value = m['MODELLO'] || '';
    document.getElementById('mezzo-tipologia').value = m['TIPOLOGIA'] || '';
    document.getElementById('mezzo-sezione').value = m['SEZIONE'] || '';
    document.getElementById('mezzo-alert').className = 'form-alert';
    // Setta checkboxes
    const turniMezzo = (mt || []).map(x => x['TURNO']);
    document.querySelectorAll('input[name="mezzo-turno"]').forEach(cb => {
      cb.checked = turniMezzo.includes(cb.value);
    });
    document.getElementById('form-mezzo-wrap').style.display = '';
    document.getElementById('form-mezzo-wrap').scrollIntoView({ behavior:'smooth', block:'start' });
  } catch(e) { console.error(e); }
  finally { setLoading(false); }
}

async function salvaMezzo() {
  const id       = document.getElementById('mezzo-edit-id').value;
  const targa    = document.getElementById('mezzo-targa').value.trim().toUpperCase();
  const marca    = document.getElementById('mezzo-marca').value.trim().toUpperCase();
  const modello  = document.getElementById('mezzo-modello').value.trim().toUpperCase();
  const tipologia= document.getElementById('mezzo-tipologia').value;
  const sezione  = document.getElementById('mezzo-sezione').value || CU['SEZIONE'];
  const turniSel = [...document.querySelectorAll('input[name="mezzo-turno"]:checked')].map(cb => cb.value);

  if (!targa)    { showFormAlert('mezzo-alert','Inserisci la targa','err'); return; }
  if (!marca)    { showFormAlert('mezzo-alert','Inserisci la marca','err'); return; }
  if (!modello)  { showFormAlert('mezzo-alert','Inserisci il modello','err'); return; }
  if (!tipologia){ showFormAlert('mezzo-alert','Seleziona una tipologia','err'); return; }
  if (!sezione)  { showFormAlert('mezzo-alert','Seleziona la sezione','err'); return; }
  if (!turniSel.length){ showFormAlert('mezzo-alert','Seleziona almeno un turno','err'); return; }

  // Trova varco della sezione
  const { data: varcoData } = await sb.from('VARCHI').select('VARCO').eq('SEZIONI', sezione).single();
  const varco = varcoData ? varcoData['VARCO'] : null;

  const row = { TARGA: targa, MARCA: marca, MODELLO: modello, TIPOLOGIA: tipologia, SEZIONE: sezione, VARCO: varco };

  setLoading(true);
  try {
    let mezzoId;
    if (id) {
      const { error } = await sb.from('MEZZI').update(row).eq('id', id);
      if (error) throw error;
      mezzoId = parseInt(id);
      // Aggiorna turni: elimina vecchi e reinserisci
      await sb.from('MEZZI_TURNI').delete().eq('MEZZO_ID', mezzoId);
    } else {
      const { data: ins, error } = await sb.from('MEZZI').insert(row).select().single();
      if (error) throw error;
      mezzoId = ins.id;
    }
    // Inserisci associazioni turni
    if (turniSel.length) {
      const mtRows = turniSel.map(t => ({ MEZZO_ID: mezzoId, TURNO: t }));
      const { error } = await sb.from('MEZZI_TURNI').insert(mtRows);
      if (error) throw error;
    }
    chiudiFormMezzo();
    showFormAlert('mezzo-alert','✅ Mezzo salvato con successo!','ok');
    await renderInserimentoMezzi();
  } catch(e) {
    showFormAlert('mezzo-alert','Errore: ' + (e.message || e),'err');
  } finally { setLoading(false); }
}

async function deleteMezzo(id, targa) {
  if (!confirm(`Eliminare il mezzo "${targa}"? Verranno rimosse anche le associazioni ai turni.`)) return;
  setLoading(true);
  try {
    await sb.from('MEZZI_TURNI').delete().eq('MEZZO_ID', id);
    await sb.from('MEZZI').delete().eq('id', id);
    await renderInserimentoMezzi();
  } catch(e) { alert('Errore: ' + e.message); }
  finally { setLoading(false); }
}


// ── MODIFICA VOLONTARIO (da sezioni) ──────────────────────────
async function openEditVolontario(id) {
  const { data: v } = await sb.from('VOLONTARI').select('*').eq('id', id).single();
  if (!v) return;
  document.getElementById('edit-vol-id').value = v.id;
  document.getElementById('edit-vol-nome').value = v['NOME_COGNOME'] || '';
  document.getElementById('edit-vol-cf').value   = v['CODICE_FISCALE'] || '';
  document.getElementById('edit-vol-tel').value   = v['TELEFONO'] || '';
  document.getElementById('edit-vol-sezione').value = v['SEZIONE'] || '';
  document.getElementById('edit-vol-nonpc').checked = v['NON_PC'] || false;
  document.getElementById('edit-vol-alert').className = 'form-alert';
  // Popola turni
  const sel = document.getElementById('edit-vol-turno');
  sel.innerHTML = (_turni.length ? _turni : []).map(t =>
    `<option value="${t['Etichetta']}" ${v['TURNO']===t['Etichetta']?'selected':''}>${t['Etichetta']} – ${t['FASCIA ORARIA']||''}</option>`
  ).join('');
  openModal('modal-edit-vol');
}

async function saveEditVolontario() {
  const id    = document.getElementById('edit-vol-id').value;
  const nome  = document.getElementById('edit-vol-nome').value.trim().toUpperCase();
  const cf    = document.getElementById('edit-vol-cf').value.trim().toUpperCase() || null;
  const tel   = document.getElementById('edit-vol-tel').value.trim() || null;
  const turno = document.getElementById('edit-vol-turno').value;
  const nonpc = document.getElementById('edit-vol-nonpc').checked;
  if (!nome) { showFormAlert('edit-vol-alert','Nome obbligatorio','err'); return; }
  setLoading(true);
  try {
    const { error } = await sb.from('VOLONTARI').update({
      NOME_COGNOME: nome, CODICE_FISCALE: cf, TELEFONO: tel, TURNO: turno, NON_PC: nonpc
    }).eq('id', id);
    if (error) throw error;
    closeModal('modal-edit-vol');
    await renderSezioni();
  } catch(e) { showFormAlert('edit-vol-alert','Errore: '+e.message,'err'); }
  finally { setLoading(false); }
}


// ══════════════════════════════════════════════════════════════
//  EXPORT EXCEL TURNO
// ══════════════════════════════════════════════════════════════
function scaricaExcelTurno() {
  if (!_turnoAttivo || !_varchi.length) { alert('Seleziona prima un turno'); return; }

  const turno    = _turnoAttivo;
  const turnoObj = _turni.find(t => t['Etichetta'] === turno) || {};
  const volTurno = _volontari.filter(v => v['TURNO'] === turno);
  const mezziT   = _mezziTurni.filter(mt => mt['TURNO'] === turno);

  // Intestazione riepilogo
  const rows = [];
  rows.push([`RIEPILOGO TURNO: ${turno} – ${turnoObj['NOME TURNO']||''} – ${turnoObj['FASCIA ORARIA']||''}`]);
  rows.push([`Generato il: ${new Date().toLocaleDateString('it-IT')} alle ${new Date().toLocaleTimeString('it-IT')}`]);
  rows.push([]);
  rows.push(['VARCO', 'SEZIONE', 'VOL. 1 – NOME', 'VOL. 1 – CF', 'VOL. 1 – TEL', 'VOL. 1 – PC',
             'VOL. 2 – NOME', 'VOL. 2 – CF', 'VOL. 2 – TEL', 'VOL. 2 – PC',
             'EXTRA (3°+)', 'MEZZO – TARGA', 'MEZZO – TIPO', 'STATO']);

  let completi=0, parziali=0, scoperti=0, totExtra=0;

  _varchi.forEach(v => {
    const nelVarco = volTurno
      .filter(x => x['VARCO'] == v['VARCO'])
      .sort((a, b) => a.id - b.id);

    const principali = nelVarco.slice(0, 2);
    const extra      = nelVarco.slice(2);
    const mezzo      = mezziT.find(mt => mt['MEZZI'] && mt['MEZZI']['VARCO'] == v['VARCO']);

    const nP = principali.length;
    let stato = nP >= 2 ? (extra.length > 0 ? 'SURPLUS' : 'COMPLETO') : nP === 1 ? 'PARZIALE' : 'SCOPERTO';
    if (nP >= 2) completi++; else if (nP === 1) parziali++; else scoperti++;
    totExtra += extra.length;

    const v1 = principali[0] || {};
    const v2 = principali[1] || {};
    const extraNomi = extra.map(e => e['NOME_COGNOME']).join(', ') || '—';

    rows.push([
      v['VARCO'],
      v['SEZIONI'] || '—',
      v1['NOME_COGNOME'] || '—',
      v1['CODICE_FISCALE'] || '—',
      v1['TELEFONO'] || '—',
      v1['NON_PC'] ? 'NON PC' : (v1['NOME_COGNOME'] ? 'PC' : '—'),
      v2['NOME_COGNOME'] || '—',
      v2['CODICE_FISCALE'] || '—',
      v2['TELEFONO'] || '—',
      v2['NON_PC'] ? 'NON PC' : (v2['NOME_COGNOME'] ? 'PC' : '—'),
      extraNomi,
      mezzo ? mezzo['MEZZI']['TARGA'] : '—',
      mezzo ? (mezzo['MEZZI']['TIPOLOGIA'] || '—') : '—',
      stato
    ]);
  });

  // Riga totali
  rows.push([]);
  rows.push(['RIEPILOGO', '', `Slot coperti: ${Math.min(completi*2+parziali, _varchi.length*2)} / ${_varchi.length*2}`,
             '', '', '', '', '', '', '', `Extra: ${totExtra}`, '',
             '', `Completi: ${completi} | Parziali: ${parziali} | Scoperti: ${scoperti}`]);

  // Crea workbook
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Larghezze colonne
  ws['!cols'] = [
    {wch:8},{wch:18},{wch:24},{wch:18},{wch:14},{wch:8},
    {wch:24},{wch:18},{wch:14},{wch:8},
    {wch:30},{wch:14},{wch:14},{wch:12}
  ];

  // Merge cella titolo
  ws['!merges'] = [
    { s:{r:0,c:0}, e:{r:0,c:13} },
    { s:{r:1,c:0}, e:{r:1,c:13} },
  ];

  XLSX.utils.book_append_sheet(wb, ws, turno);
  XLSX.writeFile(wb, `Riepilogo_${turno}_${turnoObj['NOME TURNO']||''}.xlsx`.replace(/\s+/g,'_'));
}




// ══════════════════════════════════════════════════════════════
//  DRAWER MOBILE
// ══════════════════════════════════════════════════════════════
let _drawerOpen = false;

function toggleDrawer() {
  _drawerOpen = !_drawerOpen;
  document.getElementById('drawer').classList.toggle('open', _drawerOpen);
  document.getElementById('drawer-overlay').style.display = _drawerOpen ? 'block' : 'none';
  setTimeout(() => {
    document.getElementById('drawer-overlay').classList.toggle('open', _drawerOpen);
  }, 10);
}

function closeDrawer() {
  _drawerOpen = false;
  document.getElementById('drawer').classList.remove('open');
  document.getElementById('drawer-overlay').classList.remove('open');
  setTimeout(() => {
    document.getElementById('drawer-overlay').style.display = 'none';
  }, 250);
}

function aggiornaDrawer() {
  if (!CU) return;

  // Header
  document.getElementById('drawer-username').textContent = CU['Nome Utente'] || '—';
  document.getElementById('drawer-userrole').textContent = CU['TIPOLOGIA'] || '—';

  // GIF avatar nel drawer
  const gifEl = document.getElementById('drawer-gif');
  const gifSrc = document.querySelector('.topbar-gif img')?.src;
  if (gifSrc) gifEl.innerHTML = `<img src="${gifSrc}" style="width:44px;height:44px;border-radius:50%;border:2px solid rgba(255,255,255,0.4)">`;

  // Tab di navigazione (stesse del navbar)
  const navEl = document.getElementById('drawer-nav');
  const tabs = document.querySelectorAll('.nav-tab');
  navEl.innerHTML = '';
  const icons = {'Dashboard':'📊','Volontari per Sezione':'👥','Gestione Turni':'📅','Inserimento Volontari':'➕','Inserimento Mezzi':'🚗','I miei Volontari':'👤','Utility':'🔧'};
  tabs.forEach(tab => {
    const label = tab.textContent.trim();
    const btn = document.createElement('button');
    btn.className = 'drawer-tab' + (tab.classList.contains('active') ? ' active' : '');
    btn.innerHTML = `<span style="font-size:18px">${icons[label]||'•'}</span> ${label}`;
    btn.onclick = () => {
      tab.click();
      closeDrawer();
    };
    navEl.appendChild(btn);
  });
}

// Aggiorna drawer quando cambia tab
function aggiornaDrawerTab() {
  document.querySelectorAll('.drawer-tab').forEach((btn, i) => {
    const tabs = document.querySelectorAll('.nav-tab');
    if (tabs[i]) btn.classList.toggle('active', tabs[i].classList.contains('active'));
  });
}

// ══════════════════════════════════════════════════════════════
//  AI CHAT
// ══════════════════════════════════════════════════════════════
let _aiOpen = false;
let _aiHistory = [];
let _aiThinking = false;

function toggleAiChat() {
  _aiOpen = !_aiOpen;
  const panel = document.getElementById('ai-panel');
  const fab   = document.getElementById('ai-fab');
  panel.style.display = _aiOpen ? 'flex' : 'none';
  fab.classList.toggle('pulse', !_aiOpen);
  if (_aiOpen) {
    document.getElementById('ai-input').focus();
    // Carica dati freschi per il contesto
    _aiRefreshContext();
  }
}

function aiSuggest(testo) {
  document.getElementById('ai-input').value = testo;
  aiSend();
}

function aiKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiSend(); }
}

async function _aiRefreshContext() {
  // Ricarica dati aggiornati dal DB per il contesto
  try {
    const [{ data: volontari }, { data: varchi }, { data: turni }, { data: mezzi }, { data: mezziTurni }] = await Promise.all([
      sb.from('VOLONTARI').select('*'),
      sb.from('VARCHI').select('*').order('VARCO'),
      sb.from('TURNI').select('*').order('Etichetta'),
      sb.from('MEZZI').select('*'),
      sb.from('MEZZI_TURNI').select('*, MEZZI(*)'),
    ]);
    _volontari   = volontari   || [];
    _varchi      = varchi      || [];
    _turni       = turni       || [];
    _mezzi       = mezzi       || [];
    _mezziTurni  = mezziTurni  || [];
  } catch(e) { console.error('AI context refresh error:', e); }
}

function _buildAiContext() {
  // Costruisce un riepilogo dati da passare all'AI come contesto
  const riepTurni = _turni.map(t => {
    let completi=0, parziali=0, scoperti=0, extra=0;
    _varchi.forEach(v => {
      const nelVarco = _volontari
        .filter(x => x['TURNO'] === t['Etichetta'] && x['VARCO'] == v['VARCO'])
        .sort((a,b) => a.id - b.id);
      const princ = nelVarco.slice(0,2).length;
      if (princ >= 2) completi++; else if (princ === 1) parziali++; else scoperti++;
      extra += nelVarco.slice(2).length;
    });
    const volTot = _volontari.filter(v => v['TURNO'] === t['Etichetta']).length;
    return `  - ${t['Etichetta']} (${t['NOME TURNO']||''} ${t['FASCIA ORARIA']||''}): ${volTot} volontari totali, varchi completi=${completi} parziali=${parziali} scoperti=${scoperti} extra=${extra}`;
  }).join('\n');

  const sezioniMap = {};
  _volontari.forEach(v => {
    if (!sezioniMap[v['SEZIONE']]) sezioniMap[v['SEZIONE']] = 0;
    sezioniMap[v['SEZIONE']]++;
  });
  const sezioniStr = Object.entries(sezioniMap).sort((a,b)=>b[1]-a[1])
    .map(([s,n]) => `${s}:${n}`).join(', ');

  const varchiStr = _varchi.map(v => {
    const sezioneVarco = v['SEZIONI'] || '—';
    return `Varco ${v['VARCO']}=${sezioneVarco}`;
  }).join(', ');

  // NON_PC
  const nonPcTot = _volontari.filter(v => v['NON_PC'] === true).length;
  const nonPcPerSez = {};
  _volontari.filter(v => v['NON_PC'] === true).forEach(v => {
    nonPcPerSez[v['SEZIONE']] = (nonPcPerSez[v['SEZIONE']]||0)+1;
  });
  const nonPcStr = Object.entries(nonPcPerSez).map(([s,n])=>`${s}:${n}`).join(', ');

  // Jolly e senza varco
  const jollyTot = _volontari.filter(v => v['JOLLY'] === true).length;
  const senzaVarco = _volontari.filter(v => !v['VARCO']).length;

  // Lista completa volontari
  const volList = _volontari.map(v =>
    `${v.id}|${v['NOME_COGNOME']}|sez:${v['SEZIONE']}|turno:${v['TURNO']||'—'}|varco:${v['VARCO']||'—'}|CF:${v['CODICE_FISCALE']||'—'}|tel:${v['TELEFONO']||'—'}|nonPC:${v['NON_PC']?'SI':'no'}|jolly:${v['JOLLY']?'SI':'no'}`
  ).join('\n');

  // Lista completa mezzi
  const mezziList = (_mezzi||[]).map(m =>
    `${m.id}|${m['TARGA']}|${m['MARCA']||''} ${m['MODELLO']||''}|${m['TIPOLOGIA']||''}|sez:${m['SEZIONE']}|varco:${m['VARCO']||'—'}`
  ).join('\n');

  return `
Sei Beppe, l'assistente AI genovese del portale di gestione volontari per la 97ª Adunata Nazionale Alpini - Genova 2026.
Parli italiano corretto con qualche intercalare genovese sparso: "figeu", "ma và!", "belin" (con parsimonia), "che roba!", "ninte de ninte", "magari!", "dai su".
NON usare mai "caro" per aprire le frasi. Usa invece aperture varie e simpatiche tipo: "Belin certo!", "Ma và, subito!", "Figeu, te lo dico subito:", "Dai su,", "Ecco qua:", "Guarda un po':", oppure inizia direttamente con la risposta senza intercalare.
NON parlare in dialetto — solo qualche parola sparsa. Sii diretto, simpatico, un po' burbero ma amichevole come un vero genovese.
Hai accesso COMPLETO a tutti i dati del database in tempo reale. I dati ti vengono forniti nel contesto qui sotto — usali SEMPRE per rispondere con precisione.
In particolare:
- _volontari contiene TUTTI i volontari con tutti i campi: NOME_COGNOME, CODICE_FISCALE, TELEFONO, TURNO, SEZIONE, VARCO, JOLLY, NON_PC
- NON_PC=true significa che il volontario NON è di Protezione Civile
- JOLLY=true significa che è un volontario extra
- _varchi contiene i 24 varchi con le sezioni assegnate
- _turni contiene gli 8 turni
- _mezzi contiene i mezzi
Quando ti fanno domande sui dati, analizza i dati forniti nel contesto e rispondi con numeri precisi. Non dire mai che non riesci ad accedere ai dati.

=== DATI ATTUALI ===
Totale volontari nel DB: ${_volontari.length}
Totale varchi: ${_varchi.length} (slot totali per turno: ${_varchi.length * 2})
Totale turni: ${_turni.length}
Totale mezzi: ${_mezzi.length}

Varchi e sezioni assegnate:
${varchiStr}

Volontari per sezione:
${sezioniStr}

Copertura per turno:
${riepTurni}

Volontari NON di Protezione Civile: ${nonPcTot} totali (per sezione: ${nonPcStr})
Volontari extra/jolly: ${jollyTot}
Volontari senza varco assegnato: ${senzaVarco}

Lista COMPLETA volontari (id|nome|sezione|turno|varco|CF|tel|nonPC|jolly):
${volList}

Lista COMPLETA mezzi (id|targa|marca modello|tipologia|sezione|varco):
${mezziList}

=== ISTRUZIONI ===
- Rispondi SEMPRE in italiano
- Quando ti viene chiesto di modificare dati, descrivi cosa farai e chiedi conferma PRIMA di eseguire
- Per modifiche usa le funzioni disponibili: sb.from('VOLONTARI').update({...}).eq('id', X) ecc.
- Se devi eseguire una modifica confermata, rispondi con un blocco JSON speciale:
  {"action":"supabase","table":"VOLONTARI","op":"update","data":{...},"where":{"id":X}}
- Sii conciso e diretto nelle risposte
- Usa emoji per rendere le risposte più leggibili
`.trim();
}

async function aiSend() {
  const input = document.getElementById('ai-input');
  const testo = input.value.trim();
  if (!testo || _aiThinking) return;

  input.value = '';
  input.style.height = '38px';

  // Nascondi suggerimenti dopo primo messaggio
  document.getElementById('ai-suggestions').style.display = 'none';

  // Aggiungi messaggio utente
  aiAddMessage('user', testo);
  _aiHistory.push({ role: 'user', content: testo });

  // Mostra "sta scrivendo..."
  _aiThinking = true;
  document.getElementById('ai-send').disabled = true;
  const thinkingEl = aiAddMessage('thinking', '⏳ Sto analizzando i dati...');

  try {
    const systemPrompt = _buildAiContext();

    // Usa il proxy Vercel per non esporre la API key
    const PROXY_URL = 'https://beppe-proxy.vercel.app/api/chat';
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system: systemPrompt,
        messages: _aiHistory
      })
    });

    const data = await response.json();
    thinkingEl.remove();

    const risposta = data.content?.[0]?.text || 'Errore nella risposta.';
    _aiHistory.push({ role: 'assistant', content: risposta });

    // Controlla se c'è un'azione da eseguire
    const actionMatch = risposta.match(/\{"action":"supabase"[^}]+\}/);
    if (actionMatch) {
      try {
        const action = JSON.parse(actionMatch[0]);
        await _aiEseguiAzione(action);
        const testoRisposta = risposta.replace(actionMatch[0], '').trim();
        aiAddMessage('assistant', testoRisposta || '✅ Modifica eseguita!');
        await _aiRefreshContext();
      } catch(e) {
        aiAddMessage('assistant', risposta);
      }
    } else {
      aiAddMessage('assistant', risposta);
    }

  } catch(e) {
    thinkingEl.remove();
    aiAddMessage('assistant', '❌ Errore di connessione. Riprova.');
    console.error(e);
  } finally {
    _aiThinking = false;
    document.getElementById('ai-send').disabled = false;
    document.getElementById('ai-input').focus();
  }
}

async function _aiEseguiAzione(action) {
  if (action.op === 'update') {
    const { error } = await sb.from(action.table).update(action.data).eq(Object.keys(action.where)[0], Object.values(action.where)[0]);
    if (error) throw error;
  } else if (action.op === 'delete') {
    const { error } = await sb.from(action.table).delete().eq(Object.keys(action.where)[0], Object.values(action.where)[0]);
    if (error) throw error;
  }
  // Aggiorna UI se serve
  if (action.table === 'VOLONTARI') {
    _volontari = (await sb.from('VOLONTARI').select('*')).data || [];
  }
}

function aiAddMessage(tipo, testo) {
  const msgs = document.getElementById('ai-messages');
  const div  = document.createElement('div');
  div.className = `ai-msg ${tipo}`;
  // Formatta il testo (bold, newline)
  div.innerHTML = testo
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g,'<br>');
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

// ══════════════════════════════════════════════════════════════
//  IMPORT/EXPORT EXCEL VOLONTARI
// ══════════════════════════════════════════════════════════════

function scaricaTemplateExcel() {
  const turni = _turni.length ? _turni : [];
  const nomeTurni = turni.map(t => t['Etichetta']).join(', ') || 'TURNO1,TURNO2,...';

  // Intestazione colonne
  const headers = ['NOME_COGNOME *', 'CODICE_FISCALE', 'TELEFONO', 'TURNO *', 'NON_PC (SI/NO)'];
  const istruzioni = [
    ['ISTRUZIONI - NON CANCELLARE QUESTA RIGA'],
    ['- NOME_COGNOME: obbligatorio, nome e cognome del volontario'],
    ['- CODICE_FISCALE: facoltativo'],
    ['- TELEFONO: facoltativo'],
    [`- TURNO: obbligatorio, inserire uno di questi valori: ${nomeTurni}`],
    ['- NON_PC: inserire SI se il volontario NON è di Protezione Civile, altrimenti NO o lasciare vuoto'],
    [],
    headers
  ];

  // Righe esempio
  const esempi = [
    ['MARIO ROSSI', 'RSSMRA80A01H501Z', '3331234567', turni[0]?.['Etichetta'] || 'TURNO1', 'NO'],
    ['ANNA BIANCHI', '', '3339876543', turni[1]?.['Etichetta'] || 'TURNO2', 'SI'],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([...istruzioni, ...esempi]);

  // Larghezze colonne
  ws['!cols'] = [{wch:30},{wch:20},{wch:16},{wch:12},{wch:16}];

  XLSX.utils.book_append_sheet(wb, ws, 'Volontari');
  XLSX.writeFile(wb, 'Template_Volontari.xlsx');
}

async function importaExcel(input) {
  const file = input.files[0];
  if (!file) return;

  const alertEl = document.getElementById('import-alert');
  alertEl.className = 'form-alert';
  alertEl.textContent = 'Lettura file in corso...';
  alertEl.style.display = 'block';

  try {
    const data = await file.arrayBuffer();
    const wb   = XLSX.read(data, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    // Trova le righe dati (salta istruzioni, cerca header NOME_COGNOME)
    let startRow = 0;
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    for (let i = 0; i < raw.length; i++) {
      if (raw[i].some(cell => String(cell).includes('NOME_COGNOME'))) {
        startRow = i + 1;
        break;
      }
    }
    const dataRows = raw.slice(startRow).filter(r => r[0] && String(r[0]).trim());

    if (!dataRows.length) {
      showFormAlert('import-alert', 'Nessun dato trovato nel file. Controlla il formato.', 'err');
      return;
    }

    // Recupera varco della sezione
    const sezione = CU['SEZIONE'];
    const varcoSezione = _varchi.find(v => v['SEZIONI'] === sezione);
    if (!varcoSezione) {
      showFormAlert('import-alert', 'Sezione non trovata nei varchi.', 'err');
      return;
    }

    // Conta quanti volontari ci sono già per ogni turno in questa sezione
    const contatoriTurno = {};
    _turni.forEach(t => {
      contatoriTurno[t['Etichetta']] = _volontari.filter(v =>
        v['SEZIONE'] === sezione && v['TURNO'] === t['Etichetta']
      ).length;
    });

    // Prepara inserimenti
    let inseriti = 0, errori = 0;
    const records = [];

    for (const row of dataRows) {
      const nome  = String(row[0] || '').trim();
      const cf    = String(row[1] || '').trim().toUpperCase() || null;
      const tel   = String(row[2] || '').trim() || null;
      const turno = String(row[3] || '').trim().toUpperCase();
      const nonpc = String(row[4] || '').trim().toUpperCase() === 'SI';

      if (!nome || !turno) { errori++; continue; }

      // Verifica turno valido
      const turnoValido = _turni.find(t => t['Etichetta'].toUpperCase() === turno);
      if (!turnoValido) { errori++; continue; }

      // Determina se jolly (extra) in base alla posizione
      const posizione = (contatoriTurno[turnoValido['Etichetta']] || 0);
      const isJolly   = posizione >= 2;
      contatoriTurno[turnoValido['Etichetta']] = posizione + 1;

      records.push({
        NOME_COGNOME:    nome,
        CODICE_FISCALE:  cf,
        TELEFONO:        tel,
        TURNO:           turnoValido['Etichetta'],
        SEZIONE:         sezione,
        VARCO:           varcoSezione['VARCO'],
        JOLLY:           isJolly,
        NON_PC:          nonpc,
      });
    }

    if (!records.length) {
      showFormAlert('import-alert', `Nessun record valido. Righe con errori: ${errori}`, 'err');
      return;
    }

    // Inserisci a blocchi
    setLoading(true);
    const CHUNK = 50;
    for (let i = 0; i < records.length; i += CHUNK) {
      const { error } = await sb.from('VOLONTARI').insert(records.slice(i, i + CHUNK));
      if (error) throw error;
      inseriti += Math.min(CHUNK, records.length - i);
    }

    input.value = ''; // reset input file
    showFormAlert('import-alert',
      `✅ Importati ${inseriti} volontari${errori ? ` (${errori} righe ignorate per dati mancanti)` : ''}!`,
      'ok');
    await renderInserimento();

  } catch(e) {
    console.error(e);
    showFormAlert('import-alert', "Errore durante l'importazione: " + e.message, 'err');
  } finally {
    setLoading(false);
  }
}

// ══════════════════════════════════════════════════════════════
//  UTILITY
// ══════════════════════════════════════════════════════════════
let _guidaEditOpen = false;

async function renderUtility() {
  setLoading(true);
  const isFull = CU['TIPOLOGIA'] === 'ACCESSO FULL';
  try {
    const { data: guida } = await sb.from('GUIDA').select('*').limit(1).single();
    const testo = guida ? (guida['TESTO'] || '') : '';
    document.getElementById('guida-view').textContent = testo;
    document.getElementById('guida-textarea').value = testo;
    document.getElementById('guida-edit-btn').style.display = isFull ? '' : 'none';

    const { data: varchi } = await sb.from('VARCHI').select('SEZIONI').order('SEZIONI');
    const sezioni = [...new Set((varchi||[]).map(v => v['SEZIONI']).filter(Boolean))].sort();
    const selSez = document.getElementById('segn-sezione');
    if (!isFull && CU['SEZIONE']) {
      selSez.innerHTML = `<option value="${CU['SEZIONE']}" selected>${CU['SEZIONE']}</option>`;
      selSez.disabled = true;
    } else {
      selSez.disabled = false;
      selSez.innerHTML = '<option value="">Seleziona una sezione</option>' +
        sezioni.map(s => `<option value="${s}">${s}</option>`).join('');
    }
    document.getElementById('segn-sezioni-count').textContent = sezioni.length + ' sezioni caricate';

    if (isFull) {
      document.getElementById('segn-lista-wrap').style.display = '';
      const { data: segn } = await sb.from('SEGNALAZIONI').select('*').order('created_at', { ascending: false });
      const tbody = document.getElementById('segn-tbody');
      if (!segn || !segn.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--testo3);padding:20px">Nessuna segnalazione ricevuta</td></tr>';
      } else {
        tbody.innerHTML = segn.map(s => {
          const data = new Date(s.created_at).toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
          const statoClass = s['STATO']==='RISOLTA' ? 'badge-green' : s['STATO']==='IN LAVORAZIONE' ? 'badge-orange' : 'badge-grey';
          return `<tr>
            <td style="font-size:12px;white-space:nowrap">${data}</td>
            <td><span class="badge badge-grey">${s['SEZIONE']||'—'}</span></td>
            <td style="font-size:13px;max-width:400px">${s['DESCRIZIONE']||''}</td>
            <td><span class="badge ${statoClass}">${s['STATO']||'APERTA'}</span></td>
            <td><select onchange="cambiaStatoSegn(${s.id},this.value)" style="font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:4px">
              <option ${s['STATO']==='APERTA'?'selected':''}>APERTA</option>
              <option ${s['STATO']==='IN LAVORAZIONE'?'selected':''}>IN LAVORAZIONE</option>
              <option ${s['STATO']==='RISOLTA'?'selected':''}>RISOLTA</option>
            </select></td>
          </tr>`;
        }).join('');
      }
    } else {
      document.getElementById('segn-lista-wrap').style.display = 'none';
    }
  } catch(e) { console.error(e); }
  finally { setLoading(false); }
}

function toggleGuidaEdit() {
  _guidaEditOpen = !_guidaEditOpen;
  document.getElementById('guida-view').style.display = _guidaEditOpen ? 'none' : '';
  document.getElementById('guida-edit-wrap').style.display = _guidaEditOpen ? '' : 'none';
  document.getElementById('guida-edit-btn').textContent = _guidaEditOpen ? '✕ Chiudi' : '✏️ Modifica';
}

async function salvaGuida() {
  const testo = document.getElementById('guida-textarea').value.trim();
  if (!testo) { showFormAlert('guida-alert','Il testo non può essere vuoto','err'); return; }
  setLoading(true);
  try {
    const { data: existing } = await sb.from('GUIDA').select('id').limit(1).single();
    if (existing) {
      await sb.from('GUIDA').update({ TESTO: testo, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await sb.from('GUIDA').insert({ TESTO: testo });
    }
    document.getElementById('guida-view').textContent = testo;
    showFormAlert('guida-alert','✅ Guida salvata!','ok');
    setTimeout(() => toggleGuidaEdit(), 1000);
  } catch(e) { showFormAlert('guida-alert','Errore: '+e.message,'err'); }
  finally { setLoading(false); }
}

async function inviaSegnalazione() {
  const sezione = document.getElementById('segn-sezione').value || CU['SEZIONE'];
  const descr   = document.getElementById('segn-descrizione').value.trim();
  if (!sezione) { showFormAlert('segn-alert','Seleziona la sezione','err'); return; }
  if (!descr)   { showFormAlert('segn-alert','Descrivi il problema','err'); return; }
  setLoading(true);
  try {
    await sb.from('SEGNALAZIONI').insert({ SEZIONE: sezione, DESCRIZIONE: descr, STATO: 'APERTA' });
    document.getElementById('segn-descrizione').value = '';
    showFormAlert('segn-alert','✅ Segnalazione inviata! Grazie.','ok');
  } catch(e) { showFormAlert('segn-alert','Errore: '+e.message,'err'); }
  finally { setLoading(false); }
}

async function cambiaStatoSegn(id, stato) {
  try { await sb.from('SEGNALAZIONI').update({ STATO: stato }).eq('id', id); }
  catch(e) { alert('Errore: ' + e.message); }
}

