/* =========================================================
   TAXI INTELLIGENCE — Mock data generator
   Generates ~5000 synthetic NYC taxi rides with plausible
   spatial/temporal/fare distributions.
   ========================================================= */

(function(){
  const ZONES = {
    'Manhattan':     {lat:40.7831, lng:-73.9712, r:0.04, share:0.62, fareBoost:1.0},
    'Brooklyn':      {lat:40.6782, lng:-73.9442, r:0.05, share:0.15, fareBoost:0.95},
    'Queens':        {lat:40.7282, lng:-73.7949, r:0.07, share:0.12, fareBoost:0.95},
    'Bronx':         {lat:40.8448, lng:-73.8648, r:0.04, share:0.04, fareBoost:0.9},
    'Staten Island': {lat:40.5795, lng:-74.1502, r:0.04, share:0.01, fareBoost:0.9},
    'JFK':           {lat:40.6413, lng:-73.7781, r:0.005, share:0.03, fareBoost:1.4, airport:true},
    'LGA':           {lat:40.7769, lng:-73.8740, r:0.005, share:0.02, fareBoost:1.3, airport:true},
    'EWR':           {lat:40.6895, lng:-74.1745, r:0.005, share:0.01, fareBoost:1.5, airport:true}
  };

  const WEATHER = ['Clear','Clear','Clear','Clear','Rain','Rain','Snow','Fog'];

  // Seeded PRNG so the dataset is stable across reloads.
  function mulberry32(a){ return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };}
  const rng = mulberry32(20251113);

  function pickZone(){
    const r = rng(); let acc = 0;
    for(const [name, z] of Object.entries(ZONES)){
      acc += z.share;
      if(r < acc) return name;
    }
    return 'Manhattan';
  }

  function gauss(){
    let u=0,v=0; while(!u) u = rng(); while(!v) v = rng();
    return Math.sqrt(-2*Math.log(u)) * Math.cos(2*Math.PI*v);
  }

  function pointInZone(zoneName){
    const z = ZONES[zoneName];
    const dx = gauss() * z.r * 0.6;
    const dy = gauss() * z.r * 0.6;
    return {lat: z.lat + dy, lng: z.lng + dx};
  }

  function haversine(a,b){
    const R=6371, toRad=x=>x*Math.PI/180;
    const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
    const s = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
    return 2*R*Math.asin(Math.sqrt(s));
  }

  // base rate per year (TLC base fare bumped over years)
  function baseForYear(y){
    if(y<=2011) return 2.50;
    if(y<=2012) return 2.50;
    return 2.50;
  }

  const N = 5000;
  const rides = new Array(N);
  const startTs = Date.UTC(2009,0,1);
  const endTs   = Date.UTC(2015,5,30);

  for(let i=0;i<N;i++){
    const pZ = pickZone();
    let dZ = pickZone();
    // some bias: airports almost always paired with manhattan
    if(ZONES[pZ].airport && rng()<0.7) dZ = 'Manhattan';
    else if(ZONES[dZ].airport && rng()<0.7) /* keep */{}
    const pickup  = pointInZone(pZ);
    const dropoff = pointInZone(dZ);
    const dist = haversine(pickup, dropoff);

    const ts = startTs + Math.floor(rng() * (endTs - startTs));
    const d = new Date(ts);
    const hour = d.getUTCHours();
    const dow = d.getUTCDay(); // 0=Sun
    const month = d.getUTCMonth();
    const year = d.getUTCFullYear();

    // rush hour multiplier
    const rush = (hour>=7&&hour<=9) || (hour>=17&&hour<=20) ? 1.15 : 1.0;
    const night = (hour<=5 || hour>=22) ? 1.07 : 1.0;
    const airport = (ZONES[pZ].airport || ZONES[dZ].airport) ? 1.0 : 0.0;
    const isLongHaul = dist > 18;
    const tripType = airport ? 'Airport' : (isLongHaul ? 'Long-haul' : 'Urban');

    const pax = 1 + Math.floor(rng()*6 * 0.6); // skews 1
    const wx = WEATHER[Math.floor(rng()*WEATHER.length)];

    // realistic fare model with noise
    const base = baseForYear(year);
    const distComp = 1.56 * dist;
    const airportSurcharge = airport ? 17.5 : 0;
    const toll = (dist>10 && rng()<0.25) ? 5.5 : 0;
    let fare = (base + distComp) * rush * night * ZONES[pZ].fareBoost + airportSurcharge + toll;
    fare += gauss() * 1.4; // residual noise
    fare = Math.max(2.5, fare);

    // ~1% outliers
    if(rng() < 0.008) fare = fare * (3 + rng()*4);
    if(rng() < 0.002) fare = -Math.abs(fare); // dirty rows
    if(rng() < 0.001) fare = 0;

    rides[i] = {
      id: i,
      ts, hour, dow, month, year,
      pickup, dropoff,
      pickupZone: pZ, dropoffZone: dZ,
      distance: dist, // km
      pax: Math.max(1, Math.min(6, pax)),
      weather: wx,
      tripType,
      fare: Math.round(fare*100)/100,
      isAirport: airport>0,
      isNight: night>1,
      isRush: rush>1
    };
  }

  // pre-aggregations cached on filter recompute
  window.TAXI_DATA = {
    rides,
    zones: ZONES,
    haversine,
    DOW: ['SUN','MON','TUE','WED','THU','FRI','SAT'],
    WEATHER_OPTS: ['Clear','Rain','Snow','Fog'],
    TRIP_OPTS: ['Urban','Airport','Long-haul']
  };
})();
