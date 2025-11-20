// assets/js/products.js
// =============================
// จัดการหน้า "สินค้า" ทั้งหมด
// - โหลดรายการสินค้าจาก Google Sheets
// - เปิด/ปิด Popup เพิ่มสินค้า + แก้ไขสินค้า
// - รองรับตัวเลือก 2 ชั้น (เช่น สี/ลาย + ไซส์)
// =============================

// ---------- Helper: Config & Fetch ----------
function prod_getConfig() {
  try {
    return JSON.parse(localStorage.getItem('hug_settings_v1') || '{}');
  } catch {
    return {};
  }
}

async function prod_fetchTable(table) {
  const cfg = prod_getConfig();
  if (!cfg.appsScriptUrl || !cfg.apiToken) {
    if (typeof showToast === 'function') {
      showToast('ยังไม่ได้ตั้งค่า Apps Script URL / Token', 'error');
    }
    return { ok: false, rows: [] };
  }

  const url = `${cfg.appsScriptUrl}?table=${encodeURIComponent(table)}&token=${encodeURIComponent(cfg.apiToken)}`;
  const res = await fetch(url);
  return res.json();
}

function prod_formatTHB(n) {
  const num = Number(n || 0);
  return '฿' + num.toLocaleString();
}

function prod_uid(prefix) {
  const t = Date.now().toString(36);
  return `${prefix || 'ID'}_${t}`;
}

async function prod_post(table, payload) {
  const cfg = prod_getConfig();
  const url = cfg.appsScriptUrl;
  const token = cfg.apiToken;
  if (!url || !token) {
    if (typeof showToast === 'function') showToast('ยังไม่ได้ตั้งค่า URL/Token', 'error');
    throw new Error('missing config');
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token, table, action: 'append', data: payload }),
  });
  return res.json();
}

async function prod_upsert(table, key, keyVal, payload) {
  const cfg = prod_getConfig();
  const url = cfg.appsScriptUrl;
  const token = cfg.apiToken;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token, table, action: 'upsert', key, keyVal, data: payload }),
  });
  return res.json();
}

async function prod_delete(table, key, keyVal) {
  const cfg = prod_getConfig();
  const url = cfg.appsScriptUrl;
  const token = cfg.apiToken;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token, table, action: 'delete', key, keyVal }),
  });
  return res.json();
}

// ---------- Helper: แปลง attributes -> summary text ----------
function prod_buildAttrSummary(rawAttr) {
  let attrs = '—';
  if (!rawAttr) return attrs;

  let a = {};
  try {
    if (typeof rawAttr === 'string') {
      a = JSON.parse(rawAttr || '{}');
    } else {
      a = rawAttr;
    }
  } catch {
    a = {};
  }

  // รองรับคีย์มาตรฐาน + คีย์อื่น ๆ
  const ordered = [];

  const color = a.color || a['สี'];
  const style = a.style || a['ลาย'] || a['ลายเสื้อ'] || a['สไตล์'];
  const size = a.size || a['ไซส์'] || a['ขนาด'];

  if (color) ordered.push(String(color));
  if (style) ordered.push(String(style));
  if (size) ordered.push(String(size));

  if (ordered.length) {
    attrs = ordered.join(' / ');
  } else {
    const fallback = [];
    Object.values(a).forEach((val) => {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        fallback.push(String(val));
      }
    });
    attrs = fallback.length ? fallback.join(' / ') : '—';
  }

  return attrs;
}

// ---------- โหลดรายการสินค้า (ตารางหลัก) ----------
async function loadProductsAll() {
  const body = document.getElementById('productsAllBody');
  if (!body) return;

  body.innerHTML = `<tr><td colspan="7">กำลังโหลดข้อมูล...</td></tr>`;

  try {
    const [variantsRes, productsRes] = await Promise.all([
      prod_fetchTable('ProductVariants'),
      prod_fetchTable('Products'),
    ]);

    if (!variantsRes.ok || !productsRes.ok) {
      body.innerHTML = `<tr><td colspan="7">ดึงข้อมูลไม่สำเร็จ</td></tr>`;
      if (typeof showToast === 'function') showToast('ดึงข้อมูลไม่สำเร็จ', 'error');
      return;
    }

    const productsById = {};
    (productsRes.rows || []).forEach((p) => {
      productsById[p.product_id] = p;
    });

    const rows = (variantsRes.rows || []).map((v) => {
      const p = productsById[v.product_id] || {};

      const attrsText = prod_buildAttrSummary(v.attributes);
      const qty = Number(v.quantity_on_hand || 0);
      const cost = p.cost_price ? Number(p.cost_price) : 0;
      const price = p.selling_price ? Number(p.selling_price) : 0;

      // เตรียม payload ให้ปุ่มแก้ไข
      let attrObj = {};
      try {
        if (typeof v.attributes === 'string') {
          attrObj = JSON.parse(v.attributes || '{}');
        } else {
          attrObj = v.attributes || {};
        }
      } catch {
        attrObj = {};
      }

      const editPayload = {
        variant_id: v.variant_id || '',
        product_id: v.product_id || '',
        sku_variant: v.sku_variant || '',
        name: p.name || '',
        cost_price: cost,
        selling_price: price,
        quantity_on_hand: qty,
        reorder_point: Number(v.reorder_point || 0),
        attributes: attrObj,
      };

      return `
        <tr>
          <td>${v.sku_variant || '—'}</td>
          <td>${p.name || '—'}</td>
          <td>${attrsText}</td>
          <td>${qty}</td>
          <td>${prod_formatTHB(cost)}</td>
          <td>${prod_formatTHB(price)}</td>
          <td>
            <button class="btn btn-ghost" data-edit='${encodeURIComponent(
              JSON.stringify(editPayload)
            )}'>แก้ไข</button>
            <button class="btn danger" data-del='${v.variant_id || ''}'>ลบ</button>
          </td>
        </tr>
      `;
    });

    body.innerHTML = rows.length
      ? rows.join('')
      : `<tr><td colspan="7">ยังไม่มีข้อมูลสินค้า</td></tr>`;

    if (typeof showToast === 'function') showToast('โหลดสินค้าสำเร็จ ✅', 'success');
  } catch (err) {
    console.error(err);
    body.innerHTML = `<tr><td colspan="7">เกิดข้อผิดพลาดในการโหลด</td></tr>`;
    if (typeof showToast === 'function') showToast('โหลดข้อมูลล้มเหลว (ดู Console)', 'error');
  }
}

// ---------- datalist สี (สำหรับ popup) ----------
async function prod_loadColorsDatalist() {
  const listEl = document.getElementById('colorList');
  if (!listEl) return;
  listEl.innerHTML = '';

  let options = [
    'ดำ',
    'ขาว',
    'เทา',
    'น้ำเงิน',
    'แดง',
    'เขียว',
    'เหลือง',
    'ชมพู',
    'ม่วง',
    'น้ำตาล',
    'ครีม',
  ];

  try {
    const res = await prod_fetchTable('Colors');
    if (res && res.ok && Array.isArray(res.rows) && res.rows.length) {
      const set = new Set();
      res.rows.forEach((r) => {
        const name = (r.color_name || r.name || r.Color || '')
          .toString()
          .trim();
        if (name) set.add(name);
      });
      if (set.size) options = Array.from(set);
    }
  } catch (e) {
    // ใช้ default ต่อไปถ้าดึงไม่ได้
  }

  options.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    listEl.appendChild(opt);
  });
}

// ---------- Popup: Utility เปิด/ปิด + reset ----------
function prod_openAddModal() {
  const modal = document.getElementById('addProductModal');
  const form = document.getElementById('addProductForm');
  if (!modal || !form) return;

  form.reset();
  const hid = document.getElementById('ap_product_id');
  if (hid) hid.value = '';

  modal.classList.add('show-modal');
  modal.setAttribute('aria-hidden', 'false');
}

function prod_closeAddModal() {
  const modal = document.getElementById('addProductModal');
  if (!modal) return;
  modal.classList.remove('show-modal');
  modal.setAttribute('aria-hidden', 'true');
}

function prod_openEditModal() {
  const modal = document.getElementById('editProductModal');
  if (!modal) return;
  modal.classList.add('show-modal');
  modal.setAttribute('aria-hidden', 'false');
}

function prod_closeEditModal() {
  const modal = document.getElementById('editProductModal');
  if (!modal) return;
  modal.classList.remove('show-modal');
  modal.setAttribute('aria-hidden', 'true');
}

// ---------- สร้าง attributes จากฟอร์ม (รองรับ 2 ตัวเลือก) ----------
function prod_buildAttributesFromAddForm() {
  const attrs = {};

  // โหมดใหม่: ตัวเลือก 2 ชั้น
  const opt1LabelEl = document.getElementById('ap_opt1_label');
  const opt1ValueEl = document.getElementById('ap_opt1_value');
  const opt2LabelEl = document.getElementById('ap_opt2_label');
  const opt2ValueEl = document.getElementById('ap_opt2_value');

  if (opt1LabelEl && opt1ValueEl) {
    const label1 = opt1LabelEl.value.trim();
    const value1 = opt1ValueEl.value.trim();
    if (label1 && value1) {
      attrs[label1] = value1;
      // map label มาตรฐาน -> key เฉพาะ
      if (label1 === 'สี') attrs.color = value1;
      if (label1 === 'ลายเสื้อ' || label1 === 'ลาย') attrs.style = value1;
    }
  }

  if (opt2LabelEl && opt2ValueEl) {
    const label2 = opt2LabelEl.value.trim();
    const value2 = opt2ValueEl.value.trim();
    if (label2 && value2) {
      attrs[label2] = value2;
      if (label2 === 'ไซส์' || label2 === 'ขนาด') attrs.size = value2;
    }
  }

  // โหมดเก่า: color / size / style ตรง ๆ (เผื่อ HTML เดิมยังอยู่)
  const colorEl = document.getElementById('ap_color');
  const sizeEl = document.getElementById('ap_size');
  const styleEl = document.getElementById('ap_style');

  if (colorEl && colorEl.value.trim()) attrs.color = colorEl.value.trim();
  if (sizeEl && sizeEl.value.trim()) attrs.size = sizeEl.value.trim();
  if (styleEl && styleEl.value.trim()) attrs.style = styleEl.value.trim();

  return attrs;
}

function prod_fillEditForm(data) {
  const form = document.getElementById('editProductForm');
  if (!form) return;

  const attr = data.attributes || {};

  // ฟิลด์หลัก
  const pidEl = document.getElementById('ep_product_id');
  const skuEl = document.getElementById('ep_sku_variant');
  const nameEl = document.getElementById('ep_name');
  const costEl = document.getElementById('ep_cost');
  const priceEl = document.getElementById('ep_price');
  const qtyEl = document.getElementById('ep_qty');
  const reorderEl = document.getElementById('ep_reorder');

  if (pidEl) pidEl.value = data.product_id || '';
  if (skuEl) skuEl.value = data.sku_variant || '';
  if (nameEl) nameEl.value = data.name || '';
  if (costEl) costEl.value = Number(data.cost_price || 0);
  if (priceEl) priceEl.value = Number(data.selling_price || 0);
  if (qtyEl) qtyEl.value = Number(data.quantity_on_hand || 0);
  if (reorderEl) reorderEl.value = Number(data.reorder_point || 0);

  // mapping attributes -> ฟิลด์แก้ไข
  const color = attr.color || attr['สี'] || '';
  const style = attr.style || attr['ลาย'] || attr['ลายเสื้อ'] || attr['สไตล์'] || '';
  const size = attr.size || attr['ไซส์'] || attr['ขนาด'] || '';

  const epColorEl = document.getElementById('ep_color');
  const epStyleEl = document.getElementById('ep_style');
  const epSizeEl = document.getElementById('ep_size');

  if (epColorEl) epColorEl.value = color;
  if (epStyleEl) epStyleEl.value = style;
  if (epSizeEl) epSizeEl.value = size;

  // เก็บ variant_id ไว้บน form
  form.dataset.variantId = data.variant_id || '';
}

// ---------- Init & Event Binding ----------
window.addEventListener('load', () => {
  // datalist for colors
  prod_loadColorsDatalist();

  // ปุ่มเปิด/ปิด Add Product popup
  const btnOpenAdd = document.getElementById('btnOpenAddProduct');
  const btnCloseAdd = document.getElementById('btnCloseAddProduct');
  const btnCancelAdd = document.getElementById('btnCancelAddProduct');
  const addModal = document.getElementById('addProductModal');

  if (btnOpenAdd) btnOpenAdd.addEventListener('click', prod_openAddModal);
  if (btnCloseAdd) btnCloseAdd.addEventListener('click', prod_closeAddModal);
  if (btnCancelAdd) btnCancelAdd.addEventListener('click', prod_closeAddModal);
  if (addModal) {
    addModal.addEventListener('click', (e) => {
      if (e.target === addModal) prod_closeAddModal();
    });
  }

  // Submit Add Product
  const addForm = document.getElementById('addProductForm');
  if (addForm) {
    addForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        let product_id = (document.getElementById('ap_product_id')?.value || '').trim();
        if (!product_id) product_id = prod_uid('PRD');

        const name = (document.getElementById('ap_name')?.value || '').trim();
        const cost = Number(document.getElementById('ap_cost')?.value || 0);
        const price = Number(document.getElementById('ap_price')?.value || 0);
        const sku_variant = (document.getElementById('ap_sku_variant')?.value || '').trim();
        const qty = Number(document.getElementById('ap_qty')?.value || 0);
        const reorder = Number(document.getElementById('ap_reorder')?.value || 0);

        if (!name || !sku_variant) {
          if (typeof showToast === 'function') showToast('กรุณากรอกชื่อสินค้าและ SKU', 'error');
          return;
        }

        const attributesObj = prod_buildAttributesFromAddForm();
        const attributes = JSON.stringify(attributesObj || {});

        // 1) Products
        await prod_post('Products', {
          product_id,
          sku_master: product_id,
          name,
          description: '',
          cost_price: cost,
          selling_price: price,
        });

        // 2) Variant
        const variant_id = prod_uid('VAR');
        await prod_post('ProductVariants', {
          variant_id,
          product_id,
          sku_variant,
          attributes,
          quantity_on_hand: qty,
          reorder_point: reorder,
        });

        if (typeof showToast === 'function') showToast('เพิ่มสินค้าเรียบร้อย ✅', 'success');
        prod_closeAddModal();
        if (typeof loadProductsAll === 'function') loadProductsAll();
      } catch (err) {
        console.error(err);
        if (typeof showToast === 'function') showToast('บันทึกไม่สำเร็จ (ดู Console)', 'error');
      }
    });
  }

  // ตาราง: ปุ่ม Edit / Delete
  const tbody = document.getElementById('productsAllBody');
  if (tbody) {
    tbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      // Edit
      if (btn.hasAttribute('data-edit')) {
        try {
          const raw = decodeURIComponent(btn.getAttribute('data-edit'));
          const data = JSON.parse(raw);
          prod_fillEditForm(data);
          prod_openEditModal();
        } catch (err) {
          console.error(err);
          if (typeof showToast === 'function') showToast('เปิดหน้าแก้ไขไม่ได้', 'error');
        }
        return;
      }

      // Delete
      if (btn.hasAttribute('data-del')) {
        const variantId = btn.getAttribute('data-del');
        if (!variantId) return;
        if (!confirm('ลบตัวแปรสินค้านี้หรือไม่?')) return;

        try {
          const delRes = await prod_delete('ProductVariants', 'variant_id', variantId);
          if (delRes && delRes.ok) {
            if (typeof showToast === 'function') showToast('ลบสำเร็จ ✅', 'success');
            if (typeof loadProductsAll === 'function') loadProductsAll();
          } else {
            const msg = (delRes && delRes.error) || 'ลบไม่สำเร็จ';
            if (typeof showToast === 'function') showToast(msg, 'error');
          }
        } catch (err) {
          console.error(err);
          if (typeof showToast === 'function') showToast('ลบไม่สำเร็จ (ดู Console)', 'error');
        }
      }
    });
  }

  // Edit Popup controls
  const btnCloseEdit = document.getElementById('btnCloseEditProduct');
  const btnCancelEdit = document.getElementById('btnCancelEditProduct');
  const editModal = document.getElementById('editProductModal');

  if (btnCloseEdit) btnCloseEdit.addEventListener('click', prod_closeEditModal);
  if (btnCancelEdit) btnCancelEdit.addEventListener('click', prod_closeEditModal);
  if (editModal) {
    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) prod_closeEditModal();
    });
  }

  const editForm = document.getElementById('editProductForm');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const product_id = (document.getElementById('ep_product_id')?.value || '').trim();
        const sku_variant = (document.getElementById('ep_sku_variant')?.value || '').trim();
        const name = (document.getElementById('ep_name')?.value || '').trim();
        const cost = Number(document.getElementById('ep_cost')?.value || 0);
        const price = Number(document.getElementById('ep_price')?.value || 0);
        const qty = Number(document.getElementById('ep_qty')?.value || 0);
        const reorder = Number(document.getElementById('ep_reorder')?.value || 0);

        const color = (document.getElementById('ep_color')?.value || '').trim();
        const style = (document.getElementById('ep_style')?.value || '').trim();
        const size = (document.getElementById('ep_size')?.value || '').trim();

        const variant_id = editForm.dataset.variantId || '';

        const attributesObj = {};
        if (color) attributesObj.color = color;
        if (style) attributesObj.style = style;
        if (size) attributesObj.size = size;
        const attributes = JSON.stringify(attributesObj || {});

        const r1 = await prod_upsert('Products', 'product_id', product_id, {
          product_id,
          sku_master: product_id,
          name,
          description: '',
          cost_price: cost,
          selling_price: price,
        });

        const r2 = await prod_upsert('ProductVariants', 'variant_id', variant_id, {
          variant_id,
          product_id,
          sku_variant,
          attributes,
          quantity_on_hand: qty,
          reorder_point: reorder,
        });

        if (r1 && r1.ok && r2 && r2.ok) {
          if (typeof showToast === 'function') showToast('อัปเดตสินค้าเรียบร้อย ✅', 'success');
          prod_closeEditModal();
          if (typeof loadProductsAll === 'function') loadProductsAll();
        } else {
          const msg =
            (r1 && !r1.ok && r1.error) ||
            (r2 && !r2.ok && r2.error) ||
            'บันทึกไม่สำเร็จ';
          if (typeof showToast === 'function') showToast(msg, 'error');
        }
      } catch (err) {
        console.error(err);
        if (typeof showToast === 'function') showToast('บันทึกไม่สำเร็จ (ดู Console)', 'error');
      }
    });
  }
});

// ---------- Hook router: เรียกโหลดทุกครั้งที่เข้า #/products/all ----------
(function hookProductsRoute() {
  const originalRender =
    typeof window.render === 'function' ? window.render : function () {};

  window.render = function () {
    originalRender();
    const hash = location.hash || '#/overview';
    if (hash === '#/products/all') {
      if (typeof loadProductsAll === 'function') loadProductsAll();
    }
  };
})();