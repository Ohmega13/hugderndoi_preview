// overview.js — โหลดยอดขาย/ค่าใช้จ่าย + chart

const textColor = getComputedStyle(document.documentElement)
  .getPropertyValue('--text').trim() || '#e5e7eb';

function ov_cfg(){
  try{ return JSON.parse(localStorage.getItem('hug_settings_v1')||'{}'); }
  catch{ return {}; }
}
async function ov_fetch(table){
  const cfg = ov_cfg();
  if(!cfg.appsScriptUrl || !cfg.apiToken) return { ok:false, rows:[] };
  const url = `${cfg.appsScriptUrl}?table=${encodeURIComponent(table)}&token=${encodeURIComponent(cfg.apiToken)}`;
  const res = await fetch(url);
  return res.json();
}
function ov_thb(n){ return '฿' + Number(n||0).toLocaleString(); }

const OV_CHARTS = { sales7:null, top5:null, costPie:null, costTrend:null };

function ov_set(id, value){
  const el = document.getElementById(id);
  if(el) el.textContent = value;
}
function ov_lastNDays(n){
  const days = [];
  const names = ['อา','จ','อ','พ','พฤ','ศ','ส'];
  const today = new Date();
  for(let i=n-1;i>=0;i--){
    const d = new Date(today);
    d.setDate(d.getDate()-i);
    days.push({ key: d.toISOString().slice(0,10), label: names[d.getDay()] });
  }
  return days;
}
function ov_destroyChart(inst){
  try{ if(inst && typeof inst.destroy==='function') inst.destroy(); }catch(_){}
  return null;
}

async function ov_reload(){
  const [oRes, eRes, vRes] = await Promise.all([
    ov_fetch('Orders'),
    ov_fetch('Expenses'),
    ov_fetch('ProductVariants')
  ]);
  const orders = (oRes && oRes.ok && oRes.rows) || [];
  const expenses = (eRes && eRes.ok && eRes.rows) || [];
  const variants = (vRes && vRes.ok && vRes.rows) || [];

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s,o)=>{
    const st = String(o.status||'').trim();
    if(st==='ยกเลิก') return s;
    const v = Number(o.total_amount||0);
    return s + (isFinite(v)?v:0);
  },0);
  const todayKey = (new Date()).toISOString().slice(0,10);
  const todayRevenue = orders.reduce((s,o)=>{
    const st = String(o.status||'').trim();
    if(st==='ยกเลิก') return s;
    const d = String(o.order_date||'').slice(0,10);
    if(d!==todayKey) return s;
    const v = Number(o.total_amount||0);
    return s + (isFinite(v)?v:0);
  },0);
  const pendingCount = orders.filter(o => String(o.status||'').trim()==='รอชำระ').length;
  const packCount = orders.filter(o => String(o.status||'').trim()==='พร้อมแพ็ก').length;
  const lowStockCount = variants.filter(v=>{
    const q = Number(v.quantity_on_hand||0);
    const r = Number(v.reorder_point||0);
    return isFinite(q) && isFinite(r) && q <= r;
  }).length;

  ov_set('ov_total_revenue', ov_thb(totalRevenue));
  ov_set('ov_total_orders', String(totalOrders));
  ov_set('ov_today_revenue', ov_thb(todayRevenue));
  ov_set('ov_pending_count', String(pendingCount));
  ov_set('ov_pack_count', String(packCount));
  ov_set('ov_low_stock_count', String(lowStockCount));

  // Sales last 7 days
  try{
    const last7 = ov_lastNDays(7);
    const map = Object.create(null);
    last7.forEach(d => map[d.key]=0);
    orders.forEach(o=>{
      const st = String(o.status||'').trim();
      if(st==='ยกเลิก') return;
      const k = String(o.order_date||'').slice(0,10);
      if(map[k]===undefined) return;
      const v = Number(o.total_amount||0);
      map[k] += isFinite(v)?v:0;
    });
    const labels = last7.map(d=>d.label);
    const data = last7.map(d=>map[d.key]);
    const ctx = document.getElementById('sales7');
    if(ctx && window.Chart){
      OV_CHARTS.sales7 = ov_destroyChart(OV_CHARTS.sales7);
      OV_CHARTS.sales7 = new Chart(ctx, {
        type:'line',
        data:{ labels, datasets:[{ label:'ยอดขาย (฿)', data, tension:.35, borderWidth:2 }] },
        options:{ plugins:{ legend:{ display:false } }, scales:{ x:{ ticks:{ color:textColor } }, y:{ ticks:{ color:textColor }, grid:{ color:'rgba(255,255,255,.06)' } } } }
      });
    }
  }catch(err){ console.warn('sales7 error', err); }

  // Top 5
  try{
    const oiRes = await ov_fetch('Order_Items');
    const items = (oiRes && oiRes.ok && oiRes.rows) || [];
    const qtyMap = new Map();
    items.forEach(it=>{
      const sku = it.sku_variant || it.sku || '—';
      const q = Number(it.qty||0);
      qtyMap.set(sku, (qtyMap.get(sku)||0) + (isFinite(q)?q:0));
    });
    const top = Array.from(qtyMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const labels = top.length ? top.map(x=>x[0]) : ['SKU-A','SKU-B','SKU-C','SKU-D','SKU-E'];
    const data = top.length ? top.map(x=>x[1]) : [0,0,0,0,0];
    const ctx = document.getElementById('top5');
    if(ctx && window.Chart){
      OV_CHARTS.top5 = ov_destroyChart(OV_CHARTS.top5);
      OV_CHARTS.top5 = new Chart(ctx, {
        type:'bar',
        data:{ labels, datasets:[{ label:'จำนวนขาย', data }] },
        options:{ plugins:{ legend:{ display:false } }, scales:{ x:{ ticks:{ color:textColor } }, y:{ ticks:{ color:textColor }, grid:{ color:'rgba(255,255,255,.06)' } } } }
      });
    }
  }catch(err){ console.warn('top5 error', err); }

  // Expense share
  try{
    const catMap = new Map();
    expenses.forEach(x=>{
      const k = (x.category || 'อื่น ๆ').toString();
      const v = Number(x.amount||0);
      catMap.set(k, (catMap.get(k)||0) + (isFinite(v)?v:0));
    });
    const labels = Array.from(catMap.keys());
    const data = Array.from(catMap.values());
    const ctx = document.getElementById('costPie');
    if(ctx && window.Chart){
      OV_CHARTS.costPie = ov_destroyChart(OV_CHARTS.costPie);
      OV_CHARTS.costPie = new Chart(ctx, {
        type:'doughnut',
        data:{ labels, datasets:[{ data }] },
        options:{ plugins:{ legend:{ labels:{ color:textColor } } } }
      });
    }
  }catch(err){ console.warn('pie error', err); }

  // Expense trend 14 days
  try{
    const lastN = ov_lastNDays(14);
    const map = Object.create(null);
    lastN.forEach(d=>map[d.key]=0);
    expenses.forEach(x=>{
      const k = String(x.date || '').slice(0,10);
      const v = Number(x.amount || 0);
      if(map[k] !== undefined && isFinite(v)) map[k] += v;
    });
    const labels = lastN.map(d=>d.label);
    const data = lastN.map(d=>map[d.key]);
    const ctx = document.getElementById('costTrend');
    if(ctx && window.Chart){
      OV_CHARTS.costTrend = ov_destroyChart(OV_CHARTS.costTrend);
      OV_CHARTS.costTrend = new Chart(ctx, {
        type:'line',
        data:{ labels, datasets:[{ label:'ค่าใช้จ่าย (฿)', data, tension:.35, borderWidth:2 }] },
        options:{ plugins:{ legend:{ display:false } }, scales:{ x:{ ticks:{ color:textColor } }, y:{ ticks:{ color:textColor }, grid:{ color:'rgba(255,255,255,.06)' } } } }
      });
    }
  }catch(err){ console.warn('cost trend error', err); }
}

// hook router
(function(){
  const _render = window.render;
  window.render = function(){
    _render();
    if((location.hash||'')==='#/overview') ov_reload();
  };
  window.addEventListener('load', ()=>{
    if((location.hash||'')==='#/overview') ov_reload();
  });
})();
