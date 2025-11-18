// settings.js — load/save settings + test connection
const LS_KEY = 'hug_settings_v1';
function s_get(id){return document.getElementById(id);}

function loadSettings(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return;
    const cfg = JSON.parse(raw);
    if(cfg.backendMode) s_get('backendMode').value = cfg.backendMode;
    if(cfg.spreadsheetId) s_get('spreadsheetId').value = cfg.spreadsheetId;
    if(cfg.appsScriptUrl) s_get('appsScriptUrl').value = cfg.appsScriptUrl;
    if(cfg.apiKey) s_get('apiKey').value = cfg.apiKey;
    if(cfg.apiToken) s_get('apiToken').value = cfg.apiToken;
    if(cfg.sheetMap) s_get('sheetMap').value = typeof cfg.sheetMap==='string' ? cfg.sheetMap : JSON.stringify(cfg.sheetMap);
    if(cfg.settingsNote) s_get('settingsNote').value = cfg.settingsNote;
  }catch(e){console.warn('loadSettings error', e);}
}
function saveSettings(){
  const cfg = {
    backendMode: s_get('backendMode').value,
    spreadsheetId: s_get('spreadsheetId').value.trim(),
    appsScriptUrl: s_get('appsScriptUrl').value.trim(),
    apiKey: s_get('apiKey').value.trim(),
    apiToken: s_get('apiToken').value.trim(),
    sheetMap: s_get('sheetMap').value.trim(),
    settingsNote: s_get('settingsNote').value.trim()
  };
  localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  window.showToast && window.showToast('บันทึกการตั้งค่าแล้ว ✅','success');
}
async function testConnection(){
  const url = s_get('appsScriptUrl').value.trim();
  const token = s_get('apiToken').value.trim();
  if(!url || !token){
    window.showToast && window.showToast('กรุณาใส่ Apps Script URL และ Token ให้ครบ','error');
    return;
  }
  const testUrl = `${url}?table=Settings&token=${encodeURIComponent(token)}`;
  try{
    const res = await fetch(testUrl,{method:'GET'});
    const js = await res.json();
    if(js && js.ok){
      window.showToast && window.showToast('เชื่อมต่อสำเร็จ 🎉','success');
    }else{
      window.showToast && window.showToast('เชื่อมต่อไม่ได้: '+(js && js.error ? js.error : 'unknown'),'error');
    }
  }catch(err){
    console.error(err);
    window.showToast && window.showToast('เชื่อมต่อไม่ได้: '+err.message,'error');
  }
}
window.addEventListener('load', ()=>{
  loadSettings();
  const btnSave = s_get('btnSaveSettings');
  const btnTest = s_get('btnTestConn');
  if(btnSave) btnSave.addEventListener('click', saveSettings);
  if(btnTest) btnTest.addEventListener('click', testConnection);
});
