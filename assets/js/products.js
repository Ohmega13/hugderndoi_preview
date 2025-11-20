// assets/js/products.js
// จัดการหน้าสินค้าทั้งหมด + popup เพิ่ม/แก้ไขสินค้า (UI อย่างเดียว ยังไม่ยิง Google Sheet)

let pdState = {
  products: [],   // รายการสินค้า (ตอนนี้ยัง dummy)
  variants: [],
  isEditing: false,
  editingId: null
};

function $(id) {
  return document.getElementById(id);
}

// ---------- Modal ----------
function pdOpenModal(mode = 'create', product = null) {
  const overlay = $('pd-modal');
  if (!overlay) return;

  pdState.isEditing = mode === 'edit';
  pdState.editingId = product ? product.id : null;

  const titleEl = $('pd-modal-title');
  if (titleEl) {
    titleEl.textContent = mode === 'edit' ? 'แก้ไขสินค้า' : 'เพิ่มสินค้า';
  }

  $('pd-name').value = product?.name || '';
  $('pd-sku').value = product?.sku || '';
  $('pd-barcode').value = product?.barcode || '';
  $('pd-category').value = product?.category || '';
  $('pd-note').value = product?.note || '';

  $('pd-attr1-name').value = product?.attr1Name || 'สี';
  $('pd-attr1-values').value = product?.attr1Values || '';
  $('pd-attr2-name').value = product?.attr2Name || 'ไซซ์';
  $('pd-attr2-values').value = product?.attr2Values || '';

  // ล้างตัวแปรเก่า
  pdState.variants = [];
  const tbody = $('pd-variant-tbody');
  if (tbody) tbody.innerHTML = '';
  const countEl = $('pd-variant-count');
  if (countEl) countEl.textContent = '0';

  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
}

function pdCloseModal() {
  const overlay = $('pd-modal');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
}

// ---------- Generate variants ----------
function pdGenerateVariants() {
  const attr1Name = $('pd-attr1-name').value.trim() || 'ตัวเลือก 1';
  const attr2Name = $('pd-attr2-name').value.trim() || 'ตัวเลือก 2';

  const attr1Values = $('pd-attr1-values').value
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  const attr2Values = $('pd-attr2-values').value
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);

  const tbody = $('pd-variant-tbody');
  const countEl = $('pd-variant-count');
  if (!tbody || !countEl) return;

  tbody.innerHTML = '';
  pdState.variants = [];

  if (!attr1Values.length && !attr2Values.length) {
    countEl.textContent = '0';
    return;
  }

  let variants = [];

  if (attr1Values.length && attr2Values.length) {
    attr1Values.forEach(v1 => {
      attr2Values.forEach(v2 => {
        variants.push({ v1, v2 });
      });
    });
  } else if (attr1Values.length) {
    attr1Values.forEach(v1 => variants.push({ v1, v2: '' }));
  } else {
    attr2Values.forEach(v2 => variants.push({ v1: '', v2 }));
  }

  variants.forEach((v, index) => {
    const tr = document.createElement('tr');

    const td1 = document.createElement('td');
    td1.textContent = v.v1 || '-';

    const td2 = document.createElement('td');
    td2.textContent = v.v2 || '-';

    const tdSku = document.createElement('td');
    const inpSku = document.createElement('input');
    inpSku.className = 'input input-sm';
    inpSku.placeholder = 'SKU ย่อย';
    tdSku.appendChild(inpSku);

    const tdPrice = document.createElement('td');
    const inpPrice = document.createElement('input');
    inpPrice.className = 'input input-sm';
    inpPrice.type = 'number';
    inpPrice.min = '0';
    inpPrice.placeholder = '0.00';
    tdPrice.appendChild(inpPrice);

    const tdStock = document.createElement('td');
    const inpStock = document.createElement('input');
    inpStock.className = 'input input-sm';
    inpStock.type = 'number';
    inpStock.min = '0';
    inpStock.placeholder = '0';
    tdStock.appendChild(inpStock);

    const tdBarcode = document.createElement('td');
    const inpBarcode = document.createElement('input');
    inpBarcode.className = 'input input-sm';
    inpBarcode.placeholder = 'บาร์โค้ด';
    tdBarcode.appendChild(inpBarcode);

    tr.appendChild(td1);
    tr.appendChild(td2);
    tr.appendChild(tdSku);
    tr.appendChild(tdPrice);
    tr.appendChild(tdStock);
    tr.appendChild(tdBarcode);

    tbody.appendChild(tr);

    pdState.variants.push({
      index,
      v1: v.v1,
      v2: v.v2,
      skuInput: inpSku,
      priceInput: inpPrice,
      stockInput: inpStock,
      barcodeInput: inpBarcode
    });
  });

  countEl.textContent = String(variants.length);
}

// ---------- Save (ตอนนี้ demo แค่ console.log) ----------
function pdSaveProduct() {
  const name = $('pd-name').value.trim();
  const sku = $('pd-sku').value.trim();
  const barcode = $('pd-barcode').value.trim();
  const category = $('pd-category').value.trim();
  const note = $('pd-note').value.trim();

  if (!name) {
    alert('กรุณากรอกชื่อสินค้า');
    return;
  }

  const data = {
    mode: pdState.isEditing ? 'edit' : 'create',
    id: pdState.editingId,
    name,
    sku,
    barcode,
    category,
    note,
    attr1Name: $('pd-attr1-name').value.trim(),
    attr1Values: $('pd-attr1-values').value.trim(),
    attr2Name: $('pd-attr2-name').value.trim(),
    attr2Values: $('pd-attr2-values').value.trim(),
    variants: pdState.variants.map(v => ({
      option1: v.v1,
      option2: v.v2,
      sku: v.skuInput.value.trim(),
      price: parseFloat(v.priceInput.value || '0'),
      stock: parseInt(v.stockInput.value || '0', 10),
      barcode: v.barcodeInput.value.trim()
    }))
  };

  console.log('pdSaveProduct payload', data);
  alert('ตัวอย่าง: เตรียมส่งข้อมูลไป Google Sheets (ดูใน Console)');
  pdCloseModal();
}

// ---------- Render ตารางสินค้า (ตอนนี้ dummy) ----------
function pdRenderTable() {
  const tbody = $('pd-tbody');
  const summary = $('pd-summary');
  if (!tbody || !summary) return;

  tbody.innerHTML = '';

  if (!pdState.products.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 9;
    td.className = 'table-empty';
    td.textContent = 'ยังไม่มีรายการสินค้า';
    tr.appendChild(td);
    tbody.appendChild(tr);
    summary.textContent = 'รวม 0 รายการ • สต็อกคงเหลือ 0 ชิ้น';
    return;
  }

  let totalStock = 0;

  pdState.products.forEach(p => {
    const tr = document.createElement('tr');

    const tdImg = document.createElement('td');
    tdImg.innerHTML = '<div class="thumb thumb-sm"></div>';

    const tdName = document.createElement('td');
    tdName.innerHTML = `
      <div class="table-main-text">${p.name}</div>
      <div class="table-sub-text">SKU: ${p.sku || '-'}</div>
    `;

    const tdOptions = document.createElement('td');
    tdOptions.textContent = p.options || '-';

    const tdPrice = document.createElement('td');
    tdPrice.textContent = p.price ? `฿${p.price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-';

    const tdStock = document.createElement('td');
    tdStock.textContent = typeof p.stock === 'number' ? p.stock : '-';

    const tdSold = document.createElement('td');
    tdSold.textContent = typeof p.sold === 'number' ? p.sold : '-';

    const tdCat = document.createElement('td');
    tdCat.textContent = p.category || '-';

    const tdStatus = document.createElement('td');
    tdStatus.innerHTML = `<span class="badge ${p.status === 'active' ? 'b-green' : 'b-muted'}">
      ${p.status === 'active' ? 'เปิดขาย' : 'ฉบับร่าง'}
    </span>`;

    const tdActions = document.createElement('td');
    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn btn-xs ghost';
    btnEdit.textContent = 'แก้ไข';
    btnEdit.addEventListener('click', () => pdOpenModal('edit', p));
    tdActions.appendChild(btnEdit);

    tr.appendChild(tdImg);
    tr.appendChild(tdName);
    tr.appendChild(tdOptions);
    tr.appendChild(tdPrice);
    tr.appendChild(tdStock);
    tr.appendChild(tdSold);
    tr.appendChild(tdCat);
    tr.appendChild(tdStatus);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);

    if (typeof p.stock === 'number') totalStock += p.stock;
  });

  summary.textContent = `รวม ${pdState.products.length} รายการ • สต็อกคงเหลือ ${totalStock} ชิ้น`;
}

// ---------- Init ----------
function initProductsView() {
  console.log('products.js loaded');

  const btnAdd = $('pd-btn-add-product');
  const btnReload = $('pd-btn-reload');
  const overlay = $('pd-modal');
  const btnClose = $('pd-modal-close');
  const btnCancel = $('pd-modal-cancel');
  const btnSave = $('pd-modal-save');
  const btnGen = $('pd-generate-variants');

  if (btnAdd) btnAdd.addEventListener('click', () => pdOpenModal('create'));
  if (btnReload) btnReload.addEventListener('click', () => {
    pdState.products = [
      {
        id: 'P001',
        name: 'เสื้อยืดลาย HUGDERNDOI',
        sku: 'TS-001',
        price: 199,
        stock: 25,
        sold: 10,
        category: 'เสื้อยืด',
        status: 'active',
        options: 'สี x ไซซ์'
      }
    ];
    pdRenderTable();
  });

  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) pdCloseModal();
    });
  }
  if (btnClose) btnClose.addEventListener('click', pdCloseModal);
  if (btnCancel) btnCancel.addEventListener('click', pdCloseModal);
  if (btnSave) btnSave.addEventListener('click', pdSaveProduct);
  if (btnGen) btnGen.addEventListener('click', (e) => {
    e.preventDefault();
    pdGenerateVariants();
  });

  pdRenderTable();
}

window.initProductsView = initProductsView;