
// ── SUPABASE ──────────────────────────────────────────────────
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
  const isRO   = CU['TIPOLOGIA'] === 'ACCESSO SEZIONALE_RO';
  const navbar = document.getElementById('navbar-full');

  const tabsFull = [
    { id:'dashboard',   label:'Dashboard' },
    { id:'sezioni',     label:'Volontari per Sezione' },
    { id:'griglia',     label:'Gestione Turni' },
    { id:'varchi',      label:'Varchi' },
    { id:'inserimento', label:'Inserimento Volontari' },
    { id:'mezzi',       label:'Inserimento Mezzi' },
    { id:'utility',     label:'Utility' },
  ];

  const tabsSez = [
    { id:'griglia',     label:'Gestione Turni' },
    { id:'varchi',      label:'Varchi' },
    { id:'inserimento', label:'Inserimento Volontari' },
    { id:'mezzi',       label:'Inserimento Mezzi' },
    { id:'sezioni',     label:'I miei Volontari' },
    { id:'utility',     label:'Utility' },
  ];

  const tabsRO = [
    { id:'griglia',     label:'Gestione Turni' },
    { id:'varchi',      label:'Varchi' },
    { id:'sezioni',     label:'I miei Volontari' },
  ];

  const tabs = isFull ? tabsFull : isRO ? tabsRO : tabsSez;
  navbar.innerHTML = tabs.map(t =>
    `<button class="nav-tab" data-tab="${t.id}" onclick="showTab('${t.id}')">${t.label}</button>`
  ).join('') +
  (isFull ? `<a class="nav-tab" href="https://www.google.com/maps/d/u/2/viewer?mid=1c3OipIcYOssM6SuIB_CPsdXv1UbbD_Q&ll=44.41981083520628%2C8.806570201136402&z=13" target="_blank" rel="noopener noreferrer">🗺️ Mappa</a>` : '');
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
    document.getElementById('app').style.display = 'block';
    document.getElementById('topbar-name').textContent = data['Nome Utente'];
    document.getElementById('topbar-role').textContent = data['TIPOLOGIA'] === 'ACCESSO FULL' ? 'Accesso completo' : data['TIPOLOGIA'] === 'ACCESSO SEZIONALE_RO' ? 'Solo lettura · Sezione: ' + (data['SEZIONE'] || '—') : 'Sezione: ' + (data['SEZIONE'] || '—');
    buildNavbar();
    aggiornaDrawer();
    // Mostra AI FAB solo per ACCESSO FULL
    if (CU['TIPOLOGIA'] === 'ACCESSO FULL') {
      document.getElementById('ai-fab').style.display = 'flex';
      document.getElementById('ai-fab').classList.add('pulse');
    }
    showTab(CU['TIPOLOGIA'] === 'ACCESSO FULL' ? 'dashboard' : CU['TIPOLOGIA'] === 'ACCESSO SEZIONALE_RO' ? 'griglia' : 'inserimento');
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
  aggiornaDrawerTab();
  const renders = { dashboard: renderDashboard, sezioni: renderSezioni, griglia: renderGriglia, varchi: renderVarchi, inserimento: renderInserimento, mezzi: renderInserimentoMezzi, utility: renderUtility };
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
// ── RICERCA RAPIDA VOLONTARI (ACCESSO FULL) ───────────────────
let _searchTimer = null;

function ricercaVolontari(q) {
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => _eseguiRicercaVol(q), 280);
}

function _eseguiRicercaVol(q) {
  const el = document.getElementById('dash-search-results');
  q = (q || '').trim();
  if (q.length < 2) { el.innerHTML = ''; return; }

  const qq = q.toLowerCase();
  const risultati = _volontari.filter(v =>
    (v['NOME_COGNOME']  || '').toLowerCase().includes(qq) ||
    (v['CODICE_FISCALE']|| '').toLowerCase().includes(qq) ||
    (v['TELEFONO']      || '').toLowerCase().includes(qq)
  ).slice(0, 25);

  if (!risultati.length) {
    el.innerHTML = '<div class="empty-state" style="padding:20px 0"><div class="ei">🔍</div><p>Nessun volontario trovato</p></div>';
    return;
  }

  el.innerHTML = '<div style="margin-top:10px">' + risultati.map(v => {
    const turnoObj  = _turni.find(t => t['Etichetta'] === v['TURNO']);
    const turnoTxt  = turnoObj ? (turnoObj['NOME TURNO'] || v['TURNO']) : (v['TURNO'] || '—');
    const varcoTxt  = v['VARCO'] ? `Varco ${v['VARCO']}` : 'Nessun varco';
    const jollyBadge = v['JOLLY'] ? '<span class="badge badge-orange" style="font-size:11px">JOLLY</span>' : '';
    const sezBadge   = v['SEZIONE'] ? `<span class="tag-sez">${v['SEZIONE']}</span>` : '';
    return `
      <div class="search-result-item">
        <div style="min-width:0">
          <div class="sri-nome">${v['NOME_COGNOME'] || '—'}</div>
          <div class="sri-meta">${turnoTxt} &nbsp;·&nbsp; ${varcoTxt}</div>
          ${v['TELEFONO'] ? `<div class="sri-tel"><a href="tel:${v['TELEFONO'].replace(/\s/g,'')}" style="color:inherit;text-decoration:none">${v['TELEFONO']}</a></div>` : ''}
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">${sezBadge}${jollyBadge}</div>
      </div>`;
  }).join('') + '</div>';
}

async function renderDashboard() {
  setLoading(true);
  try {
    const [{ data: turni }, { data: varchi }, { data: volontari }] = await Promise.all([
      sb.from('TURNI').select('*').order('Etichetta'),
      sb.from('VARCHI').select('*').order('VARCO'),
      sb.from('VOLONTARI').select('*'),
    ]);
    _turni = turni || []; _varchi = varchi || []; _volontari = volontari || [];

    // Mostra il pannello di ricerca solo per ACCESSO FULL
    const sp = document.getElementById('dash-search-panel');
    if (sp) sp.style.display = CU?.TIPOLOGIA === 'ACCESSO FULL' ? '' : 'none';

    let tHTML = '';
    _turni.forEach(t => {
      // Turni notturni (TURNO 1, TURNO 5): 1 slot per varco invece di 2
      const isNotturno = /[15]$/.test((t['Etichetta'] || '').trim());
      const slotsPerVarco = isNotturno ? 1 : 2;
      const totSlot = _varchi.length * slotsPerVarco;

      // Logica posizionale: per ogni varco, i primi 2 per id sono principali
      let principali = 0;
      let completi = 0, parziali = 0, scoperti = 0;
      _varchi.forEach(v => {
        const nelVarco = _volontari
          .filter(x => x['TURNO'] === t['Etichetta'] && x['VARCO'] == v['VARCO'])
          .sort((a, b) => a.id - b.id);
        const hasSec = !!v['SECURITY'];
        if (isNotturno) {
          const haCop = nelVarco.length >= 1 || hasSec;
          if (haCop) { completi++; principali++; }
          else scoperti++;
        } else {
          const nPrinc = Math.min(nelVarco.length, 2);
          principali += nPrinc + (hasSec ? 1 : 0);
          if (nPrinc >= 2) completi++;
          else if (nPrinc === 1) parziali++;
          else scoperti++;
        }
      });
      const p = totSlot ? Math.round(principali / totSlot * 100) : 0;

      tHTML += `
        <div style="margin-bottom:22px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;flex-wrap:wrap;gap:6px">
            <div>
              <span style="font-size:15px;font-weight:700">${t['NOME TURNO'] || t['Etichetta']}</span>
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
    const isFull = CU['TIPOLOGIA'] === 'ACCESSO FULL';
    const miaSezSezioni = CU['SEZIONE'];
    const [{ data: varchi }, { data: volontari }, { data: mezzi }, { data: mezziTurni }, { data: turni }] = await Promise.all([
      sb.from('VARCHI').select('*').order('VARCO'),
      isFull
        ? sb.from('VOLONTARI').select('*').order('NOME_COGNOME')
        : sb.from('VOLONTARI').select('*').eq('SEZIONE', miaSezSezioni).order('NOME_COGNOME'),
      isFull
        ? sb.from('MEZZI').select('*').order('TARGA')
        : sb.from('MEZZI').select('*').eq('SEZIONE', miaSezSezioni).order('TARGA'),
      sb.from('MEZZI_TURNI').select('*'),
      sb.from('TURNI').select('*').order('Etichetta'),
    ]);
    _varchi = varchi || []; _volontari = volontari || []; _turni = turni || []; _mezzi = mezzi || [];

    let sezioni;
    if (CU['TIPOLOGIA'] === 'ACCESSO SEZIONALE' || CU['TIPOLOGIA'] === 'ACCESSO SEZIONALE_RO') {
      sezioni = [CU['SEZIONE']].filter(Boolean);
    } else {
      await loadSezioniList();
      const daVarchi = (varchi||[]).map(v => v['SEZIONI']).filter(Boolean);
      const daVol    = (volontari||[]).map(v => v['SEZIONE']).filter(Boolean);
      sezioni = [...new Set([..._sezioniList, ...daVarchi, ...daVol])].sort();
    }

    // Salva dati per PDF (snapshot dedicato, indipendente da altri render)
    _sezioniCorrente  = sezioni;
    _volontariPerPdf  = volontari  || [];
    _mezziPerPdf      = mezzi      || [];
    _varchiPerPdf     = varchi     || [];
    _turniPerPdf      = turni      || [];
    const pdfFullWrap = document.getElementById('pdf-full-wrap');
    const pdfSezBtn   = document.getElementById('pdf-sez-btn');
    if (isFull) {
      if (pdfFullWrap) { pdfFullWrap.style.display = 'flex'; }
      if (pdfSezBtn)   pdfSezBtn.style.display = 'none';
      const pdfSezSel = document.getElementById('pdf-sez-sel');
      if (pdfSezSel) pdfSezSel.innerHTML = '<option value="">Seleziona sezione…</option>' +
        sezioni.map(s => `<option value="${s}">${s}</option>`).join('');
    } else {
      if (pdfFullWrap) pdfFullWrap.style.display = 'none';
      if (pdfSezBtn)   pdfSezBtn.style.display = '';
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
      const isSezOpen = CU['TIPOLOGIA'] === 'ACCESSO SEZIONALE' || CU['TIPOLOGIA'] === 'ACCESSO SEZIONALE_RO';
      const isRO = CU['TIPOLOGIA'] === 'ACCESSO SEZIONALE_RO';
      const sezId = sez.replace(/[^a-zA-Z0-9]/g,'_');

      // Lista volontari
      const volHTML = totVol ? volSez.map(v => {
        const turnoLabel = v['TURNO'] ? _turni.find(t=>t['Etichetta']===v['TURNO']) : null;
        const turnoStr = turnoLabel ? (turnoLabel['NOME TURNO'] || v['TURNO']) : (v['TURNO']||'—');
        return `<div class="vol-list-item">
          <div>
            <div class="vli-nome">${v['NOME_COGNOME']}${v['NON_PC']?' &nbsp;<span class="badge badge-orange" title="Non è di Protezione Civile">NON PC</span>':''}</div>
            <div class="vli-meta">Turni: ${turnoStr}${v['JOLLY']?' &nbsp;<span class="badge badge-orange">EXTRA</span>':''}</div>
            <div class="vli-tel">CF: <span style="font-family:'Geist Mono',monospace;letter-spacing:0.5px">${v['CODICE_FISCALE']||'—'}</span></div>
            <div class="vli-tel">Telefono: ${v['TELEFONO'] ? `<a href="tel:${v['TELEFONO'].replace(/\s/g,'')}" style="color:inherit;text-decoration:none">${v['TELEFONO']}</a>` : '—'}</div>
          </div>
          ${isRO ? '' : `<div class="vli-actions">
            <button class="btn btn-ghost btn-sm" onclick="openEditVolontario(${v.id})">✏️ Modifica</button>
            <button class="btn btn-danger btn-sm" onclick="deleteVolontario(${v.id})">✕</button>
          </div>`}
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
          ${isRO ? '' : `<div class="vli-actions">
            <button class="btn btn-ghost btn-sm" onclick="showTab('mezzi');setTimeout(()=>editMezzo(${m.id}),500)">✏️ Modifica</button>
            <button class="btn btn-danger btn-sm" onclick="deleteMezzoFromSez(${m.id},'${m['TARGA']}')">✕</button>
          </div>`}
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

// ── REPORT PDF SEZIONI ────────────────────────────────────────
function scaricaPdfTutteSezioni() {
  if (!_sezioniCorrente.length) { alert('Nessuna sezione caricata. Aggiorna prima la pagina.'); return; }
  _generaPdf(_sezioniCorrente);
}

function scaricaPdfSezione() {
  const sez = (document.getElementById('pdf-sez-sel') || {}).value;
  if (!sez) { alert('Seleziona una sezione dall\'elenco.'); return; }
  _generaPdf([sez]);
}

function scaricaPdfMiaSezione() {
  const sez = CU && CU['SEZIONE'];
  if (!sez) { alert('Sezione non trovata.'); return; }
  _generaPdf([sez]);
}

async function scaricaPdfTurno(etichetta) {
  if (typeof window.jspdf === 'undefined') { alert('Libreria PDF non caricata. Verifica la connessione internet.'); return; }
  const et = etichetta || _turnoAttivo;
  if (!et) { alert('Nessun turno selezionato.'); return; }

  setLoading(true);
  let volontari, mezzi, varchi, turni;
  try {
    const [r1, r2, r3, r4] = await Promise.all([
      sb.from('VOLONTARI').select('*'),
      sb.from('MEZZI').select('*'),
      sb.from('VARCHI').select('*').order('VARCO'),
      sb.from('TURNI').select('*').order('Etichetta'),
    ]);
    volontari = r1.data || [];
    mezzi     = r2.data || [];
    varchi    = r3.data || [];
    turni     = r4.data || [];
  } catch(e) {
    setLoading(false);
    alert('Errore caricamento dati PDF: ' + e.message);
    return;
  }
  setLoading(false);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const turnoObj    = turni.find(t => t['Etichetta'] === et) || {};
  const turnoNome   = (turnoObj['NOME TURNO'] || et).toUpperCase();
  const turnoGiorno = turnoObj['GIORNO'] || '';
  const turnoFascia = turnoObj['FASCIA ORARIA'] || '';
  const subtitleT   = [turnoGiorno, turnoFascia].filter(Boolean).join(' · ');

  const oggi = new Date().toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' });
  const ora  = new Date().toLocaleTimeString('it-IT', { hour:'2-digit', minute:'2-digit' });

  // Layout A4 landscape: 297×210mm
  const marginL = 10, marginR = 10;
  const W = 297 - marginL - marginR; // 277mm

  // Column widths
  const colVarco = 36, colMezzo = 65;
  const colVol   = W - colVarco - colMezzo; // 176mm

  // Vertical layout
  const yHeader = 6,  hHeader = 14;
  const yTurno  = yHeader + hHeader + 1; // 21
  const hTurno  = 12;
  const tableStartY = yTurno + hTurno + 4; // 37

  // Build row data (query-fresh)
  const volTurno = volontari.filter(v => v['TURNO'] === et);

  const rowData = varchi.map(v => {
    const vn   = v['VARCO'];
    const sezV = (v['SEZIONI'] || '').trim().toUpperCase();
    const mezziV = mezzi.filter(m => {
      if (m['UTILIZZO'] !== 'VARCHI') return false;
      if (m['VARCO'] != null) return m['VARCO'] == vn;
      const sezM = (m['SEZIONE'] || '').trim().toUpperCase();
      return sezV && (sezM === sezV || sezM.startsWith(sezV) || sezV.startsWith(sezM));
    });
    const volV = volTurno.filter(x => x['VARCO'] == vn).sort((a, b) => a.id - b.id);
    return {
      varcoNum:  vn,
      indirizzo: v['INDIRIZZO'] || '',
      vol1:      volV[0] || null,
      vol2:      volV[1] || null,
      mezziV,
    };
  });

  // Draw table
  doc.autoTable({
    startY: tableStartY,
    head: [[
      { content: 'VARCO',     styles: { halign: 'center' } },
      { content: 'VOLONTARI', styles: { halign: 'left'   } },
      { content: 'MEZZO',     styles: { halign: 'center' } },
    ]],
    body: rowData.map(() => ['', '', '']),
    styles: {
      cellPadding: 0,
      overflow:    'hidden',
      minCellHeight: 26,
      lineWidth:   0.1,
      lineColor:   [220, 220, 220],
    },
    headStyles: {
      fillColor:  [26, 61, 28],
      textColor:  [255, 255, 255],
      fontStyle:  'bold',
      fontSize:   8.5,
      cellPadding: { top:3, bottom:3, left:4, right:4 },
    },
    alternateRowStyles: { fillColor: [250, 250, 247] },
    columnStyles: {
      0: { cellWidth: colVarco },
      1: { cellWidth: colVol   },
      2: { cellWidth: colMezzo },
    },
    margin: { left: marginL, right: marginR, top: tableStartY, bottom: 16 },

    didDrawCell: function(data) {
      if (data.section !== 'body') return;
      const row = rowData[data.row.index];
      if (!row) return;
      const { x, y, width, height } = data.cell;

      // ── VARCO ──────────────────────────────────────────────
      if (data.column.index === 0) {
        doc.setFontSize(20); doc.setFont(undefined, 'bold'); doc.setTextColor(26, 61, 28);
        doc.text(String(row.varcoNum), x + width / 2, y + 10, { align: 'center' });
        if (row.indirizzo) {
          doc.setFontSize(6.5); doc.setFont(undefined, 'normal'); doc.setTextColor(120, 120, 120);
          const lines = doc.splitTextToSize(row.indirizzo, width - 4).slice(0, 2);
          doc.text(lines, x + width / 2, y + 16, { align: 'center' });
        }

      // ── VOLONTARI ──────────────────────────────────────────
      } else if (data.column.index === 1) {
        const mid  = y + height / 2;
        const sezW = 52, telW = 36;
        const nomeW = width - 6 - sezW - telW;
        const xNome = x + 3;
        const xSez  = x + 3 + nomeW + 2;

        function drawVol(vol, lineY) {
          if (vol) {
            doc.setFontSize(9.5); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 30, 30);
            doc.text(
              doc.splitTextToSize((vol['NOME_COGNOME'] || '—').toUpperCase(), nomeW)[0],
              xNome, lineY
            );
            doc.setFontSize(8); doc.setFont(undefined, 'normal'); doc.setTextColor(110, 110, 110);
            doc.text(
              doc.splitTextToSize(vol['SEZIONE'] || '', sezW - 2)[0],
              xSez, lineY
            );
            doc.setFontSize(8.5); doc.setTextColor(30, 100, 200);
            doc.text(vol['TELEFONO'] || '', x + width - 3, lineY, { align: 'right' });
          } else {
            doc.setFontSize(8); doc.setFont(undefined, 'italic'); doc.setTextColor(160, 160, 160);
            doc.text('slot vuoto', xNome, lineY);
          }
        }

        drawVol(row.vol1, y + height / 4 + 1);

        // Divisore tratteggiato
        doc.setDrawColor(190, 190, 190);
        doc.setLineDash([0.8, 0.8], 0);
        doc.line(x + 2, mid, x + width - 2, mid);
        doc.setLineDash([], 0);
        doc.setDrawColor(220, 220, 220);

        drawVol(row.vol2, y + height * 3 / 4 + 1);

      // ── MEZZO ──────────────────────────────────────────────
      } else if (data.column.index === 2) {
        const m = row.mezziV[0];
        if (!m) {
          doc.setFontSize(14); doc.setFont(undefined, 'normal'); doc.setTextColor(180, 180, 180);
          doc.text('—', x + width / 2, y + height / 2, { align: 'center', baseline: 'middle' });
        } else {
          const bPad = 3;
          const bX = x + bPad, bY = y + 3;
          const bW = width - 2 * bPad, bH = height - 6;
          doc.setFillColor(238, 244, 251);
          doc.setDrawColor(181, 212, 244);
          doc.setLineWidth(0.3);
          doc.roundedRect(bX, bY, bW, bH, 2, 2, 'FD');
          doc.setLineWidth(0.2);
          doc.setFont('Courier', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 100, 200);
          doc.text(m['TARGA'] || '', bX + 3, bY + 6);
          if (m['DESCRIZIONE']) {
            doc.setFont(undefined, 'normal'); doc.setFontSize(7); doc.setTextColor(80, 80, 80);
            const dl = doc.splitTextToSize(m['DESCRIZIONE'], bW - 6).slice(0, 2);
            doc.text(dl, bX + 3, bY + 11.5);
          }
        }
      }
    },
  });

  // Intestazione + barra turno + footer su ogni pagina
  function disegnaTestata() {
    doc.setFillColor(26, 61, 28);
    doc.rect(marginL, yHeader, W, hHeader, 'F');
    doc.setFontSize(10.5); doc.setFont(undefined, 'bold'); doc.setTextColor(255, 255, 255);
    doc.text('97ª ADUNATA NAZIONALE ALPINI — GENOVA 2026', marginL + 4, yHeader + 5.5);
    doc.setFontSize(7.5); doc.setFont(undefined, 'normal');
    doc.text('Protezione Civile ANA · Area Pedonale Alpina · 08–10 Maggio 2026', marginL + 4, yHeader + 11);
    doc.setTextColor(210, 230, 210);
    doc.text(`Stampato il: ${oggi} ore ${ora}`, marginL + W - 3, yHeader + 5.5, { align: 'right' });
    doc.text('Documento riservato', marginL + W - 3, yHeader + 11, { align: 'right' });

    doc.setFillColor(44, 95, 46);
    doc.rect(marginL, yTurno, W, hTurno, 'F');
    doc.setFontSize(11); doc.setFont(undefined, 'bold'); doc.setTextColor(255, 255, 255);
    doc.text(turnoNome, marginL + 5, yTurno + 7.5);
    if (subtitleT) {
      doc.setFontSize(8.5); doc.setFont(undefined, 'normal'); doc.setTextColor(200, 230, 200);
      doc.text(subtitleT, marginL + W - 4, yTurno + 7.5, { align: 'right' });
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    disegnaTestata();

    const yF = 210 - 13;
    doc.setFillColor(240, 240, 238);
    doc.rect(marginL, yF, W, 8, 'F');
    doc.setDrawColor(26, 110, 46); doc.setLineWidth(0.4);
    doc.line(marginL, yF, marginL + W, yF);
    doc.setLineWidth(0.2); doc.setDrawColor(220, 220, 220);
    doc.setFontSize(7); doc.setFont(undefined, 'normal'); doc.setTextColor(120, 120, 120);
    doc.text('97ª Adunata Nazionale Alpini — Genova 2026 · Protezione Civile ANA', marginL + 3, yF + 5);
    doc.text(`Pagina ${pg} di ${totalPages}`, marginL + W - 3, yF + 5, { align: 'right' });
  }

  doc.save(`TURNO_${et.replace(/\s+/g, '_')}_ADUNATA2026.pdf`);
}

async function _generaPdf(sezioni) {
  if (typeof window.jspdf === 'undefined') { alert('Libreria PDF non caricata. Verifica la connessione internet.'); return; }

  // ── Query fresche al momento della generazione ─────────────
  setLoading(true);
  let volontari, mezzi, varchi, turni;
  try {
    const isFull = CU['TIPOLOGIA'] === 'ACCESSO FULL';
    const miaSez = CU['SEZIONE'] || '';
    const [r1, r2, r3, r4] = await Promise.all([
      isFull
        ? sb.from('VOLONTARI').select('*')
        : sb.from('VOLONTARI').select('*').eq('SEZIONE', miaSez),
      isFull
        ? sb.from('MEZZI').select('*')
        : sb.from('MEZZI').select('*').eq('SEZIONE', miaSez),
      sb.from('VARCHI').select('*'),
      sb.from('TURNI').select('*'),
    ]);
    volontari = r1.data || [];
    mezzi     = r2.data || [];
    varchi    = r3.data || [];
    turni     = r4.data || [];
  } catch(e) {
    setLoading(false);
    alert('Errore nel caricamento dati per il PDF: ' + e.message);
    return;
  }
  setLoading(false);

  const { jsPDF } = window.jspdf;
  const doc  = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const oggi = new Date().toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' });
  const verde = [26, 110, 46];
  const W = 182;

  sezioni.forEach((sez, idx) => {
    if (idx > 0) doc.addPage();
    let y = 14;
    const sezLow = sez.trim().toLowerCase();

    // ── Intestazione ──────────────────────────────────────────
    doc.setFillColor(...verde);
    doc.rect(14, y, W, 12, 'F');
    doc.setFontSize(11); doc.setTextColor(255,255,255); doc.setFont(undefined, 'bold');
    doc.text('97ª ADUNATA NAZIONALE ALPINI – GENOVA 2026', 14 + W/2, y + 7.5, { align:'center' });
    y += 20;

    doc.setTextColor(0,0,0); doc.setFontSize(18); doc.setFont(undefined, 'bold');
    doc.text(`SEZIONE: ${sez}`, 14 + W/2, y, { align:'center' });
    y += 10;

    doc.setFontSize(9); doc.setFont(undefined, 'normal');
    doc.text(`Stampato il: ${oggi}`, 14 + W/2, y, { align:'center' });
    y += 14;

    // ── Volontari ─────────────────────────────────────────────
    const volSez    = volontari.filter(v => (v['SEZIONE']||'').trim().toLowerCase() === sezLow);
    const principali = volSez.filter(v => !v['JOLLY'] && v['VARCO']);
    const extra      = volSez.filter(v =>  v['JOLLY'] || !v['VARCO']);

    doc.setFontSize(12); doc.setFont(undefined, 'bold');
    doc.setTextColor(...verde);
    doc.text(`VOLONTARI (${volSez.length})`, 14, y);
    doc.setTextColor(0,0,0); doc.setFont(undefined, 'normal');
    y += 8;

    const volRows = [...principali, ...extra].map(v => {
      const turnoObj = turni.find(t => t['Etichetta'] === v['TURNO']);
      const turnoStr = turnoObj ? (turnoObj['NOME TURNO'] || v['TURNO']) : (v['TURNO'] || '—');
      const varcoRiga = varchi.find(vx => vx['VARCO'] == v['VARCO']);
      const varcoStr  = v['VARCO'] != null ? `${v['VARCO']}` : (v['JOLLY'] ? 'JOLLY' : '—');
      const indir     = varcoRiga ? (varcoRiga['INDIRIZZO'] || '—') : '—';
      return [v['NOME_COGNOME']||'—', turnoStr, varcoStr, indir, v['TELEFONO']||'—'];
    });

    doc.autoTable({
      startY: y,
      head: [['Nome Cognome', 'Turno', 'Varco', 'Indirizzo Varco', 'Telefono']],
      body: volRows.length ? volRows : [['Nessun volontario','','','','']],
      styles: { fontSize: 8.5, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: verde, fontStyle: 'bold', fontSize: 8.5 },
      columnStyles: { 0:{cellWidth:52}, 1:{cellWidth:28}, 2:{cellWidth:14}, 3:{cellWidth:58}, 4:{cellWidth:30} },
      margin: { left: 14, right: 14 },
      didDrawPage: (d) => { y = d.cursor.y; },
    });
    y = doc.lastAutoTable.finalY + 14;

    // ── Mezzi ─────────────────────────────────────────────────
    const mezSez = mezzi.filter(m => (m['SEZIONE']||'').trim().toLowerCase() === sezLow);

    doc.setFontSize(12); doc.setFont(undefined, 'bold');
    doc.setTextColor(...verde);
    doc.text(`MEZZI (${mezSez.length})`, 14, y);
    doc.setTextColor(0,0,0); doc.setFont(undefined, 'normal');
    y += 8;

    const mezRows = mezSez.map(m => {
      const varcoRigaMezzo = m['VARCO'] != null ? varchi.find(vx => vx['VARCO'] == m['VARCO']) : null;
      const indirMezzo = varcoRigaMezzo ? (varcoRigaMezzo['INDIRIZZO'] || '—') : '—';
      return [
        m['TARGA']||'—', m['DESCRIZIONE']||'—', m['TIPOLOGIA']||'—',
        m['UTILIZZO']||'—',
        m['VARCO'] != null ? `${m['VARCO']}` : '—',
        indirMezzo,
      ];
    });

    doc.autoTable({
      startY: y,
      head: [['Targa','Descrizione','Tipologia','Utilizzo','Varco','Indirizzo Varco']],
      body: mezRows.length ? mezRows : [['Nessun mezzo','','','','','']],
      styles: { fontSize: 8.5, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: verde, fontStyle: 'bold', fontSize: 8.5 },
      columnStyles: { 0:{cellWidth:22}, 1:{cellWidth:40}, 2:{cellWidth:24}, 3:{cellWidth:26}, 4:{cellWidth:14}, 5:{cellWidth:42} },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 14;

    // ── Riepilogo ─────────────────────────────────────────────
    const totVarchi = mezSez.filter(m => m['UTILIZZO'] === 'VARCHI').length;
    doc.setFontSize(9); doc.setFont(undefined, 'bold');
    doc.text('RIEPILOGO', 14, y); y += 5;
    doc.setFont(undefined, 'normal');
    doc.text(`Volontari: ${volSez.length}  |  Principali: ${principali.length}  |  Extra / Jolly: ${extra.length}`, 14, y); y += 4.5;
    doc.text(`Mezzi: ${mezSez.length}  |  Ai varchi: ${totVarchi}`, 14, y);
  });

  const tag  = sezioni.length === 1 ? sezioni[0].replace(/\s+/g,'_') : 'TUTTE';
  const data = oggi.replace(/\//g,'-');
  doc.save(`report_${tag}_${data}.pdf`);
}

async function deleteVolontario(id) {
  const _vol = _volontari.find(v => v.id === id);
  const nome = _vol ? _vol['NOME_COGNOME'] : '';
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
    const [{ data: turni }, { data: varchi }, { data: volontari }, { data: mezzi }] = await Promise.all([
      sb.from('TURNI').select('*').order('Etichetta'),
      sb.from('VARCHI').select('*').order('VARCO'),
      sb.from('VOLONTARI').select('*'),
      sb.from('MEZZI').select('*'),
    ]);
    _turni = turni || []; _varchi = varchi || [];
    _volontari = volontari || []; _mezzi = mezzi || [];

    // Aggiorna intestazione in base al tipo di accesso
    const isSezGriglia = CU && (CU['TIPOLOGIA'] === 'ACCESSO SEZIONALE' || CU['TIPOLOGIA'] === 'ACCESSO SEZIONALE_RO');
    document.getElementById('griglia-readonly-banner').style.display = isSezGriglia ? '' : 'none';
    const pageSubtitle = document.querySelector('#tab-griglia .page-title small');
    if (pageSubtitle) pageSubtitle.textContent = isSezGriglia
      ? 'Sola lettura · visibili solo i volontari della tua sezione'
      : 'Seleziona un turno · trascina i volontari extra per spostarli';
    const thVol = document.getElementById('griglia-th-volontari');
    if (thVol) thVol.textContent = isSezGriglia ? 'Volontari Assegnati' : 'Volontari Assegnati (trascina per spostare)';

    // Selettore turni
    if (!_turnoAttivo && _turni.length) _turnoAttivo = _turni[0]['Etichetta'];
    const isFull = CU && CU['TIPOLOGIA'] === 'ACCESSO FULL';
    document.getElementById('turno-selector').innerHTML = _turni.map(t =>
      `<span class="turno-btn-wrap">
        <button class="turno-btn${_turnoAttivo === t['Etichetta'] ? ' active' : ''}"
          onclick="cambioTurno('${t['Etichetta']}')">
          ${t['NOME TURNO'] || t['Etichetta']}
        </button>${isFull ? `<button class="turno-pdf-btn" onclick="scaricaPdfTurno('${t['Etichetta']}')" title="Scarica PDF turno">⬇ PDF</button>` : ''}
      </span>`
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
  const isSez = CU && (CU['TIPOLOGIA'] === 'ACCESSO SEZIONALE' || CU['TIPOLOGIA'] === 'ACCESSO SEZIONALE_RO');
  const miaSez = isSez ? (CU['SEZIONE'] || '') : null;
  const volTurno = _volontari.filter(v => v['TURNO'] === turno);

  // Confronto sezione fuzzy: case-insensitive + startsWith bidirezionale.
  // "CASALE" matcha "CASALE MONFERRATO" e viceversa.
  function sezMatch(a, b) {
    if (!a || !b) return false;
    const A = a.trim().toUpperCase(), B = b.trim().toUpperCase();
    return A === B || A.startsWith(B) || B.startsWith(A);
  }

  // Logica posizionale volontari: primi 2 per varco = principali, dal 3° = extra
  function splitVarco(varcoNum) {
    let tutti = volTurno.filter(x => x['VARCO'] == varcoNum).sort((a,b) => a.id - b.id);
    if (isSez && miaSez) tutti = tutti.filter(x => sezMatch(x['SEZIONE'], miaSez));
    return { principali: tutti.slice(0, 2), extra: tutti.slice(2) };
  }

  // Restituisce true se il volontario deve mostrare il badge EXTRA:
  // - JOLLY=true, oppure
  // - il suo VARCO non corrisponde al varco della sua SEZIONE in tabella VARCHI
  function volMostraExtra(vol) {
    if (vol['JOLLY']) return true;
    const varcoSez = _varchi.find(vx => sezMatch(vx['SEZIONI'], vol['SEZIONE']));
    if (!varcoSez) return true;
    return vol['VARCO'] != varcoSez['VARCO'];
  }

  // Mezzi VARCHI per varco.
  // Priorità: se VARCO è impostato sul mezzo, usalo (evita duplicati dopo drag).
  // Fallback su SEZIONE (fuzzy) solo se VARCO è null.
  // Per utenti sezionali: mostra solo i mezzi della propria sezione (fuzzy match).
  function getMezziVarco(varcoNum) {
    const sezVarco = ((_varchi.find(vx => vx['VARCO'] == varcoNum) || {})['SEZIONI'] || '').trim().toUpperCase();
    let tutti = _mezzi.filter(m => {
      if (m['UTILIZZO'] !== 'VARCHI') return false;
      if (m['VARCO'] != null) return m['VARCO'] == varcoNum;
      const sezM = (m['SEZIONE'] || '').trim().toUpperCase();
      return sezVarco && (sezM === sezVarco || sezM.startsWith(sezVarco) || sezVarco.startsWith(sezM));
    });
    // Per utenti sezionali mostra solo i mezzi della propria sezione
    if (isSez && miaSez) tutti = tutti.filter(m => sezMatch(m['SEZIONE'], miaSez));
    return tutti;
  }

  // Turni notturni (TURNO 1, TURNO 5): 1 slot per varco invece di 2
  const isNotturno = /[15]$/.test((turno || '').trim());
  const slotsPerVarco = isNotturno ? 1 : 2;

  let completi=0, parziali=0, scoperti=0, totPrinc=0, totMezziGriglia=0;
  _varchi.forEach(v => {
    const { principali, extra } = splitVarco(v['VARCO']);
    const hasSec = !!v['SECURITY'];
    if (isNotturno) {
      const haCop = principali.length >= 1 || hasSec;
      if (haCop) completi++;
      else scoperti++;
      totPrinc += haCop ? 1 : 0;
    } else {
      if (principali.length >= 2) completi++;
      else if (principali.length === 1) parziali++;
      else scoperti++;
      totPrinc += principali.length + (hasSec ? 1 : 0);
    }
    totMezziGriglia += getMezziVarco(v['VARCO']).length;
  });
  // EXTRA = tutti i non-principali: JOLLY=true (surplus in varco) + VARCO=null (pool non assegnati)
  const totExtra = volTurno.filter(v => v['JOLLY'] === true || !v['VARCO']).length;
  const totSlot = _varchi.length * slotsPerVarco;
  const pCop = totSlot ? Math.round(totPrinc / totSlot * 100) : 0;

  document.getElementById('turno-stats').innerHTML = `
    <div class="ts-card"><div class="ts-num">${_varchi.length}</div><div class="ts-label">Tot. Varchi</div></div>
    <div class="ts-card"><div class="ts-num blu">${totPrinc} / ${totSlot}</div><div class="ts-label">Slot coperti</div></div>
    <div class="ts-card"><div class="ts-num blu">${totMezziGriglia} / ${_varchi.length}</div><div class="ts-label">Mezzi</div></div>
    <div class="ts-card"><div class="ts-num verde">${completi}</div><div class="ts-label">Completi</div></div>
    <div class="ts-card"><div class="ts-num arancio">${parziali}</div><div class="ts-label">Parziali</div></div>
    <div class="ts-card"><div class="ts-num rosso">${scoperti}</div><div class="ts-label">Scoperti</div></div>
    <div class="ts-card"><div class="ts-num arancio">${totExtra}</div><div class="ts-label">Extra</div></div>
  `;

  // isFull calcolato una volta sola fuori dal loop (costante per tutta la render)
  const isFullGriglia = CU && CU['TIPOLOGIA'] === 'ACCESSO FULL';

  const tbody = document.getElementById('varchi-tbody');
  tbody.innerHTML = _varchi.map(v => {
    const { principali, extra } = splitVarco(v['VARCO']);

    let statoHtml;
    if (isNotturno) {
      const haCop = principali.length >= 1 || !!v['SECURITY'];
      const haSurp = principali.length >= 2 || (principali.length >= 1 && extra.length > 0);
      if (haSurp) statoHtml = `<span class="stato-surplus">SURPLUS</span>`;
      else if (haCop) statoHtml = `<span class="stato-completo">COMPLETO</span>`;
      else statoHtml = `<span class="stato-scoperto">SCOPERTO</span>`;
    } else {
      if (extra.length > 0 && principali.length >= 2)
        statoHtml = `<span class="stato-surplus">SURPLUS</span>`;
      else if (principali.length >= 2)
        statoHtml = `<span class="stato-completo">COMPLETO</span>`;
      else if (principali.length === 1)
        statoHtml = `<span class="stato-parziale">PARZIALE</span>`;
      else
        statoHtml = `<span class="stato-scoperto">SCOPERTO</span>`;
    }

    const chipsP = principali.map(vol => {
      const isExtra = volMostraExtra(vol);
      const classes = 'vol-chip-table' + (isSez ? ' readonly' : '') + (isExtra ? ' extra' : '');
      const drag = isSez ? '' : `draggable="true" ondragstart="dragStart(event,'vol',${vol.id})"`;
      const removeBtn = isSez ? '' : `<button class="vc-remove" onclick="rimuoviVol(${vol.id})" title="Rimuovi dal varco">✕</button>`;
      const extraBadge = isExtra ? '<div class="vc-badge-extra">EXTRA</div>' : '';
      return `<div class="${classes}" ${drag}>
        <div class="vc-nome">${vol['NOME_COGNOME']}</div>
        <div class="vc-sez">Sez: ${vol['SEZIONE'] || '—'}</div>
        <div class="vc-tel">${vol['TELEFONO'] ? `<a href="tel:${vol['TELEFONO'].replace(/\s/g,'')}" style="color:inherit;text-decoration:none">${vol['TELEFONO']}</a>` : ''}</div>
        ${extraBadge}
        ${removeBtn}
      </div>`;
    }).join('');

    const chipsE = extra.map(vol => {
      const classes = 'vol-chip-table extra' + (isSez ? ' readonly' : '');
      const drag = isSez ? '' : `draggable="true" ondragstart="dragStart(event,'vol',${vol.id})"`;
      const removeBtn = isSez ? '' : `<button class="vc-remove" onclick="rimuoviVol(${vol.id})" title="Rimuovi dal varco">✕</button>`;
      return `<div class="${classes}" ${drag}>
        <div class="vc-nome">${vol['NOME_COGNOME']}</div>
        <div class="vc-sez">Sez: ${vol['SEZIONE'] || '—'}</div>
        <div class="vc-tel">${vol['TELEFONO'] ? `<a href="tel:${vol['TELEFONO'].replace(/\s/g,'')}" style="color:inherit;text-decoration:none">${vol['TELEFONO']}</a>` : ''}</div>
        <div class="vc-badge-extra">EXTRA</div>
        ${removeBtn}
      </div>`;
    }).join('');

    const maxPrinc = isNotturno ? 1 : 2;
    const slotVuoto = (!isSez && principali.length < maxPrinc)
      ? `<div class="slot-drop-zone"
           ondragover="dragOver(event)" ondrop="dropOnVarco(event,${v['VARCO']},'${turno}')" ondragleave="dragLeave(event)"
           onclick="openAssegnaVol(${v['VARCO']},'${turno}','${(v['SEZIONI']||'').replace(/'/g,"\\'")}')">
           + Trascina volontario qui
         </div>`
      : (isSez && principali.length < maxPrinc ? `<span class="slot-vuoto-readonly">slot vuoto</span>` : '');

    function buildMezzoChip(m) {
      if (isSez) {
        return `<div class="mezzo-chip readonly">
          <div class="mc-targa">${m['TARGA']}${m['DESCRIZIONE'] ? ' – ' + m['DESCRIZIONE'] : ''}</div>
          <div class="mc-tipo">${m['TIPOLOGIA']||''}</div>
          <div class="mc-sez">Sez: ${m['SEZIONE'] || '—'}</div>
        </div>`;
      }
      return `<div class="mezzo-chip" draggable="true" ondragstart="dragStart(event,'mezzo',${m.id})">
        <div class="mc-targa">${m['TARGA']}${m['DESCRIZIONE'] ? ' – ' + m['DESCRIZIONE'] : ''}</div>
        <div class="mc-tipo">${m['TIPOLOGIA']||''}</div>
        <div class="mc-sez">Sez: ${m['SEZIONE'] || '—'}</div>
        <button class="mc-remove" onclick="rimuoviMezzoVarco(${m.id});event.stopPropagation()" title="Rimuovi dal varco">✕</button>
      </div>`;
    }
    const mezziVarco = getMezziVarco(v['VARCO']);
    const mezzoHtml = `<div style="display:flex;flex-wrap:wrap;gap:4px;align-items:flex-start">${
      mezziVarco.length ? mezziVarco.map(m => buildMezzoChip(m)).join('') : '<span class="nessun-mezzo-readonly">—</span>'
    }</div>`;

    const isMiaRiga = isSez && v['SEZIONI'] === miaSez;
    const dropAttrs = isSez ? '' : `ondragover="dragOver(event)" ondrop="dropOnVarco(event,${v['VARCO']},'${turno}')" ondragleave="dragLeave(event)"`;

    // SECURITY è un booleano fisso sul varco, indipendente dal turno
    const vHasSec = !!v['SECURITY'];
    const securityBadge = vHasSec
      ? `<div class="security-chip"><div class="security-chip-name">Security</div><div class="security-chip-sub">Cortesy Solution SRL</div></div>`
      : '';
    const securityBtn = isFullGriglia
      ? `<button class="security-toggle-btn${vHasSec ? ' active' : ''}" onclick="toggleSecurity(${v['VARCO']})" title="${vHasSec ? 'Rimuovi Security' : 'Aggiungi Security'}">${vHasSec ? '✕ Security' : '+ Security'}</button>`
      : '';

    return `<tr${isMiaRiga ? ' class="mia-sezione-row"' : ''}>
      <td class="td-varco">${v['VARCO']}</td>
      <td class="td-sezione">${v['SEZIONI'] || '—'}</td>
      <td class="td-volontari" ${dropAttrs}>
        <div style="display:flex;flex-wrap:wrap;gap:4px;align-items:flex-start">
          ${chipsP}${chipsE}${slotVuoto}${securityBadge}${securityBtn}
        </div>
      </td>
      <td class="td-mezzo" style="vertical-align:top" ondragover="dragOver(event)" ondrop="dropOnVarco(event,${v['VARCO']},'${turno}')" ondragleave="dragLeave(event)">${mezzoHtml}</td>
      <td class="td-stato">${statoHtml}</td>
    </tr>`;
  }).join('');

  // Area JOLLY: volontari del turno senza varco assegnato (solo admin FULL)
  // Regola: VARCO=null → jolly/non assegnato. VARCO non null → sta nel varco (JOLLY indica solo principale/extra lì dentro).
  const poolWrap = document.getElementById('pool-jolly-wrap');
  if (!isSez) {
    poolWrap.style.display = '';
    const pool = volTurno.filter(v => !v['VARCO']);
    document.getElementById('pool-jolly-chips').innerHTML = pool.length
      ? pool.map(vol =>
          `<div class="vol-chip-table extra" draggable="true" ondragstart="dragStart(event,'vol',${vol.id})">
            <div class="vc-nome">${vol['NOME_COGNOME']}</div>
            <div class="vc-sez">Sez: ${vol['SEZIONE'] || '—'}</div>
            ${vol['TELEFONO'] ? `<div class="vc-tel"><a href="tel:${vol['TELEFONO'].replace(/\s/g,'')}" style="color:inherit;text-decoration:none">${vol['TELEFONO']}</a></div>` : ''}
            <div class="vc-badge-extra">JOLLY</div>
          </div>`
        ).join('')
      : '<div style="color:var(--testo3);font-size:13px;padding:8px 0">Nessun volontario JOLLY — trascina qui un chip per aggiungere</div>';
  } else {
    poolWrap.style.display = 'none';
  }
}

// ── DRAG & DROP ───────────────────────────────────────────────
let _dragScrollRAF = null;
let _dragCursorY = 0;
const _SCROLL_ZONE = 100;
const _SCROLL_MAX  = 18;

function _startDragScroll() {
  if (_dragScrollRAF) return;
  (function loop() {
    const vh = window.innerHeight;
    const y  = _dragCursorY;
    let speed = 0;
    if (y < _SCROLL_ZONE) {
      speed = -_SCROLL_MAX * (1 - y / _SCROLL_ZONE);
    } else if (y > vh - _SCROLL_ZONE) {
      speed = _SCROLL_MAX * (1 - (vh - y) / _SCROLL_ZONE);
    }
    if (speed !== 0) window.scrollBy(0, speed);
    _dragScrollRAF = requestAnimationFrame(loop);
  })();
}

function _stopDragScroll() {
  if (_dragScrollRAF) { cancelAnimationFrame(_dragScrollRAF); _dragScrollRAF = null; }
}

document.addEventListener('dragover',  e => { _dragCursorY = e.clientY; });
document.addEventListener('dragend',   _stopDragScroll);
document.addEventListener('drop',      _stopDragScroll);

function dragStart(e, tipo, id) {
  _dragData = { tipo, id };
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.style.opacity = '0.5';
  setTimeout(() => { if(e.currentTarget) e.currentTarget.style.opacity = ''; }, 0);
  _startDragScroll();
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
      // Turni notturni (1, 5): 1 slot per varco; tutti gli altri: 2 slot
      const maxSlotVarco = /[15]$/.test((turno || '').trim()) ? 1 : 2;
      const saràJolly = giàPresenti >= maxSlotVarco;
      await sb.from('VOLONTARI').update({
        VARCO: varco,
        TURNO: turno,
        JOLLY: saràJolly
      }).eq('id', _dragData.id);
      const vol = _volontari.find(x => x.id === _dragData.id);
      if (vol) { vol['VARCO'] = varco; vol['TURNO'] = turno; vol['JOLLY'] = saràJolly; }
    } else if (_dragData.tipo === 'mezzo') {
      const m = _mezzi.find(x => x.id === _dragData.id);
      if (m) {
        const oldVarco = m['VARCO'];
        m['VARCO'] = varco;                          // aggiorna locale ottimisticamente
        try {
          const { error } = await sb.from('MEZZI').update({ VARCO: varco }).eq('id', m.id);
          if (error) throw error;
        } catch(err) {
          m['VARCO'] = oldVarco;                     // rollback locale
          _dragData = null;
          setLoading(false);
          renderTurnoAttivo();
          alert('Errore spostamento mezzo: ' + err.message);
          return;
        }
      }
    }
    _dragData = null;
    showSavedToast();
    renderTurnoAttivo();                             // aggiorna solo la vista, no re-fetch
  } catch(err) { console.error(err); alert('Errore: ' + err.message); }
  finally { setLoading(false); }
}

// ── JOLLY DROP ZONE ───────────────────────────────────────────
function dragOverJolly(e) {
  e.preventDefault();
  const box = document.getElementById('pool-jolly-box');
  if (box) box.classList.add('jolly-drop-target');
}
function dragLeaveJolly(e) {
  const box = document.getElementById('pool-jolly-box');
  if (box) box.classList.remove('jolly-drop-target');
}
async function dropOnJolly(e) {
  e.preventDefault();
  const box = document.getElementById('pool-jolly-box');
  if (box) box.classList.remove('jolly-drop-target');
  if (!_dragData) return;
  setLoading(true);
  try {
    if (_dragData.tipo === 'vol') {
      await sb.from('VOLONTARI').update({ JOLLY: true, VARCO: null }).eq('id', _dragData.id);
      const v = _volontari.find(x => x.id === _dragData.id);
      if (v) { v['JOLLY'] = true; v['VARCO'] = null; }
    } else if (_dragData.tipo === 'mezzo') {
      const m = _mezzi.find(x => x.id === _dragData.id);
      if (m) {
        const oldVarco = m['VARCO'];
        m['VARCO'] = null;
        const { error } = await sb.from('MEZZI').update({ VARCO: null }).eq('id', m.id);
        if (error) { m['VARCO'] = oldVarco; throw error; }
      }
    }
    _dragData = null;
    showSavedToast();
    renderTurnoAttivo();
  } catch(err) { console.error(err); alert('Errore: ' + err.message); }
  finally { setLoading(false); }
}

function showSavedToast(msg) {
  let toast = document.getElementById('saved-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'saved-toast';
    toast.style.cssText = 'position:fixed;bottom:28px;right:28px;background:#2e7d32;color:#fff;padding:10px 22px;border-radius:8px;font-size:14px;font-weight:700;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.18);opacity:0;transition:opacity 0.25s;pointer-events:none';
    document.body.appendChild(toast);
  }
  toast.textContent = msg || 'Salvato ✓';
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

// ── TOGGLE SECURITY VARCO ─────────────────────────────────────
async function toggleSecurity(varcoNum) {
  const varco = _varchi.find(v => v['VARCO'] == varcoNum);
  if (!varco) return;
  const newVal = !varco['SECURITY'];
  // Usa il valore reale dell'oggetto (tipo corretto) invece del parametro HTML
  const varcoKey = varco['VARCO'];
  setLoading(true);
  try {
    const { data: aggiornati, error } = await sb.from('VARCHI')
      .update({ SECURITY: newVal })
      .eq('VARCO', varcoKey)
      .select('VARCO, SECURITY');
    if (error) throw error;
    // Sincronizza _varchi con i dati reali restituiti dal DB
    (aggiornati || []).forEach(row => {
      const v = _varchi.find(x => x['VARCO'] == row['VARCO']);
      if (v) v['SECURITY'] = row['SECURITY'];
    });
    showSavedToast(newVal ? 'Security aggiunta ✓' : 'Security rimossa ✓');
    renderTurnoAttivo();
  } catch(e) { console.error(e); alert('Errore Security: ' + e.message); }
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
async function rimuoviMezzoVarco(id) {
  if (!confirm('Rimuovere il mezzo dal varco?')) return;
  const m = _mezzi.find(x => x.id === id);
  if (!m) return;
  const oldVarco = m['VARCO'];
  m['VARCO'] = null;
  renderTurnoAttivo();
  try {
    const { error } = await sb.from('MEZZI').update({ VARCO: null }).eq('id', id);
    if (error) throw error;
    showSavedToast('Rimosso ✓');
  } catch(e) {
    m['VARCO'] = oldVarco;
    renderTurnoAttivo();
    alert('Errore: ' + e.message);
  }
}

// ══════════════════════════════════════════════════════════════
//  VARCHI (tabella info)
// ══════════════════════════════════════════════════════════════
async function renderVarchi() {
  setLoading(true);
  try {
    const { data: varchi, error } = await sb.from('VARCHI').select('*').order('VARCO');
    if (error) throw error;

    const tbody = document.getElementById('varchi-info-tbody');
    if (!varchi || varchi.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--testo3);padding:24px">Nessun varco trovato.</td></tr>`;
      return;
    }

    tbody.innerHTML = varchi.map(v => {
      const indirizzo = v['INDIRIZZO'] ? `<span>${v['INDIRIZZO']}</span>` : `<span style="color:var(--testo3);font-style:italic">—</span>`;
      let posizioneHtml;
      if (v['POSIZIONE']) {
        const pos = v['POSIZIONE'].trim();
        console.log('POSIZIONE raw:', JSON.stringify(v['POSIZIONE']), '| test:', /^https?:\/\//i.test(pos));
        const mapsUrl = /^https?:\/\//i.test(pos) ? pos : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pos)}`;
        posizioneHtml = `<a href="${mapsUrl}" target="_blank" rel="noopener" style="color:var(--verde);text-decoration:none;font-weight:600">📍 Vedi mappa</a>`;
      } else {
        posizioneHtml = `<span style="color:var(--testo3);font-style:italic">—</span>`;
      }
      return `<tr>
        <td style="font-weight:700;font-family:'Geist Mono',monospace">${v['VARCO']}</td>
        <td>${v['SEZIONI'] || '<span style="color:var(--testo3)">—</span>'}</td>
        <td>${indirizzo}</td>
        <td>${posizioneHtml}</td>
      </tr>`;
    }).join('');
  } catch(e) {
    console.error(e);
    document.getElementById('varchi-info-tbody').innerHTML =
      `<tr><td colspan="4" style="text-align:center;color:var(--rosso);padding:24px">Errore nel caricamento: ${e.message}</td></tr>`;
  } finally {
    setLoading(false);
  }
}

// ══════════════════════════════════════════════════════════════
//  INSERIMENTO VOLONTARI
// ══════════════════════════════════════════════════════════════

// Struttura dati form: { [etichettaTurno]: [ {nome, cf, tel, nonpc}, ... ] }
let _insData = {};

function cambiaSezioneInserimento() {
  _insData = {};
  renderInserimento();
}

async function renderInserimento() {
  setLoading(true);
  try {
    const isFull = CU['TIPOLOGIA'] === 'ACCESSO FULL';
    await loadSezioniList();

    let sezione;
    if (isFull) {
      const wrap = document.getElementById('ins-sezione-wrap');
      wrap.style.display = '';
      const sel = document.getElementById('ins-sezione-sel');
      if (sel.options.length <= 1) {
        sel.innerHTML = '<option value="">Seleziona una sezione</option>' +
          _sezioniList.map(s => `<option value="${s}">${s}</option>`).join('');
      }
      sezione = sel.value;
    } else {
      document.getElementById('ins-sezione-wrap').style.display = 'none';
      sezione = CU['SEZIONE'];
    }

    document.getElementById('ins-sezione-label').textContent = 'Sezione: ' + (sezione || '—');

    if (!sezione) {
      document.getElementById('ins-turni-container').innerHTML = '<div class="empty-state"><div class="ei">👆</div><p>Seleziona una sezione per iniziare.</p></div>';
      return;
    }

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
            <div class="turno-block-title">${t['NOME TURNO'] || et}</div>
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
  const isFull = CU['TIPOLOGIA'] === 'ACCESSO FULL';
  const sezione = isFull ? document.getElementById('ins-sezione-sel').value : CU['SEZIONE'];
  if (!sezione) { showFormAlert('ins-alert', isFull ? 'Seleziona una sezione' : 'Account senza sezione assegnata', 'err'); return; }

  // Trova il varco della sezione (case-insensitive)
  const { data: varcoData } = await sb.from('VARCHI').select('VARCO').ilike('SEZIONI', sezione).maybeSingle();
  const varcoNum = varcoData ? varcoData['VARCO'] : null;

  setLoading(true);
  try {
    let totSalvati = 0;
    let totJolly = 0;

    for (const [turno, vols] of Object.entries(_insData)) {
      // Conta i volontari già esistenti nel DB per VARCO+TURNO
      // (esclude quelli del batch corrente che hanno già un ID)
      let baseCount = 0;
      if (varcoNum !== null) {
        const idsEsistenti = vols.filter(v => v.id).map(v => v.id);
        let q = sb.from('VOLONTARI').select('id', { count: 'exact', head: true })
          .eq('VARCO', varcoNum).eq('TURNO', turno);
        if (idsEsistenti.length > 0) {
          q = q.not('id', 'in', `(${idsEsistenti.join(',')})`);
        }
        const { count } = await q;
        baseCount = count || 0;
      }
      let contatore = baseCount;

      for (let i = 0; i < vols.length; i++) {
        const v = vols[i];
        if (!v.nome.trim()) continue; // salta righe vuote

        if (v.id) {
          // Aggiorna esistente: MAI toccare VARCO o JOLLY, che possono essere stati
          // assegnati manualmente dalla griglia turni dall'admin FULL.
          const rowUpdate = {
            'NOME_COGNOME':   v.nome.trim().toUpperCase(),
            'CODICE_FISCALE': v.cf.trim().toUpperCase() || null,
            'TELEFONO':       v.tel.trim() || null,
            'NON_PC':         v.nonpc || false,
            'SEZIONE':        sezione,
            'TURNO':          turno,
          };
          const { error } = await sb.from('VOLONTARI').update(rowUpdate).eq('id', v.id);
          if (error) throw error;
          totSalvati++;
        } else {
          // Nuovo volontario: applica la logica di auto-assegnazione VARCO
          const isJolly = varcoNum === null || contatore >= 2;
          contatore++;
          const rowInsert = {
            'NOME_COGNOME':   v.nome.trim().toUpperCase(),
            'CODICE_FISCALE': v.cf.trim().toUpperCase() || null,
            'TELEFONO':       v.tel.trim() || null,
            'NON_PC':         v.nonpc || false,
            'SEZIONE':        sezione,
            'TURNO':          turno,
            'VARCO':          varcoNum,
            'JOLLY':          isJolly,
          };
          const { data: ins, error } = await sb.from('VOLONTARI').insert(rowInsert).select().single();
          if (error) throw error;
          v.id = ins.id;
          isJolly ? totJolly++ : totSalvati++;
        }
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
let _sezioniList = [];
let _sezioniCorrente = [];
let _volontariPerPdf = [], _mezziPerPdf = [], _varchiPerPdf = [], _turniPerPdf = [];

async function loadSezioniList(force = false) {
  if (_sezioniList.length && !force) return;
  const [{ data: varchiData }, { data: sezioniData }] = await Promise.all([
    sb.from('VARCHI').select('SEZIONI').order('SEZIONI'),
    sb.from('SEZIONI').select('SEZIONE').order('SEZIONE'),
  ]);
  const daVarchi  = (varchiData  || []).map(r => r['SEZIONI']).filter(Boolean);
  const daSezioni = (sezioniData || []).map(r => r['SEZIONE']).filter(Boolean);
  _sezioniList = [...new Set([...daVarchi, ...daSezioni])].sort();
}

async function renderInserimentoMezzi() {
  const sezione = CU['SEZIONE'];
  const isFull  = CU['TIPOLOGIA'] === 'ACCESSO FULL';
  document.getElementById('mezzi-sezione-label').textContent = 'Sezione: ' + (sezione || 'Tutte');

  setLoading(true);
  try {
    // Carica mezzi
    const { data: mezzi } = await (isFull
      ? sb.from('MEZZI').select('*').order('TARGA')
      : sb.from('MEZZI').select('*').eq('SEZIONE', sezione).order('TARGA'));
    _mezzi = mezzi || [];

    // Popola sezioni nel form (solo full può scegliere)
    await loadSezioniList();
    const selSez = document.getElementById('mezzo-sezione');
    if (isFull) {
      selSez.innerHTML = '<option value="">Seleziona una sezione</option>' +
        _sezioniList.map(s => `<option value="${s}">${s}</option>`).join('');
      document.getElementById('mezzo-sezione-wrap').style.display = '';
    } else {
      selSez.innerHTML = `<option value="${sezione}" selected>${sezione}</option>`;
      document.getElementById('mezzo-sezione-wrap').style.display = 'none';
    }
    document.getElementById('mezzo-utilizzo-wrap').style.display = isFull ? '' : 'none';
    const importBtn = document.getElementById('import-mezzi-btn');
    if (importBtn) importBtn.style.display = isFull ? '' : 'none';

    // Aggiorna contatori e tabella (usa filtraMezzi per gestire anche la search)
    const cntEl = document.getElementById('mezzi-counters');
    if (cntEl) cntEl.style.display = 'grid';
    filtraMezzi();
  } catch(e) { console.error(e); }
  finally { setLoading(false); }
}

function openFormMezzo() {
  document.getElementById('mezzo-edit-id').value = '';
  document.getElementById('form-mezzo-title').textContent = 'Aggiungi nuovo mezzo';
  document.getElementById('mezzo-targa').value = '';
  document.getElementById('mezzo-descrizione').value = '';
  document.getElementById('mezzo-tipologia').value = '';
  document.getElementById('mezzo-utilizzo').value = 'VARCHI';
  document.getElementById('mezzo-dislocazione').value = '';
  document.getElementById('mezzo-accesso-porto').checked = false;
  document.getElementById('mezzo-parcheggio').checked = false;
  document.getElementById('mezzo-aut').checked = false;
  document.getElementById('mezzo-note').value = '';
  document.getElementById('mezzo-alert').className = 'form-alert';
  if (CU['TIPOLOGIA'] !== 'ACCESSO FULL') {
    document.getElementById('mezzo-sezione').value = CU['SEZIONE'];
  } else {
    document.getElementById('mezzo-sezione').value = '';
  }
  document.getElementById('form-mezzo-wrap').style.display = '';
  document.getElementById('form-mezzo-wrap').scrollIntoView({ behavior:'smooth', block:'start' });
}

function chiudiFormMezzo() {
  document.getElementById('form-mezzo-wrap').style.display = 'none';
}

function editMezzo(id) { aprirePannelloMezzo(id); }

async function salvaMezzo() {
  const id          = document.getElementById('mezzo-edit-id').value;
  const targa       = document.getElementById('mezzo-targa').value.trim().toUpperCase();
  const descrizione = document.getElementById('mezzo-descrizione').value.trim().toUpperCase();
  const tipologia   = document.getElementById('mezzo-tipologia').value;
  const utilizzo    = CU['TIPOLOGIA'] === 'ACCESSO FULL' ? (document.getElementById('mezzo-utilizzo').value || 'VARCHI') : 'VARCHI';
  const sezione     = document.getElementById('mezzo-sezione').value || CU['SEZIONE'];
  const dislocazione= document.getElementById('mezzo-dislocazione').value;
  const accessoPorto= document.getElementById('mezzo-accesso-porto').checked;
  const parcheggio  = document.getElementById('mezzo-parcheggio').checked;
  const aut         = document.getElementById('mezzo-aut').checked;
  const note        = document.getElementById('mezzo-note').value.trim();
  if (!targa)       { showFormAlert('mezzo-alert','Inserisci la targa','err'); return; }
  if (!descrizione) { showFormAlert('mezzo-alert','Inserisci la descrizione del mezzo','err'); return; }
  if (!sezione)     { showFormAlert('mezzo-alert','Seleziona la sezione','err'); return; }

  // Trova varco della sezione (solo se UTILIZZO = VARCHI)
  let varco = null;
  if (utilizzo === 'VARCHI') {
    const { data: varcoData } = await sb.from('VARCHI').select('VARCO').eq('SEZIONI', sezione).maybeSingle();
    varco = varcoData ? varcoData['VARCO'] : null;
  }

  const row = {
    TARGA: targa, DESCRIZIONE: descrizione, TIPOLOGIA: tipologia,
    UTILIZZO: utilizzo, SEZIONE: sezione, VARCO: varco,
    DISLOCAZIONE: dislocazione || null,
    ACCESSO_PORTO: accessoPorto, PARCHEGGIO: parcheggio, AUT: aut,
    NOTE: note || null,
  };

  setLoading(true);
  try {
    if (id) {
      const { error } = await sb.from('MEZZI').update(row).eq('id', id);
      if (error) throw error;
    } else {
      const { data: ins, error } = await sb.from('MEZZI').insert(row).select().single();
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
  if (!confirm(`Eliminare il mezzo "${targa}"?`)) return;
  setLoading(true);
  try {
    await sb.from('MEZZI').delete().eq('id', id);
    await renderInserimentoMezzi();
  } catch(e) { alert('Errore: ' + e.message); }
  finally { setLoading(false); }
}


// ── RICERCA E TABELLA MEZZI ───────────────────────────────────
function _buildMezziRows(lista) {
  return lista.map(m => {
    const utilizzo = m['UTILIZZO'] || 'VARCHI';
    const uColor = utilizzo === 'VARCHI' ? 'badge-green' : (utilizzo === 'TRASPORTO' || utilizzo === 'TR VOLONTARI') ? 'badge-orange' : 'badge-grey';
    const noteQ = (m['NOTE'] || '').replace(/"/g, '&quot;');
    const td = html => `<td>${html}</td>`;
    const bc = (campo, val) =>
      `<td style="text-align:center;font-size:15px;cursor:pointer;color:${val?'var(--verde)':'var(--testo3)'}" onclick="toggleBoolMezzo(${m.id},'${campo}',${!!val});event.stopPropagation()" title="Clicca per cambiare">${val?'✓':'✗'}</td>`;
    return `<tr data-mezzo-id="${m.id}" onclick="aprirePannelloMezzo(${m.id})" style="cursor:pointer">
      ${td(`<span class="mono" style="font-weight:700">${m['TARGA']}</span>`)}
      ${td(m['DESCRIZIONE']||'—')}
      ${td(m['TIPOLOGIA']?`<span class="badge badge-blue">${m['TIPOLOGIA']}</span>`:'—')}
      ${td(`<span class="badge badge-grey">${m['SEZIONE']||'—'}</span>`)}
      ${td(`<span class="badge ${uColor}">${utilizzo}</span>`)}
      ${td(m['DISLOCAZIONE']?`<span class="badge badge-grey">${m['DISLOCAZIONE']}</span>`:'—')}
      ${bc('ACCESSO_PORTO',m['ACCESSO_PORTO'])}
      ${bc('PARCHEGGIO',m['PARCHEGGIO'])}
      ${bc('AUT',m['AUT'])}
      ${td(`<span title="${noteQ}" style="max-width:120px;display:inline-block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m['NOTE']||'—'}</span>`)}
      <td onclick="event.stopPropagation()" style="white-space:nowrap">
        <button class="btn btn-danger btn-sm" onclick="deleteMezzo(${m.id},'${m['TARGA']}')">✕</button>
      </td>
    </tr>`;
  }).join('');
}

function filtraMezzi() {
  const q = ((document.getElementById('mezzi-search')||{}).value || '').trim().toLowerCase();
  const lista = q
    ? _mezzi.filter(m => ['TARGA','DESCRIZIONE','TIPOLOGIA','SEZIONE','UTILIZZO','DISLOCAZIONE','NOTE'].some(f => (m[f]||'').toLowerCase().includes(q)))
    : _mezzi;

  const cntEl = document.getElementById('mezzi-counters');
  if (cntEl && cntEl.style.display !== 'none') {
    document.getElementById('cnt-mezzi-tot').textContent        = lista.length;
    document.getElementById('cnt-mezzi-varchi').textContent     = lista.filter(m => m['UTILIZZO'] === 'VARCHI').length;
    document.getElementById('cnt-mezzi-porto').textContent      = lista.filter(m => m['ACCESSO_PORTO']).length;
    document.getElementById('cnt-mezzi-parcheggio').textContent = lista.filter(m => m['PARCHEGGIO']).length;
    document.getElementById('cnt-mezzi-passful').textContent    = lista.filter(m => m['AUT']).length;
  }

  chiudiPannelloMezzo();
  const tbody = document.getElementById('tbody-mezzi');
  if (!lista.length) {
    tbody.innerHTML = q
      ? `<tr><td colspan="11" style="text-align:center;color:var(--testo3);padding:20px">Nessun risultato per "<strong>${q}</strong>"</td></tr>`
      : `<tr><td colspan="11"><div class="empty-state"><div class="ei">🚗</div><p>Nessun mezzo registrato.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = _buildMezziRows(lista);
}

// ── PANNELLO MODIFICA INLINE MEZZO ───────────────────────────
function aprirePannelloMezzo(id) {
  chiudiPannelloMezzo();
  const m = _mezzi.find(x => x.id === id);
  if (!m) return;
  const tr = document.querySelector(`#tbody-mezzi tr[data-mezzo-id="${id}"]`);
  if (!tr) return;
  tr.classList.add('selected-for-edit');

  const sel = (elId, opts, val) => `<select id="${elId}" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:4px;font-size:13px">${
    opts.map(o => `<option value="${o}"${o===(val||'')?'selected':''}>${o||'—'}</option>`).join('')
  }</select>`;
  const inp = (elId, val, up) => `<input id="${elId}" type="text" value="${(val||'').replace(/"/g,'&quot;')}" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:4px;font-size:13px${up?';text-transform:uppercase':''}" autocomplete="off">`;
  const chk = (elId, val, label) => `<label style="display:inline-flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;font-weight:600"><input type="checkbox" id="${elId}"${val?' checked':''} style="width:15px;height:15px;accent-color:var(--verde)">${label}</label>`;

  const lbl = t => `<div style="font-size:11px;font-weight:700;color:var(--testo3);text-transform:uppercase;margin-bottom:4px">${t}</div>`;
  const sezOpts = ['',..._sezioniList];
  const tipOpts = ['','FUORISTRADA','AUTOVETTURA','PULMINO','FURGONE','AUTOCARRO','ALTRO'];
  const utlOpts = ['VARCHI','TR VOLONTARI','SERVIZIO','TRASPORTO','SUPP CUCINA','DISL VOLONTARI'];
  const dslOpts = ['','PORTO','VARCO','CITTADELLA'];

  const panelRow = document.createElement('tr');
  panelRow.className = 'inline-edit-row';
  panelRow.innerHTML = `<td colspan="11" style="padding:0">
    <div style="background:#f0faf3;border-top:2px solid var(--verde);border-bottom:2px solid var(--verde);padding:16px 20px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div>${lbl('Targa')}${inp('ie-targa',m['TARGA'],true)}</div>
        <div>${lbl('Descrizione')}${inp('ie-descrizione',m['DESCRIZIONE'],true)}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div>${lbl('Tipologia')}${sel('ie-tipologia',tipOpts,m['TIPOLOGIA'])}</div>
        <div>${lbl('Utilizzo')}${sel('ie-utilizzo',utlOpts,m['UTILIZZO'])}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div>${lbl('Sezione')}${sel('ie-sezione',sezOpts,m['SEZIONE'])}</div>
        <div>${lbl('Dislocazione')}${sel('ie-dislocazione',dslOpts,m['DISLOCAZIONE'])}</div>
      </div>
      <div style="display:flex;gap:24px;margin-bottom:12px;flex-wrap:wrap">
        ${chk('ie-porto',m['ACCESSO_PORTO'],'Accesso Porto')}
        ${chk('ie-parcheggio',m['PARCHEGGIO'],'Parcheggio')}
        ${chk('ie-passful',m['AUT'],'Pass Full')}
      </div>
      <div style="margin-bottom:14px">${lbl('Note')}<textarea id="ie-note" rows="2" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:4px;font-size:13px;font-family:inherit;resize:vertical">${m['NOTE']||''}</textarea></div>
      <div style="display:flex;gap:10px;align-items:center">
        <button class="btn btn-primary btn-sm" onclick="salvaInlineMezzo(${id})">💾 Salva</button>
        <button class="btn btn-secondary btn-sm" onclick="chiudiPannelloMezzo()">Annulla</button>
        <div class="form-alert" id="ie-alert" style="margin:0;flex:1"></div>
      </div>
    </div>
  </td>`;
  tr.insertAdjacentElement('afterend', panelRow);
  document.getElementById('ie-targa').focus();
}

function chiudiPannelloMezzo() {
  document.querySelector('.inline-edit-row')?.remove();
  document.querySelectorAll('#tbody-mezzi tr.selected-for-edit').forEach(r => r.classList.remove('selected-for-edit'));
}

async function salvaInlineMezzo(id) {
  const targa        = document.getElementById('ie-targa').value.trim().toUpperCase();
  const descrizione  = document.getElementById('ie-descrizione').value.trim().toUpperCase();
  const tipologia    = document.getElementById('ie-tipologia').value || null;
  const utilizzo     = document.getElementById('ie-utilizzo').value || 'VARCHI';
  const sezione      = document.getElementById('ie-sezione').value || null;
  const dislocazione = document.getElementById('ie-dislocazione').value || null;
  const accessoPorto = document.getElementById('ie-porto').checked;
  const parcheggio   = document.getElementById('ie-parcheggio').checked;
  const aut          = document.getElementById('ie-passful').checked;
  const note         = document.getElementById('ie-note').value.trim() || null;

  if (!targa) { showFormAlert('ie-alert','Inserisci la targa','err'); return; }

  let varco = null;
  if (utilizzo === 'VARCHI' && sezione) {
    const { data: vx } = await sb.from('VARCHI').select('VARCO').eq('SEZIONI', sezione).maybeSingle();
    varco = vx ? vx['VARCO'] : null;
  }

  const upd = { TARGA: targa, DESCRIZIONE: descrizione, TIPOLOGIA: tipologia, UTILIZZO: utilizzo, SEZIONE: sezione, VARCO: varco, DISLOCAZIONE: dislocazione, ACCESSO_PORTO: accessoPorto, PARCHEGGIO: parcheggio, AUT: aut, NOTE: note };
  try {
    const { error } = await sb.from('MEZZI').update(upd).eq('id', id);
    if (error) throw error;
    const m = _mezzi.find(x => x.id === id);
    if (m) Object.assign(m, upd);
    chiudiPannelloMezzo();
    showSavedToast('✓ Salvato');
    filtraMezzi();
  } catch(e) { showFormAlert('ie-alert','Errore: ' + e.message,'err'); }
}

// ── MODIFICA INLINE TABELLA MEZZI ────────────────────────────
async function editCellaMezzo(td, id, campo, currentVal) {
  if (td.querySelector('input,select,textarea')) return;
  const opzioni = {
    TIPOLOGIA:    ['','FUORISTRADA','AUTOVETTURA','PULMINO','FURGONE','AUTOCARRO','ALTRO'],
    UTILIZZO:     ['VARCHI','TR VOLONTARI','SERVIZIO','TRASPORTO','SUPP CUCINA','DISL VOLONTARI'],
    DISLOCAZIONE: ['','PORTO','VARCO','CITTADELLA'],
  };
  const origHTML = td.innerHTML;
  let widget;
  if (campo === 'SEZIONE') {
    widget = document.createElement('select');
    ['', ..._sezioniList].forEach(o => {
      const opt = document.createElement('option');
      opt.value = o; opt.textContent = o || '—';
      if (o === (currentVal || '')) opt.selected = true;
      widget.appendChild(opt);
    });
  } else if (opzioni[campo]) {
    widget = document.createElement('select');
    opzioni[campo].forEach(o => {
      const opt = document.createElement('option');
      opt.value = o; opt.textContent = o || '—';
      if (o === (currentVal || '')) opt.selected = true;
      widget.appendChild(opt);
    });
  } else {
    widget = document.createElement('input');
    widget.type = 'text';
    widget.value = currentVal || '';
    if (campo === 'TARGA' || campo === 'DESCRIZIONE') widget.style.textTransform = 'uppercase';
  }
  widget.style.cssText = 'width:100%;min-width:70px;padding:2px 6px;border:1.5px solid var(--verde);border-radius:4px;font-size:12px;font-family:inherit;box-sizing:border-box';
  td.innerHTML = '';
  td.appendChild(widget);
  widget.focus();
  let saved = false;
  async function salva() {
    if (saved) return; saved = true;
    let val = (widget.tagName === 'SELECT' ? widget.value : widget.value.trim()) || null;
    if (campo === 'TARGA' || campo === 'DESCRIZIONE') val = (val || '').toUpperCase() || null;
    try {
      const upd = { [campo]: val };
      // Se SEZIONE o UTILIZZO cambia, ricalcola VARCO
      if (campo === 'SEZIONE' || campo === 'UTILIZZO') {
        const m = _mezzi.find(x => x.id === id);
        const util = campo === 'UTILIZZO' ? (val || 'VARCHI') : (m?.['UTILIZZO'] || 'VARCHI');
        const sez  = campo === 'SEZIONE'  ? (val || '') : (m?.['SEZIONE'] || '');
        if (util === 'VARCHI' && sez) {
          const { data: vx } = await sb.from('VARCHI').select('VARCO').eq('SEZIONI', sez).maybeSingle();
          upd['VARCO'] = vx ? vx['VARCO'] : null;
        } else { upd['VARCO'] = null; }
      }
      const { error } = await sb.from('MEZZI').update(upd).eq('id', id);
      if (error) throw error;
      const m = _mezzi.find(x => x.id === id);
      if (m) Object.assign(m, upd);
      showSavedToast('✓ Salvato');
      await renderInserimentoMezzi();
    } catch(e) { saved = false; td.innerHTML = origHTML; alert('Errore: ' + e.message); }
  }
  widget.addEventListener('blur', salva);
  widget.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); widget.blur(); }
    if (e.key === 'Escape') { saved = true; td.innerHTML = origHTML; }
  });
}

async function toggleBoolMezzo(id, campo, currentVal) {
  const newVal = !currentVal;
  try {
    const { error } = await sb.from('MEZZI').update({ [campo]: newVal }).eq('id', id);
    if (error) throw error;
    const m = _mezzi.find(x => x.id === id);
    if (m) m[campo] = newVal;
    showSavedToast('✓ Salvato');
    await renderInserimentoMezzi();
  } catch(e) { alert('Errore: ' + e.message); }
}

// ── IMPORTAZIONE EXCEL MEZZI ──────────────────────────────────
async function importaMezziExcel(input) {
  const file = input.files[0];
  if (!file) return;
  const alertEl = document.getElementById('import-mezzi-alert');
  alertEl.style.display = 'block';
  alertEl.className = 'form-alert show';
  alertEl.textContent = 'Lettura file in corso…';

  try {
    const data = await file.arrayBuffer();
    const wb   = XLSX.read(data, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    // Riga 0 = titolo, riga 1 = intestazioni, riga 2+ = dati
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const dataRows = raw.slice(2).filter(r => String(r[0] || '').trim());

    if (!dataRows.length) {
      alertEl.className = 'form-alert show err';
      alertEl.textContent = 'Nessun dato trovato. Controlla il file.';
      return;
    }

    // Carica dati esistenti
    const [{ data: varchi }, { data: mezziEsistenti }] = await Promise.all([
      sb.from('VARCHI').select('VARCO, SEZIONI'),
      sb.from('MEZZI').select('id, TARGA'),
    ]);
    const targheMap = {};
    (mezziEsistenti || []).forEach(m => { targheMap[m['TARGA'].trim().toUpperCase()] = m.id; });

    let inseriti = 0, aggiornati = 0, saltati = 0;
    const errori = [];

    for (let i = 0; i < dataRows.length; i++) {
      const r = dataRows[i];
      // Colonne: TARGA | MEZZO/DESCRIZIONE | TIPOLOGIA | PROPRIETÀ/SEZIONE | UTILIZZO | DISLOCAZIONE | ACCESSO PORTO | PARCHEGGIO | AUT | NOTE
      const targa       = String(r[0] || '').trim().toUpperCase();
      const descrizione = String(r[1] || '').trim().toUpperCase();
      const tipologia   = String(r[2] || '').trim().toUpperCase() || null;
      const sezione     = String(r[3] || '').trim().toUpperCase() || null;
      const utilizzo    = String(r[4] || '').trim().toUpperCase() || 'VARCHI';
      const dislocazione= String(r[5] || '').trim().toUpperCase() || null;
      const accessoPorto= ['SI','SÌ','YES','TRUE','1'].includes(String(r[6] || '').trim().toUpperCase());
      const parcheggio  = ['SI','SÌ','YES','TRUE','1'].includes(String(r[7] || '').trim().toUpperCase());
      const aut         = ['SI','SÌ','YES','TRUE','1'].includes(String(r[8] || '').trim().toUpperCase());
      const note        = String(r[9] || '').trim() || null;

      if (!targa) { saltati++; continue; }

      // Trova VARCO (solo se UTILIZZO = VARCHI)
      let varco = null;
      if (utilizzo === 'VARCHI' && sezione) {
        const vx = (varchi || []).find(v => (v['SEZIONI'] || '').trim().toUpperCase() === sezione);
        if (vx) varco = vx['VARCO'];
      }

      const row = {
        TARGA: targa, DESCRIZIONE: descrizione, TIPOLOGIA: tipologia,
        SEZIONE: sezione, UTILIZZO: utilizzo, VARCO: varco,
        DISLOCAZIONE: dislocazione, ACCESSO_PORTO: accessoPorto,
        PARCHEGGIO: parcheggio, AUT: aut, NOTE: note,
      };

      try {
        if (targheMap[targa] !== undefined) {
          const { error } = await sb.from('MEZZI').update(row).eq('id', targheMap[targa]);
          if (error) throw error;
          aggiornati++;
        } else {
          const { data: ins, error } = await sb.from('MEZZI').insert(row).select('id').single();
          if (error) throw error;
          targheMap[targa] = ins.id;
          inseriti++;
        }
      } catch(e) {
        errori.push(`Riga ${i+2} (${targa}): ${e.message}`);
        saltati++;
      }
    }

    input.value = '';
    let msg = `✅ Importazione completata: ${inseriti} inseriti, ${aggiornati} aggiornati, ${saltati} saltati.`;
    if (errori.length) msg += '<br>⚠️ Errori:<br>' + errori.map(e => `• ${e}`).join('<br>');
    alertEl.className = 'form-alert show ' + (errori.length ? 'err' : 'ok');
    alertEl.innerHTML = msg;
    await renderInserimentoMezzi();
  } catch(e) {
    console.error(e);
    alertEl.className = 'form-alert show err';
    alertEl.textContent = 'Errore durante l\'importazione: ' + e.message;
  }
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
    `<option value="${t['Etichetta']}" ${v['TURNO']===t['Etichetta']?'selected':''}>${t['NOME TURNO'] || t['Etichetta']}</option>`
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
  // Mezzi: non più legati al turno, si cercano per VARCO direttamente in _mezzi

  // Intestazione riepilogo
  const rows = [];
  rows.push([`RIEPILOGO TURNO: ${turnoObj['NOME TURNO'] || turno}`]);
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
    const mezzo      = _mezzi.find(m => m['UTILIZZO'] === 'VARCHI' && m['VARCO'] == v['VARCO']);

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
      mezzo ? mezzo['TARGA'] : '—',
      mezzo ? (mezzo['TIPOLOGIA'] || '—') : '—',
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
//  EXPORT EXCEL TABELLA PRESIDIO VARCHI
// ══════════════════════════════════════════════════════════════
async function scaricaTabellaPresidio(btn) {
  const origHTML = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Generazione...'; }

  try {
    // ── 1. Query: varchi ordinati, tutti i volontari JOLLY=false ──
    const [{ data: varchi, error: eV }, { data: volontari, error: eW }] = await Promise.all([
      sb.from('VARCHI').select('VARCO, SEZIONI').order('VARCO', { ascending: true }),
      sb.from('VOLONTARI').select('id, NOME_COGNOME, TELEFONO, SEZIONE, TURNO, VARCO')
        .order('id', { ascending: true })
    ]);
    if (eV) throw new Error('VARCHI: ' + eV.message);
    if (eW) throw new Error('VOLONTARI: ' + eW.message);

    // ── 2. Mappa precalcolata: "TURNO X" → varcoNum → [vol1, vol2] ──
    // Valori VARCO nel DB sono numeri; convertiamo in stringa per chiave
    const mapVol = {};          // mapVol["TURNO 1"]["5"] = [volA, volB]
    for (const v of (volontari || [])) {
      const turnoKey = v['TURNO'];
      const varcoKey = String(v['VARCO']);
      if (!turnoKey || !varcoKey || varcoKey === 'null') continue;
      if (!mapVol[turnoKey]) mapVol[turnoKey] = {};
      if (!mapVol[turnoKey][varcoKey]) mapVol[turnoKey][varcoKey] = [];
      if (mapVol[turnoKey][varcoKey].length < 2) mapVol[turnoKey][varcoKey].push(v);
    }

    // ── 3. Helper: estrai celle per un volontario (o vuoto) ──────
    function celleVol(vol) {
      if (!vol) return ['', '', '', '', ''];
      return [
        vol['NOME_COGNOME'] || '',   // NOME (campo intero, nessun split)
        '',                           // COGNOME (sempre vuoto)
        vol['TELEFONO']     || '',
        '',                           // MAIL (sempre vuota)
        vol['SEZIONE']      || ''    // GRUPPO
      ];
    }

    // ── 4. Intestazione 22 colonne ──────────────────────────────
    const header = [
      'N.VARCO', 'POSIZIONE',
      'I°T-NOME',   'I°T-COGNOME',   'I°T-TELEFONO',   'I°T-MAIL',   'I°T-GRUPPO',
      'II°T-NOME',  'II°T-COGNOME',  'II°T-TELEFONO',  'II°T-MAIL',  'II°T-GRUPPO',
      'III°T-NOME', 'III°T-COGNOME', 'III°T-TELEFONO', 'III°T-MAIL', 'III°T-GRUPPO',
      'IV°T-NOME',  'IV°T-COGNOME',  'IV°T-TELEFONO',  'IV°T-MAIL',  'IV°T-GRUPPO'
    ];

    // ── 5. Configurazione fogli ─────────────────────────────────
    // Turni certi dal DB: "TURNO 1"-"TURNO 4" = VENERDI, "TURNO 5"-"TURNO 8" = SABATO
    const fogli = [
      { sheetName: 'VENERDI', turni: ['TURNO 1', 'TURNO 2', 'TURNO 3', 'TURNO 4'] },
      { sheetName: 'SABATO',  turni: ['TURNO 5', 'TURNO 6', 'TURNO 7', 'TURNO 8'] }
    ];

    const wb = XLSX.utils.book_new();

    for (const foglio of fogli) {
      const [t1, t2, t3, t4] = foglio.turni;   // etichette I°…IV° turno
      const rows = [header];

      for (const varco of (varchi || [])) {
        const vNum = varco['VARCO'];
        const vKey = String(vNum);
        const pos  = varco['SEZIONI'] || '';

        // Slot 0 e 1 per ogni turno
        const v1 = { t1: (mapVol[t1]?.[vKey] || [])[0] || null,
                     t2: (mapVol[t2]?.[vKey] || [])[0] || null,
                     t3: (mapVol[t3]?.[vKey] || [])[0] || null,
                     t4: (mapVol[t4]?.[vKey] || [])[0] || null };
        const v2 = { t1: (mapVol[t1]?.[vKey] || [])[1] || null,
                     t2: (mapVol[t2]?.[vKey] || [])[1] || null,
                     t3: (mapVol[t3]?.[vKey] || [])[1] || null,
                     t4: (mapVol[t4]?.[vKey] || [])[1] || null };

        // Riga slot 1
        rows.push([vNum, pos, ...celleVol(v1.t1), ...celleVol(v1.t2), ...celleVol(v1.t3), ...celleVol(v1.t4)]);
        // Riga slot 2
        rows.push(['',   '',  ...celleVol(v2.t1), ...celleVol(v2.t2), ...celleVol(v2.t3), ...celleVol(v2.t4)]);
      }

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [
        {wch:8}, {wch:24},                          // N.VARCO, POSIZIONE
        {wch:30},{wch:4},{wch:14},{wch:4},{wch:20}, // I° turno
        {wch:30},{wch:4},{wch:14},{wch:4},{wch:20}, // II° turno
        {wch:30},{wch:4},{wch:14},{wch:4},{wch:20}, // III° turno
        {wch:30},{wch:4},{wch:14},{wch:4},{wch:20}  // IV° turno
      ];
      XLSX.utils.book_append_sheet(wb, ws, foglio.sheetName);
    }

    XLSX.writeFile(wb, 'TABELLA_PRESIDIO_2026.xlsx');

  } catch (err) {
    console.error(err);
    alert('Errore generazione tabella presidio: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = origHTML; }
  }
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
  tabs.forEach(tab => {
    const label = tab.textContent.trim();
    const btn = document.createElement('button');
    btn.className = 'drawer-tab' + (tab.classList.contains('active') ? ' active' : '');
    btn.textContent = label;
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
    return `  - ${t['NOME TURNO'] || t['Etichetta']}: ${volTot} volontari totali, varchi completi=${completi} parziali=${parziali} scoperti=${scoperti} extra=${extra}`;
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
  const miaSezione = CU['SEZIONE'] || 'NOME_SEZIONE';

  // Intestazione colonne
  const headers = ['NOME_COGNOME *', 'CODICE_FISCALE', 'TELEFONO', 'TURNO *', 'NON_PC (SI/NO)', 'SEZIONE *'];
  const istruzioni = [
    ['ISTRUZIONI - NON CANCELLARE QUESTA RIGA'],
    ['- NOME_COGNOME: obbligatorio, nome e cognome del volontario'],
    ['- CODICE_FISCALE: facoltativo'],
    ['- TELEFONO: facoltativo'],
    [`- TURNO: obbligatorio, inserire uno di questi valori: ${nomeTurni}`],
    ['- NON_PC: inserire SI se il volontario NON è di Protezione Civile, altrimenti NO o lasciare vuoto'],
    ['- SEZIONE: obbligatorio, nome della sezione di appartenenza del volontario'],
    [],
    headers
  ];

  // Righe esempio
  const esempi = [
    ['MARIO ROSSI', 'RSSMRA80A01H501Z', '3331234567', turni[0]?.['Etichetta'] || 'TURNO1', 'NO', miaSezione],
    ['ANNA BIANCHI', '', '3339876543', turni[1]?.['Etichetta'] || 'TURNO2', 'SI', miaSezione],
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([...istruzioni, ...esempi]);

  // Larghezze colonne
  ws['!cols'] = [{wch:30},{wch:20},{wch:16},{wch:12},{wch:16},{wch:20}];

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

    // Trova le righe dati (salta istruzioni, cerca header NOME_COGNOME)
    let startRow = 0;
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    for (let i = 0; i < raw.length; i++) {
      if (raw[i].some(cell => String(cell).includes('NOME_COGNOME'))) {
        startRow = i + 1;
        break;
      }
    }
    const dataRows = raw.slice(startRow).filter(r => String(r[0] || '').trim());

    if (!dataRows.length) {
      showFormAlert('import-alert', 'Nessun dato trovato nel file. Controlla il formato.', 'err');
      return;
    }

    // Contatori JOLLY per varco: pre-popola dai volontari già esistenti
    // { varcoKey -> { turno -> count } }
    const contatoriVarco = {};
    _volontari.forEach(v => {
      const vk = (v['VARCO'] !== null && v['VARCO'] !== undefined) ? String(v['VARCO']) : '__null__';
      if (!contatoriVarco[vk]) contatoriVarco[vk] = {};
      contatoriVarco[vk][v['TURNO']] = (contatoriVarco[vk][v['TURNO']] || 0) + 1;
    });

    const records = [];
    const righeIgnorate = []; // messaggi per le righe saltate

    for (let i = 0; i < dataRows.length; i++) {
      const row    = dataRows[i];
      const rowNum = i + 1; // numero progressivo record (1-based)

      const nome  = String(row[0] || '').trim();
      const cf    = String(row[1] || '').trim().toUpperCase() || null;
      const tel   = String(row[2] || '').trim() || null;
      const turno = String(row[3] || '').trim().toUpperCase();
      const nonpc = String(row[4] || '').trim().toUpperCase() === 'SI';
      // SEZIONE: colonna 5 del file; fallback a CU['SEZIONE'] per utenti non-FULL
      const sezRiga = (String(row[5] || '').trim() || CU['SEZIONE'] || '').toUpperCase();

      if (!nome) {
        righeIgnorate.push(`riga ${rowNum}: NOME_COGNOME mancante`);
        continue;
      }
      if (!sezRiga) {
        righeIgnorate.push(`riga ${rowNum}: SEZIONE mancante`);
        continue;
      }
      if (!turno) {
        righeIgnorate.push(`riga ${rowNum}: TURNO mancante`);
        continue;
      }

      const turnoValido = _turni.find(t => t['Etichetta'].toUpperCase() === turno);
      if (!turnoValido) {
        righeIgnorate.push(`riga ${rowNum}: TURNO non valido ("${turno}")`);
        continue;
      }

      // Trova VARCO per la sezione di questa riga
      const varcoRiga    = _varchi.find(v => (v['SEZIONI'] || '').toLowerCase() === sezRiga.toLowerCase());
      const varcoNumRiga = varcoRiga ? varcoRiga['VARCO'] : null;
      const vk           = (varcoNumRiga !== null && varcoNumRiga !== undefined) ? String(varcoNumRiga) : '__null__';

      if (!contatoriVarco[vk]) contatoriVarco[vk] = {};
      const posizione = contatoriVarco[vk][turnoValido['Etichetta']] || 0;
      const isJolly   = varcoNumRiga === null || posizione >= 2;
      contatoriVarco[vk][turnoValido['Etichetta']] = posizione + 1;

      records.push({
        NOME_COGNOME:   nome,
        CODICE_FISCALE: cf,
        TELEFONO:       tel,
        TURNO:          turnoValido['Etichetta'],
        SEZIONE:        sezRiga,
        VARCO:          varcoNumRiga,
        JOLLY:          isJolly,
        NON_PC:         nonpc,
      });
    }

    if (!records.length) {
      const dettaglio = righeIgnorate.length
        ? '<br>' + righeIgnorate.map(r => `• ${r}`).join('<br>')
        : '';
      alertEl.innerHTML = `Nessun record valido.${dettaglio}`;
      alertEl.className = 'form-alert show err';
      return;
    }

    // Inserisci a blocchi
    setLoading(true);
    let inseriti = 0;
    const CHUNK = 50;
    for (let i = 0; i < records.length; i += CHUNK) {
      const { error } = await sb.from('VOLONTARI').insert(records.slice(i, i + CHUNK));
      if (error) throw error;
      inseriti += Math.min(CHUNK, records.length - i);
    }

    input.value = ''; // reset input file

    let msgHtml = `✅ Importati ${inseriti} volontari!`;
    if (righeIgnorate.length) {
      msgHtml += `<br>⚠️ ${righeIgnorate.length} ${righeIgnorate.length === 1 ? 'riga ignorata' : 'righe ignorate'}:<br>` +
        righeIgnorate.map(r => `• ${r}`).join('<br>');
    }
    alertEl.innerHTML = msgHtml;
    alertEl.className = 'form-alert show ok';
    if (!righeIgnorate.length) setTimeout(() => alertEl.classList.remove('show'), 4000);

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

    await loadSezioniList(true);
    const selSez = document.getElementById('segn-sezione');
    if (!isFull && CU['SEZIONE']) {
      selSez.innerHTML = `<option value="${CU['SEZIONE']}" selected>${CU['SEZIONE']}</option>`;
      selSez.disabled = true;
    } else {
      selSez.disabled = false;
      selSez.innerHTML = '<option value="">Seleziona una sezione</option>' +
        _sezioniList.map(s => `<option value="${s}">${s}</option>`).join('');
    }
    document.getElementById('segn-sezioni-count').textContent = _sezioniList.length + ' sezioni caricate';

    if (isFull) {
      document.getElementById('segn-lista-wrap').style.display = '';
      document.getElementById('sezioni-manager-wrap').style.display = '';
      document.getElementById('utenti-mode-wrap').style.display = '';
      renderSezioniManager();
      renderUtentiMode();
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
      document.getElementById('sezioni-manager-wrap').style.display = 'none';
      document.getElementById('utenti-mode-wrap').style.display = 'none';
    }
  } catch(e) { console.error(e); }
  finally { setLoading(false); }
}

function renderSezioniManager() {
  const lista = document.getElementById('sezioni-lista');
  if (!_sezioniList.length) {
    lista.innerHTML = '<div style="color:var(--testo3);font-size:13px;padding:8px 0">Nessuna sezione presente.</div>';
    return;
  }
  lista.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px">` +
    _sezioniList.map(s =>
      `<div style="display:inline-flex;align-items:center;gap:6px;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 10px 6px 12px;font-size:13px;font-weight:600;color:var(--testo)">
        ${s}
        <button onclick="eliminaSezione('${s.replace(/'/g,"\\'")}');" title="Elimina" style="background:none;border:none;cursor:pointer;color:var(--rosso);font-size:18px;line-height:1;padding:0 2px;margin-left:2px">×</button>
      </div>`
    ).join('') +
  `</div>`;
}

async function renderUtentiMode() {
  try {
    const { data: utenti } = await sb.from('UTENTI')
      .select('TIPOLOGIA')
      .in('TIPOLOGIA', ['ACCESSO SEZIONALE', 'ACCESSO SEZIONALE_RO']);
    const haRO = (utenti || []).some(u => u['TIPOLOGIA'] === 'ACCESSO SEZIONALE_RO');
    const haStd = (utenti || []).some(u => u['TIPOLOGIA'] === 'ACCESSO SEZIONALE');
    const modoAttuale = haRO && !haStd ? 'ACCESSO SEZIONALE_RO' : 'ACCESSO SEZIONALE';
    _aggiornaBottoniModalita(modoAttuale);
  } catch(e) { document.getElementById('utenti-mode-status').textContent = 'Errore: ' + e.message; }
}

function _aggiornaBottoniModalita(modoAttuale) {
  const isRO = modoAttuale === 'ACCESSO SEZIONALE_RO';
  const btnStd = document.getElementById('mode-btn-standard');
  const btnRO  = document.getElementById('mode-btn-ro');
  const status = document.getElementById('utenti-mode-status');
  if (btnStd) { btnStd.className = isRO ? 'btn btn-secondary' : 'btn btn-primary'; }
  if (btnRO)  { btnRO.className  = isRO ? 'btn btn-primary'   : 'btn btn-secondary'; }
  if (status) status.textContent = isRO ? 'Tutti gli utenti sezionali sono in sola lettura.' : 'Tutti gli utenti sezionali hanno accesso standard.';
}

async function impostaModalitaSezionale(tipologia) {
  const status = document.getElementById('utenti-mode-status');
  status.textContent = 'Salvataggio…';
  try {
    const { error } = await sb.from('UTENTI')
      .update({ TIPOLOGIA: tipologia })
      .in('TIPOLOGIA', ['ACCESSO SEZIONALE', 'ACCESSO SEZIONALE_RO']);
    if (error) throw error;
    _aggiornaBottoniModalita(tipologia);
  } catch(e) {
    status.textContent = 'Errore: ' + e.message;
  }
}

async function aggiungiSezione() {
  const input = document.getElementById('nuova-sezione-input');
  const nome = input.value.trim().toUpperCase();
  if (!nome) { showFormAlert('sezioni-alert', 'Inserisci il nome della sezione', 'err'); return; }
  if (_sezioniList.includes(nome)) { showFormAlert('sezioni-alert', 'Sezione già presente', 'err'); return; }
  setLoading(true);
  try {
    const { error } = await sb.from('SEZIONI').insert({ SEZIONE: nome });
    if (error) throw error;
    input.value = '';
    await loadSezioniList(true);
    renderSezioniManager();
    showFormAlert('sezioni-alert', `✅ Sezione "${nome}" aggiunta!`, 'ok');
  } catch(e) { showFormAlert('sezioni-alert', 'Errore: ' + e.message, 'err'); }
  finally { setLoading(false); }
}

async function eliminaSezione(nome) {
  if (!confirm(`Eliminare la sezione "${nome}"?`)) return;
  setLoading(true);
  try {
    const { error } = await sb.from('SEZIONI').delete().eq('SEZIONE', nome);
    if (error) throw error;
    await loadSezioniList(true);
    renderSezioniManager();
    showFormAlert('sezioni-alert', `✅ Sezione "${nome}" eliminata.`, 'ok');
  } catch(e) { showFormAlert('sezioni-alert', 'Errore: ' + e.message, 'err'); }
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



let _swWaiting = null;

function swApplyUpdate() {
  if (_swWaiting) {
    _swWaiting.postMessage({ type: 'SKIP_WAITING' });
  }
  window.location.reload();
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      // Controlla subito se c'è già un SW in attesa
      if (reg.waiting) {
        _swWaiting = reg.waiting;
        document.getElementById('sw-update-banner').classList.add('show');
      }

      // Ascolta i futuri aggiornamenti
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            _swWaiting = newWorker;
            document.getElementById('sw-update-banner').classList.add('show');
          }
        });
      });
    }).catch(() => {});

    // Quando il SW cambia (dopo SKIP_WAITING), ricarica la pagina
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}
