/* =============================================================
   📱 APP.JS — Planning Poseurs v3
   Architecture : Router / Auth / Dashboard / Activités /
   Dossiers / Rapport / PDF / Email / Poseurs / Utils / Init
   ============================================================= */

const App = (() => {
  /* ---- Shortcuts ---- */
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  /* ---- State ---- */
  let user = null;        // current user
  let page = 'activities';
  let subTab = 'planned';
  let dossierId = null;   // current dossier detail
  let reportDosId = null; // current report dossier
  let sigCanvas, sigCtx, sigDrawing = false;
  let calView = 'month'; // 'month' | 'week' | 'day' | 'list'
  let calDate = new Date(); // current calendar focus date
  let calFilterPoseur = null; // null = all
  let calNowInterval = null;

  /* =============================================================
     UTILS
     ============================================================= */
  function isMag() { return user && user.role === 'magasin'; }

  function fmtDate(d) {
    const dt = new Date(d);
    const j = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    const m = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
    return `${j[dt.getDay()]} ${dt.getDate()} ${m[dt.getMonth()]} ${dt.getFullYear()}`;
  }
  function fmtTime(d) {
    const dt = new Date(d);
    return `${String(dt.getHours()).padStart(2,'0')}h${String(dt.getMinutes()).padStart(2,'0')}`;
  }
  function mapsUrl(addr, city) { return `https://maps.google.com/?q=${encodeURIComponent(addr + ', ' + city)}`; }
  function statusLabel(s) { return { confirmed:'Confirmé', pending:'En attente', urgent:'URGENT', done:'Terminé', in_progress:'En cours', sav_pending:'SAV en attente' }[s] || s; }
  function statusDot(s) { return { confirmed:'dot-confirmed', pending:'dot-pending', urgent:'dot-urgent', done:'dot-done', in_progress:'dot-confirmed', sav_pending:'dot-pending' }[s] || 'dot-pending'; }
  function poseurName(id) { const p = POSEURS.find(x => x.id === id); return p ? `${p.prenom} ${p.nom}` : '—'; }
  function poseurColor(id) { const p = POSEURS.find(x => x.id === id); return p ? p.couleur : '#999'; }
  function poseurInitials(id) { const p = POSEURS.find(x => x.id === id); return p ? p.prenom[0] + p.nom[0] : '??'; }

  /* Toast */
  function showToast(msg, type = 'success') {
    const wrap = $('toastWrap');
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    const icons = { success: 'ph-check-circle', error: 'ph-x-circle', warning: 'ph-warning', info: 'ph-info' };
    el.innerHTML = `<i class="ph ${icons[type] || icons.info}"></i> ${msg}`;
    wrap.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, 3000);
  }

  /* Overlay helpers */
  function openOv(id, html) {
    const contentId = id === 'ovModal' ? 'modContent' : 'modConfirm';
    $(contentId).innerHTML = `<div class="modal-handle"></div>${html}`;
    $(id).classList.add('on');
    document.body.style.overflow = 'hidden';
  }
  function closeOv(id, e) {
    if (e && e.target !== $(id)) return;
    $(id).classList.remove('on');
    document.body.style.overflow = '';
  }
  function openLB(src) { $('lbImg').src = src; $('lightbox').classList.add('on'); }
  function closeLB() { $('lightbox').classList.remove('on'); }

  /* Persistence */
  function save() {
    try {
      localStorage.setItem('pp3_activities', JSON.stringify(ACTIVITIES));
      localStorage.setItem('pp3_dossiers', JSON.stringify(DOSSIERS));
      localStorage.setItem('pp3_poseurs', JSON.stringify(POSEURS));
    } catch(e) {}
  }
  function loadSaved() {
    try {
      const a = localStorage.getItem('pp3_activities');
      const d = localStorage.getItem('pp3_dossiers');
      const p = localStorage.getItem('pp3_poseurs');
      if (a) ACTIVITIES = JSON.parse(a);
      if (d) DOSSIERS = JSON.parse(d);
      if (p) POSEURS = JSON.parse(p);
    } catch(e) {}
  }

  /* =============================================================
     AUTH
     ============================================================= */
  function doLogin() {
    const em = $('inEmail').value.trim();
    const pw = $('inPass').value;
    if (!em || !pw) { $('loginErr').textContent = 'Remplissez tous les champs.'; return; }
    const u = DEMO_USERS.find(u => u.email === em && u.pass === pw);
    if (!u) { $('loginErr').textContent = 'Identifiants incorrects.'; return; }
    enterApp(u);
  }

  function quickLogin(role) {
    enterApp(DEMO_USERS.find(u => u.role === role));
  }

  function enterApp(u) {
    user = u;
    $('loginErr').textContent = '';
    $('loginPage').classList.add('hide');
    $('shell').classList.add('on');

    const h = new Date().getHours();
    $('hdrGreet').textContent = (h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir') + ' 👋';
    $('hdrName').textContent = `${u.firstName} ${u.lastName}`;
    $('hdrRole').textContent = isMag() ? 'Magasin' : 'Poseur';
    $('hdrAvatar').style.background = isMag() ? STORE_CONFIG.accentColor : (poseurColor(u.poseurId) || STORE_CONFIG.accentColor);
    $('hdrAvatar').textContent = u.firstName[0] + u.lastName[0];

    // Show/hide mag-only nav items
    $$('.bnav-item.mag-only').forEach(b => b.style.display = isMag() ? 'flex' : 'none');

    nav(isMag() ? 'dashboard' : 'activities');
  }

  function logout() {
    $('shell').classList.remove('on');
    $('loginPage').classList.remove('hide');
    $('inEmail').value = ''; $('inPass').value = '';
    user = null;
  }

  /* =============================================================
     ROUTER
     ============================================================= */
  function nav(pg) {
    page = pg;
    $$('.page').forEach(p => p.classList.remove('on'));
    // Map to element id
    const map = { dashboard:'pgDashboard', activities:'pgActivities', dossiers:'pgDossiers',
      dossierDetail:'pgDossierDetail', rapport:'pgRapport', pdf:'pgPdf', profile:'pgProfile' };
    const el = $(map[pg]);
    if (el) el.classList.add('on');

    // Bottom nav highlight
    const navPg = pg === 'dossierDetail' ? 'dossiers' : pg;
    $$('.bnav-item').forEach(b => b.classList.toggle('on', b.dataset.pg === navPg));

    // FAB
    $('fab').classList.toggle('show', pg === 'activities' && isMag());

    // Render
    const renderers = {
      dashboard: renderDashboard,
      activities: renderActivities,
      dossiers: renderDossiersList,
      dossierDetail: renderDossierDetail,
      rapport: renderRapport,
      pdf: renderPdfView,
      profile: renderProfile
    };
    if (renderers[pg]) renderers[pg]();
  }

  /* =============================================================
     DASHBOARD (magasin only)
     ============================================================= */
  function renderDashboard() {
    const posesMonth = ACTIVITIES.filter(a => a.type === 'Pose' && a.status === 'done').length;
    const savPending = ACTIVITIES.filter(a => a.type === 'SAV' && a.status !== 'done').length;
    const dosDone = DOSSIERS.filter(d => d.status === 'done').length;
    const ca = DOSSIERS.filter(d => d.status === 'done').reduce((s, d) => s + d.amount, 0);
    const urgents = ACTIVITIES.filter(a => a.status === 'urgent' && a.status !== 'done');

    let html = `
      <div class="kpi-grid">
        <div class="kpi"><div class="kpi-num">${posesMonth}</div><div class="kpi-label">Poses terminées</div></div>
        <div class="kpi"><div class="kpi-num">${savPending}${savPending > 0 ? '<span class="kpi-badge" style="background:var(--danger);color:#fff">!</span>' : ''}</div><div class="kpi-label">SAV en attente</div></div>
        <div class="kpi"><div class="kpi-num">${dosDone}</div><div class="kpi-label">Dossiers terminés</div></div>
        <div class="kpi"><div class="kpi-num" style="font-size:22px">${ca.toLocaleString('fr-BE')}€</div><div class="kpi-label">CA du mois</div></div>
      </div>`;

    // Chart
    html += `<div class="chart-wrap"><h4>Poses par semaine</h4><canvas id="chartCanvas"></canvas></div>`;

    // Poseurs actifs
    html += `<div class="sec-title">Poseurs actifs</div>`;
    POSEURS.filter(p => p.actif).forEach(p => {
      const count = ACTIVITIES.filter(a => a.poseurId === p.id && a.status !== 'done').length;
      html += `<div class="card" style="display:flex;align-items:center;gap:10px">
        <div class="poseur-av" style="background:${p.couleur}">${p.prenom[0]}${p.nom[0]}</div>
        <div style="flex:1"><div style="font-weight:600;font-size:13px">${p.prenom} ${p.nom}</div><div style="font-size:11px;color:var(--text-light)">${count} activité(s) en cours</div></div>
        <span class="badge" style="background:${count > 0 ? '#fef3c7;color:#d97706' : '#dcfce7;color:#16a34a'}">${count > 0 ? 'Occupé' : 'Dispo'}</span>
      </div>`;
    });

    // Recent activities
    html += `<div class="sec-title">Dernières activités</div>`;
    ACTIVITIES.slice(0, 5).forEach(a => {
      const bc = a.type === 'Pose' ? 'badge-pose' : a.type === 'SAV' ? 'badge-sav' : 'badge-livraison';
      html += `<div class="card" onclick="App.openDossierFromAct(${a.id})" style="padding:10px 14px">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span class="badge ${bc}">${a.type}</span>
          <span class="status-txt"><span class="dot ${statusDot(a.status)}"></span>${statusLabel(a.status)}</span>
        </div>
        <div style="font-weight:600;font-size:12px;margin-top:6px">${a.client.lastName} ${a.client.firstName}</div>
      </div>`;
    });

    // SAV urgents
    if (urgents.length) {
      html += `<div class="sec-title" style="color:var(--danger)">⚠ SAV urgents</div>`;
      urgents.forEach(a => {
        html += `<div class="card" style="border-left:3px solid var(--danger)">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="badge badge-sav"><i class="ph ph-warning"></i> URGENT</span>
            <span style="font-size:11px;color:var(--text-light)">${fmtDate(a.slot.start)}</span>
          </div>
          <div style="font-weight:600;font-size:13px;margin:6px 0">${a.client.lastName} ${a.client.firstName}</div>
          <div style="font-size:12px;color:var(--text-light)">${a.notes || 'Pas de détails'}</div>
        </div>`;
      });
    }

    $('pgDashboard').innerHTML = html;

    // Draw chart after render
    setTimeout(drawChart, 50);
  }

  function drawChart() {
    const canvas = $('chartCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    const w = rect.width, h = rect.height;

    // Compute weekly data (last 4 weeks)
    const weeks = [0, 0, 0, 0];
    const now = new Date();
    ACTIVITIES.filter(a => a.type === 'Pose').forEach(a => {
      const d = new Date(a.slot.start);
      const diff = Math.floor((now - d) / (7 * 24 * 60 * 60 * 1000));
      if (diff >= 0 && diff < 4) weeks[3 - diff]++;
    });

    const max = Math.max(...weeks, 1);
    const labels = ['S-3', 'S-2', 'S-1', 'Cette sem.'];
    const barW = (w - 60) / 4;
    const chartH = h - 30;

    ctx.fillStyle = '#f9fafb';
    ctx.fillRect(0, 0, w, h);

    weeks.forEach((v, i) => {
      const x = 30 + i * barW + barW * 0.2;
      const bw = barW * 0.6;
      const bh = (v / max) * (chartH - 10);
      const y = chartH - bh;

      // Bar
      ctx.fillStyle = STORE_CONFIG.accentColor;
      ctx.beginPath();
      const r = 4;
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + bw - r, y);
      ctx.quadraticCurveTo(x + bw, y, x + bw, y + r);
      ctx.lineTo(x + bw, chartH);
      ctx.lineTo(x, chartH);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.fill();

      // Value
      ctx.fillStyle = '#1f2937';
      ctx.font = '600 11px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(v, x + bw / 2, y - 4);

      // Label
      ctx.fillStyle = '#6b7280';
      ctx.font = '500 10px Inter';
      ctx.fillText(labels[i], x + bw / 2, h - 6);
    });
  }

  /* =============================================================
     ACTIVITÉS + CALENDRIER
     ============================================================= */

  /* ---- Filtered activities helper ---- */
  function filterActs(key) {
    const now = new Date(NOW.toDateString());
    let list = ACTIVITIES;
    if (!isMag() && user.poseurId) list = list.filter(a => a.poseurId === user.poseurId);
    switch (key) {
      case 'planned': return list.filter(a => a.status !== 'done' && a.type !== 'SAV' && new Date(a.slot.start) >= now);
      case 'to-plan': return list.filter(a => a.status === 'pending');
      case 'sav': return list.filter(a => a.type === 'SAV' && a.status !== 'done');
      case 'done': return list.filter(a => a.status === 'done');
      default: return list;
    }
  }
  function setSubTab(key) { subTab = key; renderActivities(); }

  /* Activities for a date, with poseur filter */
  function actsForDate(date) {
    let list = ACTIVITIES;
    if (!isMag() && user.poseurId) list = list.filter(a => a.poseurId === user.poseurId);
    if (calFilterPoseur) list = list.filter(a => a.poseurId === calFilterPoseur);
    return list.filter(a => {
      const d = new Date(a.slot.start);
      return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() && d.getDate() === date.getDate();
    });
  }

  function actClass(a) { return a.status === 'urgent' ? 'urgent' : a.type.toLowerCase(); }

  /* ---- Main render ---- */
  function renderActivities() {
    // Update urgent badge
    const urgentN = ACTIVITIES.filter(a => a.status === 'urgent').length;
    const badge = $('navBadge');
    if (badge) { badge.textContent = urgentN; badge.classList.toggle('show', urgentN > 0); }

    let html = renderCalToolbar();

    // Poseur filter (magasin only)
    if (isMag()) {
      html += `<div class="cal-poseur-filter">
        <button class="cal-pf-btn${!calFilterPoseur ? ' on' : ''}" onclick="App.setCalFilter(null)">Tous</button>
        ${POSEURS.filter(p => p.actif).map(p =>
          `<button class="cal-pf-btn${calFilterPoseur === p.id ? ' on' : ''}" onclick="App.setCalFilter(${p.id})"><span class="cal-pf-dot" style="background:${p.couleur}"></span>${p.prenom}</button>`
        ).join('')}
      </div>`;
    }

    if (calView === 'list') html += renderListView();
    else if (calView === 'month') html += renderMonthView();
    else if (calView === 'week') html += renderWeekView();
    else if (calView === 'day') html += renderDayView();

    $('pgActivities').innerHTML = html;

    // Start now-line updater for week/day views
    clearInterval(calNowInterval);
    if (calView === 'week' || calView === 'day') {
      updateNowLine();
      calNowInterval = setInterval(updateNowLine, 60000);
    }
  }

  /* ---- Calendar toolbar ---- */
  function renderCalToolbar() {
    const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    const JOURS_COURT = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
    let title = '';
    if (calView === 'month') title = `${MOIS[calDate.getMonth()]} ${calDate.getFullYear()}`;
    else if (calView === 'week') {
      const ws = weekStart(calDate);
      const we = new Date(ws); we.setDate(we.getDate() + 6);
      title = `${ws.getDate()} ${MOIS[ws.getMonth()].slice(0,3)} — ${we.getDate()} ${MOIS[we.getMonth()].slice(0,3)}`;
    } else if (calView === 'day') {
      title = `${JOURS_COURT[calDate.getDay()]} ${calDate.getDate()} ${MOIS[calDate.getMonth()]}`;
    } else {
      title = 'Activités';
    }
    return `<div class="cal-toolbar">
      <div class="cal-nav-group">
        <button class="cal-nav-btn" onclick="App.calPrev()"><i class="ph ph-caret-left"></i></button>
        <button class="cal-today-btn" onclick="App.calToday()">Auj.</button>
        <button class="cal-nav-btn" onclick="App.calNext()"><i class="ph ph-caret-right"></i></button>
      </div>
      <span class="cal-title">${title}</span>
      <div class="cal-views">
        ${['list','month','week','day'].map(v => {
          const labels = { list:'☰', month:'Mois', week:'Sem.', day:'Jour' };
          return `<button class="cal-view-btn${calView === v ? ' on' : ''}" onclick="App.setCalView('${v}')">${labels[v]}</button>`;
        }).join('')}
      </div>
    </div>`;
  }

  /* Navigation */
  function calPrev() {
    if (calView === 'month') calDate.setMonth(calDate.getMonth() - 1);
    else if (calView === 'week') calDate.setDate(calDate.getDate() - 7);
    else if (calView === 'day') calDate.setDate(calDate.getDate() - 1);
    renderActivities();
  }
  function calNext() {
    if (calView === 'month') calDate.setMonth(calDate.getMonth() + 1);
    else if (calView === 'week') calDate.setDate(calDate.getDate() + 7);
    else if (calView === 'day') calDate.setDate(calDate.getDate() + 1);
    renderActivities();
  }
  function calToday() { calDate = new Date(); renderActivities(); }
  function setCalView(v) { calView = v; renderActivities(); }
  function setCalFilter(id) { calFilterPoseur = id; renderActivities(); }

  /* ---- Helper: Monday of the week ---- */
  function weekStart(d) {
    const dt = new Date(d);
    const day = dt.getDay();
    const diff = (day === 0 ? -6 : 1) - day;
    dt.setDate(dt.getDate() + diff);
    dt.setHours(0,0,0,0);
    return dt;
  }

  /* =============================================================
     LIST VIEW (old activities view)
     ============================================================= */
  function renderListView() {
    const tabs = [
      { key: 'planned', label: 'Planifiées' },
      { key: 'to-plan', label: 'À planifier' },
      { key: 'sav', label: 'SAV' },
      { key: 'done', label: 'Terminées' }
    ];
    const counts = {};
    tabs.forEach(t => counts[t.key] = filterActs(t.key).length);

    let html = `<div class="tabs">${tabs.map(t =>
      `<button class="tab${subTab === t.key ? ' on' : ''}" onclick="App.setSubTab('${t.key}')">${t.label}<span class="cnt">${counts[t.key]}</span></button>`
    ).join('')}</div>`;

    const acts = filterActs(subTab);
    if (!acts.length) {
      html += '<div class="empty"><i class="ph ph-clipboard"></i><p>Aucune activité</p></div>';
    } else {
      acts.forEach(a => {
        const bc = a.type === 'Pose' ? 'badge-pose' : a.type === 'SAV' ? 'badge-sav' : 'badge-livraison';
        const ic = a.type === 'Pose' ? 'ph-hard-hat' : a.type === 'SAV' ? 'ph-first-aid' : 'ph-truck';
        const addr = a.client.address + ', ' + a.client.city;
        html += `<div class="card" onclick="App.openActDetail(${a.id})">
          <div class="card-header">
            <span class="badge ${bc}"><i class="ph ${ic}"></i> ${a.type}</span>
            <span class="status-txt"><span class="dot ${statusDot(a.status)}"></span>${statusLabel(a.status)}</span>
          </div>
          <div style="font-weight:700;font-size:14px;margin-bottom:6px">${a.client.lastName} ${a.client.firstName}</div>
          <div class="irow"><i class="ph ph-map-pin"></i><a href="${mapsUrl(a.client.address, a.client.city)}" target="_blank" onclick="event.stopPropagation()">${addr}</a></div>
          <div class="irow"><i class="ph ph-phone"></i><a href="tel:${a.client.phone.replace(/\s/g,'')}" onclick="event.stopPropagation()">${a.client.phone}</a></div>
          <div class="slot"><i class="ph ph-calendar-blank"></i>${fmtDate(a.slot.start)} · ${fmtTime(a.slot.start)} → ${fmtTime(a.slot.end)}</div>
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
            <div class="poseur-av" style="background:${poseurColor(a.poseurId)};width:22px;height:22px;font-size:9px">${poseurInitials(a.poseurId)}</div>
            <span style="font-size:11px;color:var(--text-light)">${poseurName(a.poseurId)}</span>
          </div>
          ${a.dossierId ? `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();App.openDossier(${a.dossierId})"><i class="ph ph-folder-open"></i> Ouvrir le dossier</button>` : ''}
        </div>`;
      });
    }
    return html;
  }

  /* =============================================================
     MONTH VIEW
     ============================================================= */
  function renderMonthView() {
    const year = calDate.getFullYear(), month = calDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startOff = (firstDay.getDay() + 6) % 7; // Monday=0
    const todayStr = new Date().toDateString();

    let html = `<div class="cal-month-weekdays"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>`;
    html += '<div class="cal-month-grid">';

    // Previous month days
    const prevLast = new Date(year, month, 0).getDate();
    for (let i = startOff - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevLast - i);
      html += renderMonthCell(d, true, todayStr);
    }
    // Current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, month, day);
      html += renderMonthCell(d, false, todayStr);
    }
    // Next month fill
    const total = startOff + lastDay.getDate();
    const rem = (7 - (total % 7)) % 7;
    for (let i = 1; i <= rem; i++) {
      const d = new Date(year, month + 1, i);
      html += renderMonthCell(d, true, todayStr);
    }
    html += '</div>';
    return html;
  }

  function renderMonthCell(date, isOther, todayStr) {
    const isToday = date.toDateString() === todayStr;
    const acts = actsForDate(date);
    const cls = `cal-day-cell${isOther ? ' other' : ''}${isToday ? ' today' : ''}`;
    const dateISO = date.toISOString();

    let inner = `<div class="cal-day-num">${date.getDate()}</div>`;
    const show = acts.slice(0, 2);
    show.forEach(a => {
      inner += `<div class="cal-day-evt ${actClass(a)}">${a.client.lastName}</div>`;
    });
    if (acts.length > 2) inner += `<div class="cal-day-more">+${acts.length - 2}</div>`;

    return `<div class="${cls}" onclick="App.openDayPanel('${dateISO}')">${inner}</div>`;
  }

  /* =============================================================
     WEEK VIEW
     ============================================================= */
  function renderWeekView() {
    const ws = weekStart(calDate);
    const JOURS = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
    const todayStr = new Date().toDateString();
    // On mobile show 3 days, else 7
    const isMobile = window.innerWidth <= 480;
    const numDays = isMobile ? 3 : 7;
    // On mobile, center on calDate
    let startDate;
    if (isMobile) {
      startDate = new Date(calDate);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(0,0,0,0);
    } else {
      startDate = ws;
    }

    const days = [];
    for (let i = 0; i < numDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      days.push(d);
    }

    const HOURS_START = 7, HOURS_END = 20;
    const hourCount = HOURS_END - HOURS_START;
    const colW = `${100 / (numDays + 1)}%`;
    const labelW = '38px';

    // Header
    let html = `<div class="cal-week-wrap" id="calWeekWrap">`;
    html += `<div class="cal-week-header" style="grid-template-columns:${labelW} repeat(${numDays},1fr)">`;
    html += `<div class="wh-cell"></div>`;
    days.forEach((d, i) => {
      const isT = d.toDateString() === todayStr;
      const dayName = JOURS[(d.getDay() + 6) % 7];
      html += `<div class="wh-cell${isT ? ' today' : ''}" onclick="App.calGoDay('${d.toISOString()}')">${dayName}<span class="wh-num">${d.getDate()}</span></div>`;
    });
    html += '</div>';

    // Body grid
    html += `<div class="cal-week-body" style="grid-template-columns:${labelW} repeat(${numDays},1fr);position:relative">`;

    // Hour labels + rows
    for (let h = HOURS_START; h < HOURS_END; h++) {
      html += `<div class="cal-hour-label" style="grid-row:${h - HOURS_START + 1}">${String(h).padStart(2,'0')}h</div>`;
      for (let c = 0; c < numDays; c++) {
        const d = days[c];
        const clickDate = new Date(d);
        clickDate.setHours(h, 0, 0, 0);
        html += `<div class="cal-hour-row" style="grid-row:${h - HOURS_START + 1};grid-column:${c + 2}" ${isMag() ? `onclick="App.openNewActivityAt('${clickDate.toISOString()}')"` : ''}></div>`;
      }
    }

    // Activity blocks
    days.forEach((d, colIdx) => {
      const dayActs = actsForDate(d);
      // Detect overlaps
      const placed = [];
      dayActs.forEach(a => {
        const s = new Date(a.slot.start);
        const e = new Date(a.slot.end);
        const top = Math.max(0, (s.getHours() + s.getMinutes() / 60 - HOURS_START)) * 60;
        const bot = Math.min(hourCount, (e.getHours() + e.getMinutes() / 60 - HOURS_START)) * 60;
        const height = Math.max(bot - top, 20);
        // Check overlap
        let isOverlap = false, isSecond = false;
        placed.forEach(p => {
          if (top < p.bot && bot > p.top) { isOverlap = true; if (top >= p.top) isSecond = true; }
        });
        placed.push({ top, bot, id: a.id });

        const halfCls = isOverlap ? ` half${isSecond ? ' second' : ''}` : '';
        const rapportBtn = (!isMag() && a.dossierId) ? `<span class="wb-rapport">📋 Rapport</span>` : '';

        html += `<div class="cal-week-block ${actClass(a)}${halfCls}" style="top:${top}px;height:${height}px;grid-column:${colIdx + 2}" onclick="App.openActDetail(${a.id})">
          <div class="wb-client">${a.client.lastName}</div>
          <div class="wb-time">${fmtTime(a.slot.start)}→${fmtTime(a.slot.end)}</div>
          ${rapportBtn}
          <div class="wb-poseur" style="background:${poseurColor(a.poseurId)}">${poseurInitials(a.poseurId)}</div>
        </div>`;
      });
    });

    // Now line
    html += `<div class="cal-now-line" id="calNowLine" style="display:none"></div>`;
    html += '</div></div>';
    return html;
  }

  /* =============================================================
     DAY VIEW
     ============================================================= */
  function renderDayView() {
    const HOURS_START = 7, HOURS_END = 20;
    const hourCount = HOURS_END - HOURS_START;
    const dayActs = actsForDate(calDate);
    const todayStr = new Date().toDateString();
    const isToday = calDate.toDateString() === todayStr;

    // Summary
    const poses = dayActs.filter(a => a.type === 'Pose').length;
    const savs = dayActs.filter(a => a.type === 'SAV').length;
    const livs = dayActs.filter(a => a.type === 'Livraison').length;
    const poseursSet = new Set(dayActs.map(a => a.poseurId));

    let html = `<div class="cal-day-summary">
      <span><span class="cal-pf-dot" style="background:var(--info)"></span>${poses} pose(s)</span>
      <span><span class="cal-pf-dot" style="background:var(--warning)"></span>${savs} SAV</span>
      <span><span class="cal-pf-dot" style="background:var(--success)"></span>${livs} livr.</span>
      <span><i class="ph ph-users" style="font-size:13px"></i> ${poseursSet.size} poseur(s)</span>
    </div>`;

    html += `<div class="cal-day-wrap" id="calDayWrap" style="height:${hourCount * 60 + 20}px">`;

    // Hour lines
    for (let h = HOURS_START; h < HOURS_END; h++) {
      const top = (h - HOURS_START) * 60;
      html += `<div class="cal-day-hour" style="top:${top}px">${String(h).padStart(2,'0')}h</div>`;
      html += `<div style="position:absolute;left:42px;right:0;top:${top}px;height:60px;border-bottom:1px solid #f0f0f0;border-left:1px solid var(--border)" ${isMag() ? `onclick="App.openNewActivityAt('${new Date(calDate.getFullYear(),calDate.getMonth(),calDate.getDate(),h).toISOString()}')"` : ''}></div>`;
    }

    // Activity blocks
    const placed = [];
    dayActs.forEach(a => {
      const s = new Date(a.slot.start);
      const e = new Date(a.slot.end);
      const top = Math.max(0, (s.getHours() + s.getMinutes() / 60 - HOURS_START)) * 60;
      const bot = Math.min(hourCount, (e.getHours() + e.getMinutes() / 60 - HOURS_START)) * 60;
      const height = Math.max(bot - top, 40);
      let isOverlap = false, isSecond = false;
      placed.forEach(p => {
        if (top < p.bot && bot > p.top) { isOverlap = true; if (top >= p.top) isSecond = true; }
      });
      placed.push({ top, bot });

      const style = `top:${top}px;height:${height}px;${isOverlap ? `width:48%;${isSecond ? 'left:52%' : 'left:46px'}` : ''}`;

      html += `<div class="cal-day-block ${actClass(a)}" style="${style}" onclick="App.openActDetail(${a.id})">
        <div class="db-client">${a.client.lastName} ${a.client.firstName}</div>
        <div class="db-addr">${a.client.address}, ${a.client.city}</div>
        <div class="db-time"><i class="ph ph-clock"></i> ${fmtTime(a.slot.start)} → ${fmtTime(a.slot.end)}</div>
        <div class="db-poseur"><div class="poseur-av" style="background:${poseurColor(a.poseurId)};width:18px;height:18px;font-size:8px">${poseurInitials(a.poseurId)}</div> ${poseurName(a.poseurId)}</div>
        <div class="db-status"><span class="dot ${statusDot(a.status)}"></span>${statusLabel(a.status)}</div>
        ${a.dossierId ? `<div class="db-actions"><button onclick="event.stopPropagation();App.openDossier(${a.dossierId})">📁 Dossier</button>${!isMag() ? `<button onclick="event.stopPropagation();App.openReport(${a.dossierId})">📋 Rapport</button>` : ''}</div>` : ''}
      </div>`;
    });

    // Now line
    if (isToday) html += `<div class="cal-now-line" id="calNowLine" style="left:42px;display:none"></div>`;
    html += '</div>';
    return html;
  }

  /* Now line updater */
  function updateNowLine() {
    const el = document.getElementById('calNowLine');
    if (!el) return;
    const now = new Date();
    const top = (now.getHours() + now.getMinutes() / 60 - 7) * 60;
    if (top < 0 || top > 13 * 60) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    el.style.top = top + 'px';
  }

  /* Go to day from week header click */
  function calGoDay(iso) { calDate = new Date(iso); calView = 'day'; renderActivities(); }

  /* =============================================================
     SIDE PANEL (month day click)
     ============================================================= */
  function openDayPanel(iso) {
    const date = new Date(iso);
    const acts = actsForDate(date);
    $('sidePanelTitle').textContent = fmtDate(date);

    let html = '';
    if (!acts.length) {
      html = '<div class="empty" style="padding:24px"><p>Aucune activité ce jour</p></div>';
    } else {
      acts.forEach(a => {
        const bc = a.type === 'Pose' ? 'badge-pose' : a.type === 'SAV' ? 'badge-sav' : 'badge-livraison';
        html += `<div class="card" onclick="App.closeSide();App.openActDetail(${a.id})">
          <div class="card-header">
            <span class="badge ${bc}">${a.type}</span>
            <span class="status-txt"><span class="dot ${statusDot(a.status)}"></span>${statusLabel(a.status)}</span>
          </div>
          <div style="font-weight:600;font-size:13px">${a.client.lastName} ${a.client.firstName}</div>
          <div class="slot"><i class="ph ph-clock"></i>${fmtTime(a.slot.start)} → ${fmtTime(a.slot.end)}</div>
          <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text-light)">
            <div class="poseur-av" style="background:${poseurColor(a.poseurId)};width:18px;height:18px;font-size:8px">${poseurInitials(a.poseurId)}</div>
            ${poseurName(a.poseurId)}
          </div>
          ${a.dossierId ? `<button class="btn btn-primary btn-sm" style="margin-top:8px" onclick="event.stopPropagation();App.closeSide();App.openDossier(${a.dossierId})"><i class="ph ph-folder-open"></i> Dossier</button>` : ''}
        </div>`;
      });
    }
    if (isMag()) {
      const clickDate = new Date(date); clickDate.setHours(8, 0, 0, 0);
      html += `<button class="btn btn-accent btn-sm" style="margin-top:8px" onclick="App.closeSide();App.openNewActivityAt('${clickDate.toISOString()}')"><i class="ph ph-plus-circle"></i> Ajouter une activité</button>`;
    }
    $('sidePanelContent').innerHTML = html;
    $('sideOverlay').classList.add('on');
    $('sidePanel').classList.add('on');
  }

  function closeSide() {
    $('sideOverlay').classList.remove('on');
    $('sidePanel').classList.remove('on');
  }

  /* =============================================================
     NEW ACTIVITY AT specific time (calendar click)
     ============================================================= */
  function openNewActivityAt(iso) {
    if (!isMag()) return;
    const dt = new Date(iso);
    // Pre-fill date and time in the new activity modal
    openNewActivity(dt);
  }

  function openActDetail(id) {
    const a = ACTIVITIES.find(x => x.id === id); if (!a) return;
    const bc = a.type === 'Pose' ? 'badge-pose' : a.type === 'SAV' ? 'badge-sav' : 'badge-livraison';
    const ic = a.type === 'Pose' ? 'ph-hard-hat' : a.type === 'SAV' ? 'ph-first-aid' : 'ph-truck';
    const addr = a.client.address + ', ' + a.client.city;

    let html = `
      <span class="badge ${bc}" style="margin-bottom:6px"><i class="ph ${ic}"></i> ${a.type}</span>
      <h2 class="modal-title">${a.client.lastName} ${a.client.firstName}</h2>
      <div class="sec-title">Informations</div>
      <div class="irow" style="padding:6px 0"><i class="ph ph-map-pin"></i><a href="${mapsUrl(a.client.address, a.client.city)}" target="_blank">${addr}</a></div>
      <div class="irow" style="padding:6px 0"><i class="ph ph-phone"></i><a href="tel:${a.client.phone.replace(/\s/g, '')}">${a.client.phone}</a></div>
      <div class="irow" style="padding:6px 0"><i class="ph ph-clock"></i><span>${fmtDate(a.slot.start)} · ${fmtTime(a.slot.start)} → ${fmtTime(a.slot.end)}</span></div>
      <div class="irow" style="padding:6px 0"><span class="dot ${statusDot(a.status)}"></span><span>${statusLabel(a.status)}</span></div>
      <div class="irow" style="padding:6px 0"><div class="poseur-av" style="background:${poseurColor(a.poseurId)};width:22px;height:22px;font-size:9px">${poseurInitials(a.poseurId)}</div><span>${poseurName(a.poseurId)}</span></div>
      ${isMag() ? `<div class="form-group" style="margin-top:8px"><label class="form-label">Réassigner à</label><select class="form-input" onchange="App.reassign(${a.id},+this.value)">${POSEURS.filter(p => p.actif).map(p => `<option value="${p.id}" ${a.poseurId === p.id ? 'selected' : ''}>${p.prenom} ${p.nom}</option>`).join('')}</select></div>` : ''}
      <div class="sec-title">Notes</div>
      <textarea class="form-input" placeholder="Notes..." onchange="ACTIVITIES.find(x=>x.id===${a.id}).notes=this.value;App.save()">${a.notes || ''}</textarea>
      <div style="display:flex;flex-direction:column;gap:6px;margin-top:14px">
        <a href="tel:${a.client.phone.replace(/\s/g, '')}" class="btn btn-ghost btn-sm" style="text-decoration:none"><i class="ph ph-phone"></i> Appeler</a>
        ${a.status !== 'done' ? `<button class="btn btn-success btn-sm" onclick="App.markDone(${a.id})"><i class="ph ph-check-circle"></i> Marquer terminé</button>` : '<div style="text-align:center;color:var(--text-light);font-size:12px">✅ Terminé</div>'}
        ${a.dossierId ? `<button class="btn btn-primary btn-sm" onclick="App.closeOv('ovModal');App.openDossier(${a.dossierId})"><i class="ph ph-folder-open"></i> Dossier</button>` : ''}
      </div>`;
    openOv('ovModal', html);
  }

  function openDossierFromAct(id) {
    const a = ACTIVITIES.find(x => x.id === id);
    if (a && a.dossierId) openDossier(a.dossierId);
  }

  function reassign(actId, poseurId) {
    const a = ACTIVITIES.find(x => x.id === actId);
    if (a) { a.poseurId = poseurId; save(); showToast('Poseur réassigné'); }
  }

  function markDone(id) {
    const a = ACTIVITIES.find(x => x.id === id);
    if (a) { a.status = 'done'; save(); }
    closeOv('ovModal'); renderActivities();
    showToast('Activité terminée');
  }

  /* New activity */
  function openNewActivity(prefillDate) {
    const poseursOpts = POSEURS.filter(p => p.actif).map(p => `<option value="${p.id}">${p.prenom} ${p.nom}</option>`).join('');
    const dossierOpts = DOSSIERS.map(d => `<option value="${d.id}">${d.num} — ${d.client.lastName}</option>`).join('');
    const dateVal = prefillDate ? prefillDate.toISOString().slice(0, 10) : '';
    const startVal = prefillDate ? `${String(prefillDate.getHours()).padStart(2,'0')}:${String(prefillDate.getMinutes()).padStart(2,'0')}` : '08:00';
    const endH = prefillDate ? Math.min(prefillDate.getHours() + 2, 20) : 17;
    const endVal = prefillDate ? `${String(endH).padStart(2,'0')}:00` : '17:00';

    const html = `
      <h2 class="modal-title">Nouvelle activité</h2>
      <div class="form-group"><label class="form-label">Type</label>
        <div class="radio-group" style="flex-direction:row;gap:6px">
          <div class="radio-opt sel" onclick="App._setRadioType(this,'Pose')" data-val="Pose" style="flex:1;justify-content:center;padding:10px 6px;border-color:var(--info)"><span style="color:var(--info);font-weight:700">🔧 Pose</span></div>
          <div class="radio-opt" onclick="App._setRadioType(this,'SAV')" data-val="SAV" style="flex:1;justify-content:center;padding:10px 6px"><span style="color:var(--warning);font-weight:700">🛠 SAV</span></div>
          <div class="radio-opt" onclick="App._setRadioType(this,'Livraison')" data-val="Livraison" style="flex:1;justify-content:center;padding:10px 6px"><span style="color:var(--success);font-weight:700">🚚 Livr.</span></div>
        </div>
        <input type="hidden" id="naType" value="Pose">
      </div>
      <div class="form-group"><label class="form-label">Dossier client (optionnel)</label><select class="form-input" id="naDossier"><option value="">— Aucun —</option>${dossierOpts}</select></div>
      <div class="form-group"><label class="form-label">Poseur</label><select class="form-input" id="naPoseur">${poseursOpts}</select></div>
      <div class="form-group"><label class="form-label">Nom</label><input class="form-input" id="naLn" placeholder="NOM"></div>
      <div class="form-group"><label class="form-label">Prénom</label><input class="form-input" id="naFn" placeholder="Prénom"></div>
      <div class="form-group"><label class="form-label">Téléphone</label><input class="form-input" id="naPh" placeholder="+32..."></div>
      <div class="form-group"><label class="form-label">Adresse</label><input class="form-input" id="naAddr"></div>
      <div class="form-group"><label class="form-label">Ville</label><input class="form-input" id="naCity"></div>
      <div class="form-group"><label class="form-label">Date</label><input class="form-input" id="naDate" type="date" value="${dateVal}"></div>
      <div class="form-group"><label class="form-label">Début</label><input class="form-input" id="naStart" type="time" value="${startVal}"></div>
      <div class="form-group"><label class="form-label">Fin</label><input class="form-input" id="naEnd" type="time" value="${endVal}"></div>
      <div class="form-group"><label class="form-label">Notes</label><textarea class="form-input" id="naNotes"></textarea></div>
      <button class="btn btn-accent" onclick="App.createActivity()"><i class="ph ph-plus-circle"></i> Créer l'activité</button>`;
    openOv('ovModal', html);

    // Auto-fill from dossier selection
    $('naDossier').onchange = function() {
      const dos = DOSSIERS.find(d => d.id === +this.value);
      if (dos) {
        $('naLn').value = dos.client.lastName;
        $('naFn').value = dos.client.firstName;
        $('naPh').value = dos.client.phone;
        $('naAddr').value = dos.client.address;
        $('naCity').value = dos.client.city;
      }
    };
  }

  function _setRadioType(el, val) {
    el.parentElement.querySelectorAll('.radio-opt').forEach(o => o.classList.remove('sel'));
    el.classList.add('sel');
    $('naType').value = val;
  }

  function createActivity() {
    const ln = $('naLn').value.trim(); const fn = $('naFn').value.trim(); const dt = $('naDate').value;
    if (!ln || !fn || !dt) { showToast('Nom, prénom et date requis', 'error'); return; }
    const [sh, sm] = ($('naStart').value || '08:00').split(':').map(Number);
    const [eh, em] = ($('naEnd').value || '17:00').split(':').map(Number);
    const d = new Date(dt);
    const start = new Date(d); start.setHours(sh, sm, 0, 0);
    const end = new Date(d); end.setHours(eh, em, 0, 0);
    const dosId = $('naDossier') && $('naDossier').value ? +$('naDossier').value : null;
    const newAct = {
      id: Date.now(), type: $('naType').value, status: 'pending', dossierId: dosId,
      poseurId: +$('naPoseur').value,
      client: { firstName: fn, lastName: ln.toUpperCase(), phone: $('naPh').value, address: $('naAddr').value, city: $('naCity').value },
      slot: { start: start.toISOString(), end: end.toISOString() },
      notes: $('naNotes').value
    };
    ACTIVITIES.push(newAct);
    save(); closeOv('ovModal'); renderActivities();
    showToast('Activité créée');

    // Send email notifications
    const dos = dosId ? DOSSIERS.find(x => x.id === dosId) : null;
    sendNotification('new_activity', {
      activite: newAct,
      poseur: POSEURS.find(p => p.id === newAct.poseurId),
      client: newAct.client,
      clientEmail: dos ? dos.client.email : '',
      dossierNum: dos ? dos.num : ''
    });
  }

  /* =============================================================
     DOSSIERS
     ============================================================= */
  function renderDossiersList() {
    // Poseur ne voit que ses dossiers assignés
    const list = isMag() ? DOSSIERS : DOSSIERS.filter(d => d.poseurId === user.poseurId);
    let html = `<div class="sec-title" style="margin-top:12px">${isMag() ? 'Tous les dossiers' : 'Mes dossiers'}</div>`;
    if (!list.length) { html += '<div class="empty"><i class="ph ph-folder-open"></i><p>Aucun dossier assigné</p></div>'; }
    list.forEach(d => {
      const st = { done: 'Terminé', in_progress: 'En cours', sav_pending: 'SAV en attente' }[d.status] || d.status;
      html += `<div class="card" onclick="App.openDossier(${d.id})">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
          <span style="font-size:11px;font-weight:600;color:var(--accent)">${d.num}</span>
          <span class="status-txt"><span class="dot ${statusDot(d.status)}"></span>${st}</span>
        </div>
        <div style="font-weight:700;font-size:14px;margin-bottom:4px">${d.client.lastName} ${d.client.firstName}</div>
        <div class="irow"><i class="ph ph-map-pin"></i><span>${d.client.address}, ${d.client.city}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
          <span style="font-weight:700;color:var(--primary);font-size:14px">${d.amount.toLocaleString('fr-BE')} €</span>
          <div style="display:flex;align-items:center;gap:4px">
            <div class="poseur-av" style="background:${poseurColor(d.poseurId)};width:20px;height:20px;font-size:8px">${poseurInitials(d.poseurId)}</div>
            <span style="font-size:10px;color:var(--text-light)">${poseurName(d.poseurId)}</span>
          </div>
        </div>
      </div>`;
    });
    if (isMag()) {
      html += `<button class="btn btn-accent" style="margin-top:6px" onclick="App.openNewDossier()"><i class="ph ph-plus-circle"></i> Nouveau dossier</button>`;
    }
    $('pgDossiers').innerHTML = html;
  }

  function openDossier(id) { dossierId = id; nav('dossierDetail'); }

  function renderDossierDetail() {
    const d = DOSSIERS.find(x => x.id === dossierId);
    if (!d) { $('pgDossierDetail').innerHTML = '<div class="empty"><p>Dossier non trouvé</p></div>'; return; }
    const c = d.client;
    const st = { done: 'Terminé', in_progress: 'En cours', sav_pending: 'SAV en attente' }[d.status] || d.status;

    let html = `<button class="back-btn" onclick="App.nav('dossiers')"><i class="ph ph-caret-left"></i> Dossiers</button>
      <div class="dos-header">
        <div class="dos-num">${d.num}</div>
        <div class="dos-client">${c.lastName} ${c.firstName}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
          <span class="status-txt"><span class="dot ${statusDot(d.status)}"></span>${st}</span>
          <span style="font-size:11px;color:var(--text-light)">·</span>
          <div class="poseur-av" style="background:${poseurColor(d.poseurId)};width:20px;height:20px;font-size:8px">${poseurInitials(d.poseurId)}</div>
          <span style="font-size:11px;color:var(--text-light)">${poseurName(d.poseurId)}</span>
        </div>
      </div>`;

    // A: Fiche client
    html += `<div class="sec-card">
      <div class="sec-card-title"><i class="ph ph-user"></i> Fiche client</div>
      <div class="irow"><i class="ph ph-identification-badge"></i><span>${c.civ} ${c.firstName} ${c.lastName}</span></div>
      <div class="irow"><i class="ph ph-map-pin"></i><a href="${mapsUrl(c.address, c.city)}" target="_blank">${c.address}, ${c.city}</a></div>
      <div class="irow"><i class="ph ph-phone"></i><a href="tel:${c.phone.replace(/\s/g, '')}">${c.phone}</a></div>
      <div class="irow"><i class="ph ph-envelope-simple"></i><a href="mailto:${c.email}">${c.email}</a></div>
      ${isMag() ? `<button class="btn btn-ghost btn-sm" style="margin-top:8px" onclick="App.editClient(${d.id})"><i class="ph ph-pencil-simple"></i> Modifier</button>` : ''}
    </div>`;

    // B: Documents
    html += `<div class="sec-card"><div class="sec-card-title"><i class="ph ph-file-text"></i> Documents</div>
      <div class="doc-card" style="background:linear-gradient(135deg,#f0fdf4,#dcfce7)">
        <div class="doc-icon">💶</div>
        <div class="doc-info"><div class="doc-name">Montant commande</div><div style="font-size:16px;font-weight:700;color:var(--success);margin-top:2px">${d.amount.toLocaleString('fr-BE')} €</div></div>
      </div>`;
    d.documents.forEach(doc => {
      html += `<div class="doc-card">
        <div class="doc-icon">${doc.type === 'pdf' ? '📄' : '🖼️'}</div>
        <div class="doc-info"><div class="doc-name">${doc.name}</div><div class="doc-date">${doc.date}</div></div>
        <button class="doc-action" onclick="App.viewDoc('${(doc.url || '').replace(/'/g, "\\'")}','${doc.name}','${doc.type}')"><i class="ph ph-eye"></i></button>
      </div>`;
    });
    if (isMag()) html += `<button class="btn btn-ghost btn-sm" style="margin-top:6px" onclick="App.addDoc(${d.id})"><i class="ph ph-plus-circle"></i> Ajouter</button>`;
    html += `</div>`;

    // C: Electros
    html += `<div class="sec-card"><div class="sec-card-title"><i class="ph ph-lightning"></i> Électroménagers (${d.electros.length})</div>`;
    d.electros.forEach(e => {
      html += `<div class="ref-card">
        <div class="ref-type">${e.type}</div>
        <div class="ref-brand">${e.brand} — ${e.model}</div>
        <div class="ref-model">${e.serial ? 'S/N: ' + e.serial : ''}${e.notes ? ' · ' + e.notes : ''}</div>
        <div style="margin-top:4px;font-size:11px">Notice : ${e.notice ? '<span style="color:var(--success)">✅ Disponible</span>' : '<span style="color:var(--text-light)">❌ Non dispo</span>'}</div>
      </div>`;
    });
    if (isMag()) html += `<button class="btn btn-ghost btn-sm" style="margin-top:6px" onclick="App.addElectro(${d.id})"><i class="ph ph-plus-circle"></i> Ajouter</button>`;
    html += `</div>`;

    // Accès rapport — toujours visible pour les deux rôles
    html += `<div style="display:flex;flex-direction:column;gap:6px;margin:10px 0 8px">
      ${d.report.status === 'submitted'
        ? `<button class="btn btn-primary btn-sm" onclick="App.openReportView(${d.id})"><i class="ph ph-file-text"></i> Voir le rapport final</button>`
        : `<button class="btn btn-accent btn-sm" onclick="App.openReport(${d.id})"><i class="ph ph-note-pencil"></i> ${isMag() ? 'Voir le rapport' : 'Compléter le rapport'}</button>`
      }
    </div>`;

    // Bouton flottant proéminent pour le poseur (rapport non soumis)
    if (!isMag() && d.report.status !== 'submitted') {
      html += `<div style="position:sticky;bottom:calc(var(--nav-h) + 10px);z-index:40;margin:8px 0 20px">
        <button class="btn btn-accent" style="padding:16px;font-size:15px;box-shadow:var(--shadow-md);border-radius:var(--radius-lg)" onclick="App.openReport(${d.id})">
          <i class="ph ph-clipboard-text"></i> 📋 Remplir le rapport de pose
        </button>
      </div>`;
    }

    $('pgDossierDetail').innerHTML = html;
  }

  function viewDoc(url, name, type) {
    if (!url) { showToast('Fichier PDF simulé : ' + name, 'info'); return; }
    openLB(url);
  }

  /* Client edit */
  function editClient(did) {
    const d = DOSSIERS.find(x => x.id === did); if (!d) return;
    const c = d.client;
    const html = `<h2 class="modal-title">Modifier client</h2>
      <div class="form-group"><label class="form-label">Civilité</label><select class="form-input" id="ecCiv"><option ${c.civ === 'M.' ? 'selected' : ''}>M.</option><option ${c.civ === 'Mme' ? 'selected' : ''}>Mme</option></select></div>
      <div class="form-group"><label class="form-label">Prénom</label><input class="form-input" id="ecFn" value="${c.firstName}"></div>
      <div class="form-group"><label class="form-label">Nom</label><input class="form-input" id="ecLn" value="${c.lastName}"></div>
      <div class="form-group"><label class="form-label">Adresse</label><input class="form-input" id="ecAddr" value="${c.address}"></div>
      <div class="form-group"><label class="form-label">Ville</label><input class="form-input" id="ecCity" value="${c.city}"></div>
      <div class="form-group"><label class="form-label">Téléphone</label><input class="form-input" id="ecPh" value="${c.phone}"></div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="ecEm" value="${c.email}"></div>
      <button class="btn btn-success btn-sm" onclick="App.saveClient(${did})"><i class="ph ph-check"></i> Enregistrer</button>`;
    openOv('ovModal', html);
  }
  function saveClient(did) {
    const d = DOSSIERS.find(x => x.id === did); if (!d) return;
    d.client = { civ: $('ecCiv').value, firstName: $('ecFn').value, lastName: $('ecLn').value.toUpperCase(), address: $('ecAddr').value, city: $('ecCity').value, phone: $('ecPh').value, email: $('ecEm').value };
    save(); closeOv('ovModal'); renderDossierDetail(); showToast('Client mis à jour');
  }

  /* Add document */
  function addDoc(did) {
    const html = `<h2 class="modal-title">Ajouter un document</h2>
      <div class="form-group"><label class="form-label">Nom</label><input class="form-input" id="adName" placeholder="Ex: Plan cuisine"></div>
      <div class="form-group"><label class="form-label">Type</label><select class="form-input" id="adType"><option value="image">Image / Plan</option><option value="pdf">PDF</option></select></div>
      <div class="form-group"><label class="form-label">Fichier</label><input type="file" accept="image/*,.pdf" class="form-input" id="adFile"></div>
      <div class="form-group"><label class="form-label">Montant (€, optionnel)</label><input class="form-input" id="adAmt" type="number"></div>
      <button class="btn btn-success btn-sm" onclick="App.saveDoc(${did})"><i class="ph ph-plus-circle"></i> Ajouter</button>`;
    openOv('ovModal', html);
  }
  function saveDoc(did) {
    const d = DOSSIERS.find(x => x.id === did); if (!d) return;
    const name = $('adName').value.trim() || 'Document';
    const type = $('adType').value;
    const file = $('adFile').files[0];
    const amt = $('adAmt').value;
    if (amt) d.amount = parseFloat(amt);
    const finish = (url) => {
      d.documents.push({ id: Date.now(), name, type, date: new Date().toISOString().slice(0, 10), url: url || '' });
      save(); closeOv('ovModal'); renderDossierDetail(); showToast('Document ajouté');
    };
    if (file && file.type.startsWith('image/')) {
      const r = new FileReader(); r.onload = e => finish(e.target.result); r.readAsDataURL(file);
    } else { finish(''); }
  }

  /* Add electro */
  function addElectro(did) {
    const html = `<h2 class="modal-title">Ajouter un électro</h2>
      <div class="form-group"><label class="form-label">Type</label><select class="form-input" id="aeType"><option>Four</option><option>Lave-vaisselle</option><option>Réfrigérateur</option><option>Plaque</option><option>Hotte</option><option>Micro-ondes</option><option>Four vapeur</option><option>Autre</option></select></div>
      <div class="form-group"><label class="form-label">Marque</label><input class="form-input" id="aeBr"></div>
      <div class="form-group"><label class="form-label">Modèle</label><input class="form-input" id="aeMo"></div>
      <div class="form-group"><label class="form-label">N° série</label><input class="form-input" id="aeSe"></div>
      <div class="form-group"><label class="form-label">Notice dispo</label><select class="form-input" id="aeNo"><option value="0">Non</option><option value="1">Oui</option></select></div>
      <div class="form-group"><label class="form-label">Notes</label><input class="form-input" id="aeNt"></div>
      <button class="btn btn-success btn-sm" onclick="App.saveElectro(${did})"><i class="ph ph-plus-circle"></i> Ajouter</button>`;
    openOv('ovModal', html);
  }
  function saveElectro(did) {
    const d = DOSSIERS.find(x => x.id === did); if (!d) return;
    d.electros.push({ id: Date.now(), type: $('aeType').value, brand: $('aeBr').value, model: $('aeMo').value, serial: $('aeSe').value, notice: $('aeNo').value === '1', noticeUrl: '#', notes: $('aeNt').value });
    save(); closeOv('ovModal'); renderDossierDetail(); showToast('Électro ajouté');
  }

  /* New dossier */
  function openNewDossier() {
    const pOpts = POSEURS.filter(p => p.actif).map(p => `<option value="${p.id}">${p.prenom} ${p.nom}</option>`).join('');
    const html = `<h2 class="modal-title">Nouveau dossier</h2>
      <div class="form-group"><label class="form-label">Civilité</label><select class="form-input" id="ndCiv"><option>M.</option><option>Mme</option></select></div>
      <div class="form-group"><label class="form-label">Prénom</label><input class="form-input" id="ndFn"></div>
      <div class="form-group"><label class="form-label">Nom</label><input class="form-input" id="ndLn"></div>
      <div class="form-group"><label class="form-label">Adresse</label><input class="form-input" id="ndAddr"></div>
      <div class="form-group"><label class="form-label">Ville</label><input class="form-input" id="ndCity"></div>
      <div class="form-group"><label class="form-label">Téléphone</label><input class="form-input" id="ndPh"></div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="ndEm"></div>
      <div class="form-group"><label class="form-label">Montant (€)</label><input class="form-input" id="ndAmt" type="number"></div>
      <div class="form-group"><label class="form-label">Poseur assigné</label><select class="form-input" id="ndPos">${pOpts}</select></div>
      <button class="btn btn-accent" onclick="App.createDossier()"><i class="ph ph-plus-circle"></i> Créer</button>`;
    openOv('ovModal', html);
  }
  function createDossier() {
    const ln = $('ndLn').value.trim(); const fn = $('ndFn').value.trim();
    if (!ln || !fn) { showToast('Nom et prénom requis', 'error'); return; }
    const num = 'DOS-' + new Date().getFullYear() + '-' + String(DOSSIERS.length + 41).padStart(4, '0');
    DOSSIERS.push({
      id: Date.now(), num, status: 'in_progress', poseurId: +$('ndPos').value,
      client: { civ: $('ndCiv').value, firstName: fn, lastName: ln.toUpperCase(), address: $('ndAddr').value, city: $('ndCity').value, phone: $('ndPh').value, email: $('ndEm').value },
      amount: parseFloat($('ndAmt').value) || 0, documents: [], electros: [],
      report: { status: 'draft', submittedAt: '', checks: { poseComplete: false, poseComment: '', elecOk: false, elecComment: '', sanitOk: false, sanitComment: '', reglagesOk: false, reglagesComment: '', conforme: false, conformeComment: '', clientInformed: false, clientInformedComment: '' }, problems: { level: 'none', detail: '' }, sav: { needed: false, desc: '', urgency: '' }, photos: [], clientRemarks: '', signatory: fn + ' ' + ln.toUpperCase(), signatureData: '', signatureDate: '' }
    });
    save(); closeOv('ovModal'); renderDossiersList(); showToast('Dossier créé');
  }

  /* =============================================================
     RAPPORT
     ============================================================= */
  function openReport(did) { reportDosId = did; nav('rapport'); }
  function openReportView(did) { reportDosId = did; nav('pdf'); }

  function renderRapport() {
    const d = DOSSIERS.find(x => x.id === reportDosId);
    if (!d) {
      // Auto-sélectionner un dossier si poseur n'en a qu'un en cours
      const myDossiers = isMag() ? DOSSIERS : DOSSIERS.filter(x => x.poseurId === user.poseurId);
      const drafts = myDossiers.filter(x => x.report.status !== 'submitted');
      if (drafts.length === 1) {
        reportDosId = drafts[0].id;
        renderRapport();
        return;
      }
      // Afficher un sélecteur de dossier
      let html = '<div class="sec-title" style="margin-top:14px">Sélectionnez un dossier</div>';
      if (!drafts.length) {
        html += '<div class="empty"><i class="ph ph-note-pencil"></i><p>Aucun dossier avec rapport à compléter.</p></div>';
      } else {
        drafts.forEach(dos => {
          html += `<div class="card" onclick="App.openReport(${dos.id})">
            <div style="font-size:11px;font-weight:600;color:var(--accent)">${dos.num}</div>
            <div style="font-weight:700;font-size:14px;margin:4px 0">${dos.client.lastName} ${dos.client.firstName}</div>
            <div class="irow"><i class="ph ph-map-pin"></i><span>${dos.client.address}, ${dos.client.city}</span></div>
            <button class="btn btn-accent btn-sm" style="margin-top:8px"><i class="ph ph-note-pencil"></i> Remplir le rapport</button>
          </div>`;
        });
      }
      // Aussi montrer les rapports déjà soumis
      const submitted = myDossiers.filter(x => x.report.status === 'submitted');
      if (submitted.length) {
        html += '<div class="sec-title">Rapports soumis</div>';
        submitted.forEach(dos => {
          html += `<div class="card" onclick="App.openReportView(${dos.id})">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:11px;font-weight:600;color:var(--accent)">${dos.num}</span>
              <span class="badge badge-livraison">✅ Soumis</span>
            </div>
            <div style="font-weight:700;font-size:14px;margin-top:4px">${dos.client.lastName} ${dos.client.firstName}</div>
          </div>`;
        });
      }
      $('pgRapport').innerHTML = html;
      return;
    }
    const r = d.report;
    const submitted = r.status === 'submitted';
    const readOnly = submitted || isMag();
    const progress = calcProgress(r);

    const checks = [
      { key: 'poseComplete', label: 'Pose terminée à 100%' },
      { key: 'elecOk', label: 'Contrôle électrique effectué' },
      { key: 'sanitOk', label: 'Contrôle sanitaire effectué' },
      { key: 'reglagesOk', label: 'Contrôle réglages effectué' },
      { key: 'conforme', label: 'Tout conforme à la commande' },
      { key: 'clientInformed', label: 'Client informé sur utilisation' }
    ];

    let html = `
      <button class="back-btn" onclick="App.openDossier(${d.id})"><i class="ph ph-caret-left"></i> ${d.num}</button>
      <div class="sec-card" style="margin-top:6px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h3 style="font-size:15px">Rapport de pose</h3>
          <span class="badge ${submitted ? 'badge-livraison' : 'badge-sav'}">${submitted ? '✅ Soumis' : '📝 Brouillon'}</span>
        </div>
        <div class="progress"><div class="progress-bar" style="width:${progress}%"></div></div>
        <div style="text-align:center;font-size:11px;color:var(--text-light)">${progress}%</div>
      </div>`;

    // 4.1 Contrôles
    html += `<div class="sec-card"><div class="sec-card-title"><i class="ph ph-check-square"></i> Contrôles techniques</div>`;
    checks.forEach(ch => {
      const val = r.checks[ch.key];
      const comm = r.checks[ch.key + 'Comment'] || '';
      html += `<div class="toggle-row"><span class="toggle-label">${ch.label}</span>
        <button class="toggle${val ? ' on' : ''}" ${readOnly ? 'disabled' : ''} onclick="App.toggleCheck(${d.id},'${ch.key}')"></button></div>`;
      if (!val) html += `<div style="margin:6px 0 10px"><textarea class="form-input" style="min-height:40px;font-size:12px" placeholder="Commentaire..." ${readOnly ? 'disabled' : ''} onchange="App.setCheckComment(${d.id},'${ch.key}',this.value)">${comm}</textarea></div>`;
    });
    html += `</div>`;

    // 4.2 Problèmes
    html += `<div class="sec-card"><div class="sec-card-title"><i class="ph ph-warning"></i> Problèmes</div>
      <div class="radio-group">${['none', 'minor', 'blocking'].map(lv => {
        const labels = { none: 'Aucun problème', minor: 'Problèmes mineurs', blocking: 'Problèmes bloquants' };
        return `<div class="radio-opt${r.problems.level === lv ? ' sel' : ''}" onclick="${readOnly ? '' : `App.setProblem(${d.id},'${lv}')`}"><div class="radio-dot"></div><span>${labels[lv]}</span></div>`;
      }).join('')}</div>
      ${r.problems.level !== 'none' ? `<div class="form-group" style="margin-top:8px"><label class="form-label">Détail *</label><textarea class="form-input" ${readOnly ? 'disabled' : ''} onchange="App.setProblemDetail(${d.id},this.value)">${r.problems.detail}</textarea></div>` : ''}
    </div>`;

    // 4.3 SAV
    html += `<div class="sec-card"><div class="sec-card-title"><i class="ph ph-first-aid"></i> SAV</div>
      <div class="toggle-row"><span class="toggle-label">Un SAV est-il nécessaire ?</span>
        <button class="toggle${r.sav.needed ? ' on' : ''}" ${readOnly ? 'disabled' : ''} onclick="App.toggleSav(${d.id})"></button></div>
      ${r.sav.needed ? `
        <div class="form-group" style="margin-top:8px"><label class="form-label">Description</label><textarea class="form-input" ${readOnly ? 'disabled' : ''} onchange="App.setSavDesc(${d.id},this.value)">${r.sav.desc}</textarea></div>
        <div class="form-group"><label class="form-label">Urgence</label>
          <select class="form-input" ${readOnly ? 'disabled' : ''} onchange="App.setSavUrg(${d.id},this.value)">
            <option value="">Choisir...</option><option value="low" ${r.sav.urgency === 'low' ? 'selected' : ''}>Faible</option><option value="medium" ${r.sav.urgency === 'medium' ? 'selected' : ''}>Moyenne</option><option value="high" ${r.sav.urgency === 'high' ? 'selected' : ''}>Haute</option>
          </select></div>` : ''}
    </div>`;

    // 4.4 Photos
    html += `<div class="sec-card"><div class="sec-card-title"><i class="ph ph-camera"></i> Photos (${r.photos.length}/20)</div>`;
    if (!readOnly) {
      html += `<div style="display:flex;gap:6px;margin-bottom:10px">
        <label class="btn btn-ghost btn-sm" style="flex:1;cursor:pointer"><i class="ph ph-camera"></i> Photo<input type="file" accept="image/*" capture="environment" style="display:none" onchange="App.addPhoto(${d.id},this)"></label>
        <label class="btn btn-ghost btn-sm" style="flex:1;cursor:pointer"><i class="ph ph-image"></i> Galerie<input type="file" accept="image/*" multiple style="display:none" onchange="App.addPhotos(${d.id},this)"></label>
      </div>`;
    }
    if (r.photos.length) {
      html += '<div class="photo-grid">';
      r.photos.forEach((p, i) => {
        html += `<div class="photo-thumb"><img src="${p.src}" onclick="App.openLB('${p.src.replace(/'/g, "\\'")}')">
          ${!readOnly ? `<button class="del" onclick="App.delPhoto(${d.id},${i})"><i class="ph ph-x"></i></button>` : ''}
          <div class="caption"><input value="${p.caption}" placeholder="Légende" ${readOnly ? 'disabled' : ''} onchange="App.setPhotoCaption(${d.id},${i},this.value)"></div></div>`;
      });
      html += '</div>';
    } else { html += '<div class="empty" style="padding:16px"><p>Aucune photo</p></div>'; }
    html += '</div>';

    // 4.5 Remarques + signature
    html += `<div class="sec-card"><div class="sec-card-title"><i class="ph ph-chat-text"></i> Remarques client</div>
      <textarea class="form-input" placeholder="Le client dicte ses remarques..." ${readOnly ? 'disabled' : ''} onchange="App.setRemarks(${d.id},this.value)">${r.clientRemarks}</textarea></div>`;

    html += `<div class="sec-card"><div class="sec-card-title"><i class="ph ph-signature"></i> Signature</div>
      <div class="form-group"><label class="form-label">Signataire</label><input class="form-input" value="${r.signatory}" ${readOnly ? 'disabled' : ''} onchange="App.setSignatory(${d.id},this.value)"></div>
      ${submitted && r.signatureData
        ? `<div style="border:1px solid var(--border);border-radius:8px;padding:6px;margin:6px 0"><img src="${r.signatureData}" style="max-height:100px"></div><div style="font-size:11px;color:var(--text-light)">Signé le ${fmtDate(r.signatureDate)} à ${fmtTime(r.signatureDate)}</div>`
        : `<div class="sig-wrap"><canvas id="sigCanvas" width="600" height="360"></canvas></div>
           ${!readOnly ? `<button class="btn btn-ghost btn-sm" style="margin-top:4px" onclick="App.clearSig()"><i class="ph ph-eraser"></i> Effacer</button>` : ''}`
      }</div>`;

    // 4.6 Submit
    if (!submitted && !isMag()) {
      html += `<div id="valErrors"></div>
        <button class="btn btn-accent" style="margin:10px 0 20px;padding:15px" onclick="App.submitReport(${d.id})"><i class="ph ph-paper-plane-tilt"></i> Soumettre le rapport</button>`;
    }

    $('pgRapport').innerHTML = html;
    if (!submitted || !r.signatureData) setTimeout(initSigCanvas, 80);
  }

  function calcProgress(r) {
    let t = 0, d = 0;
    ['poseComplete', 'elecOk', 'sanitOk', 'reglagesOk', 'conforme', 'clientInformed'].forEach(k => { t++; if (r.checks[k]) d++; });
    t++; d++; // problems always counts
    t++; if (r.photos.length >= 1) d++;
    t++; if (r.clientRemarks.trim()) d++;
    t++; if (r.signatureData) d++;
    return Math.round(d / t * 100);
  }

  /* Report helpers */
  function toggleCheck(did, key) {
    const d = DOSSIERS.find(x => x.id === did); if (!d) return;
    d.report.checks[key] = !d.report.checks[key];
    if (d.report.checks[key]) d.report.checks[key + 'Comment'] = '';
    save(); renderRapport();
  }
  function setCheckComment(did, key, val) {
    const d = DOSSIERS.find(x => x.id === did); if (!d) return;
    d.report.checks[key + 'Comment'] = val; save();
  }
  function setProblem(did, lv) {
    const d = DOSSIERS.find(x => x.id === did); if (!d) return;
    d.report.problems.level = lv;
    if (lv === 'none') d.report.problems.detail = '';
    save(); renderRapport();
  }
  function setProblemDetail(did, val) { const d = DOSSIERS.find(x => x.id === did); if (d) { d.report.problems.detail = val; save(); } }
  function toggleSav(did) { const d = DOSSIERS.find(x => x.id === did); if (d) { d.report.sav.needed = !d.report.sav.needed; save(); renderRapport(); } }
  function setSavDesc(did, val) { const d = DOSSIERS.find(x => x.id === did); if (d) { d.report.sav.desc = val; save(); } }
  function setSavUrg(did, val) { const d = DOSSIERS.find(x => x.id === did); if (d) { d.report.sav.urgency = val; save(); } }
  function addPhoto(did, input) {
    const file = input.files[0]; if (!file) return;
    const d = DOSSIERS.find(x => x.id === did); if (!d || d.report.photos.length >= 20) return;
    const reader = new FileReader();
    reader.onload = e => { d.report.photos.push({ id: Date.now(), src: e.target.result, caption: '' }); save(); renderRapport(); };
    reader.readAsDataURL(file);
  }
  function addPhotos(did, input) {
    const files = input.files; if (!files.length) return;
    const d = DOSSIERS.find(x => x.id === did); if (!d) return;
    Array.from(files).forEach(f => {
      if (d.report.photos.length >= 20) return;
      const reader = new FileReader();
      reader.onload = e => { d.report.photos.push({ id: Date.now() + Math.random(), src: e.target.result, caption: '' }); save(); renderRapport(); };
      reader.readAsDataURL(f);
    });
  }
  function delPhoto(did, idx) { const d = DOSSIERS.find(x => x.id === did); if (d) { d.report.photos.splice(idx, 1); save(); renderRapport(); } }
  function setPhotoCaption(did, idx, val) { const d = DOSSIERS.find(x => x.id === did); if (d && d.report.photos[idx]) { d.report.photos[idx].caption = val; save(); } }
  function setRemarks(did, val) { const d = DOSSIERS.find(x => x.id === did); if (d) { d.report.clientRemarks = val; save(); } }
  function setSignatory(did, val) { const d = DOSSIERS.find(x => x.id === did); if (d) { d.report.signatory = val; save(); } }

  /* Signature canvas */
  function initSigCanvas() {
    sigCanvas = document.getElementById('sigCanvas');
    if (!sigCanvas) return;
    sigCtx = sigCanvas.getContext('2d');
    const rect = sigCanvas.getBoundingClientRect();
    sigCanvas.width = rect.width * 2;
    sigCanvas.height = rect.height * 2;
    sigCtx.scale(2, 2);
    sigCtx.strokeStyle = STORE_CONFIG.primaryColor;
    sigCtx.lineWidth = 2;
    sigCtx.lineCap = 'round';
    sigCtx.lineJoin = 'round';
    function pos(e) { const r = sigCanvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; }
    sigCanvas.onpointerdown = e => { sigDrawing = true; const p = pos(e); sigCtx.beginPath(); sigCtx.moveTo(p.x, p.y); e.preventDefault(); };
    sigCanvas.onpointermove = e => { if (!sigDrawing) return; const p = pos(e); sigCtx.lineTo(p.x, p.y); sigCtx.stroke(); e.preventDefault(); };
    sigCanvas.onpointerup = () => sigDrawing = false;
    sigCanvas.onpointerleave = () => sigDrawing = false;
  }
  function clearSig() { if (sigCanvas && sigCtx) sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height); }
  function getSigData() {
    if (!sigCanvas) return '';
    const px = sigCanvas.getContext('2d').getImageData(0, 0, sigCanvas.width, sigCanvas.height).data;
    for (let i = 3; i < px.length; i += 4) { if (px[i] > 0) return sigCanvas.toDataURL(); }
    return '';
  }

  /* Submit report */
  function submitReport(did) {
    const d = DOSSIERS.find(x => x.id === did); if (!d) return;
    const r = d.report;
    const errors = [];
    if (r.photos.length < 1) errors.push('Minimum 1 photo requise');
    if (r.problems.level !== 'none' && !r.problems.detail.trim()) errors.push('Détaillez les problèmes');
    if (r.sav.needed && !r.sav.desc.trim()) errors.push('Décrivez le SAV');
    if (r.sav.needed && !r.sav.urgency) errors.push("Urgence du SAV requise");
    const sig = getSigData();
    if (!sig) errors.push('Signature requise');
    if (!r.clientRemarks.trim()) errors.push('Remarques client requises (même "RAS")');
    if (errors.length) {
      const el = $('valErrors');
      if (el) { el.innerHTML = `<div class="val-errors">${errors.map(e => `<p><i class="ph ph-warning-circle"></i>${e}</p>`).join('')}</div>`; el.scrollIntoView({ behavior: 'smooth' }); }
      return;
    }
    const html = `<h2 class="modal-title">⚠️ Confirmation</h2>
      <p style="margin-bottom:14px;font-size:13px;color:var(--text-light)">Êtes-vous sûr ? <strong>Action irréversible.</strong></p>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" style="flex:1" onclick="App.closeOv('ovConfirm')">Annuler</button>
        <button class="btn btn-success btn-sm" style="flex:1" onclick="App.doSubmit(${did})"><i class="ph ph-check"></i> Confirmer</button>
      </div>`;
    openOv('ovConfirm', html);
  }

  function doSubmit(did) {
    closeOv('ovConfirm');
    const d = DOSSIERS.find(x => x.id === did); if (!d) return;
    const r = d.report;
    r.signatureData = getSigData();
    r.signatureDate = new Date().toISOString();
    r.submittedAt = new Date().toISOString();
    r.status = 'submitted';
    d.status = 'done';

    // Auto-create SAV
    if (r.sav.needed) {
      ACTIVITIES.push({
        id: Date.now(), type: 'SAV', status: r.sav.urgency === 'high' ? 'urgent' : 'pending',
        dossierId: d.id, poseurId: d.poseurId,
        client: { firstName: d.client.firstName, lastName: d.client.lastName, phone: d.client.phone, address: d.client.address, city: d.client.city },
        slot: _dOff(7, 9, 0, 12, 0), notes: 'SAV: ' + r.sav.desc
      });
    }
    save();

    // Send email
    sendRapportEmail(d);

    renderRapport();
    showToast('Rapport soumis avec succès !');
  }

  /* =============================================================
     EMAIL NOTIFICATIONS (EmailJS)
     Types: new_activity, modified, cancelled, rapport
     ============================================================= */
  const isEmailDemo = () => STORE_CONFIG.emailJsPublicKey === 'YOUR_PUBLIC_KEY';

  function _sendEmail(params) {
    if (isEmailDemo()) return;
    try {
      emailjs.init(STORE_CONFIG.emailJsPublicKey);
      emailjs.send(STORE_CONFIG.emailJsServiceId, STORE_CONFIG.emailJsTemplateId, params)
        .then(() => showToast('Email envoyé ✓'))
        .catch(err => { console.error('EmailJS error:', err); showToast('Erreur envoi email', 'error'); });
    } catch (e) { console.error(e); }
  }

  function sendNotification(type, data) {
    const CFG = STORE_CONFIG;
    const act = data.activite;
    const poseur = data.poseur;
    const client = data.client;

    if (type === 'new_activity' && act) {
      // Email → Poseur
      const poseurSubject = `Nouvelle ${act.type.toLowerCase()} assignée — ${client.lastName} ${client.firstName} — ${fmtDate(act.slot.start)}`;
      const poseurBody = `Bonjour ${poseur ? poseur.prenom : ''},\n\nUne nouvelle activité vous a été assignée :\n\n📋 Type : ${act.type}\n👤 Client : ${client.lastName} ${client.firstName}\n📍 Adresse : ${client.address}, ${client.city}\n📞 Téléphone : ${client.phone}\n📅 Date : ${fmtDate(act.slot.start)}\n🕐 Horaire : ${fmtTime(act.slot.start)} → ${fmtTime(act.slot.end)}\n📁 Dossier : ${data.dossierNum || '—'}\n\nConnectez-vous à l'app pour voir le dossier complet.\n\n${CFG.name}`;

      // Email → Client
      const typeLabel = act.type === 'Pose' ? 'pose' : act.type === 'SAV' ? 'SAV' : 'livraison';
      const clientSubject = `Votre ${typeLabel} est confirmé(e) — ${fmtDate(act.slot.start)}`;
      const clientBody = `Bonjour ${client.firstName},\n\nVotre rendez-vous est confirmé :\n\n📋 Type : ${act.type}\n📅 Date : ${fmtDate(act.slot.start)}\n🕐 Horaire : ${fmtTime(act.slot.start)} → ${fmtTime(act.slot.end)}\n🔧 Technicien : ${poseur ? poseur.prenom + ' ' + poseur.nom : '—'}\n\nPour toute question, contactez-nous :\n📞 ${CFG.phone}\n📧 ${CFG.email}\n\nÀ bientôt,\n${CFG.name}\n${CFG.address}`;

      if (isEmailDemo()) {
        console.log('📧 EMAIL → POSEUR:', poseurSubject, '\n', poseurBody);
        console.log('📧 EMAIL → CLIENT:', clientSubject, '\n', clientBody);
        showToast('Mode démo — 2 emails simulés ✓', 'info');
      } else {
        _sendEmail({ to_email: poseur ? poseur.email : '', subject: poseurSubject, message: poseurBody });
        if (data.clientEmail) _sendEmail({ to_email: data.clientEmail, subject: clientSubject, message: clientBody });
      }
    }

    if (type === 'modified' && act && data.oldSlot) {
      const subject = `Votre rendez-vous a été modifié — ${CFG.name}`;
      const body = `Bonjour ${client.firstName},\n\nVotre rendez-vous a été modifié :\n\n❌ Ancienne date : ${fmtDate(data.oldSlot.start)} ${fmtTime(data.oldSlot.start)} → ${fmtTime(data.oldSlot.end)}\n✅ Nouvelle date : ${fmtDate(act.slot.start)} ${fmtTime(act.slot.start)} → ${fmtTime(act.slot.end)}\n🔧 Technicien : ${poseur ? poseur.prenom + ' ' + poseur.nom : '—'}\n\n📞 ${CFG.phone}\n📧 ${CFG.email}\n\n${CFG.name}\n${CFG.address}`;

      if (isEmailDemo()) {
        console.log('📧 EMAIL MODIF → CLIENT:', subject, '\n', body);
        showToast('Mode démo — email modif simulé ✓', 'info');
      } else {
        if (data.clientEmail) _sendEmail({ to_email: data.clientEmail, subject, message: body });
      }
    }

    if (type === 'cancelled' && data.client) {
      const subject = `Votre rendez-vous a été annulé — ${CFG.name}`;
      const body = `Bonjour ${client.firstName},\n\nNous vous informons que votre rendez-vous du ${act ? fmtDate(act.slot.start) : ''} a été annulé.\n\nNous vous recontacterons rapidement pour fixer une nouvelle date.\n\n📞 ${CFG.phone}\n📧 ${CFG.email}\n\n${CFG.name}\n${CFG.address}`;

      if (isEmailDemo()) {
        console.log('📧 EMAIL ANNUL → CLIENT:', subject, '\n', body);
        showToast('Mode démo — email annulation simulé ✓', 'info');
      } else {
        if (data.clientEmail) _sendEmail({ to_email: data.clientEmail, subject, message: body });
      }
    }

    if (type === 'rapport' && data.dossier) {
      const d = data.dossier;
      const r = d.report;
      const summary = {
        dossier: d.num, client: d.client.lastName + ' ' + d.client.firstName,
        submittedAt: r.submittedAt,
        conformite: Object.entries(r.checks).filter(([k]) => !k.endsWith('Comment')).map(([k, v]) => `${k}: ${v ? '✅' : '❌'}`).join(', '),
        problemes: r.problems.level === 'none' ? 'Aucun' : r.problems.detail,
        sav: r.sav.needed ? r.sav.desc : 'Aucun'
      };
      const subject = `Rapport de pose — ${d.num} — ${d.client.lastName} ${d.client.firstName}`;
      const body = `Rapport soumis le ${fmtDate(r.submittedAt)}.\n\nClient : ${d.client.lastName} ${d.client.firstName}\nConformité : ${summary.conformite}\nProblèmes : ${summary.problemes}\nSAV : ${summary.sav}`;

      if (isEmailDemo()) {
        console.log('📧 EMAIL RAPPORT:', JSON.stringify(summary, null, 2));
        showToast('Mode démo — email rapport simulé ✓', 'info');
        showToast(`📧 Copie → ${d.client.email}`, 'info');
      } else {
        _sendEmail({ to_email: CFG.email, subject, message: body });
        if (d.client.email) _sendEmail({ to_email: d.client.email, subject: `Votre pose est terminée — ${CFG.name}`, message: body });
      }
    }
  }

  /* Legacy wrapper for rapport submission */
  function sendRapportEmail(d) {
    sendNotification('rapport', { dossier: d });
  }

  /* =============================================================
     PDF EXPORT
     ============================================================= */
  function renderPdfView() {
    // Find submitted report — filter by poseur if needed
    let d = DOSSIERS.find(x => x.id === reportDosId && x.report.status === 'submitted');
    if (!d) {
      const pool = isMag() ? DOSSIERS : DOSSIERS.filter(x => x.poseurId === user.poseurId);
      d = pool.find(x => x.report.status === 'submitted');
    }
    if (!d) {
      $('pgPdf').innerHTML = '<div class="empty" style="margin-top:36px"><i class="ph ph-file-pdf"></i><p>Aucun rapport soumis disponible.</p></div>';
      return;
    }
    reportDosId = d.id;
    const r = d.report; const c = d.client;
    const checks = [
      { key: 'poseComplete', label: 'Pose terminée' },
      { key: 'elecOk', label: 'Contrôle électrique' },
      { key: 'sanitOk', label: 'Contrôle sanitaire' },
      { key: 'reglagesOk', label: 'Contrôle réglages' },
      { key: 'conforme', label: 'Conforme commande' },
      { key: 'clientInformed', label: 'Client informé' }
    ];

    let html = `<div class="print-view">
      <div class="print-header">
        <div class="print-logo">${STORE_CONFIG.logo}</div>
        <div style="flex:1"><div style="font-family:'Poppins',sans-serif;font-size:16px;font-weight:700">${STORE_CONFIG.name}</div>
          <div class="print-meta">${d.num} · ${fmtDate(r.submittedAt)}</div>
          <div class="print-meta">${STORE_CONFIG.address}</div></div>
      </div>
      <div class="print-section"><h3>Client</h3>
        <p>${c.civ} ${c.firstName} ${c.lastName}</p><p>${c.address}, ${c.city}</p><p>${c.phone} · ${c.email}</p>
        <p style="font-weight:600;margin-top:4px">Montant : ${d.amount.toLocaleString('fr-BE')} €</p>
      </div>
      <div class="print-section"><h3>Contrôles</h3>
        ${checks.map(ch => {
          const ok = r.checks[ch.key]; const comm = r.checks[ch.key + 'Comment'];
          return `<div class="check-row"><span class="${ok ? 'check-ok' : 'check-no'}">${ok ? '✅' : '❌'}</span><span>${ch.label}</span>${comm ? `<span style="color:var(--danger);font-size:11px;margin-left:auto">— ${comm}</span>` : ''}</div>`;
        }).join('')}
      </div>
      <div class="print-section"><h3>Problèmes</h3>
        <p>${{ none: 'Aucun', minor: 'Mineurs', blocking: 'Bloquants' }[r.problems.level]}</p>
        ${r.problems.detail ? `<p style="color:var(--danger)">${r.problems.detail}</p>` : ''}
      </div>
      <div class="print-section"><h3>SAV</h3>
        ${r.sav.needed ? `<p>Urgence : ${{ low: 'Faible', medium: 'Moyenne', high: 'Haute' }[r.sav.urgency] || '—'}</p><p>${r.sav.desc}</p>` : '<p>Aucun SAV</p>'}
      </div>
      <div class="print-section"><h3>Photos (${r.photos.length})</h3>
        <div class="photo-grid">${r.photos.map(p => `<div class="photo-thumb"><img src="${p.src}" onclick="App.openLB('${p.src.replace(/'/g, "\\'")}')"><div class="caption"><input value="${p.caption}" disabled></div></div>`).join('')}</div>
      </div>
      <div class="print-section"><h3>Remarques</h3><p>${r.clientRemarks || '—'}</p></div>
      <div class="print-section"><h3>Signature</h3>
        <p>${r.signatory} — ${fmtDate(r.signatureDate)} à ${fmtTime(r.signatureDate)}</p>
        ${r.signatureData ? `<div style="border:1px solid var(--border);border-radius:6px;padding:8px;display:inline-block;margin-top:4px"><img src="${r.signatureData}" style="max-height:80px"></div>` : ''}
      </div>
    </div>
    <div style="display:flex;gap:6px;margin:14px 0 20px">
      <button class="btn btn-primary btn-sm" style="flex:1" onclick="App.downloadPdf(${d.id})"><i class="ph ph-file-pdf"></i> PDF</button>
      <button class="btn btn-ghost btn-sm" style="flex:1" onclick="window.print()"><i class="ph ph-printer"></i> Imprimer</button>
      <button class="btn btn-ghost btn-sm" style="flex:1" onclick="App.resendEmail(${d.id})"><i class="ph ph-envelope-simple"></i> Email</button>
    </div>`;
    $('pgPdf').innerHTML = html;
  }

  function resendEmail(did) {
    const d = DOSSIERS.find(x => x.id === did);
    if (d) { sendRapportEmail(d); showToast('Email renvoyé', 'info'); }
  }

  function downloadPdf(did) {
    const d = DOSSIERS.find(x => x.id === did);
    if (!d) return;
    const r = d.report; const c = d.client;

    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      const W = 210, M = 15;
      let y = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(STORE_CONFIG.logo + ' ' + STORE_CONFIG.name, M, y);
      y += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(`${d.num} · Rapport du ${fmtDate(r.submittedAt)}`, M, y);
      y += 5;
      doc.text(STORE_CONFIG.address + ' · ' + STORE_CONFIG.phone, M, y);
      y += 3;
      doc.setDrawColor(26, 26, 46);
      doc.setLineWidth(0.5);
      doc.line(M, y, W - M, y);
      y += 10;

      // Client
      doc.setTextColor(0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Client', M, y); y += 6;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`${c.civ} ${c.firstName} ${c.lastName}`, M, y); y += 5;
      doc.text(`${c.address}, ${c.city}`, M, y); y += 5;
      doc.text(`${c.phone} · ${c.email}`, M, y); y += 5;
      doc.text(`Montant : ${d.amount.toLocaleString('fr-BE')} €`, M, y); y += 10;

      // Checks
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Contrôles techniques', M, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const checkLabels = [
        ['poseComplete', 'Pose terminée'], ['elecOk', 'Contrôle électrique'],
        ['sanitOk', 'Contrôle sanitaire'], ['reglagesOk', 'Contrôle réglages'],
        ['conforme', 'Conforme commande'], ['clientInformed', 'Client informé']
      ];
      checkLabels.forEach(([key, label]) => {
        const ok = r.checks[key];
        doc.text(`${ok ? '✓' : '✗'}  ${label}`, M, y);
        const comm = r.checks[key + 'Comment'];
        if (comm) { doc.setTextColor(200, 0, 0); doc.text(`   → ${comm}`, M + 60, y); doc.setTextColor(0); }
        y += 5;
      });
      y += 5;

      // Problems
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Problèmes', M, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text({ none: 'Aucun problème', minor: 'Problèmes mineurs', blocking: 'Problèmes bloquants' }[r.problems.level], M, y); y += 5;
      if (r.problems.detail) { const lines = doc.splitTextToSize(r.problems.detail, W - 2 * M); doc.text(lines, M, y); y += lines.length * 5; }
      y += 5;

      // SAV
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('SAV', M, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      if (r.sav.needed) {
        doc.text(`Urgence : ${{ low: 'Faible', medium: 'Moyenne', high: 'Haute' }[r.sav.urgency] || '—'}`, M, y); y += 5;
        const savLines = doc.splitTextToSize(r.sav.desc, W - 2 * M); doc.text(savLines, M, y); y += savLines.length * 5;
      } else { doc.text('Aucun SAV nécessaire', M, y); y += 5; }
      y += 5;

      // Remarks
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Remarques client', M, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const remLines = doc.splitTextToSize(r.clientRemarks || '—', W - 2 * M);
      doc.text(remLines, M, y); y += remLines.length * 5 + 5;

      // Signature
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Signature', M, y); y += 7;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`${r.signatory} — ${fmtDate(r.signatureDate)}`, M, y); y += 8;
      if (r.signatureData) {
        try { doc.addImage(r.signatureData, 'PNG', M, y, 60, 20); y += 25; } catch(e) {}
      }

      // Footer
      y += 5;
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`${STORE_CONFIG.name} · v${STORE_CONFIG.appVersion} · Généré le ${fmtDate(new Date())}`, M, 285);

      doc.save(`rapport_${d.num}.pdf`);
      showToast('PDF téléchargé');
    } catch (e) {
      console.error('jsPDF error:', e);
      showToast('Erreur génération PDF', 'error');
    }
  }

  /* =============================================================
     PROFIL
     ============================================================= */
  function renderProfile() {
    if (!user) return;
    const posesMonth = ACTIVITIES.filter(a => a.type === 'Pose' && a.status === 'done').length;
    const savPending = ACTIVITIES.filter(a => a.type === 'SAV' && a.status !== 'done').length;
    const dosDone = DOSSIERS.filter(d => d.status === 'done').length;

    let html = `
      <div style="background:var(--white);border-radius:var(--radius-lg);padding:20px;text-align:center;margin-top:14px;box-shadow:var(--shadow)">
        <div style="width:64px;height:64px;background:${isMag() ? STORE_CONFIG.accentColor : poseurColor(user.poseurId)};color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;font-family:'Poppins',sans-serif;margin:0 auto 8px">${user.firstName[0]}${user.lastName[0]}</div>
        <div style="font-family:'Poppins',sans-serif;font-size:18px;font-weight:700">${user.firstName} ${user.lastName}</div>
        <div style="color:var(--text-light);font-size:12px">${isMag() ? 'Responsable Magasin' : 'Poseur / Technicien'}</div>
      </div>
      <div class="stats">
        <div class="stat"><div class="stat-num">${posesMonth}</div><div class="stat-label">Poses</div></div>
        <div class="stat"><div class="stat-num">${savPending}</div><div class="stat-label">SAV</div></div>
        <div class="stat"><div class="stat-num">${dosDone}</div><div class="stat-label">Terminés</div></div>
      </div>`;

    // Poseurs management (magasin only)
    if (isMag()) {
      html += `<div class="sec-title">Gestion des poseurs</div>`;
      POSEURS.forEach(p => {
        const acts = ACTIVITIES.filter(a => a.poseurId === p.id && a.status !== 'done').length;
        html += `<div class="card" style="display:flex;align-items:center;gap:10px;opacity:${p.actif ? 1 : 0.5}">
          <div class="poseur-av" style="background:${p.couleur}">${p.prenom[0]}${p.nom[0]}</div>
          <div style="flex:1"><div style="font-weight:600;font-size:13px">${p.prenom} ${p.nom}</div><div style="font-size:10px;color:var(--text-light)">${p.email} · ${p.tel}</div><div style="font-size:10px;color:var(--text-light)">${acts} activité(s) · ${p.actif ? 'Actif' : 'Inactif'}</div></div>
          <button class="btn btn-ghost btn-sm" style="width:auto;padding:6px 10px;font-size:11px" onclick="App.togglePoseur(${p.id})">${p.actif ? 'Désactiver' : 'Activer'}</button>
        </div>`;
      });
      html += `<button class="btn btn-accent btn-sm" style="margin-top:6px" onclick="App.addPoseur()"><i class="ph ph-plus-circle"></i> Ajouter un poseur</button>`;
    }

    // Store info
    html += `<div style="background:var(--white);border-radius:var(--radius);overflow:hidden;box-shadow:var(--shadow);margin-top:14px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-light);padding:12px 14px 4px">Magasin</div>
      <div class="irow" style="padding:8px 14px"><i class="ph ph-storefront"></i><span>${STORE_CONFIG.name}</span></div>
      <div class="irow" style="padding:8px 14px"><i class="ph ph-map-pin"></i><span>${STORE_CONFIG.address}</span></div>
      <div class="irow" style="padding:8px 14px"><i class="ph ph-phone"></i><span>${STORE_CONFIG.phone}</span></div>
      <div class="irow" style="padding:8px 14px"><i class="ph ph-envelope-simple"></i><span>${STORE_CONFIG.email}</span></div>
    </div>
    <a href="mailto:${STORE_CONFIG.supportEmail}" class="btn btn-ghost btn-sm" style="margin-top:12px;text-decoration:none"><i class="ph ph-headset"></i> Contacter le support</a>
    <button class="btn btn-danger btn-sm" style="margin-top:8px;margin-bottom:20px" onclick="App.logout()"><i class="ph ph-sign-out"></i> Se déconnecter</button>
    <div style="text-align:center;font-size:10px;color:var(--text-light)">v${STORE_CONFIG.appVersion}</div>`;

    $('pgProfile').innerHTML = html;
  }

  function togglePoseur(id) {
    const p = POSEURS.find(x => x.id === id);
    if (p) { p.actif = !p.actif; save(); renderProfile(); showToast(p.actif ? 'Poseur activé' : 'Poseur désactivé'); }
  }

  function addPoseur() {
    const html = `<h2 class="modal-title">Nouveau poseur</h2>
      <div class="form-group"><label class="form-label">Prénom</label><input class="form-input" id="apFn"></div>
      <div class="form-group"><label class="form-label">Nom</label><input class="form-input" id="apLn"></div>
      <div class="form-group"><label class="form-label">Email</label><input class="form-input" id="apEm"></div>
      <div class="form-group"><label class="form-label">Téléphone</label><input class="form-input" id="apTel"></div>
      <div class="form-group"><label class="form-label">Couleur</label><input class="form-input" id="apCol" type="color" value="#6366f1"></div>
      <button class="btn btn-success btn-sm" onclick="App.savePoseur()"><i class="ph ph-plus-circle"></i> Ajouter</button>`;
    openOv('ovModal', html);
  }
  function savePoseur() {
    const fn = $('apFn').value.trim(); const ln = $('apLn').value.trim();
    if (!fn || !ln) { showToast('Nom et prénom requis', 'error'); return; }
    POSEURS.push({ id: Date.now(), nom: ln.toUpperCase(), prenom: fn, email: $('apEm').value, tel: $('apTel').value, actif: true, couleur: $('apCol').value });
    save(); closeOv('ovModal'); renderProfile(); showToast('Poseur ajouté');
  }

  /* =============================================================
     RIPPLE EFFECT
     ============================================================= */
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn');
    if (!btn) return;
    const sp = document.createElement('span'); sp.className = 'ripple';
    const r = btn.getBoundingClientRect();
    const sz = Math.max(r.width, r.height);
    sp.style.width = sp.style.height = sz + 'px';
    sp.style.left = (e.clientX - r.left - sz / 2) + 'px';
    sp.style.top = (e.clientY - r.top - sz / 2) + 'px';
    btn.appendChild(sp);
    setTimeout(() => sp.remove(), 500);
  });

  /* =============================================================
     INIT
     ============================================================= */
  document.addEventListener('DOMContentLoaded', () => {
    // Apply config colors
    document.documentElement.style.setProperty('--primary', STORE_CONFIG.primaryColor);
    document.documentElement.style.setProperty('--accent', STORE_CONFIG.accentColor);

    // Splash
    $('splashIcon').textContent = STORE_CONFIG.logo;
    $('splashTitle').textContent = STORE_CONFIG.name;
    $('loginIcon').textContent = STORE_CONFIG.logo;
    $('loginBrand').textContent = STORE_CONFIG.name;
    $('loginVer').textContent = 'v' + STORE_CONFIG.appVersion;

    // Load saved data
    loadSaved();

    // Hide splash
    setTimeout(() => $('splash').classList.add('hide'), 1100);

    // Login form
    $('loginForm').onsubmit = e => { e.preventDefault(); doLogin(); };
  });

  /* =============================================================
     PUBLIC API
     ============================================================= */
  return {
    // Auth
    quickLogin, logout, doLogin,
    // Nav
    nav, setSubTab,
    // Calendar
    calPrev, calNext, calToday, setCalView, setCalFilter, calGoDay,
    openDayPanel, closeSide, openNewActivityAt, _setRadioType,
    // Activities
    openActDetail, markDone, openNewActivity, createActivity, reassign, openDossierFromAct,
    // Dossiers
    openDossier, editClient, saveClient, addDoc, saveDoc, addElectro, saveElectro, openNewDossier, createDossier,
    viewDoc,
    // Report
    openReport, openReportView, toggleCheck, setCheckComment, setProblem, setProblemDetail,
    toggleSav, setSavDesc, setSavUrg,
    addPhoto, addPhotos, delPhoto, setPhotoCaption, setRemarks, setSignatory,
    clearSig, submitReport, doSubmit,
    // PDF
    downloadPdf, resendEmail,
    // Poseurs
    togglePoseur, addPoseur, savePoseur,
    // Email
    sendNotification,
    // Utils
    openLB, closeLB, closeOv, showToast, save
  };
})();
