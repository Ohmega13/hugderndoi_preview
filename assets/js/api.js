// api.js — util สำหรับ config + Toast + wrapper เรียก Apps Script

window.HUG_LS_KEY = 'hug_settings_v1';

window.hugGetConfig = function(){
  try{ return JSON.parse(localStorage.getItem(window.HUG_LS_KEY) || '{}'); }
  catch(e){ console.warn('parse cfg error', e); return {}; }
};

window.hugSaveConfig = function(cfg){
  localStorage.setItem(window.HUG_LS_KEY, JSON.stringify(cfg || {}));
};

window.showToast = function(msg, type='success'){
  const t = document.getElementById('toast');
  if(!t) return;
  t.textContent = msg;
  t.className = 'toast ' + (type==='success' ? 'success' : 'error') + ' show';
  t.style.display = 'block';
  setTimeout(()=>{
    t.classList.remove('show');
    setTimeout(()=>{ t.style.display='none'; },180);
  },1800);
};

window.hugFetchTable = async function(table){
  const cfg = window.hugGetConfig();
  if(!cfg.appsScriptUrl || !cfg.apiToken){
    window.showToast && window.showToast('ยังไม่ได้ตั้งค่า Apps Script URL / Token','error');
    return { ok:false, rows:[] };
  }
  const url = `${cfg.appsScriptUrl}?table=${encodeURIComponent(table)}&token=${encodeURIComponent(cfg.apiToken)}`;
  const res = await fetch(url);
  return res.json();
};

window.hugPostTable = async function(table, payload, action='append', extra){
  const cfg = window.hugGetConfig();
  if(!cfg.appsScriptUrl || !cfg.apiToken){
    window.showToast && window.showToast('ยังไม่ได้ตั้งค่า Apps Script URL / Token','error');
    throw new Error('missing config');
  }
  const body = Object.assign({
    token: cfg.apiToken,
    table,
    action,
    data: payload
  }, extra || {});
  const res = await fetch(cfg.appsScriptUrl, {
    method:'POST',
    headers:{ 'Content-Type':'text/plain;charset=utf-8' },
    body: JSON.stringify(body)
  });
  return res.json();
};
