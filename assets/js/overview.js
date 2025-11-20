// products.js — เพิ่มสินค้า + popup + generate variants

(function(){
  console.log('products.js loaded');

  const MODAL = {
    backdrop: null,
    dialog: null,
    open(){
      this.backdrop?.classList.add('show');
    },
    close(){
      this.backdrop?.classList.remove('show');
    }
  };

  function initModal(){
    MODAL.backdrop = document.getElementById('product-modal');
    if(!MODAL.backdrop) return;

    MODAL.dialog = MODAL.backdrop.querySelector('.modal');

    MODAL.backdrop.addEventListener('click', e=>{
      if(e.target === MODAL.backdrop) MODAL.close();
    });

    const closes = MODAL.backdrop.querySelectorAll('[data-modal-close]');
    closes.forEach(btn=> btn.addEventListener('click', ()=>MODAL.close()));
  }

  function parseValues(str){
    return String(str||'')
      .split(',')
      .map(s=>s.trim())
      .filter(s=>s.length>0);
  }

  function genVariants(opts1, opts2){
    const rows = [];
    for(const a of opts1){
      for(const b of opts2){
        rows.push({ attr1:a, attr2:b, sku:'', price:'', stock:'' });
      }
    }
    return rows;
  }

  function renderVariantRows(list){
    const tbody = document.getElementById('variants-table').querySelector('tbody');
    if(!tbody) return;

    if(!list || list.length===0){
      tbody.innerHTML = `<tr><td colspan="5" class="table-empty">ยังไม่มีตัวเลือก</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(v=>`
      <tr>
        <td>${v.attr1}</td>
        <td>${v.attr2}</td>
        <td><input class="input" data-field="sku" placeholder="SKU"></td>
        <td><input class="input" data-field="price" placeholder="0"></td>
        <td><input class="input" data-field="stock" placeholder="0"></td>
      </tr>
    `).join('');
  }

  function collectVariantData(){
    const tbody = document.getElementById('variants-table').querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    return rows.map(tr=>{
      const tds = tr.querySelectorAll('td');
      return {
        attr1: tds[0].textContent.trim(),
        attr2: tds[1].textContent.trim(),
        sku: tds[2].querySelector('input')?.value.trim() || '',
        price: Number(tds[3].querySelector('input')?.value||0),
        stock: Number(tds[4].querySelector('input')?.value||0)
      };
    });
  }

  async function saveProduct(){
    const name = document.getElementById('p-name')?.value.trim()||'';
    const sku = document.getElementById('p-sku')?.value.trim()||'';
    const brand = document.getElementById('p-brand')?.value.trim()||'';
    const category = document.getElementById('p-category')?.value.trim()||'';
    const note = document.getElementById('p-note')?.value.trim()||'';

    if(!name){ alert('กรุณากรอกชื่อสินค้า'); return; }

    const variants = collectVariantData();

    const body = {
      action: 'addProduct',
      name, sku, brand, category, note,
      variants
    };

    try{
      const cfg = JSON.parse(localStorage.getItem('hug_settings_v1')||'{}');
      if(!cfg.appsScriptUrl || !cfg.apiToken){ alert('ยังไม่ได้ตั้งค่า Apps Script'); return; }

      const res = await fetch(cfg.appsScriptUrl,{
        method:'POST',
        headers:{ 'Content-Type':'text/plain;charset=utf-8' },
        body: JSON.stringify({ token: cfg.apiToken, ...body })
      });
      const json = await res.json();

      if(json && json.ok){
        alert('บันทึกสำเร็จ');
        MODAL.close();
      }else{
        alert('บันทึกล้มเหลว');
      }
    }catch(err){
      console.error(err);
      alert('เกิดข้อผิดพลาดในการส่งข้อมูล');
    }
  }

  function initEvents(){
    const btnAdd = document.getElementById('pd-btn-add-product');
    if(btnAdd) btnAdd.addEventListener('click', ()=> MODAL.open());

    const btnGen = document.getElementById('btn-generate-variants');
    if(btnGen){
      btnGen.addEventListener('click', ()=>{
        const opt1 = parseValues(document.getElementById('opt1-values')?.value||'');
        const opt2 = parseValues(document.getElementById('opt2-values')?.value||'');
        const list = genVariants(opt1, opt2);
        renderVariantRows(list);
      });
    }

    const btnSave = document.getElementById('btn-save-product');
    if(btnSave) btnSave.addEventListener('click', saveProduct);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    initModal();
    initEvents();
  });
})();
