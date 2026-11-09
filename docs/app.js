(()=>{
'use strict';
const $=id=>document.getElementById(id);
const PUBLIC_MARKET_URL='https://raw.githubusercontent.com/DMOG189/meso-market-data/data/market.json';
let personalFeedEnabled=false,publicFeedLastFetch=0;

const categories=['Todos','Estrelas','Scrolls','Equipamentos','Materiais','Consumíveis','NX'];
const demoCatalog=[
 ['Kumbi Throwing Stars','Estrelas',480000,18],['Tobi Throwing Stars','Estrelas',2150000,12],['Steely Throwing Knives','Estrelas',6700000,6],['Ilbi Throwing Stars','Estrelas',39000000,2],['Mokbi Throwing Stars','Estrelas',180000,30],['Wolbi Throwing Stars','Estrelas',2000,65],
 ['Gloves Attack Scroll: Intermediate','Scrolls',1400000,26],['Claw Attack Scroll: Intermediate','Scrolls',388000,32],['Overall LUK Scroll: Greater','Scrolls',29000,55],['Gloves Magic Attack Scroll: Intermediate','Scrolls',520000,22],['Overall DEX Scroll: Greater','Scrolls',20000,51],['Hat Accuracy Scroll: Greater','Scrolls',5000,55],['Shoe Speed Scroll: Lesser','Scrolls',19000,50],['Wand Magic Attack Scroll: Intermediate','Scrolls',220000,30],['Spear Attack Scroll: Intermediate','Scrolls',120000,34],['Overall INT Scroll: Greater','Scrolls',26500,43],['Claw Attack Scroll: Lesser','Scrolls',160000,29],['Gloves Attack Scroll: Lesser','Scrolls',780000,20],
 ['Steel Slain','Equipamentos',1700000,13],['Scarabs','Equipamentos',7200000,8],['Work Gloves','Equipamentos',2800,75],['Emerald Earrings','Equipamentos',19000,78],['Blue Sauna Robe','Equipamentos',42000,63],['Pink Earrings','Equipamentos',470000,17],['Red Viper','Equipamentos',22000,39],['Korean Fan','Equipamentos',25000,32],['Steel Pow','Equipamentos',34000,23],['Cromi','Equipamentos',650000,8],['Mystick Shield','Equipamentos',620000,10],['Weighted Earrings','Equipamentos',115000,17],
 ['Iron Ore','Materiais',310,92],['Bronze Ore','Materiais',70,92],['Leather','Materiais',120,89],['Orihalcon Ore','Materiais',90,83],['Garnet Ore','Materiais',130,79],['Diamond Ore','Materiais',245,64],['Dark Crystal Ore','Materiais',3200,47],['Cursed Doll','Materiais',55,75],['Mithril Ore','Materiais',130,77],['Stiff Feather','Materiais',28,62],
 ['Orange Potion','Consumíveis',135,95],['White Potion','Consumíveis',300,88],['Pure Water','Consumíveis',820,75],['Unagi','Consumíveis',550,68],['Mana Elixir','Consumíveis',630,60],
 ['Selective 5-slot Coupon','NX',54999,59],['Mystery Palette Exchange Coupon','NX',125000,35],['Ink-and-Wash Name Tag Ring','NX',2950000,25],['SP Reset Scroll','NX',75000,60],['Angel Halo','NX',499000,11]
];
let state={mode:'demo',source:'Simulação',updatedAt:null,items:[],selected:'Kumbi Throwing Stars',period:'1d',historyRange:'30d',customFrom:'',customTo:'',category:'Todos',sort:'volume24',sortDir:-1,search:'',watchOnly:false,watch:new Set(),ma7:true,ma21:true,ma50:true,bb20:false,hover:null};
try{state.watch=new Set(JSON.parse(localStorage.getItem('mma_watch')||'[]'))}catch{}
const money=x=>x==null||!Number.isFinite(x)?'—':(Math.abs(x)>=1e9?(x/1e9).toFixed(2)+'B':Math.abs(x)>=1e6?(x/1e6).toFixed(2)+'M':Math.abs(x)>=1000?(x/1000).toFixed(x>=100000?1:2)+'K':Math.round(x).toLocaleString('pt-BR'));
const precise=x=>x==null||!Number.isFinite(x)?'—':Math.round(x).toLocaleString('pt-BR');
const pct=x=>x==null||!Number.isFinite(x)?'—':`${x>0?'+':''}${x.toFixed(1)}%`;
const css=name=>getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const pad=(n)=>String(n).padStart(2,'0');
function rsi(prices,n=14){if(prices.length<n+1)return null;let up=0,down=0;for(let i=prices.length-n;i<prices.length;i++){let d=prices[i]-prices[i-1];up+=Math.max(0,d);down+=Math.max(0,-d);}return down===0?100:100-100/(1+(up/down));}
function bands(prices,n=20,m=2){if(prices.length<n)return null;const p=prices.slice(-n),avg=p.reduce((a,b)=>a+b,0)/n,dev=Math.sqrt(p.reduce((a,b)=>a+(b-avg)**2,0)/n);return {top:avg+m*dev,bottom:avg-m*dev,middle:avg};}
const dateFmt=x=>new Date(x).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'America/Sao_Paulo'});
function seeded(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const hash=s=>[...s].reduce((a,c)=>((a<<5)-a+c.charCodeAt(0))|0,1789);
function makeDemo(){const now=Math.floor(Date.now()/3600000)*3600000;return demoCatalog.map(([name,category,anchor,liquidity],idx)=>{const rnd=seeded(hash(name));let price=anchor*(.82+rnd()*.36);const bars=[];let ask=null;for(let i=0;i<24*120;i++){let hourTs=now-(24*120-1-i)*3600000;let n=(rnd()-.49)*(.016+(100-liquidity)*.00023)+Math.sin((i+idx*31)/111)*.0016;let open=price,close=Math.max(anchor*.22,price*(1+n));let high=Math.max(open,close)*(1+rnd()*.008);let low=Math.min(open,close)*(1-rnd()*.007);let volume=Math.max(0,Math.floor(liquidity*(.18+rnd()*1.35)));let trades=Math.max(0,Math.floor(volume*(.2+rnd()*.4)));if(liquidity<16&&rnd()>.7){volume=0;trades=0;close=open;high=open;low=open;}bars.push({time:new Date(hourTs).toISOString(),open,high,low,close,volume,trades});price=close;}
let last=bars[bars.length-1].close;ask=last*(.88+rnd()*.26);return{name,category,candles:bars,lowestAsk:ask,askUpdatedAt:new Date().toISOString(),quality:'demo'};});}
function quantile(values,q=.5){const a=values.filter(Number.isFinite).slice().sort((x,y)=>x-y);if(!a.length)return null;let i=(a.length-1)*q,l=Math.floor(i),h=Math.ceil(i);return a[l]+(a[h]-a[l])*(i-l)}
function sma(vals,n){let result=Array(vals.length).fill(null),sum=0;for(let i=0;i<vals.length;i++){sum+=vals[i];if(i>=n)sum-=vals[i-n];if(i>=n-1)result[i]=sum/n}return result;}
function bucketTime(time,period){
  const t=Date.parse(time);
  if(period==='1h')return Math.floor(t/3600000)*3600000;
  if(period==='4h')return Math.floor(t/14400000)*14400000;
  if(period==='1d')return Math.floor(t/86400000)*86400000;
  const d=new Date(t);d.setUTCHours(0,0,0,0);
  if(period==='1w'){d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.getTime();}
  if(period==='1mo'){d.setUTCDate(1);return d.getTime();}
  return Math.floor(t/86400000)*86400000;
}
function aggregate(bars,period){
  if(period==='1h')return bars;
  const groups=new Map();
  for(const b of bars){
    let k=new Date(bucketTime(b.time,period)).toISOString(),g=groups.get(k);
    if(!g){groups.set(k,{time:k,open:b.open,high:b.high,low:b.low,close:b.close,volume:b.volume||0,trades:b.trades||0,turnover:b.turnover??(b.volume||0)*b.close});}
    else{g.high=Math.max(g.high,b.high);g.low=Math.min(g.low,b.low);g.close=b.close;g.volume+=b.volume||0;g.trades+=b.trades||0;g.turnover+=(b.turnover??(b.volume||0)*b.close);}
  }
  return [...groups.values()].sort((a,b)=>a.time.localeCompare(b.time));
}
function brDay(time){return new Date(time).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric'});}
function dateInputToTs(value,endOfDay=false){
  if(!value)return endOfDay?Infinity:-Infinity;
  const t=Date.parse(value+'T00:00:00-03:00');
  return Number.isFinite(t)?t+(endOfDay?86400000:0):(endOfDay?Infinity:-Infinity);
}
function rangeWindow(raw){
  let latest=raw.length?Date.parse(raw[raw.length-1].time):null;
  if(latest==null)return {from:-Infinity,to:Infinity,requested:0};
  if(state.historyRange==='all')return {from:-Infinity,to:Infinity,requested:0};
  if(state.historyRange==='custom')return {from:dateInputToTs(state.customFrom),to:dateInputToTs(state.customTo,true),requested:0};
  const days=parseInt(state.historyRange,10)||30;
  // O recorte segue a última observação disponível; dados antigos não parecem atuais por isso.
  return {from:latest-days*86400000,to:latest+1,requested:days};
}
function candleEnd(b,period){
  const t=Date.parse(b.time);
  if(period==='1h')return t+3600000;
  if(period==='4h')return t+14400000;
  if(period==='1d')return t+86400000;
  if(period==='1w')return t+7*86400000;
  if(period==='1mo'){const d=new Date(t);d.setUTCMonth(d.getUTCMonth()+1);return d.getTime();}
  return t+86400000;
}
function getStats(it){let a=it.candles||[],l=a.length? a[a.length-1].close : it.lastSale??null;let cutoff24=Date.now()-86400000,cutoff7=Date.now()-7*86400000;let d24=a.filter(b=>Date.parse(b.time)>=cutoff24),d7=a.filter(b=>Date.parse(b.time)>=cutoff7);let hist24=[...a].reverse().find(b=>Date.parse(b.time)<cutoff24)||null,hist7=[...a].reverse().find(b=>Date.parse(b.time)<cutoff7)||null;let ch24=hist24&&l?100*(l/hist24.close-1):null,ch7=hist7&&l?100*(l/hist7.close-1):null;
let vol24=it.quality==='daily_median'?null:d24.reduce((s,b)=>s+(b.turnover??(b.volume||0)*b.close),0),tr24=d24.reduce((s,b)=>s+(b.trades||0),0);const closes=a.map(x=>x.close);const m7=sma(closes,7).at(-1),m21=sma(closes,21).at(-1);let med7=quantile(d7.map(x=>x.close))??(it.lastSale??null);let signal='LATERAL';if(m7!=null&&m21!=null&&ch24!=null){if(m7>m21&&ch24>0)signal='ALTA';if(m7<m21&&ch24<0)signal='BAIXA';}
// A 2% fee is a configurable scenario, not a claim about actual in-game costs.
const modelFee=.03,margin=.08,ask=it.lowestAsk;let age=Date.now()-Date.parse(it.askUpdatedAt||'');let askFresh=Number.isFinite(age)&&age>=0&&age<=3*3600000;let trustworthy=state.mode==='demo'||it.quality==='sales';let deal=trustworthy&&askFresh&&Number.isFinite(ask)&&med7&&ask<med7*(1-modelFee-margin)&&tr24>=5;
return{price:l,change24:ch24,change7:ch7,volume24:vol24,trades24:tr24,ask,med7,signal,deal,discount:med7&&ask?100*(1-ask/med7):null,m7,m21,rsi14:rsi(closes),bb20:bands(closes)};}
function getRows(){return state.items.map(it=>({...it,...getStats(it)}));}
function filterRows(all){let q=state.search.toLowerCase().trim();let rows=all.filter(i=>(state.category==='Todos'||i.category===state.category)&&(!state.watchOnly||state.watch.has(i.name))&&(!q||i.name.toLowerCase().includes(q)));let k=state.sort,d=state.sortDir;rows.sort((a,b)=>{let x=a[k],y=b[k];if(x==null)return 1;if(y==null)return -1;if(typeof x==='string')return x.localeCompare(y)*d;return (x-y)*d;});return rows;}
function renderKpis(rows){$('kpiItems').textContent=precise(rows.length);$('kpiSource').textContent='• '+(state.mode==='demo'?'simulado':state.items[0]?.quality==='daily_median'?'medianas diárias':'importado');$('kpiVolume').textContent=money(rows.reduce((s,x)=>s+(x.volume24||0),0));const gain=rows.filter(x=>Number.isFinite(x.change24)).sort((a,b)=>b.change24-a.change24)[0];$('kpiGainer').textContent=gain?pct(gain.change24):'—';$('kpiGainerName').textContent=gain?gain.name:'sem série histórica';$('kpiDeals').textContent=rows.filter(x=>x.deal).length;}
function renderSignals(rows){const list=rows.filter(i=>i.quality!=='daily_median'&&i.trades24>=3&&i.change24!=null).sort((a,b)=>{let s=x=>(x.deal?100:0)+Math.abs(x.change24)*.9+Math.log1p(x.trades24);return s(b)-s(a);}).slice(0,4);$('signalsList').innerHTML=list.length?list.map(x=>`<div class="signal-row"><div class="signal-left"><div class="signal-name">${escapeHtml(x.name)}</div><div class="signal-detail">${x.deal?'Pedido '+(x.discount?.toFixed(1)||'')+'% abaixo da mediana':precise(x.trades24)+' vendas • '+pct(x.change24)}</div></div><span class="signal-badge ${x.deal?'buy':x.signal==='BAIXA'?'sell':'neutral'}">${x.deal?'DESCONTO':x.signal==='BAIXA'?'EM QUEDA':'EM ALTA'}</span></div>`).join(''):'<div class="loading">Sem dados suficientes para sinais.</div>';}
function renderTable(rows){let all=filterRows(rows);$('marketTotal').textContent=`${all.length} itens`;$('tableFoot').textContent=`Mostrando ${Math.min(all.length,150)} de ${all.length} itens • Ordenado por ${state.sort}`;const content=all.slice(0,150).map(i=>`<tr><td class="star-col"><button class="star-btn ${state.watch.has(i.name)?'is-starred':''}" data-watch="${escapeAttr(i.name)}" aria-label="Favoritar">${state.watch.has(i.name)?'★':'☆'}</button></td><td class="item-link" data-item="${escapeAttr(i.name)}"><strong>${escapeHtml(i.name)}</strong><div class="category-sub">${escapeHtml(i.category)}</div></td><td><strong>${money(i.price)}</strong></td><td class="${i.change24==null?'muted-cell':i.change24>=0?'value-positive':'value-negative'}">${pct(i.change24)}</td><td class="${i.change7==null?'muted-cell':i.change7>=0?'value-positive':'value-negative'}">${pct(i.change7)}</td><td>${i.volume24==null?'—':money(i.volume24)}</td><td>${precise(i.trades24)}</td><td>${money(i.ask)}</td><td><span class="signal-pill ${i.signal==='ALTA'?'bull':i.signal==='BAIXA'?'bear':''}">${i.deal?'DESCONTO':i.signal}</span></td></tr>`).join('');$('marketRows').innerHTML=content||'<tr><td colspan="9" class="no-results">Nenhum item encontrado com esses filtros.</td></tr>';}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));}function escapeAttr(s){return escapeHtml(s);}
let drawing=null,chartViewportKey='';
function drawChart(){
  const it=state.items.find(x=>x.name===state.selected)||state.items[0];
  if(!it)return;
  state.selected=it.name;
  const raw=(it.candles||[]).slice().sort((a,b)=>a.time.localeCompare(b.time));
  const bars=aggregate(raw,state.period),selectedWindow=rangeWindow(raw);
  const selectedIndexes=[];
  for(let i=0;i<bars.length;i++){
    const b=bars[i],t=Date.parse(b.time);
    if(candleEnd(b,state.period)>selectedWindow.from && t<selectedWindow.to)selectedIndexes.push(i);
  }
  const data=selectedIndexes.map(i=>bars[i]);
  const firstIndex=selectedIndexes.length?selectedIndexes[0]:0;
  const last=data.at(-1);
  const starting=data[0];
  const intervalChange=last&&starting&&starting.open>0?100*(last.close/starting.open-1):null;
  const closes=bars.map(b=>b.close);
  const historyCloses=closes.slice(0,selectedIndexes.length?selectedIndexes.at(-1)+1:0);
  const r14=rsi(historyCloses);
  $('chartTitle').textContent=it.name;
  $('chartPrice').textContent=last?money(last.close)+' mesos':'Sem vendas no período';
  $('chartChange').textContent=intervalChange===null?'—':pct(intervalChange)+' no período';
  $('chartChange').className=intervalChange===null?'subtle':intervalChange>=0?'value-positive':'value-negative';
  $('chartRsi').textContent=r14===null?'RSI 14 —':'RSI 14 '+r14.toFixed(1);
  $('chartDataType').textContent=it.quality==='daily_median'?'PREÇOS MEDIANOS DIÁRIOS • SEM OHLC • fonte: '+state.source:state.mode==='demo'?'CANDLES SIMULADOS • sem cotação real':it.quality==='snapshot'?'SOMENTE ANÚNCIOS • sem candles':'VENDAS OBSERVADAS • '+state.source;
  const hist=$('historyInfo'),start=raw[0],end=raw.at(-1),coverage=start&&end?(brDay(start.time)+' a '+brDay(end.time)):'nenhum histórico disponível';
  const windowLabel=state.historyRange==='all'?'histórico completo':state.historyRange==='custom'?'datas selecionadas':selectedWindow.requested+' dias';
  const incomplete=selectedWindow.requested && start && Date.parse(start.time)>selectedWindow.from+86400000;
  const fromLabel=data.length?brDay(data[0].time):'—',toLabel=data.length?brDay(data.at(-1).time):'—';
  hist.innerHTML=`<span>Disponível: <b>${coverage}</b></span><span>Filtro: <b>${windowLabel}</b> · Exibindo <b>${data.length}</b> candles (${fromLabel} → ${toLabel})</span>${incomplete?'<strong class="history-short">Histórico menor que a janela escolhida</strong>':''}<span class="history-hint">↔ Role horizontalmente para explorar todos os candles</span>`;
  const canvas=$('priceChart'),wrap=$('chartWrap'),empty=$('emptyChart');
  empty.classList.toggle('hidden',!!data.length);
  if(!data.length){empty.textContent=raw.length?'Não existem negociações no intervalo selecionado. Escolha outras datas ou importe mais histórico.':'Sem candles disponíveis. Importe vendas históricas reais para este item.';drawing=null;$('chartTooltip').classList.add('hidden');const g=canvas.getContext('2d');if(g)g.clearRect(0,0,canvas.width,canvas.height);return;}
  const viewport=Math.max(300,wrap.clientWidth),w=Math.max(viewport,Math.min(24000,data.length*7+90)),h=Math.max(280,wrap.clientHeight-9);
  canvas.style.width=w+'px';canvas.style.height=h+'px';
  const dpr=Math.min(window.devicePixelRatio||1,1.7);
  canvas.width=Math.ceil(w*dpr);canvas.height=Math.ceil(h*dpr);
  const g=canvas.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,w,h);
  g.fillStyle='#000000';g.fillRect(0,0,w,h);
  const x0=16,x1=w-80,top=18,bot=h-101,vtop=h-83,vbot=h-31,plotW=x1-x0,plotH=bot-top,cw=plotW/data.length;
  const vals=data.map(x=>x.close),allSmas={7:sma(closes,7),21:sma(closes,21),50:sma(closes,50)};
  let max=Math.max(...data.map(b=>b.high)),min=Math.min(...data.map(b=>b.low));
  let bbFull=null;
  if(state.bb20){bbFull=selectedIndexes.map(i=>bands(closes.slice(Math.max(0,i-19),i+1)));for(const bb of bbFull){if(bb){max=Math.max(max,bb.top);min=Math.min(min,bb.bottom);}}}
  let padding=Math.max(1,(max-min)*.10);max+=padding;min=Math.max(0,min-padding);
  const py=v=>bot-(v-min)/(max-min)*plotH;
  const cx=i=>x0+(i+.5)*cw;
  g.font='11px ui-monospace,Consolas,monospace';g.textAlign='left';
  for(let j=0;j<=4;j++){
    const y=top+j*plotH/4;
    g.strokeStyle='#252525';g.lineWidth=1;g.beginPath();g.moveTo(x0,y);g.lineTo(x1,y);g.stroke();
    g.fillStyle='#9c9c9c';g.fillText(money(max-j*(max-min)/4),x1+8,y+3);
  }
  g.strokeStyle='#242424';g.beginPath();g.moveTo(x0,vtop-7);g.lineTo(x1,vtop-7);g.stroke();
  const vmax=Math.max(1,...data.map(x=>x.volume||0)),bodyWidth=Math.max(1,Math.min(9,cw*.7));
  if(it.quality==='daily_median'){
    g.strokeStyle='#f4f4f4';g.lineWidth=2.1;g.beginPath();data.forEach((b,i)=>{if(!i)g.moveTo(cx(i),py(b.close));else g.lineTo(cx(i),py(b.close));});g.stroke();
    const maxCount=Math.max(1,...data.map(b=>b.trades||0));data.forEach((b,i)=>{const hh=(b.trades||0)/maxCount*(vbot-vtop);g.fillStyle='#646464';g.fillRect(cx(i)-bodyWidth/2,vbot-hh,bodyWidth,hh);});
  }else{
  data.forEach((b,i)=>{
    const x=cx(i),up=b.close>=b.open,o=py(b.open),c=py(b.close),topBody=Math.min(o,c),heightBody=Math.max(1.4,Math.abs(c-o));
    // Alta: corpo branco preenchido. Baixa: corpo preto com contorno cinza-claro para visibilidade.
    g.strokeStyle=up?'#ffffff':'#bababa';g.lineWidth=1;
    g.beginPath();g.moveTo(x,py(b.high));g.lineTo(x,py(b.low));g.stroke();
    g.fillStyle=up?'#ffffff':'#000000';g.fillRect(x-bodyWidth/2,topBody,bodyWidth,heightBody);
    g.strokeStyle=up?'#ffffff':'#d4d4d4';g.lineWidth=.9;g.strokeRect(x-bodyWidth/2,topBody,bodyWidth,heightBody);
    const hh=(b.volume||0)/vmax*(vbot-vtop);
    g.globalAlpha=.72;g.fillStyle=up?'#bcbcbc':'#555555';g.fillRect(x-bodyWidth/2,vbot-hh,bodyWidth,hh);g.globalAlpha=1;
  });
  }
  if(bbFull){for(const key of ['top','bottom']){g.strokeStyle='#5772a5';g.lineWidth=1;g.setLineDash([3,3]);g.beginPath();let started=false;bbFull.forEach((bb,i)=>{if(!bb)return;if(!started){g.moveTo(cx(i),py(bb[key]));started=true;}else g.lineTo(cx(i),py(bb[key]));});if(started)g.stroke();g.setLineDash([]);}}
  function plotMA(n,color){
    const mm=allSmas[n];g.strokeStyle=color;g.lineWidth=n===21?2.4:1.8;g.beginPath();let started=false;
    selectedIndexes.forEach((j,i)=>{let v=mm[j];if(v==null)return;if(!started){g.moveTo(cx(i),py(v));started=true;}else g.lineTo(cx(i),py(v));});
    if(started)g.stroke();
  }
  if(state.ma50)plotMA(50,'#bc8cff');
  if(state.ma21)plotMA(21,'#37e39c');
  if(state.ma7)plotMA(7,'#ff6875');
  g.setLineDash([5,5]);g.strokeStyle='#bbbbbb';g.beginPath();g.moveTo(x0,py(last.close));g.lineTo(x1,py(last.close));g.stroke();g.setLineDash([]);
  g.fillStyle='#efefef';g.fillText(money(last.close),x1+8,py(last.close)-6);
  g.fillStyle='#9d9d9d';g.textAlign='center';
  const ticks=Math.min(8,data.length);
  for(let i=0;i<ticks;i++){
    const j=ticks<=1?0:Math.min(data.length-1,Math.floor(i*(data.length-1)/(ticks-1)));
    g.fillText(brDay(data[j].time).slice(0,5),cx(j),h-11);
  }
  g.textAlign='left';g.fillStyle='#999999';g.fillText(it.quality==='daily_median'?'NEGÓCIOS/DIA':'VOL.',x0,vtop+2);
  const over=state.hover;
  if(over!==null&&over>=0&&over<data.length){
    const xx=cx(over),b=data[over];g.strokeStyle='#777777';g.setLineDash([3,4]);g.beginPath();g.moveTo(xx,top);g.lineTo(xx,vbot);g.stroke();g.setLineDash([]);
    const tip=$('chartTooltip');tip.innerHTML=it.quality==='daily_median'?`<b>${dateFmt(b.time)}</b><br>Mediana: ${precise(b.close)} mesos<br>Negócios observados: ${precise(b.trades)}<br>Sem dados de OHLC`:`<b>${dateFmt(b.time)}</b><br>A ${precise(b.open)} &nbsp; M ${precise(b.high)}<br>m ${precise(b.low)} &nbsp; F ${precise(b.close)}<br>Volume: ${precise(b.volume)} • ${precise(b.trades)} vendas`;
    tip.classList.remove('hidden');tip.style.left=`${Math.max(wrap.scrollLeft+8,Math.min(wrap.scrollLeft+wrap.clientWidth-190,xx+12))}px`;tip.style.top='22px';
  }else{$('chartTooltip').classList.add('hidden');}
  drawing={data,x0,cw,x1,w};
  const key=[state.selected,state.period,state.historyRange,state.customFrom,state.customTo].join('|');
  if(key!==chartViewportKey){chartViewportKey=key;wrap.scrollLeft=wrap.scrollWidth-wrap.clientWidth;}
}
function refresh(){const rows=getRows();renderKpis(rows);renderSignals(rows);renderTable(rows);$('watchCount').textContent=state.watch.size;let prev=$('itemSelect').value;$('itemSelect').innerHTML=state.items.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(i=>`<option value="${escapeAttr(i.name)}">${escapeHtml(i.name)}</option>`).join('');if(!state.items.some(x=>x.name===state.selected))state.selected=state.items[0]?.name;$('itemSelect').value=state.selected;state.hover=null;drawChart();const demo=state.mode==='demo';$('demoBanner').classList.toggle('hidden',!demo);$('mainStatus').innerHTML=demo?'<span>◉</span> DEMONSTRAÇÃO':state.items[0]?.quality==='daily_median'?'<span>●</span> HISTÓRICO DE MEDIANAS':'<span>●</span> DADOS IMPORTADOS';$('mainStatus').style.color=demo?'#ffd39e':'#6ce1bd';$('sidebarStatus').textContent=demo?'MODO DEMONSTRAÇÃO':'FONTE: '+state.source.toUpperCase();$('lastUpdate').textContent=demo?'Candles simulados • não utilizar para negociar':'Atualizado: '+(state.updatedAt?dateFmt(state.updatedAt):'sem horário informado');$('footerSource').textContent=demo?'SIMULAÇÃO':state.source.toUpperCase();}
function showImport(){ $('importModal').classList.remove('hidden');$('importError').classList.add('hidden');}
function closeImport(){ $('importModal').classList.add('hidden');}
function parseCsv(text){let lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(s=>s.trim());if(!lines.length)throw Error('Arquivo vazio.');let sep=(lines[0].match(/;/g)||[]).length>(lines[0].match(/,/g)||[]).length?';':',';const parse=s=>{let parts=[],cur='',quoted=false;for(let i=0;i<s.length;i++){let c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){cur+='"';i++}else quoted=!quoted;}else if(c===sep&&!quoted){parts.push(cur.trim());cur='';}else cur+=c;}parts.push(cur.trim());return parts;};let header=parse(lines.shift()).map(x=>x.toLowerCase().trim());return lines.map(line=>Object.fromEntries(parse(line).map((v,i)=>[header[i]||'unnamed',v])));}
function toDate(x){let t=Date.parse(x);return Number.isFinite(t)?new Date(t).toISOString():null;}
function parseFeed(obj,label='Arquivo importado'){if(Array.isArray(obj))obj={sales:obj};if(!obj||typeof obj!=='object')throw Error('JSON inválido.');if(Array.isArray(obj.items)&&obj.items.some(i=>Array.isArray(i.candles))){let items=obj.items.map(it=>{let candles=(it.candles||[]).map(b=>({time:toDate(b.time||b.timestamp),open:+b.open,high:+b.high,low:+b.low,close:+b.close,volume:+(b.volume||0),trades:+(b.trades||0),turnover:Number.isFinite(+b.turnover)?+b.turnover:(+b.volume||0)*(+b.close)})).filter(b=>b.time&&[b.open,b.high,b.low,b.close].every(x=>Number.isFinite(x)&&x>0)&&b.high>=Math.max(b.open,b.close)&&b.low<=Math.min(b.open,b.close)).sort((a,b)=>a.time.localeCompare(b.time));return {name:String(it.name||it.item||'').trim(),category:it.category||'Outros',lowestAsk:Number.isFinite(+it.lowestAsk)&&+it.lowestAsk>0?+it.lowestAsk:null,lastSale:+(it.lastSale||0)||null,quality:it.quality||'sales',askUpdatedAt:it.askUpdatedAt||null,candles};}).filter(x=>x.name);if(!items.length)throw Error('Não encontrei itens com candles válidos.');return{items,source:obj.source||label,updatedAt:obj.updatedAt||new Date().toISOString(),mode:obj.mode||'live'};}
const sales=obj.sales||obj.events||[],listings=obj.listings||[],itemsMap=new Map();function itemFor(x){let name=String(x.item||x.name||'').trim();if(!name)return null;let it=itemsMap.get(name);if(!it){it={name,category:x.category||'Outros',candles:[],lowestAsk:null,lastSale:null,quality:'sales',askUpdatedAt:null,_sales:[]};itemsMap.set(name,it);}return it;}
for(const s of sales){if(s.type&& !['sale','sold','trade','venda'].includes(String(s.type).toLowerCase()))continue;let it=itemFor(s);if(!it)continue;let ts=toDate(s.timestamp||s.time||s.ts),price=Number(s.price),quantity=Number(s.quantity??s.qty??1);if(!ts||!Number.isFinite(price)||price<=0||!Number.isFinite(quantity)||quantity<=0)continue;it._sales.push({ts,price,quantity});}
for(const a of listings){let it=itemFor(a);if(!it)continue;let ask=Number(a.price??a.ask??a.lowestAsk);let time=toDate(a.timestamp||a.time||a.askUpdatedAt);if(ask>0&&time&&Date.now()-Date.parse(time)<=10800000&&(it.lowestAsk==null||ask<it.lowestAsk)){it.lowestAsk=ask;it.askUpdatedAt=time;}}
for(const it of itemsMap.values()){let groups=new Map();for(const s of it._sales.sort((a,b)=>a.ts.localeCompare(b.ts))){let key=new Date(Math.floor(Date.parse(s.ts)/3600000)*3600000).toISOString(),g=groups.get(key);if(!g){g={time:key,open:s.price,high:s.price,low:s.price,close:s.price,volume:s.quantity,trades:1,turnover:s.price*s.quantity};groups.set(key,g)}else{g.high=Math.max(g.high,s.price);g.low=Math.min(g.low,s.price);g.close=s.price;g.volume+=s.quantity;g.trades++;g.turnover+=s.price*s.quantity;}}it.candles=[...groups.values()].sort((a,b)=>a.time.localeCompare(b.time));it.lastSale=it.candles.at(-1)?.close??null;delete it._sales;}
const items=[...itemsMap.values()];if(!items.length)throw Error('Nenhuma venda ou anúncio válido foi encontrado.');return{items,source:obj.source||label,updatedAt:obj.updatedAt||new Date().toISOString(),mode:'live'};}
function importRows(rows,label){if(!rows.length)throw Error('Nenhuma linha encontrada.');let h=Object.keys(rows[0]);if(['open','high','low','close'].every(s=>h.includes(s))){let map=new Map();for(const r of rows){let name=r.item||r.name,time=toDate(r.timestamp||r.time||r.ts);if(!name||!time)continue;const b={time,open:+r.open,high:+r.high,low:+r.low,close:+r.close,volume:+(r.volume||0),trades:+(r.trades||0),turnover:Number.isFinite(+r.turnover)?+r.turnover:(+r.volume||0)*(+r.close)};if(![b.open,b.high,b.low,b.close].every(x=>Number.isFinite(x)&&x>0)||b.high<Math.max(b.open,b.close)||b.low>Math.min(b.open,b.close))continue;let it=map.get(name);if(!it){it={name,category:r.category||'Outros',quality:'sales',lowestAsk:null,candles:[]};map.set(name,it)}it.candles.push(b);}
return parseFeed({items:[...map.values()],source:label,mode:'live'},label);}
return parseFeed({sales:rows,source:label},label);}
function adopt(obj,persist=true){state.items=obj.items;state.mode='live';state.source=obj.source;state.updatedAt=obj.updatedAt;state.selected=state.items.some(i=>i.name==='Kumbi Throwing Stars')?'Kumbi Throwing Stars':state.items[0].name;state.category='Todos';state.watchOnly=false;state.search='';$('tableSearch').value='';document.querySelectorAll('#categoryChips button').forEach(b=>b.classList.toggle('active',b.dataset.cat==='Todos'));refresh();if(persist){try{let serialized=JSON.stringify(obj);if(serialized.length<2500000)localStorage.setItem('mma_import',serialized);}catch{}}}
async function receive(file){if(!file)return;try{let text=await file.text(),obj=file.name.toLowerCase().endsWith('.json')?parseFeed(JSON.parse(text),file.name):importRows(parseCsv(text),file.name);adopt(obj);closeImport();}catch(err){$('importError').textContent='Não foi possível importar: '+err.message;$('importError').classList.remove('hidden');}}
function parsePublicMarket(data){
  if(!data||!Array.isArray(data.items))throw Error('A fonte não retornou uma lista de itens.');
  const categoryMap={Etc:'Materiais',Use:'Consumíveis',Cash:'NX',Equip:'Equipamentos'};
  const items=data.items.map(row=>{
    const candles=(Array.isArray(row.h)?row.h:[]).map(p=>{
      const day=String(p[0]||'');const price=Number(p[1]);const count=Number(p[2]);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!(price>0))return null;
      return {time:day+'T00:00:00.000Z',open:price,high:price,low:price,close:price,volume:0,trades:Number.isFinite(count)&&count>=0?count:0,turnover:0};
    }).filter(Boolean).sort((a,b)=>a.time.localeCompare(b.time));
    if(!candles.length)return null;
    const name=String(row.n||'').trim();if(!name)return null;
    let category=categoryMap[row.k]||'Outros';
    if(/throwing stars/i.test(name))category='Estrelas';
    else if(/scroll/i.test(name))category='Scrolls';
    return {name,category,candles,quality:'daily_median',lowestAsk:null,lastSale:candles.at(-1).close,askUpdatedAt:null};
  }).filter(Boolean);
  if(!items.length)throw Error('A fonte pública não trouxe histórico aproveitável.');
  return {items,source:'MapleCharts / Meso Market (GitHub público)',updatedAt:data.updatedAt||null,mode:'reference'};
}
async function loadPublicMarket(force=false){
  const status=$('publicFeedStatus'),btn=$('loadPublicData');
  if(!status||!btn)return false;
  if(!force&&Date.now()-publicFeedLastFetch<3500000)return true;
  btn.disabled=true;status.textContent='Consultando 1 arquivo JSON público…';
  try{
    const response=await fetch(PUBLIC_MARKET_URL,{cache:'no-store',mode:'cors'});
    if(!response.ok)throw Error('HTTP '+response.status+'; sem tentar contornar restrições');
    const raw=await response.json();const parsed=parsePublicMarket(raw);
    state.period='1d';document.querySelectorAll('#intervalBtns button').forEach(b=>b.classList.toggle('active',b.dataset.period==='1d'));
    adopt(parsed,false); // não publica nem armazena cópia da base no GitHub
    personalFeedEnabled=true;publicFeedLastFetch=Date.now();
    status.textContent=parsed.items.length+' itens com séries diárias • referência em '+(parsed.updatedAt||'sem horário')+' • próxima consulta somente nesta aba em até 1 hora';
    return true;
  }catch(err){status.textContent='Fonte não disponível: '+String(err.message||err)+'. Use importação CSV/JSON.';return false;}
  finally{btn.disabled=false;}
}

async function tryRemote(){if(location.protocol==='file:')return false;try{const resp=await fetch(`data/market.json?cache=${Date.now()}`,{cache:'no-store'});if(!resp.ok)return false;const obj=await resp.json();if(obj.mode==='demo'||!Array.isArray(obj.items)||!obj.items.length)return false;const parsed=parseFeed(obj,'Feed autorizado');adopt(parsed,false);return true;}catch(e){return false;}}
function download(name,text,type){let url=URL.createObjectURL(new Blob([text],{type}));let a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportCSV(){let rows=filterRows(getRows()),header='item,categoria,preco,variacao_24h_pct,variacao_7d_pct,volume_24h_mesos,vendas_24h,menor_anuncio,sinal\n',csv=header+rows.map(i=>[i.name,i.category,i.price??'',i.change24??'',i.change7??'',i.volume24==null?'':Math.round(i.volume24),i.trades24,i.ask??'',i.signal].map(x=>'"'+String(x).replaceAll('"','""')+'"').join(',')).join('\n');download('maple-market-resumo.csv',csv,'text/csv;charset=utf-8');}
function initEvents(){$('loadPublicData').addEventListener('click',()=>loadPublicMarket(true));setInterval(()=>{if(personalFeedEnabled)loadPublicMarket(false)},3600000);document.querySelectorAll('[data-nav]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-nav]').forEach(x=>x.classList.remove('active'));b.classList.add('active');let tab=b.dataset.nav;if(tab==='import'){showImport();return;}state.watchOnly=(tab==='watch');state.search='';$('tableSearch').value='';refresh();if(tab==='market'||tab==='watch')$('marketSection').scrollIntoView({behavior:'smooth'});else scrollTo({top:0,behavior:'smooth'});}));['importTop','bannerImport'].forEach(id=>$(id).addEventListener('click',showImport));$('modalClose').addEventListener('click',closeImport);$('importModal').addEventListener('click',e=>{if(e.target===$('importModal'))closeImport();});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeImport()});$('fileInput').addEventListener('change',e=>receive(e.target.files[0]));$('restoreDemo').addEventListener('click',()=>{localStorage.removeItem('mma_import');state.items=makeDemo();state.mode='demo';state.source='Simulação';state.updatedAt=null;state.selected='Kumbi Throwing Stars';refresh();closeImport()});$('itemSelect').addEventListener('change',e=>{state.selected=e.target.value;state.hover=null;drawChart()});
  document.querySelectorAll('#historyRangeBtns button').forEach(btn=>btn.addEventListener('click',()=>{state.historyRange=btn.dataset.range;document.querySelectorAll('#historyRangeBtns button').forEach(x=>x.classList.toggle('active',x===btn));$('historyCustom').classList.toggle('hidden',state.historyRange!=='custom');state.hover=null;drawChart();}));
  $('historyApply').addEventListener('click',()=>{if(state.customFrom&&state.customTo&&state.customFrom>state.customTo){$('historyInfo').textContent='A data inicial não pode ser posterior à final.';return;}state.customFrom=$('dateFrom').value;state.customTo=$('dateTo').value;if(state.customFrom&&state.customTo&&state.customFrom>state.customTo){$('historyInfo').textContent='A data inicial não pode ser posterior à final.';return;}state.historyRange='custom';state.hover=null;drawChart();});
document.querySelectorAll('#intervalBtns button').forEach(b=>b.addEventListener('click',()=>{state.period=state.items[0]?.quality==='daily_median'&&['1h','4h'].includes(b.dataset.period)?'1d':b.dataset.period;document.querySelectorAll('#intervalBtns button').forEach(x=>x.classList.toggle('active',x.dataset.period===state.period));state.hover=null;drawChart()}));[7,21,50].forEach(n=>$('ma'+n).addEventListener('change',e=>{state['ma'+n]=e.target.checked;drawChart()}));$('bb20').addEventListener('change',e=>{state.bb20=e.target.checked;drawChart()});$('tableSearch').addEventListener('input',e=>{state.search=e.target.value;renderTable(getRows());});document.querySelectorAll('#categoryChips button').forEach(b=>b.addEventListener('click',()=>{state.category=b.dataset.cat;document.querySelectorAll('#categoryChips button').forEach(x=>x.classList.toggle('active',x===b));renderTable(getRows())}));document.querySelectorAll('thead button[data-sort]').forEach(b=>b.addEventListener('click',()=>{let k=b.dataset.sort;if(state.sort===k)state.sortDir*=-1;else{state.sort=k;state.sortDir=k==='name'?1:-1;}renderTable(getRows());}));$('marketRows').addEventListener('click',e=>{let star=e.target.closest('[data-watch]');if(star){let item=star.dataset.watch;if(state.watch.has(item))state.watch.delete(item);else state.watch.add(item);try{localStorage.setItem('mma_watch',JSON.stringify([...state.watch]));}catch{};$('watchCount').textContent=state.watch.size;renderTable(getRows());return;}let el=e.target.closest('[data-item]');if(el){state.selected=el.dataset.item;$('itemSelect').value=state.selected;state.hover=null;drawChart();$('chartWrap').scrollIntoView({behavior:'smooth',block:'center'});}});$('exportCsv').addEventListener('click',exportCSV);$('refreshBtn').addEventListener('click',async()=>{let ok=await tryRemote();if(!ok)refresh();});const cv=$('priceChart');cv.addEventListener('mousemove',e=>{if(!drawing)return;let r=cv.getBoundingClientRect(),x=e.clientX-r.left,idx=Math.floor((x-drawing.x0)/drawing.cw);state.hover=idx>=0&&idx<drawing.data.length?idx:null;drawChart();});cv.addEventListener('mouseleave',()=>{state.hover=null;drawChart()});window.addEventListener('resize',()=>drawChart());window.addEventListener('orientationchange',()=>drawChart());$('clock').textContent=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(new Date())+' BRT';setInterval(()=>{$('clock').textContent=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(new Date())+' BRT'},60000);setInterval(tryRemote,3600000);}
async function init(){state.items=makeDemo();initEvents();try{let stored=localStorage.getItem('mma_import');if(stored){let obj=JSON.parse(stored);if(obj&&obj.items?.length)adopt(obj,false)}}catch{}refresh();await tryRemote();}
init();
})();
