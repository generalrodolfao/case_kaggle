/* =========================================================
   TAXI INTELLIGENCE — App shell, state, filtering, routing
   v3.2.0
   ========================================================= */
(function(){
  const T = window.TAXI_DATA;
  const SC = window.TAXI_SCREENS;

  // ----- Default filter state -----
  const state = {
    current: 'overview',
    filters: {
      dateFrom: '2014-01-01',
      dateTo:   '2014-12-31',
      hourMin: 0, hourMax: 23,
      fareMin: 0, fareMax: 200,
      distMin: 0, distMax: 50,
      dow: new Set([0,1,2,3,4,5,6]),
      pax: new Set([1,2,3,4,5,6]),
      pickup: 'ALL',
      dropoff:'ALL',
      weather: new Set(['Clear','Rain','Snow','Fog']),
      tripType: new Set(['Urban','Airport','Long-haul']),
    },
    filtered: T.rides,
    goto: (id)=> selectNav(id)
  };
  window.appState = state;

  // ----- Nav -----
  const NAV = [
    {id:'overview',  icon:'🏁', label:'Overview',         k:'01'},
    {id:'geo',       icon:'🗺️', label:'Geo Analysis',     k:'02'},
    {id:'temporal',  icon:'⏱️', label:'Temporal Patterns',k:'03'},
    {id:'fare',      icon:'💵', label:'Fare Breakdown',   k:'04'},
    {id:'distance',  icon:'📏', label:'Distance & Duration',k:'05'},
    {id:'predictor', icon:'🎯', label:'Fare Predictor',   k:'06'},
    {id:'perf',      icon:'📊', label:'Model Performance',k:'07'},
    {id:'quality',   icon:'⚙️', label:'Data Quality',     k:'08'}
  ];

  function renderNav(){
    const nav = document.getElementById('nav');
    nav.innerHTML = NAV.map(n=>`
      <div class="nav-item ${n.id===state.current?'active':''}" data-id="${n.id}">
        <span class="ico">${n.icon}</span>
        <span class="nlabel">${n.label}</span>
        <span class="num">${n.k}</span>
      </div>`).join('');
    nav.addEventListener('click',e=>{
      const it = e.target.closest('.nav-item'); if(!it) return;
      selectNav(it.dataset.id);
    });
  }

  // ----- Filter UI rendering -----
  function renderChips(elId, opts, selected, onToggle){
    const el = document.getElementById(elId);
    el.innerHTML = opts.map(o=>`<div class="chip ${selected.has(o.v)?'on':''}" data-v="${o.v}">${o.l}</div>`).join('');
    el.addEventListener('click',e=>{
      const t = e.target.closest('.chip'); if(!t) return;
      const v = isNaN(+t.dataset.v) ? t.dataset.v : +t.dataset.v;
      onToggle(v, t);
      scheduleApply();
    });
  }

  function setupFilters(){
    // DOW chips
    renderChips('fDow',
      ['SUN','MON','TUE','WED','THU','FRI','SAT'].map((l,i)=>({v:i, l})),
      state.filters.dow,
      (v,t)=>{ if(state.filters.dow.has(v)) state.filters.dow.delete(v); else state.filters.dow.add(v); t.classList.toggle('on'); });

    // PAX chips
    renderChips('fPax',
      [1,2,3,4,5,6].map(v=>({v, l: v===6?'6+':String(v)})),
      state.filters.pax,
      (v,t)=>{ if(state.filters.pax.has(v)) state.filters.pax.delete(v); else state.filters.pax.add(v); t.classList.toggle('on'); });

    // Weather chips
    renderChips('fWx',
      ['Clear','Rain','Snow','Fog'].map(v=>({v, l:v})),
      state.filters.weather,
      (v,t)=>{ if(state.filters.weather.has(v)) state.filters.weather.delete(v); else state.filters.weather.add(v); t.classList.toggle('on'); });

    // Trip chips
    renderChips('fTrip',
      ['Urban','Airport','Long-haul'].map(v=>({v, l:v})),
      state.filters.tripType,
      (v,t)=>{ if(state.filters.tripType.has(v)) state.filters.tripType.delete(v); else state.filters.tripType.add(v); t.classList.toggle('on'); });

    // Inputs
    document.getElementById('fDateFrom').addEventListener('change',e=>{ state.filters.dateFrom = e.target.value; scheduleApply(); });
    document.getElementById('fDateTo').addEventListener('change',e=>{ state.filters.dateTo = e.target.value; scheduleApply(); });
    document.getElementById('fPickup').addEventListener('change',e=>{ state.filters.pickup = e.target.value; scheduleApply(); });
    document.getElementById('fDropoff').addEventListener('change',e=>{ state.filters.dropoff = e.target.value; scheduleApply(); });

    // Dual range sliders
    setupDualRange('fHourMin','fHourMax','hourFill', 'fHourVal', 'hour', v=>v+'h');
    setupDualRange('fFareMin','fFareMax','fareFill', 'fFareVal', 'fare', v=>'$'+v);
    setupDualRange('fDistMin','fDistMax','distFill', 'fDistVal', 'dist', v=>v+' km');

    // Buttons
    document.getElementById('btnApply').addEventListener('click',()=>applyFilters());
    document.getElementById('btnClear').addEventListener('click',clearFilters);
    document.getElementById('btnExport').addEventListener('click',exportCsv);
  }

  function setupDualRange(loId, hiId, fillId, valLabel, key, fmt){
    const lo = document.getElementById(loId), hi = document.getElementById(hiId);
    const fill = document.getElementById(fillId), val = document.getElementById(valLabel);
    const update = ()=>{
      let a = +lo.value, b = +hi.value;
      if(a > b){ [a,b] = [b,a]; }
      const min = +lo.min, max = +lo.max;
      const fa = (a-min)/(max-min)*100, fb = (b-min)/(max-min)*100;
      fill.style.left = fa+'%'; fill.style.right = (100-fb)+'%'; fill.style.top='13px'; fill.style.bottom='auto'; fill.style.height='4px';
      val.textContent = fmt(a) + '—' + fmt(b);
      state.filters[key+'Min'] = a; state.filters[key+'Max'] = b;
      scheduleApply();
    };
    lo.addEventListener('input',update); hi.addEventListener('input',update);
    update();
  }

  let applyTimer=null;
  function scheduleApply(){
    if(applyTimer) clearTimeout(applyTimer);
    applyTimer = setTimeout(()=>applyFilters(), 280);
  }

  function applyFilters(){
    const f = state.filters;
    const tsFrom = Date.parse(f.dateFrom);
    const tsTo   = Date.parse(f.dateTo) + 24*3600*1000;
    state.filtered = T.rides.filter(r=>{
      if(r.ts < tsFrom || r.ts > tsTo) return false;
      if(r.hour < f.hourMin || r.hour > f.hourMax) return false;
      if(r.fare < f.fareMin || r.fare > f.fareMax) return false;
      if(r.distance < f.distMin || r.distance > f.distMax) return false;
      if(!f.dow.has(r.dow)) return false;
      const paxVal = r.pax >=6 ? 6 : r.pax;
      if(!f.pax.has(paxVal)) return false;
      if(f.pickup !== 'ALL' && r.pickupZone !== f.pickup) return false;
      if(f.dropoff !== 'ALL' && r.dropoffZone !== f.dropoff) return false;
      if(!f.weather.has(r.weather)) return false;
      if(!f.tripType.has(r.tripType)) return false;
      return true;
    });
    // counter / active filter list
    const factor = 250;
    document.getElementById('countText').textContent = fmtInt(state.filtered.length * factor);
    document.getElementById('rowsSelected').textContent = fmtInt(state.filtered.length * factor);
    document.getElementById('activeFilterList').textContent = describeFilters();
    renderCurrentScreen();
  }

  function describeFilters(){
    const f = state.filters; const arr = [];
    arr.push('period');
    if(f.hourMin!==0||f.hourMax!==23) arr.push('hour');
    if(f.fareMin!==0||f.fareMax!==200) arr.push('fare');
    if(f.distMin!==0||f.distMax!==50) arr.push('dist');
    if(f.dow.size!==7) arr.push('dow');
    if(f.pax.size!==6) arr.push('pax');
    if(f.pickup!=='ALL') arr.push('pickup');
    if(f.dropoff!=='ALL') arr.push('dropoff');
    if(f.weather.size!==4) arr.push('weather');
    if(f.tripType.size!==3) arr.push('trip');
    return arr.join(' · ');
  }

  function clearFilters(){
    state.filters.dateFrom = '2009-01-01'; document.getElementById('fDateFrom').value = '2009-01-01';
    state.filters.dateTo   = '2015-06-30'; document.getElementById('fDateTo').value = '2015-06-30';
    state.filters.hourMin = 0; state.filters.hourMax = 23;
    document.getElementById('fHourMin').value = 0; document.getElementById('fHourMax').value = 23;
    document.getElementById('fFareMin').value = 0; document.getElementById('fFareMax').value = 200;
    document.getElementById('fDistMin').value = 0; document.getElementById('fDistMax').value = 50;
    state.filters.fareMin=0; state.filters.fareMax=200; state.filters.distMin=0; state.filters.distMax=50;
    state.filters.dow = new Set([0,1,2,3,4,5,6]);
    state.filters.pax = new Set([1,2,3,4,5,6]);
    state.filters.weather = new Set(['Clear','Rain','Snow','Fog']);
    state.filters.tripType = new Set(['Urban','Airport','Long-haul']);
    state.filters.pickup='ALL'; state.filters.dropoff='ALL';
    document.getElementById('fPickup').value='ALL';
    document.getElementById('fDropoff').value='ALL';
    setupFilters(); // re-render chips
    applyFilters();
  }

  function exportCsv(){
    const rows = state.filtered.slice(0, 5000);
    const head = 'id,timestamp,pickup_lat,pickup_lng,dropoff_lat,dropoff_lng,pickup_zone,dropoff_zone,distance_km,pax,weather,trip_type,fare_amount\n';
    const body = rows.map(r=>[
      r.id, new Date(r.ts).toISOString(),
      r.pickup.lat.toFixed(5), r.pickup.lng.toFixed(5),
      r.dropoff.lat.toFixed(5), r.dropoff.lng.toFixed(5),
      r.pickupZone, r.dropoffZone, r.distance.toFixed(3),
      r.pax, r.weather, r.tripType, r.fare.toFixed(2)
    ].join(',')).join('\n');
    const blob = new Blob([head+body],{type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'taxi-intelligence-export.csv';
    a.click();
  }

  // ----- Screen routing -----
  function selectNav(id){
    state.current = id;
    document.querySelectorAll('.nav-item').forEach(n=>{
      n.classList.toggle('active', n.dataset.id===id);
    });
    const screens = document.getElementById('screens');
    screens.querySelectorAll('.screen').forEach(s=> s.classList.remove('on'));
    let scr = document.getElementById('screen-'+id);
    if(!scr){
      scr = SC.builders[id]();
      screens.appendChild(scr);
    }
    scr.classList.add('on');
    document.getElementById('crumbCurrent').textContent =
      NAV.find(n=>n.id===id).label.toUpperCase();
    renderCurrentScreen();
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function renderCurrentScreen(){
    const r = SC.renderers[state.current];
    if(r) r(state.filtered);
    // tooltip rebind for any new heatmap cells
    bindTooltips();
  }

  // ----- Tooltips -----
  function bindTooltips(){
    const tip = document.getElementById('tooltip');
    document.querySelectorAll('[data-tt]').forEach(el=>{
      if(el._ttBound) return; el._ttBound = true;
      el.addEventListener('mouseenter',e=>{
        tip.textContent = el.getAttribute('data-tt');
        tip.classList.add('on');
      });
      el.addEventListener('mousemove',e=>{
        tip.style.left = e.clientX+'px';
        tip.style.top  = e.clientY+'px';
      });
      el.addEventListener('mouseleave',()=>tip.classList.remove('on'));
    });
  }

  function fmtInt(v){ return Math.round(v).toLocaleString('en-US'); }

  // ----- Clock in botbar -----
  function tick(){
    const d = new Date();
    const pad = x => (x<10?'0':'')+x;
    document.getElementById('clock').textContent = pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds())+' · NYC';
  }
  setInterval(tick,1000); tick();

  // ----- Boot -----
  renderNav();
  setupFilters();
  selectNav('overview'); // also calls applyFilters via render

  applyFilters();
})();
