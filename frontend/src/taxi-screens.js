/* =========================================================
   TAXI INTELLIGENCE — Screen renderers
   Each screen exposes mount() and update(filtered).
   ========================================================= */
(function(){
  const T = window.TAXI_DATA;
  const fmtMoney = v => '$' + v.toFixed(2);
  const fmtInt   = v => v.toLocaleString('en-US');
  const fmtKm    = v => v.toFixed(2) + ' km';

  // Common Chart.js defaults
  Chart.defaults.color = '#8A8A8A';
  Chart.defaults.font.family = "'JetBrains Mono', monospace";
  Chart.defaults.font.size = 10;
  Chart.defaults.borderColor = '#2A2A2A';
  Chart.defaults.plugins.legend.labels.font = { family: "'Barlow Condensed', sans-serif", size: 12, weight: '600' };
  Chart.defaults.plugins.tooltip.backgroundColor = '#000';
  Chart.defaults.plugins.tooltip.borderColor = '#F7B731';
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleFont = { family: "'Barlow Condensed', sans-serif", size: 12 };
  Chart.defaults.plugins.tooltip.bodyFont = { family: "'JetBrains Mono', monospace", size: 11 };

  const yellow = '#F7B731';
  const yellowSoft = 'rgba(247,183,49,0.6)';
  const red = '#FF1744';
  const green = '#00C853';
  const grey = '#2A2A2A';

  // =========================================================
  // 1) OVERVIEW
  // =========================================================
  function buildOverview(){
    const el = document.createElement('section');
    el.className = 'screen on';
    el.id = 'screen-overview';
    el.dataset.screenLabel = '01 Overview';
    el.innerHTML = `
      <div class="screen-intro">
        <div class="screen-title">Fleet <em>overview</em></div>
        <div class="screen-sub">METER FEED · LIVE AGGREGATE OF SELECTED RIDES</div>
      </div>

      <div class="grid g-kpi" id="kpiRow"></div>

      <div class="grid g-2 row-gap">
        <div class="card">
          <div class="card-head">
            <div>
              <div class="card-title">Hour × Day demand heatmap</div>
              <div class="card-sub">RIDES / CELL · DARKER = COLDER · YELLOW→RED = HOT</div>
            </div>
            <div class="legend-strip"><span>LOW</span><span class="legend-bar"></span><span>HIGH</span></div>
          </div>
          <div class="heatmap" id="heatmap"></div>
        </div>
        <div class="card">
          <div class="card-head">
            <div><div class="card-title">Top 10 routes</div>
            <div class="card-sub">PICKUP → DROPOFF · COUNT · AVG FARE</div></div>
          </div>
          <table class="tbl" id="topRoutes"></table>
        </div>
      </div>

      <div class="grid g-2 row-gap">
        <div class="card">
          <div class="card-head"><div><div class="card-title">Fare vs volume — monthly</div>
            <div class="card-sub">AVG FARE LINE · VOLUME BAR · DUAL AXIS</div></div></div>
          <div class="chart-wrap h-280"><canvas id="chTimeline"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><div><div class="card-title">Borough mix</div>
          <div class="card-sub">PICKUP DISTRIBUTION</div></div></div>
          <div class="chart-wrap h-280"><canvas id="chBoroughs"></canvas></div>
        </div>
      </div>

      <div class="grid g-2 row-gap">
        <div class="card">
          <div class="card-head"><div><div class="card-title">Pickup density (preview)</div>
          <div class="card-sub">CLICK TO OPEN GEO ANALYSIS</div></div>
          <div class="card-tag">PREVIEW</div></div>
          <div id="miniMap" class="map-mini"></div>
        </div>
        <div class="card">
          <div class="card-head"><div><div class="card-title">Fleet pulse</div>
          <div class="card-sub">RIDES BY HOUR · LAST PERIOD</div></div></div>
          <div class="chart-wrap h-280"><canvas id="chHourPulse"></canvas></div>
        </div>
      </div>
    `;
    return el;
  }

  function kpis(filtered){
    const n = filtered.length;
    const avgFare = n ? filtered.reduce((a,r)=>a+r.fare,0)/n : 0;
    const totalRev = filtered.reduce((a,r)=>a+r.fare,0);
    const avgDist = n ? filtered.reduce((a,r)=>a+r.distance,0)/n : 0;
    const hourCounts = new Array(24).fill(0);
    filtered.forEach(r=>hourCounts[r.hour]++);
    let peakH = 0, peakV = 0;
    hourCounts.forEach((v,h)=>{ if(v>peakV){peakV=v; peakH=h;} });
    return [
      {ico:'🚖', label:'Total rides', val: fmtInt(Math.round(n*250)), delta:'+12.4%', deltaPos:true, sub:'vs prev period'},
      {ico:'💵', label:'Avg fare',    val: fmtMoney(avgFare),         delta:'−2.1%',  deltaPos:false, sub:'meter mean'},
      {ico:'🏦', label:'Revenue est.', val:'$'+(totalRev*250/1e6).toFixed(1)+'M', delta:'+8.7%', deltaPos:true, sub:'extrapolated'},
      {ico:'📏', label:'Avg distance', val: fmtKm(avgDist),           delta:'+0.3%',  deltaPos:true,  sub:'haversine'},
      {ico:'⏰', label:'Peak demand',  val: pad(peakH)+'h–'+pad((peakH+2)%24)+'h', delta:fmtInt(peakV)+' rides', deltaPos:true, sub:'peak window'},
      {ico:'🎯', label:'RMSE · XGBoost',val:'$3.27', delta:'BEAT BASELINE', deltaPos:true, sub:'validation', accent:true, badge:true}
    ];
  }
  function pad(n){ return (n<10?'0':'')+n; }

  function renderKpis(filtered){
    const row = document.getElementById('kpiRow'); row.innerHTML = '';
    kpis(filtered).forEach(k=>{
      const d = document.createElement('div'); d.className='kpi';
      d.innerHTML = `
        <div class="kpi-ico">${k.ico}</div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-val ${k.accent?'accent':''}">${k.val}</div>
        <div class="kpi-foot">
          ${k.badge
            ? '<span class="kpi-badge">' + k.delta + '</span>'
            : '<span class="kpi-delta '+(k.deltaPos?'pos':'neg')+'">'+(k.deltaPos?'▲':'▼')+' '+k.delta+'</span>'}
          <span class="muted">${k.sub}</span>
        </div>`;
      row.appendChild(d);
    });
  }

  function renderHeatmap(filtered){
    const hm = document.getElementById('heatmap'); hm.innerHTML='';
    // grid[day][hour]
    const grid = Array.from({length:7},()=>new Array(24).fill(0));
    filtered.forEach(r=>{ grid[r.dow][r.hour]++; });
    let mx = 1; grid.forEach(row=>row.forEach(v=>{ if(v>mx) mx=v; }));

    // header row
    const blank = document.createElement('div'); blank.className='hm-head'; hm.appendChild(blank);
    for(let h=0;h<24;h++){
      const hd = document.createElement('div'); hd.className='hm-head'; hd.textContent = pad(h);
      hm.appendChild(hd);
    }
    for(let d=0; d<7; d++){
      const lbl = document.createElement('div'); lbl.className='hm-label'; lbl.textContent = T.DOW[d];
      hm.appendChild(lbl);
      for(let h=0; h<24; h++){
        const v = grid[d][h];
        const t = v/mx;
        const cell = document.createElement('div');
        cell.className='hm-cell';
        cell.style.background = heatColor(t);
        cell.setAttribute('data-tt', `${T.DOW[d]} · ${pad(h)}h\n${fmtInt(v)} rides`);
        hm.appendChild(cell);
      }
    }
  }
  function heatColor(t){
    // dark → yellow → red
    if(t<0.01) return '#161616';
    if(t<0.25){ const a=t/0.25; return `rgba(247,183,49,${0.12+a*0.18})`; }
    if(t<0.7){ const a=(t-0.25)/0.45; return `rgba(247,183,49,${0.3+a*0.5})`; }
    const a=(t-0.7)/0.3; return `rgba(${255},${ Math.round(196-a*100) },${ Math.round(0+a*30) },${0.8+a*0.2})`;
  }

  function renderTopRoutes(filtered){
    const tbl = document.getElementById('topRoutes');
    const map = {};
    filtered.forEach(r=>{
      const k = r.pickupZone+'|'+r.dropoffZone;
      (map[k] = map[k] || {n:0, sum:0, p:r.pickupZone, d:r.dropoffZone});
      map[k].n++; map[k].sum += r.fare;
    });
    const arr = Object.values(map).map(o=>({...o, avg:o.sum/o.n})).sort((a,b)=>b.n-a.n).slice(0,10);
    tbl.innerHTML = `<thead><tr><th>#</th><th>Route</th><th class="num">Rides</th><th class="num">Avg fare</th><th></th></tr></thead>
      <tbody>${arr.map((r,i)=>{
        const pct = arr[0] ? r.n/arr[0].n : 0;
        return `<tr>
          <td class="accent">${pad(i+1)}</td>
          <td>${r.p} <span class="muted">→</span> ${r.d}</td>
          <td class="num">${fmtInt(r.n)}</td>
          <td class="num accent">${fmtMoney(r.avg)}</td>
          <td><div class="minibar"><div class="bar"><i style="width:${(pct*100).toFixed(1)}%"></i></div></div></td>
        </tr>`;
      }).join('')}</tbody>`;
  }

  // chart instances
  const charts = {};
  function destroyChart(name){ if(charts[name]){ charts[name].destroy(); delete charts[name]; } }

  function renderTimeline(filtered){
    const buckets = {};
    filtered.forEach(r=>{
      const k = r.year+'-'+pad(r.month+1);
      (buckets[k] = buckets[k] || {n:0, sum:0});
      buckets[k].n++; buckets[k].sum += r.fare;
    });
    const labels = Object.keys(buckets).sort();
    const counts = labels.map(k=>buckets[k].n);
    const avgs   = labels.map(k=>buckets[k].sum/buckets[k].n);
    destroyChart('timeline');
    charts.timeline = new Chart(document.getElementById('chTimeline'), {
      data: { labels, datasets: [
        { type:'bar', label:'Rides', data:counts, backgroundColor:'rgba(247,183,49,0.25)', borderColor: yellow, borderWidth:1, yAxisID:'y1', borderRadius:2 },
        { type:'line', label:'Avg fare', data:avgs, borderColor: red, backgroundColor:'rgba(255,23,68,0.0)', tension:0.3, pointRadius:0, borderWidth:2, yAxisID:'y2' }
      ]},
      options: chartOpts({
        scales:{
          x:{ grid:{ color:grey, display:false}, ticks:{ maxRotation:0, autoSkip:true, maxTicksLimit:12 } },
          y1:{ position:'left', grid:{ color: 'rgba(255,255,255,0.04)'}, ticks:{ callback:v=>fmtInt(v)} },
          y2:{ position:'right', grid:{ display:false }, ticks:{ callback:v=>'$'+v.toFixed(0), color: red } }
        }
      })
    });
  }

  function renderBoroughs(filtered){
    const counts = {};
    filtered.forEach(r=>{ counts[r.pickupZone] = (counts[r.pickupZone]||0)+1; });
    const labels = Object.keys(counts);
    const data = labels.map(k=>counts[k]);
    const colors = labels.map((_,i)=>['#F7B731','#FFCC00','#B8851F','#5B4710','#FF1744','#00C853','#29B6F6','#8A8A8A'][i%8]);
    destroyChart('boroughs');
    charts.boroughs = new Chart(document.getElementById('chBoroughs'), {
      type:'doughnut',
      data:{ labels, datasets:[{ data, backgroundColor:colors, borderColor:'#0F0F0F', borderWidth:2 }]},
      options: { responsive:true, maintainAspectRatio:false, cutout:'62%',
        plugins:{ legend:{ position:'right', labels:{ boxWidth:10, font:{ family:"'JetBrains Mono', monospace", size:10 }, color:'#B0B0B0' } } }
      }
    });
  }

  function renderHourPulse(filtered){
    const arr = new Array(24).fill(0);
    filtered.forEach(r=>arr[r.hour]++);
    destroyChart('hourPulse');
    charts.hourPulse = new Chart(document.getElementById('chHourPulse'),{
      type:'line',
      data:{ labels: arr.map((_,h)=>pad(h)+'h'),
        datasets:[{ label:'Rides', data: arr, fill:true, backgroundColor:'rgba(247,183,49,0.15)', borderColor:yellow, tension:0.35, pointRadius:0, borderWidth:2 }]
      },
      options: chartOpts({ scales:{ x:{ grid:{ display:false } }, y:{ grid:{ color:'rgba(255,255,255,0.04)' } } } })
    });
  }

  let miniMap = null, miniMapLayer = null;
  function renderMiniMap(filtered){
    if(!miniMap){
      miniMap = L.map('miniMap', { zoomControl:false, attributionControl:false }).setView([40.74,-73.97],11);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',{
        subdomains:'abcd', maxZoom: 19
      }).addTo(miniMap);
      miniMap.getContainer().addEventListener('click',()=>{ window.appState.goto('geo'); });
    }
    if(miniMapLayer){ miniMap.removeLayer(miniMapLayer); }
    const sample = filtered.length > 800 ? sampleArray(filtered, 800) : filtered;
    miniMapLayer = L.layerGroup();
    sample.forEach(r=>{
      L.circleMarker([r.pickup.lat, r.pickup.lng], {
        radius: 2, color:'#F7B731', fillColor:'#F7B731',
        fillOpacity:0.7, weight:0
      }).addTo(miniMapLayer);
    });
    miniMapLayer.addTo(miniMap);
    setTimeout(()=>miniMap.invalidateSize(), 50);
  }

  function sampleArray(a, n){
    if(a.length<=n) return a.slice();
    const out = []; const step = a.length/n;
    for(let i=0;i<n;i++) out.push(a[Math.floor(i*step)]);
    return out;
  }

  // =========================================================
  // 2) GEO
  // =========================================================
  function buildGeo(){
    const el = document.createElement('section'); el.className='screen'; el.id='screen-geo';
    el.dataset.screenLabel = '02 Geo Analysis';
    el.innerHTML = `
      <div class="screen-intro">
        <div class="screen-title">Geo <em>analysis</em></div>
        <div class="screen-sub">PICKUP/DROPOFF MAP · DARKMATTER TILES · FILTERED LIVE</div>
      </div>
      <div class="geo-controls">
        <div><span class="tg-label">LAYER</span>
          <div class="toggle-group" id="geoLayer">
            <div class="tg on" data-v="PICKUP">PICKUP</div>
            <div class="tg" data-v="DROPOFF">DROPOFF</div>
            <div class="tg" data-v="BOTH">BOTH</div>
            <div class="tg" data-v="FLOW">FLOW</div>
          </div>
        </div>
        <div><span class="tg-label">MODE</span>
          <div class="toggle-group" id="geoMode">
            <div class="tg on" data-v="POINTS">POINTS</div>
            <div class="tg" data-v="HEAT">HEATMAP</div>
            <div class="tg" data-v="HEX">HEXBIN</div>
            <div class="tg" data-v="CLUSTER">CLUSTERS</div>
          </div>
        </div>
        <div class="opacity-ctrl">
          <span class="tg-label">OPACITY</span>
          <input type="range" id="geoOpacity" min="10" max="100" value="70"/>
          <span class="mono" id="geoOpacityVal">0.70</span>
        </div>
        <div style="margin-left:auto; display:flex; gap:8px;">
          <button class="btn btn-ghost" id="btnManhattan">CENTER · MANHATTAN</button>
          <button class="btn btn-ghost" id="btnAllBoroughs">ALL BOROUGHS</button>
        </div>
      </div>

      <div class="geo-wrap">
        <div class="card" style="padding:0; overflow:hidden;">
          <div id="bigMap" class="map-full"></div>
        </div>
        <div style="display:flex; flex-direction:column; gap:14px;">
          <div class="card">
            <div class="card-head"><div class="card-title">Top pickup zones</div></div>
            <table class="tbl" id="topPickup"></table>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">Top dropoff zones</div></div>
            <table class="tbl" id="topDropoff"></table>
          </div>
          <div class="card">
            <div class="card-head"><div class="card-title">Airport ops</div></div>
            <div id="airportOps" class="mono" style="font-size:11px;"></div>
          </div>
        </div>
      </div>
    `;
    return el;
  }

  let bigMap = null, bigLayer = null;
  const GEO_STATE = { layer:'PICKUP', mode:'POINTS', opacity:0.7 };

  function ensureBigMap(){
    if(bigMap) return;
    bigMap = L.map('bigMap',{ zoomControl:true }).setView([40.74,-73.97],11);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',{
      attribution:'© CartoDB · NYC TLC',
      subdomains:'abcd', maxZoom: 19
    }).addTo(bigMap);
    // airport markers
    Object.entries(T.zones).forEach(([n,z])=>{
      if(z.airport){
        L.marker([z.lat, z.lng], {
          icon: L.divIcon({
            className:'airport-pin',
            html:`<div style="background:#F7B731;color:#000;font-weight:700;font-family:'Barlow Condensed';padding:3px 6px;border-radius:3px;font-size:11px;border:1px solid #000;">✈ ${n}</div>`
          })
        }).addTo(bigMap);
      }
    });

    document.getElementById('geoLayer').addEventListener('click',e=>{
      const t = e.target.closest('.tg'); if(!t) return;
      [...e.currentTarget.children].forEach(c=>c.classList.toggle('on', c===t));
      GEO_STATE.layer = t.dataset.v; drawBigMap(window.appState.filtered);
    });
    document.getElementById('geoMode').addEventListener('click',e=>{
      const t = e.target.closest('.tg'); if(!t) return;
      [...e.currentTarget.children].forEach(c=>c.classList.toggle('on', c===t));
      GEO_STATE.mode = t.dataset.v; drawBigMap(window.appState.filtered);
    });
    document.getElementById('geoOpacity').addEventListener('input',e=>{
      GEO_STATE.opacity = +e.target.value/100;
      document.getElementById('geoOpacityVal').textContent = GEO_STATE.opacity.toFixed(2);
      drawBigMap(window.appState.filtered);
    });
    document.getElementById('btnManhattan').addEventListener('click',()=>bigMap.setView([40.7831,-73.9712],13));
    document.getElementById('btnAllBoroughs').addEventListener('click',()=>bigMap.setView([40.72,-73.94],11));
  }

  function drawBigMap(filtered){
    ensureBigMap();
    if(bigLayer){ bigMap.removeLayer(bigLayer); bigLayer = null; }
    bigLayer = L.layerGroup();
    const sample = filtered.length > 2000 ? sampleArray(filtered, 2000) : filtered;
    const op = GEO_STATE.opacity;

    if(GEO_STATE.mode === 'HEX' || GEO_STATE.mode === 'HEAT'){
      // simulate hexbin/heat with sized circle bins by lat/lng grid
      const grid = {};
      const step = GEO_STATE.mode === 'HEX' ? 0.012 : 0.006;
      sample.forEach(r=>{
        const pts = (GEO_STATE.layer === 'DROPOFF') ? [r.dropoff]
                  : (GEO_STATE.layer === 'BOTH') ? [r.pickup, r.dropoff]
                  : [r.pickup];
        pts.forEach(p=>{
          const lat = Math.round(p.lat/step)*step;
          const lng = Math.round(p.lng/step)*step;
          const k = lat+'|'+lng;
          (grid[k] = grid[k] || {lat, lng, n:0, sum:0});
          grid[k].n++; grid[k].sum += r.fare;
        });
      });
      const vals = Object.values(grid); const mx = Math.max(1, ...vals.map(v=>v.n));
      vals.forEach(v=>{
        const t = v.n/mx;
        const radius = GEO_STATE.mode==='HEX' ? 12 + t*16 : 6 + t*22;
        L.circleMarker([v.lat, v.lng],{
          radius, color:'transparent',
          fillColor: heatGradient(t),
          fillOpacity: op * (0.4 + t*0.5),
          weight: 0
        }).bindTooltip(`${fmtInt(v.n)} rides · avg ${fmtMoney(v.sum/v.n)}`, {className:'lt'}).addTo(bigLayer);
      });
    } else if(GEO_STATE.mode === 'CLUSTER'){
      // simple zone-level clusters
      const zCount = {};
      sample.forEach(r=>{
        const z = GEO_STATE.layer==='DROPOFF'? r.dropoffZone : r.pickupZone;
        (zCount[z] = zCount[z] || {n:0, lat:T.zones[z].lat, lng:T.zones[z].lng, name:z});
        zCount[z].n++;
      });
      const mx = Math.max(1, ...Object.values(zCount).map(v=>v.n));
      Object.values(zCount).forEach(v=>{
        const t = v.n/mx;
        L.circleMarker([v.lat,v.lng],{
          radius: 14+t*30,
          color:yellow, fillColor:yellow, fillOpacity:op*0.4, weight:2
        }).bindTooltip(`${v.name} · ${fmtInt(v.n)} rides`).addTo(bigLayer);
      });
    } else {
      // POINTS
      sample.forEach(r=>{
        if(GEO_STATE.layer === 'PICKUP' || GEO_STATE.layer === 'BOTH'){
          L.circleMarker([r.pickup.lat, r.pickup.lng],{
            radius:2.2, color:yellow, fillColor:yellow, fillOpacity:op*0.7, weight:0
          }).addTo(bigLayer);
        }
        if(GEO_STATE.layer === 'DROPOFF' || GEO_STATE.layer === 'BOTH'){
          L.circleMarker([r.dropoff.lat, r.dropoff.lng],{
            radius:2.2, color:red, fillColor:red, fillOpacity:op*0.6, weight:0
          }).addTo(bigLayer);
        }
        if(GEO_STATE.layer === 'FLOW'){
          L.polyline([[r.pickup.lat,r.pickup.lng],[r.dropoff.lat,r.dropoff.lng]],{
            color:yellow, opacity: op*0.18, weight:1
          }).addTo(bigLayer);
        }
      });
    }
    bigLayer.addTo(bigMap);
    setTimeout(()=>bigMap.invalidateSize(),60);
    renderGeoSidePanels(filtered);
  }

  function heatGradient(t){
    if(t<0.25) return '#5B4710';
    if(t<0.55) return '#B8851F';
    if(t<0.8) return '#F7B731';
    return '#FF1744';
  }

  function renderGeoSidePanels(filtered){
    const tp = document.getElementById('topPickup');
    const td = document.getElementById('topDropoff');
    const acc = (key)=>{
      const m={}; filtered.forEach(r=>{ const k=r[key]; (m[k]=m[k]||{n:0,sum:0}); m[k].n++; m[k].sum+=r.fare; });
      const arr=Object.entries(m).map(([n,v])=>({n, count:v.n, avg:v.sum/v.n})).sort((a,b)=>b.count-a.count).slice(0,8);
      return arr;
    };
    const renderZ = (tbl, rows)=>{
      const mx = rows[0]?.count||1;
      tbl.innerHTML = `<thead><tr><th>Zone</th><th class="num">Rides</th><th class="num">Avg</th><th></th></tr></thead>
      <tbody>${rows.map(r=>`<tr>
        <td>${r.n}</td>
        <td class="num">${fmtInt(r.count)}</td>
        <td class="num accent">${fmtMoney(r.avg)}</td>
        <td style="width:50px;"><div class="minibar"><div class="bar"><i style="width:${(r.count/mx*100).toFixed(0)}%"></i></div></div></td>
      </tr>`).join('')}</tbody>`;
    };
    renderZ(tp, acc('pickupZone'));
    renderZ(td, acc('dropoffZone'));

    // airport ops
    const apEl = document.getElementById('airportOps');
    const apZ = ['JFK','LGA','EWR'];
    const lines = apZ.map(z=>{
      const r = filtered.filter(x=>x.pickupZone===z || x.dropoffZone===z);
      const cnt = r.length;
      const avg = cnt? r.reduce((a,x)=>a+x.fare,0)/cnt : 0;
      return `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #1F1F1F;">
        <span class="accent">✈ ${z}</span>
        <span>${fmtInt(cnt)} rides</span>
        <span>${fmtMoney(avg)} avg</span>
      </div>`;
    }).join('');
    apEl.innerHTML = lines;
  }

  // =========================================================
  // 3) TEMPORAL
  // =========================================================
  function buildTemporal(){
    const el = document.createElement('section'); el.className='screen'; el.id='screen-temporal';
    el.dataset.screenLabel = '03 Temporal Patterns';
    el.innerHTML = `
      <div class="screen-intro">
        <div class="screen-title">Temporal <em>patterns</em></div>
        <div class="screen-sub">HOUR · DAY · MONTH · YEAR · EVENT WINDOWS</div>
      </div>
      <div class="grid g-temp">
        <div class="card">
          <div class="card-head"><div><div class="card-title">By hour of day</div>
            <div class="card-sub">RIDES (BARS) vs AVG FARE (LINE)</div></div></div>
          <div class="chart-wrap h-280"><canvas id="chHour"></canvas></div>
        </div>
        <div class="card insight" id="tempInsight"></div>
      </div>
      <div class="grid g-3 row-gap">
        <div class="card">
          <div class="card-head"><div class="card-title">By day of week</div></div>
          <div class="chart-wrap h-240"><canvas id="chDow"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">By month</div></div>
          <div class="chart-wrap h-240"><canvas id="chMonth"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">Year-on-year</div></div>
          <div class="chart-wrap h-240"><canvas id="chYear"></canvas></div>
        </div>
      </div>
      <div class="grid g-2 row-gap">
        <div class="card">
          <div class="card-head"><div><div class="card-title">Year × month sazonality</div>
          <div class="card-sub">DARKER = QUIET · YELLOW = BUSY</div></div></div>
          <div id="yearMonthHeat" class="heatmap" style="grid-template-columns: 40px repeat(12, 1fr);"></div>
        </div>
        <div class="card">
          <div class="card-head"><div><div class="card-title">Holiday vs weekday</div></div></div>
          <div class="chart-wrap h-280"><canvas id="chHoliday"></canvas></div>
        </div>
      </div>
    `;
    return el;
  }

  function renderTemporal(filtered){
    // by hour: rides + avg fare
    const hRides = new Array(24).fill(0), hFare = new Array(24).fill(0), hN = new Array(24).fill(0);
    filtered.forEach(r=>{ hRides[r.hour]++; hFare[r.hour]+=r.fare; hN[r.hour]++; });
    const hAvg = hFare.map((v,i)=> hN[i]? v/hN[i] : 0);

    destroyChart('hour');
    charts.hour = new Chart(document.getElementById('chHour'),{
      data:{ labels: hRides.map((_,h)=>pad(h)+'h'),
        datasets:[
          { type:'bar', label:'Rides', data:hRides, backgroundColor:'rgba(247,183,49,0.2)', borderColor:yellow, borderWidth:1, yAxisID:'y1', borderRadius:2 },
          { type:'line', label:'Avg fare', data:hAvg, borderColor:red, tension:0.35, pointRadius:0, borderWidth:2, yAxisID:'y2' }
        ]},
      options: chartOpts({
        scales:{
          y1:{ position:'left', grid:{color:'rgba(255,255,255,0.04)'}, ticks:{ callback:v=>fmtInt(v)} },
          y2:{ position:'right', grid:{display:false}, ticks:{ callback:v=>'$'+v.toFixed(0), color:red } }
        }
      })
    });

    // dow
    const dCount = new Array(7).fill(0), dFare = new Array(7).fill(0);
    filtered.forEach(r=>{ dCount[r.dow]++; dFare[r.dow]+=r.fare; });
    const dAvg = dFare.map((v,i)=> dCount[i]? v/dCount[i] : 0);
    destroyChart('dow');
    charts.dow = new Chart(document.getElementById('chDow'),{
      data:{ labels:T.DOW, datasets:[
        { type:'bar', label:'Rides', data:dCount, backgroundColor:yellowSoft, borderRadius:2, yAxisID:'y1' },
        { type:'line', label:'Avg fare', data:dAvg, borderColor:red, tension:0.3, pointRadius:0, borderWidth:2, yAxisID:'y2' }
      ]},
      options: chartOpts({ scales:{
        y1:{ position:'left', grid:{color:'rgba(255,255,255,0.04)'}, ticks:{ callback:v=>fmtInt(v) } },
        y2:{ position:'right', grid:{display:false}, ticks:{ callback:v=>'$'+v.toFixed(0), color:red } }
      }})
    });

    // month
    const mCount = new Array(12).fill(0);
    filtered.forEach(r=>{ mCount[r.month]++; });
    destroyChart('month');
    charts.month = new Chart(document.getElementById('chMonth'),{
      type:'bar',
      data:{ labels:['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'],
        datasets:[{ data:mCount, backgroundColor:yellow, borderRadius:2 }]},
      options: chartOpts({ plugins:{ legend:{display:false}}, scales:{ x:{ grid:{display:false} }, y:{ grid:{color:'rgba(255,255,255,0.04)'} } } })
    });

    // year
    const yMap = {}; filtered.forEach(r=>{ yMap[r.year]=(yMap[r.year]||0)+1; });
    const yrs = Object.keys(yMap).sort();
    destroyChart('year');
    charts.year = new Chart(document.getElementById('chYear'),{
      type:'line',
      data:{ labels:yrs, datasets:[
        { label:'Rides', data: yrs.map(y=>yMap[y]), borderColor:yellow, backgroundColor:'rgba(247,183,49,0.15)', fill:true, tension:0.25, pointRadius:3, pointBackgroundColor:yellow }
      ]},
      options: chartOpts({ plugins:{ legend:{display:false}}, scales:{ y:{ grid:{color:'rgba(255,255,255,0.04)'} } } })
    });

    // year x month heatmap
    const ymh = document.getElementById('yearMonthHeat'); ymh.innerHTML='';
    const yrSet = [...new Set(filtered.map(r=>r.year))].sort();
    const ymGrid = {}; yrSet.forEach(y=>{ ymGrid[y]=new Array(12).fill(0); });
    filtered.forEach(r=>{ if(ymGrid[r.year]) ymGrid[r.year][r.month]++; });
    let ymMx = 1; yrSet.forEach(y=>ymGrid[y].forEach(v=>{ if(v>ymMx) ymMx=v; }));
    // header
    const blank=document.createElement('div'); blank.className='hm-head'; ymh.appendChild(blank);
    ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'].forEach(m=>{
      const h=document.createElement('div'); h.className='hm-head'; h.textContent=m; ymh.appendChild(h);
    });
    yrSet.forEach(y=>{
      const lbl=document.createElement('div'); lbl.className='hm-label'; lbl.textContent=y; ymh.appendChild(lbl);
      for(let m=0;m<12;m++){
        const v = ymGrid[y][m]; const t = v/ymMx;
        const c = document.createElement('div'); c.className='hm-cell'; c.style.background = heatColor(t);
        c.setAttribute('data-tt', `${y} · ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][m]}\n${fmtInt(v)} rides`);
        ymh.appendChild(c);
      }
    });

    // holiday mock
    destroyChart('holiday');
    charts.holiday = new Chart(document.getElementById('chHoliday'),{
      type:'bar',
      data:{ labels:['Weekday','Saturday','Sunday','Holiday','Big game','Sandy week'],
        datasets:[
          { label:'Avg fare', data:[11.4,12.2,11.8,14.6,16.1,9.2], backgroundColor:yellow, borderRadius:2 },
          { label:'Δ vs weekday', data:[0,+6.8,+3.4,+27.3,+39.6,-19.4], backgroundColor:'rgba(255,23,68,0.4)', borderRadius:2 }
        ]},
      options: chartOpts({ scales:{ y:{ grid:{color:'rgba(255,255,255,0.04)'}}, x:{ grid:{display:false}} } })
    });

    // insight
    let peakD=0, peakV=0;
    for(let d=0;d<7;d++){ if(dCount[d]>peakV){ peakV=dCount[d]; peakD=d; } }
    let peakH=0, peakHV=0;
    hRides.forEach((v,i)=>{ if(v>peakHV){ peakHV=v; peakH=i; } });
    document.getElementById('tempInsight').innerHTML = `
      <span class="ic-label">INSIGHT · CURRENT FILTER</span>
      <p style="margin:0">${T.DOW[peakD]} between ${pad(peakH)}h and ${pad((peakH+3)%24)}h
      concentra <strong style="color:var(--taxi-yellow)">${(peakHV/(filtered.length||1)*100).toFixed(1)}%</strong>
      do volume e tarifa média de <strong>${fmtMoney(hAvg[peakH]||0)}</strong>.
      Considere alocar mais frota para esta janela.</p>
      <div style="margin-top:10px;font-family:'JetBrains Mono', monospace;font-size:10px;color:var(--taxi-grey-text);">
        WINDOW · ${T.DOW[peakD]} ${pad(peakH)}:00–${pad((peakH+3)%24)}:00 · n=${fmtInt(peakHV)}
      </div>
    `;
  }

  // =========================================================
  // 4) FARE BREAKDOWN
  // =========================================================
  function buildFare(){
    const el=document.createElement('section'); el.className='screen'; el.id='screen-fare';
    el.dataset.screenLabel = '04 Fare Breakdown';
    el.innerHTML = `
      <div class="screen-intro">
        <div class="screen-title">Fare <em>breakdown</em></div>
        <div class="screen-sub">DISTRIBUTION · DRIVERS · OUTLIERS</div>
      </div>
      <div class="grid g-2">
        <div class="card">
          <div class="card-head">
            <div><div class="card-title">fare_amount distribution</div>
            <div class="card-sub">HISTOGRAM · ADJUSTABLE BINS</div></div>
            <div class="toggle-group" id="binToggle">
              <div class="tg" data-v="5">5</div>
              <div class="tg on" data-v="10">10</div>
              <div class="tg" data-v="20">20</div>
              <div class="tg" data-v="50">50</div>
            </div>
          </div>
          <div class="chart-wrap h-320"><canvas id="chHist"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><div><div class="card-title">Fare decomposition</div>
            <div class="card-sub">EST. CONTRIBUTION TO FINAL FARE · MEAN</div></div></div>
          <div class="chart-wrap h-320"><canvas id="chDecomp"></canvas></div>
        </div>
      </div>
      <div class="grid g-2 row-gap">
        <div class="card">
          <div class="card-head"><div class="card-title">Box by passenger count</div></div>
          <div class="chart-wrap h-280"><canvas id="chBox"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">Violin · hour of day</div></div>
          <div class="chart-wrap h-280"><canvas id="chViolin"></canvas></div>
        </div>
      </div>
      <div class="card row-gap">
        <div class="card-head">
          <div><div class="card-title">Outlier detector · top 50 anomalies</div>
          <div class="card-sub">$>150 OR NEGATIVE · CLICK "EXCLUDE" TO REMOVE FROM DATASET</div></div>
          <div class="card-tag" id="outlierCount">0 detected</div>
        </div>
        <div style="max-height:280px; overflow:auto;">
          <table class="tbl" id="outlierTbl"></table>
        </div>
      </div>
    `;
    return el;
  }

  let HIST_BINS = 10;
  function renderFare(filtered){
    document.getElementById('binToggle').onclick = (e)=>{
      const t = e.target.closest('.tg'); if(!t) return;
      [...e.currentTarget.children].forEach(c=>c.classList.toggle('on', c===t));
      HIST_BINS = +t.dataset.v;
      drawHist(filtered);
    };
    drawHist(filtered);

    // decomposition (stacked bar)
    const dec = decompose(filtered);
    destroyChart('decomp');
    charts.decomp = new Chart(document.getElementById('chDecomp'),{
      type:'bar',
      data:{ labels:['Mean fare'], datasets: dec.map((d,i)=>({
        label:d.k, data:[d.v], backgroundColor:['#F7B731','#FFCC00','#B8851F','#5B4710','#FF1744','#00C853'][i%6],
        borderRadius:2, stack:'s'
      })) },
      options: chartOpts({
        indexAxis:'y',
        scales:{ x:{ stacked:true, grid:{color:'rgba(255,255,255,0.04)'}, ticks:{ callback:v=>'$'+v }},
                 y:{ stacked:true, grid:{display:false}} },
        plugins:{ legend:{ position:'bottom' } }
      })
    });

    // box by pax (approx with min/q1/med/q3/max simulated via Chart.js bar)
    const paxStats = [];
    for(let p=1;p<=6;p++){
      const arr = filtered.filter(r=>r.pax===p).map(r=>r.fare).sort((a,b)=>a-b);
      paxStats.push(quartiles(arr));
    }
    destroyChart('box');
    charts.box = new Chart(document.getElementById('chBox'),{
      type:'bar',
      data:{ labels: paxStats.map((_,i)=>'PAX '+(i+1)),
        datasets:[
          { label:'p25–p75', data:paxStats.map(s=>s? s.q3-s.q1 : 0), backgroundColor:yellowSoft, borderRadius:2 },
          { label:'median', data:paxStats.map(s=>s? s.med : 0), type:'line', borderColor:red, tension:0.2, pointRadius:4, pointBackgroundColor:red, fill:false, borderWidth:2, yAxisID:'y2' }
        ]},
      options: chartOpts({ scales:{ x:{grid:{display:false}},
        y:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{ callback:v=>'$'+v}},
        y2:{ position:'right', grid:{display:false}, ticks:{ callback:v=>'$'+v.toFixed(0), color:red } }
      }})
    });

    // violin = scatter w/ jitter per hour
    const points = filtered.map(r=>({x:r.hour + (Math.random()-0.5)*0.6, y:r.fare}));
    destroyChart('violin');
    charts.violin = new Chart(document.getElementById('chViolin'),{
      type:'scatter',
      data:{ datasets:[{ data:points, backgroundColor:'rgba(247,183,49,0.35)', pointRadius:1.5 }]},
      options: chartOpts({ plugins:{legend:{display:false}}, scales:{
        x:{ min:-0.5, max:23.5, ticks:{ stepSize:2 }, grid:{display:false}, title:{display:true, text:'HOUR'}},
        y:{ min:0, max:80, ticks:{ callback:v=>'$'+v }, grid:{color:'rgba(255,255,255,0.04)'}}
      }})
    });

    // outliers
    const outs = filtered.filter(r=>r.fare<0 || r.fare===0 || r.fare>150).sort((a,b)=>Math.abs(b.fare)-Math.abs(a.fare)).slice(0,50);
    document.getElementById('outlierCount').textContent = fmtInt(outs.length) + ' detected';
    document.getElementById('outlierTbl').innerHTML = `
      <thead><tr><th>id</th><th>Date</th><th>Pickup</th><th>Dropoff</th><th class="num">Dist</th><th class="num">Pax</th><th class="num">Fare</th><th>Reason</th><th></th></tr></thead>
      <tbody>${outs.map(r=>{
        const reason = r.fare<0 ? 'negative' : r.fare===0 ? 'zero' : 'extreme';
        return `<tr class="danger">
          <td>#${r.id}</td>
          <td>${new Date(r.ts).toISOString().slice(0,10)}</td>
          <td>${r.pickupZone}</td>
          <td>${r.dropoffZone}</td>
          <td class="num">${r.distance.toFixed(2)} km</td>
          <td class="num">${r.pax}</td>
          <td class="num">${fmtMoney(r.fare)}</td>
          <td>${reason}</td>
          <td><button class="btn btn-ghost" style="padding:3px 8px;font-size:10px;">EXCLUDE</button></td>
        </tr>`;
      }).join('')}</tbody>`;
  }

  function drawHist(filtered){
    const fares = filtered.map(r=>r.fare).filter(v=>v>0 && v<200);
    if(!fares.length) return;
    const min=Math.min(...fares), max=Math.max(...fares);
    const step = (max-min)/HIST_BINS;
    const bins = new Array(HIST_BINS).fill(0);
    fares.forEach(v=>{ const i=Math.min(HIST_BINS-1, Math.floor((v-min)/step)); bins[i]++; });
    const labels = bins.map((_,i)=>'$'+(min+i*step).toFixed(0)+'-'+(min+(i+1)*step).toFixed(0));
    destroyChart('hist');
    charts.hist = new Chart(document.getElementById('chHist'),{
      type:'bar',
      data:{ labels, datasets:[{ data:bins, backgroundColor:yellow, borderRadius:2 }]},
      options: chartOpts({ plugins:{legend:{display:false}}, scales:{
        x:{ grid:{display:false}, ticks:{ maxRotation:0, autoSkip:true, maxTicksLimit:10 }},
        y:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{ callback:v=>fmtInt(v) }}
      }})
    });
  }
  function quartiles(arr){
    if(!arr.length) return null;
    const q=(p)=>arr[Math.floor(arr.length*p)];
    return { min:arr[0], q1:q(0.25), med:q(0.5), q3:q(0.75), max:arr[arr.length-1] };
  }
  function decompose(filtered){
    const n = Math.max(1, filtered.length);
    const mean = filtered.reduce((a,r)=>a+r.fare,0)/n;
    const meanDist = filtered.reduce((a,r)=>a+r.distance,0)/n;
    const airportShare = filtered.filter(r=>r.isAirport).length/n;
    const rushShare = filtered.filter(r=>r.isRush).length/n;
    const nightShare = filtered.filter(r=>r.isNight).length/n;
    return [
      { k:'Base ($2.50)', v: 2.5 },
      { k:'Distance · 1.56×km', v: 1.56*meanDist },
      { k:'Rush hour surcharge', v: 0.6*rushShare },
      { k:'Night surcharge', v: 0.5*nightShare },
      { k:'Airport surcharge', v: 17.5*airportShare },
      { k:'Residual / noise', v: Math.max(0, mean - (2.5 + 1.56*meanDist + 0.6*rushShare + 0.5*nightShare + 17.5*airportShare)) }
    ];
  }

  // =========================================================
  // 5) DISTANCE & DURATION
  // =========================================================
  function buildDistance(){
    const el=document.createElement('section'); el.className='screen'; el.id='screen-distance';
    el.dataset.screenLabel = '05 Distance & Duration';
    el.innerHTML = `
      <div class="screen-intro">
        <div class="screen-title">Distance & <em>duration</em></div>
        <div class="screen-sub">HAVERSINE × FARE · LINEAR FIT · EFFICIENCY BANDS</div>
      </div>
      <div class="grid g-2">
        <div class="card">
          <div class="card-head"><div><div class="card-title">Haversine (km) × fare_amount</div>
          <div class="card-sub">YELLOW POINTS · RED LINE = LINEAR FIT</div></div>
          <div class="card-tag mono" id="r2Tag">R² = 0.00</div></div>
          <div class="chart-wrap h-360"><canvas id="chScatter"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">$/km efficiency</div></div>
          <div class="chart-wrap h-360"><canvas id="chEff"></canvas></div>
        </div>
      </div>
      <div class="card row-gap">
        <div class="card-head"><div class="card-title">Urban · airport · long-haul comparison</div></div>
        <table class="tbl" id="tripTbl"></table>
      </div>
    `;
    return el;
  }
  function renderDistance(filtered){
    const pts = filtered.map(r=>({x:r.distance, y:r.fare})).filter(p=>p.y>0 && p.y<200);
    // linear regression
    const n = pts.length;
    let sx=0, sy=0, sxx=0, sxy=0;
    pts.forEach(p=>{ sx+=p.x; sy+=p.y; sxx+=p.x*p.x; sxy+=p.x*p.y; });
    const slope = n? (n*sxy - sx*sy)/(n*sxx - sx*sx) : 0;
    const intercept = n? (sy - slope*sx)/n : 0;
    const meanY = sy/n;
    let ssTot=0, ssRes=0;
    pts.forEach(p=>{ const pred=slope*p.x+intercept; ssTot += (p.y-meanY)**2; ssRes += (p.y-pred)**2; });
    const r2 = ssTot? 1 - ssRes/ssTot : 0;
    document.getElementById('r2Tag').textContent = 'R² = '+r2.toFixed(3)+' · slope $'+slope.toFixed(2)+'/km';

    const maxX = Math.max(...pts.map(p=>p.x), 1);
    const line = [{x:0, y:intercept},{x:maxX, y:slope*maxX+intercept}];

    destroyChart('scatter');
    charts.scatter = new Chart(document.getElementById('chScatter'),{
      type:'scatter',
      data:{ datasets:[
        { label:'Rides', data:pts, backgroundColor:'rgba(247,183,49,0.35)', pointRadius:1.5 },
        { type:'line', label:'Linear fit', data:line, parsing:false, borderColor:red, borderWidth:2, pointRadius:0, tension:0 }
      ]},
      options: chartOpts({ scales:{
        x:{ title:{display:true,text:'DISTANCE · km'}, grid:{color:'rgba(255,255,255,0.04)'}},
        y:{ title:{display:true,text:'FARE · $'},     grid:{color:'rgba(255,255,255,0.04)'}, ticks:{ callback:v=>'$'+v }}
      }})
    });

    // $/km efficiency hist
    const eff = filtered.filter(r=>r.distance>0.5 && r.fare>0).map(r=>r.fare/r.distance);
    const ebins = 20; const eMin = 0, eMax = 30;
    const arr = new Array(ebins).fill(0);
    eff.forEach(v=>{ if(v>=eMin && v<=eMax){ arr[Math.min(ebins-1, Math.floor((v-eMin)/(eMax-eMin)*ebins))]++; } });
    const labels = arr.map((_,i)=> '$'+(eMin + i*(eMax-eMin)/ebins).toFixed(1)+'/km');
    const colors = labels.map((_,i)=>{
      const x = i/(ebins-1);
      if(x<0.25) return green;
      if(x<0.55) return yellow;
      return red;
    });
    destroyChart('eff');
    charts.eff = new Chart(document.getElementById('chEff'),{
      type:'bar',
      data:{ labels, datasets:[{ data:arr, backgroundColor:colors, borderRadius:2 }]},
      options: chartOpts({ plugins:{legend:{display:false}}, scales:{
        x:{ grid:{display:false}, ticks:{ maxRotation:60, autoSkip:true, maxTicksLimit:10 }},
        y:{ grid:{color:'rgba(255,255,255,0.04)'} }
      }})
    });

    // trip type comparison
    const tt = document.getElementById('tripTbl');
    const types = ['Urban','Airport','Long-haul'];
    const groups = types.map(t=>{
      const a = filtered.filter(r=>r.tripType===t);
      const fare = a.length? a.reduce((x,r)=>x+r.fare,0)/a.length : 0;
      const dist = a.length? a.reduce((x,r)=>x+r.distance,0)/a.length : 0;
      const perKm = dist? fare/dist : 0;
      return { t, n:a.length, fare, dist, perKm };
    });
    tt.innerHTML = `<thead><tr><th>Type</th><th class="num">Rides</th><th class="num">Avg fare</th><th class="num">Avg dist</th><th class="num">$/km</th><th>Distribution</th></tr></thead>
      <tbody>${groups.map(g=>`<tr>
        <td class="accent">${g.t}</td>
        <td class="num">${fmtInt(g.n)}</td>
        <td class="num">${fmtMoney(g.fare)}</td>
        <td class="num">${fmtKm(g.dist)}</td>
        <td class="num">${fmtMoney(g.perKm)}</td>
        <td><div class="minibar"><div class="bar"><i style="width:${(g.n/filtered.length*100).toFixed(1)}%"></i></div></div></td>
      </tr>`).join('')}</tbody>`;
  }

  // =========================================================
  // 6) PREDICTOR
  // =========================================================
  function buildPredictor(){
    const el=document.createElement('section'); el.className='screen'; el.id='screen-predictor';
    el.dataset.screenLabel = '06 Fare Predictor';
    el.innerHTML = `
      <div class="screen-intro">
        <div class="screen-title">Fare <em>predictor</em></div>
        <div class="screen-sub">ML INFERENCE · DROP YOUR FARE INTO THE METER</div>
      </div>
      <div class="predictor">
        <div class="card">
          <div class="card-head"><div><div class="card-title">Inputs · trip request</div>
          <div class="card-sub">DISPATCH FORM · CLICK MINI-MAP TO SET POINTS</div></div></div>

          <div class="input-row">
            <label>Pickup lat</label>
            <input type="number" step="0.0001" id="pkLat" value="40.7831"/>
            <input type="number" step="0.0001" id="pkLng" value="-73.9712"/>
          </div>
          <div class="input-row">
            <label>Dropoff lat</label>
            <input type="number" step="0.0001" id="doLat" value="40.6413"/>
            <input type="number" step="0.0001" id="doLng" value="-73.7781"/>
          </div>
          <div class="input-row">
            <label>Date · time</label>
            <input type="datetime-local" id="pTime" value="2015-03-12T18:30"/>
          </div>
          <div class="input-row">
            <label>Passengers</label>
            <div class="pax-pick" id="paxPick">
              ${[1,2,3,4,5,6].map(p=>`<div class="px ${p===1?'on':''}" data-v="${p}">${p}</div>`).join('')}
            </div>
          </div>
          <div class="input-row">
            <label>Model</label>
            <select class="sel" id="modelPick" style="flex:1;">
              <option>XGBoost</option><option>LightGBM</option>
              <option>Random Forest</option><option>Neural Net</option>
              <option>Linear Regression</option>
            </select>
          </div>

          <div id="pickMap" class="map-mini" style="margin-top:8px;height:200px;"></div>

          <button class="btn-meter" id="btnPredict">▶ START METER · CALCULATE FARE</button>
        </div>

        <div style="display:flex; flex-direction:column; gap:14px;">
          <div class="taxi-display">
            <div class="meter-label">FARE · ESTIMATED</div>
            <div class="meter-digits" id="meter">$ 0 0 . 0 0</div>
            <div class="meter-confidence" id="meterConf">± $0.00 · 95% interval</div>

            <div class="meter-bits">
              <div class="meter-bit"><div class="bit-label">DISTANCE · HAVERSINE</div><div class="bit-val" id="bitDist">0.00 km</div></div>
              <div class="meter-bit"><div class="bit-label">MODEL</div><div class="bit-val" id="bitModel">XGBoost</div></div>
              <div class="meter-bit"><div class="bit-label">RMSE</div><div class="bit-val" id="bitRmse">$3.27</div></div>
              <div class="meter-bit"><div class="bit-label">TRIP TYPE</div><div class="bit-val" id="bitTrip">—</div></div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><div><div class="card-title">Top features · this prediction</div>
            <div class="card-sub">SHAP-LIKE CONTRIBUTION (MOCK)</div></div></div>
            <div class="feature-bars" id="featBars"></div>
          </div>
        </div>
      </div>
    `;
    return el;
  }
  let pickMap=null, pickMarkers=[], pickLine=null;
  function setupPredictor(){
    if(pickMap) return;
    pickMap = L.map('pickMap',{ zoomControl:true, attributionControl:false }).setView([40.74,-73.93], 11);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',{subdomains:'abcd'}).addTo(pickMap);
    let toggle = 0;
    pickMap.on('click',e=>{
      const which = toggle%2===0 ? 'pickup' : 'dropoff';
      if(which==='pickup'){
        document.getElementById('pkLat').value = e.latlng.lat.toFixed(4);
        document.getElementById('pkLng').value = e.latlng.lng.toFixed(4);
      } else {
        document.getElementById('doLat').value = e.latlng.lat.toFixed(4);
        document.getElementById('doLng').value = e.latlng.lng.toFixed(4);
      }
      toggle++;
      redrawPickMarkers();
    });
    redrawPickMarkers();

    document.getElementById('paxPick').addEventListener('click',e=>{
      const t=e.target.closest('.px'); if(!t) return;
      [...e.currentTarget.children].forEach(c=>c.classList.toggle('on', c===t));
    });
    document.getElementById('btnPredict').addEventListener('click',predict);
    ['pkLat','pkLng','doLat','doLng'].forEach(id=>{
      document.getElementById(id).addEventListener('change', redrawPickMarkers);
    });
    document.getElementById('modelPick').addEventListener('change', updateModelMeta);
  }
  function redrawPickMarkers(){
    pickMarkers.forEach(m=>pickMap.removeLayer(m));
    if(pickLine) pickMap.removeLayer(pickLine);
    pickMarkers=[];
    const pk = [+document.getElementById('pkLat').value, +document.getElementById('pkLng').value];
    const dr = [+document.getElementById('doLat').value, +document.getElementById('doLng').value];
    pickMarkers.push(L.circleMarker(pk,{ radius:6, color:yellow, fillColor:yellow, fillOpacity:1, weight:2 }).bindTooltip('PICKUP').addTo(pickMap));
    pickMarkers.push(L.circleMarker(dr,{ radius:6, color:red, fillColor:red, fillOpacity:1, weight:2 }).bindTooltip('DROPOFF').addTo(pickMap));
    pickLine = L.polyline([pk,dr],{ color:yellow, weight:2, dashArray:'4 4', opacity:0.7 }).addTo(pickMap);
    setTimeout(()=>pickMap.invalidateSize(),50);
  }
  function updateModelMeta(){
    const m = document.getElementById('modelPick').value;
    document.getElementById('bitModel').textContent = m;
    const rmse = ({'XGBoost':3.27,'LightGBM':3.31,'Random Forest':3.81,'Neural Net':3.45,'Linear Regression':4.89})[m];
    document.getElementById('bitRmse').textContent = '$'+rmse.toFixed(2);
  }
  function predict(){
    const pk = {lat:+document.getElementById('pkLat').value, lng:+document.getElementById('pkLng').value};
    const dr = {lat:+document.getElementById('doLat').value, lng:+document.getElementById('doLng').value};
    const dist = T.haversine(pk,dr);
    const t = new Date(document.getElementById('pTime').value);
    const hour = t.getHours();
    const pax = +(document.querySelector('#paxPick .px.on')?.dataset.v || 1);
    const isAirport = isAirport_(pk) || isAirport_(dr);
    const rushF = (hour>=7&&hour<=9)||(hour>=17&&hour<=20) ? 1.0 : 0;
    const nightF= (hour<=5||hour>=22) ? 1.0 : 0;
    const noise = (Math.random()-0.5)*0.8;
    let fare = 2.50 + 1.56*dist + 0.8*rushF + 0.5*nightF + (isAirport?17.5:0) + (pax-1)*0.2 + noise;
    fare = Math.max(2.5, fare);
    const rmse = +document.getElementById('bitRmse').textContent.replace('$','');
    document.getElementById('bitTrip').textContent = isAirport ? 'Airport' : (dist>18?'Long-haul':'Urban');
    document.getElementById('bitDist').textContent = dist.toFixed(2)+' km';

    animateMeter(fare);
    document.getElementById('meterConf').textContent = '± $'+(rmse*1.96/2).toFixed(2)+' · 95% interval';

    // feature bars
    const feats = [
      {n:'distance_haversine', v: Math.min(1, dist/30)},
      {n:'pickup_lng', v: 0.6},
      {n:'is_airport', v: isAirport?1:0.1},
      {n:'hour', v: rushF?0.7:0.3 + nightF*0.3},
      {n:'pickup_lat', v: 0.45},
      {n:'dropoff_lng', v: 0.4},
      {n:'passenger_count', v: 0.08*pax},
      {n:'year', v: 0.2}
    ].sort((a,b)=>b.v-a.v);
    document.getElementById('featBars').innerHTML = feats.map(f=>`
      <div class="fb-item">
        <span class="fb-name">${f.n}</span>
        <span class="fb-bar"><i style="width:${Math.min(100, f.v*100).toFixed(0)}%"></i></span>
        <span class="fb-val">${(f.v).toFixed(2)}</span>
      </div>`).join('');
  }
  function isAirport_(p){
    const aps = ['JFK','LGA','EWR'].map(k=>T.zones[k]);
    return aps.some(z=> Math.abs(z.lat-p.lat)<0.02 && Math.abs(z.lng-p.lng)<0.02);
  }
  function animateMeter(v){
    const el = document.getElementById('meter');
    let cur = 0; const target = v; const steps = 28; let i=0;
    const tick = setInterval(()=>{
      i++; cur = target * (1 - Math.pow(1-i/steps, 2));
      el.textContent = formatMeter(cur);
      if(i>=steps){ clearInterval(tick); el.textContent = formatMeter(target); }
    }, 25);
  }
  function formatMeter(v){
    const s = v.toFixed(2);
    return '$ ' + s.split('').join(' ');
  }

  // =========================================================
  // 7) MODEL PERFORMANCE
  // =========================================================
  function buildPerf(){
    const el=document.createElement('section'); el.className='screen'; el.id='screen-perf';
    el.dataset.screenLabel = '07 Model Performance';
    el.innerHTML = `
      <div class="screen-intro">
        <div class="screen-title">Model <em>performance</em></div>
        <div class="screen-sub">RMSE · MAE · R² · LEADERBOARD</div>
      </div>
      <div class="card">
        <div class="card-head"><div><div class="card-title">Leaderboard</div>
        <div class="card-sub">XGBOOST IS ACTIVE</div></div></div>
        <table class="tbl">
          <thead><tr><th>Model</th><th class="num">RMSE</th><th class="num">MAE</th><th class="num">R²</th><th class="num">Train time</th><th>Status</th></tr></thead>
          <tbody>
          ${[
            ['Baseline · distance',5.74,4.21,0.62,'—','off'],
            ['Linear Regression',4.89,3.45,0.71,'12s','off'],
            ['Random Forest',3.81,2.67,0.83,'4m 20s','off'],
            ['XGBoost',3.27,2.34,0.88,'2m 15s','on'],
            ['LightGBM',3.31,2.38,0.87,'1m 45s','off'],
            ['Neural Net · DNN',3.45,2.51,0.85,'18m','off']
          ].map(([n,rmse,mae,r2,tt,st])=>`
            <tr class="model-row ${st==='on'?'active':''}">
              <td>${n}</td>
              <td class="num ${st==='on'?'accent':''}">$${rmse.toFixed(2)}</td>
              <td class="num">$${mae.toFixed(2)}</td>
              <td class="num">${r2.toFixed(2)}</td>
              <td class="num">${tt}</td>
              <td><span class="status-dot ${st}"></span>${st==='on'?'ACTIVE':'idle'}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>

      <div class="grid g-3 row-gap">
        <div class="card">
          <div class="card-head"><div class="card-title">Predicted × actual</div></div>
          <div class="chart-wrap h-280"><canvas id="chPvA"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">Residuals</div></div>
          <div class="chart-wrap h-280"><canvas id="chRes"></canvas></div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">Feature importance</div></div>
          <div class="chart-wrap h-280"><canvas id="chFeat"></canvas></div>
        </div>
      </div>

      <div class="card row-gap">
        <div class="card-head"><div><div class="card-title">Learning curve · train vs validation</div>
        <div class="card-sub">RMSE OVER 200 BOOSTING ROUNDS</div></div></div>
        <div class="chart-wrap h-280"><canvas id="chLearn"></canvas></div>
      </div>
    `;
    return el;
  }
  function renderPerf(filtered){
    // pred vs actual: simulate prediction
    const sample = sampleArray(filtered.filter(r=>r.fare>0 && r.fare<100), 600);
    const pva = sample.map(r=>{
      const pred = 2.5 + 1.56*r.distance + (r.isAirport?17.5:0) + (r.isRush?1:0) + (Math.random()-0.5)*3.0;
      return {x:r.fare, y:Math.max(2.5,pred)};
    });
    const maxV = Math.max(...pva.map(p=>Math.max(p.x,p.y)), 50);
    destroyChart('pva');
    charts.pva = new Chart(document.getElementById('chPvA'),{
      type:'scatter',
      data:{ datasets:[
        { label:'predictions', data:pva, backgroundColor:'rgba(247,183,49,0.4)', pointRadius:1.6 },
        { type:'line', label:'y=x', data:[{x:0,y:0},{x:maxV,y:maxV}], parsing:false, borderColor:red, borderWidth:1.5, pointRadius:0 }
      ]},
      options: chartOpts({ scales:{
        x:{ title:{display:true,text:'ACTUAL · $'}, grid:{color:'rgba(255,255,255,0.04)'}, ticks:{ callback:v=>'$'+v }},
        y:{ title:{display:true,text:'PREDICTED · $'}, grid:{color:'rgba(255,255,255,0.04)'}, ticks:{ callback:v=>'$'+v }}
      }})
    });

    // residuals
    const res = pva.map(p=>p.y - p.x);
    const bins = 30; const min=-15, max=15; const arr=new Array(bins).fill(0);
    res.forEach(v=>{ if(v>=min && v<=max){ arr[Math.min(bins-1, Math.floor((v-min)/(max-min)*bins))]++; }});
    const labels = arr.map((_,i)=> (min + i*(max-min)/bins).toFixed(1));
    destroyChart('res');
    charts.res = new Chart(document.getElementById('chRes'),{
      type:'bar',
      data:{ labels, datasets:[{ data:arr, backgroundColor:yellow, borderRadius:2 }]},
      options: chartOpts({ plugins:{legend:{display:false}}, scales:{
        x:{ grid:{display:false}, ticks:{ maxTicksLimit:10 }},
        y:{ grid:{color:'rgba(255,255,255,0.04)'} }
      }})
    });

    // feature importance
    const feats = [
      {n:'distance_haversine', v:0.34},
      {n:'pickup_lng', v:0.14},
      {n:'dropoff_lng', v:0.13},
      {n:'hour', v:0.09},
      {n:'pickup_lat', v:0.08},
      {n:'dropoff_lat', v:0.07},
      {n:'is_airport', v:0.06},
      {n:'day_of_week', v:0.04},
      {n:'passenger_count', v:0.03},
      {n:'year', v:0.02}
    ];
    destroyChart('feat');
    charts.feat = new Chart(document.getElementById('chFeat'),{
      type:'bar',
      data:{ labels: feats.map(f=>f.n), datasets:[{ data:feats.map(f=>f.v), backgroundColor:yellow, borderRadius:2 }]},
      options: chartOpts({ indexAxis:'y', plugins:{legend:{display:false}},
        scales:{ x:{ grid:{color:'rgba(255,255,255,0.04)'}}, y:{ grid:{display:false}} } })
    });

    // learning curve
    const iters = Array.from({length:60},(_,i)=>i*4);
    const train = iters.map(i=> 6 * Math.exp(-i/40) + 2.6 + Math.random()*0.1);
    const valid = iters.map((i,k)=> 6 * Math.exp(-i/35) + 2.9 + Math.random()*0.12 + (i>180?0.05:0));
    destroyChart('learn');
    charts.learn = new Chart(document.getElementById('chLearn'),{
      type:'line',
      data:{ labels:iters, datasets:[
        { label:'Train RMSE', data:train, borderColor:yellow, backgroundColor:'rgba(247,183,49,0.1)', fill:true, tension:0.3, pointRadius:0, borderWidth:2 },
        { label:'Validation RMSE', data:valid, borderColor:red, fill:false, tension:0.3, pointRadius:0, borderWidth:2 }
      ]},
      options: chartOpts({ scales:{
        x:{ grid:{display:false}, title:{display:true, text:'BOOSTING ROUND' }},
        y:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{ callback:v=>'$'+v.toFixed(1)}}
      }})
    });
  }

  // =========================================================
  // 8) DATA QUALITY
  // =========================================================
  function buildQuality(){
    const el=document.createElement('section'); el.className='screen'; el.id='screen-quality';
    el.dataset.screenLabel = '08 Data Quality';
    el.innerHTML = `
      <div class="screen-intro">
        <div class="screen-title">Data <em>quality</em></div>
        <div class="screen-sub">CLEANING RULES · OUTLIERS · MISSING VALUES</div>
      </div>
      <div class="grid g-3">
        <div class="kpi"><div class="kpi-label">Original rows</div><div class="kpi-val mono">55,423,856</div><div class="kpi-foot"><span class="muted">2009-01 → 2015-06</span></div></div>
        <div class="kpi"><div class="kpi-label">After cleaning</div><div class="kpi-val mono">54,432,109</div><div class="kpi-foot"><span class="pos">▲ 98.2% retained</span></div></div>
        <div class="kpi"><div class="kpi-label">Removed</div><div class="kpi-val mono">991,747</div><div class="kpi-foot"><span class="neg">▼ 1.8% dropped</span></div></div>
      </div>

      <div class="grid g-2 row-gap">
        <div class="card">
          <div class="card-head"><div class="card-title">Cleaning rules applied</div></div>
          <div id="dqRules"></div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">Removal reasons</div></div>
          <div class="chart-wrap h-320"><canvas id="chDqPie"></canvas></div>
        </div>
      </div>

      <div class="card row-gap">
        <div class="card-head"><div><div class="card-title">Outlier sample · 20 rows</div>
        <div class="card-sub">PAGINATED · 1–20 OF 32,114</div></div></div>
        <div style="max-height:320px;overflow:auto"><table class="tbl" id="dqOutTbl"></table></div>
      </div>
    `;
    return el;
  }
  function renderQuality(){
    const rules = [
      {r:'fare_amount > 0', n:218430},
      {r:'passenger_count between 1 and 6', n:144020},
      {r:'pickup/dropoff inside NYC bbox (lng −74.5..−72.8 / lat 40.5..41.8)', n:382108},
      {r:'haversine distance > 0 km', n:65241},
      {r:'datetime between 2009 and 2015', n:181948}
    ];
    document.getElementById('dqRules').innerHTML = rules.map(rl=>`
      <div class="dq-rule">
        <span class="chk">✓</span>
        <span class="rname">${rl.r}</span>
        <span class="rcount">−${fmtInt(rl.n)} rows</span>
      </div>`).join('');

    destroyChart('dqPie');
    charts.dqPie = new Chart(document.getElementById('chDqPie'),{
      type:'doughnut',
      data:{ labels: rules.map(r=>r.r.replace(' between',' ∈').slice(0,28)+'…'),
        datasets:[{ data: rules.map(r=>r.n), backgroundColor:['#F7B731','#FFCC00','#B8851F','#FF1744','#00C853'], borderColor:'#0F0F0F', borderWidth:2 }]},
      options:{ responsive:true, maintainAspectRatio:false, cutout:'58%',
        plugins:{ legend:{ position:'bottom', labels:{ boxWidth:10, color:'#B0B0B0', font:{ family:"'JetBrains Mono', monospace", size:9 }} } }
      }
    });

    const sample = T.rides.filter(r=>r.fare<=0 || r.distance===0 || r.fare>150).slice(0,20);
    document.getElementById('dqOutTbl').innerHTML = `
      <thead><tr><th>id</th><th>Date</th><th>Route</th><th class="num">Dist</th><th class="num">Fare</th><th class="num">Pax</th><th>Why</th></tr></thead>
      <tbody>${sample.map(r=>`<tr class="danger">
        <td>#${r.id}</td>
        <td>${new Date(r.ts).toISOString().slice(0,10)}</td>
        <td>${r.pickupZone} → ${r.dropoffZone}</td>
        <td class="num">${r.distance.toFixed(2)}</td>
        <td class="num">${fmtMoney(r.fare)}</td>
        <td class="num">${r.pax}</td>
        <td>${r.fare<=0?'fare ≤ 0':(r.fare>150?'fare > $150':'dist=0')}</td>
      </tr>`).join('')}</tbody>`;
  }

  // ============ Common chart opts ============
  function chartOpts(extra){
    return Object.assign({
      responsive:true, maintainAspectRatio:false,
      interaction:{ mode:'index', intersect:false },
      plugins:{
        legend:{ labels:{ boxWidth:10, color:'#B0B0B0', font:{ family:"'JetBrains Mono', monospace", size:10}} },
        tooltip:{ enabled:true }
      }
    }, extra||{});
  }

  // expose
  window.TAXI_SCREENS = {
    builders: {
      overview: buildOverview, geo: buildGeo, temporal: buildTemporal,
      fare: buildFare, distance: buildDistance, predictor: buildPredictor,
      perf: buildPerf, quality: buildQuality
    },
    renderers: {
      overview: (f)=>{ renderKpis(f); renderHeatmap(f); renderTopRoutes(f); renderTimeline(f); renderBoroughs(f); renderHourPulse(f); renderMiniMap(f); },
      geo:      (f)=>{ drawBigMap(f); },
      temporal: renderTemporal,
      fare:     renderFare,
      distance: renderDistance,
      predictor:(f)=>{ setupPredictor(); updateModelMeta(); },
      perf:     renderPerf,
      quality:  ()=>renderQuality()
    }
  };
})();
