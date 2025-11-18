// assets/js/products.js
// Logic สินค้า: โหลดรายการสินค้าจาก Google Sheets + Modal เพิ่ม/แก้ไขสินค้า

// ===== Config & Helper สำหรับฝั่ง Products =====
function getCfgProd() {
  try {
    return JSON.parse(localStorage.getItem('hug_settings_v1') || '{}');
  } catch {
    return {};
  }
}

async function fetchTableProd(table) {
  const cfg = getCfgProd();
  if (!cfg.appsScriptUrl || !cfg.apiToken) {
    if (typeof showToast === 'function') {
      showToast('ยังไม่ได้ตั้งค่า Apps Script URL / Token', 'error');
    }
    return { ok: false, rows: [] };
  }
  const url = `${cfg.appsScriptUrl}?table=${encodeURIComponent(
    table
  )}&token=${encodeURIComponent(cfg.apiToken)}`;
  const res = await fetch(url);
  return res.json();
}

function formatCurrencyTHB(n) {
  const num = Number(n || 0);
  return '฿' + num.toLocaleString();
}

// ===== โหลดรายการสินค้า (หน้า Products > สินค้าทั้งหมด) =====
async function loadProductsAll() {
  const body = document.getElementById('productsAllBody');
  if (!body) return;
  body.innerHTML = `<tr><td colspan="7">กำลังโหลดข้อมูล...</td></tr>`;

  try {
    const [variantsRes, productsRes] = await Promise.all([
      fetchTableProd('ProductVariants'),
      fetchTableProd('Products'),
    ]);

    if (!variantsRes.ok || !productsRes.ok) {
      body.innerHTML = `<tr><td colspan="7">ดึงข้อมูลไม่สำเร็จ</td></tr>`;
      if (typeof showToast === 'function')
        showToast('ดึงข้อมูลไม่สำเร็จ', 'error');
      return;
    }

    const productsById = {};
    (productsRes.rows || []).forEach((p) => {
      productsById[p.product_id] = p;
    });

    const rows = (variantsRes.rows || []).map((v) => {
      const p = productsById[v.product_id] || {};
      let attrs = '—';
      let a = {};
      try {
        a =
          typeof v.attributes === 'string'
            ? JSON.parse(v.attributes || '{}')
            : v.attributes || {};
        const ordered = [];
        const color = a.color || a['สี'];
        const size = a.size || a['ไซส์'];
        const style = a.style || a['สไตล์'];
        if (color) ordered.push(String(color));
        if (size) ordered.push(String(size));
        if (style) ordered.push(String(style));
        if (!ordered.length) {
          const fallback = [];
          Object.values(a).forEach((val) => {
            if (
              val !== undefined &&
              val !== null &&
              String(val).trim() !== ''
            )
              fallback.push(String(val));
          });
          attrs = fallback.length ? fallback.join(' / ') : '—';
        } else {
          attrs = ordered.join(' / ');
        }
      } catch {
        a = {};
      }

      const qty = v.quantity_on_hand || 0;
      const cost = p.cost_price ? Number(p.cost_price) : 0;
      const price = p.selling_price ? Number(p.selling_price) : 0;

      // เก็บข้อมูลไว้ใน data-edit สำหรับเปิด Edit Modal
      const editPayload = {
        variant_id: v.variant_id || '',
        product_id: v.product_id || '',
        sku_variant: v.sku_variant || '',
        name: p.name || '',
        cost_price: cost,
        selling_price: price,
        color: (a && (a.color || a['สี'])) || '',
        size: (a && (a.size || a['ไซส์'])) || '',
        style: (a && (a.style || a['สไตล์'])) || '',
        quantity_on_hand: Number(v.quantity_on_hand || 0),
        reorder_point: Number(v.reorder_point || 0),
      };

      return `
        <tr>
          <td>${v.sku_variant || '—'}</td>
          <td>${p.name || '—'}</td>
          <td>${attrs}</td>
          <td>${qty}</td>
          <td>${formatCurrencyTHB(cost)}</td>
          <td>${formatCurrencyTHB(price)}</td>
          <td>
            <button class="btn" data-edit='${encodeURIComponent(
              JSON.stringify(editPayload)
            )}'>แก้ไข</button>
            <button class="btn danger" data-del='${v.variant_id || ''}'>ลบ</button>
          </td>
        </tr>
      `;
    });

    body.innerHTML = rows.length
      ? rows.join('')
      : `<tr><td colspan="7">ไม่มีข้อมูล</td></tr>`;

    if (typeof showToast === 'function')
      showToast('โหลดสินค้าสำเร็จ ✅', 'success');
  } catch (err) {
    console.error(err);
    body.innerHTML = `<tr><td colspan="7">เกิดข้อผิดพลาดในการโหลด</td></tr>`;
    if (typeof showToast === 'function')
      showToast('โหลดข้อมูลล้มเหลว (ดู Console)', 'error');
  }
}

// ===== โหลดรายการสีใส่ datalist สำหรับ Add/Edit Product =====
async function ap_loadColors() {
  const listEl = document.getElementById('colorList');
  if (!listEl) return;
  listEl.innerHTML = '';

  // default color list
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
    const res = await fetchTableProd('Colors');
    if (res && res.ok && Array.isArray(res.rows) && res.rows.length) {
      const set = new Set();
      res.rows.forEach((r) => {
        const name = (
          r.color_name ||
          r.name ||
          r.Color ||
          ''
        )
          .toString()
          .trim();
        if (name) set.add(name);
      });
      if (set.size) options = Array.from(set);
    }
  } catch (e) {
    // ถ้า error ก็ใช้ default list ไป
  }

  options.forEach((c) => {
    const opt = document.createElement('option');
    opt.value = c;
    listEl.appendChild(opt);
  });
}

// ===== Add / Edit Product — POST/UPSERT ไป Google Sheets =====
function ap_getCfg() {
  try {
    return JSON.parse(localStorage.getItem('hug_settings_v1') || '{}');
  } catch {
    return {};
  }
}

function ap_open() {
  const m = document.getElementById('addProductModal');
  if (!m) return;
  m.classList.add('show-modal');
  m.setAttribute('aria-hidden', 'false');
}

function ap_close() {
  const m = document.getElementById('addProductModal');
  if (!m) return;
  m.classList.remove('show-modal');
  m.setAttribute('aria-hidden', 'true');
}

function ap_uid(prefix = 'PRD') {
  const t = Date.now().toString(36);
  return `${prefix}_${t}`;
}

async function ap_post(table, payload) {
  const cfg = ap_getCfg();
  const url = cfg.appsScriptUrl;
  const token = cfg.apiToken;
  if (!url || !token) {
    if (typeof showToast === 'function')
      showToast('ยังไม่ได้ตั้งค่า URL/Token', 'error');
    throw new Error('missing config');
  }
  // ใช้ text/plain เพื่อลดปัญหา CORS preflight กับ Apps Script
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token, table, action: 'append', data: payload }),
  });
  return res.json();
}

// NOTE: ต้องให้ Apps Script รองรับ action: 'upsert' และ 'delete'
async function ap_upsert(table, key, keyVal, payload) {
  const cfg = ap_getCfg();
  const url = cfg.appsScriptUrl;
  const token = cfg.apiToken;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token, table, action: 'upsert', key, keyVal, data: payload }),
  });
  return res.json();
}

async function ap_delete(table, key, keyVal) {
  const cfg = ap_getCfg();
  const url = cfg.appsScriptUrl;
  const token = cfg.apiToken;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token, table, action: 'delete', key, keyVal }),
  });
  return res.json();
}

// ===== Binding Event หน้าสินค้า (Add Product / Edit Product) =====
window.addEventListener('load', () => {
  ap_loadColors();

  const btnOpen = document.getElementById('btnOpenAddProduct');
  const btnClose = document.getElementById('btnCloseAddProduct');
  const btnCancel = document.getElementById('btnCancelAddProduct');
  const modal = document.getElementById('addProductModal');

  if (btnOpen) btnOpen.addEventListener('click', ap_open);
  if (btnClose) btnClose.addEventListener('click', ap_close);
  if (btnCancel) btnCancel.addEventListener('click', ap_close);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) ap_close();
    });
  }

  const form = document.getElementById('addProductForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        // เก็บค่าจากฟอร์ม
        let product_id = document
          .getElementById('ap_product_id')
          .value.trim();
        if (!product_id) product_id = ap_uid('PRD');

        const name = document.getElementById('ap_name').value.trim();
        const cost = Number(document.getElementById('ap_cost').value || 0);
        const price = Number(document.getElementById('ap_price').value || 0);
        const sku_variant = document
          .getElementById('ap_sku_variant')
          .value.trim();
        const qty = Number(document.getElementById('ap_qty').value || 0);
        const color = document.getElementById('ap_color').value.trim();
        const size = document.getElementById('ap_size').value.trim();
        const style = document.getElementById('ap_style').value.trim();
        const reorder = Number(
          document.getElementById('ap_reorder').value || 0
        );

        if (!name || !sku_variant) {
          if (typeof showToast === 'function')
            showToast('กรุณากรอกชื่อสินค้าและ SKU', 'error');
          return;
        }

        const attrObj = {};
        if (color) attrObj.color = color;
        if (size) attrObj.size = size;
        if (style) attrObj.style = style;

        // 1) เพิ่ม/บันทึก Product row (Products sheet)
        await ap_post('Products', {
          product_id,
          sku_master: product_id,
          name,
          description: '',
          cost_price: cost,
          selling_price: price,
        });

        // 2) เพิ่ม Variant row (ProductVariants sheet)
        const attributes = JSON.stringify(attrObj);
        const variant_id = ap_uid('VAR');

        await ap_post('ProductVariants', {
          variant_id,
          product_id,
          sku_variant,
          attributes,
          quantity_on_hand: qty,
          reorder_point: reorder,
        });

        if (typeof showToast === 'function')
          showToast('เพิ่มสินค้าเรียบร้อย ✅', 'success');
        ap_close();
        if (typeof loadProductsAll === 'function') loadProductsAll();
      } catch (err) {
        console.error(err);
        if (typeof showToast === 'function')
          showToast('บันทึกไม่สำเร็จ (ดู Console)', 'error');
      }
    });
  }

  // ===== Edit / Delete wiring =====
  const tbody = document.getElementById('productsAllBody');

  function ep_open() {
    const m = document.getElementById('editProductModal');
    if (!m) return;
    m.classList.add('show-modal');
    m.setAttribute('aria-hidden', 'false');
  }

  function ep_close() {
    const m = document.getElementById('editProductModal');
    if (!m) return;
    m.classList.remove('show-modal');
    m.setAttribute('aria-hidden', 'true');
  }

  function fillEditForm(data) {
    document.getElementById('ep_product_id').value = data.product_id || '';
    document.getElementById('ep_sku_variant').value =
      data.sku_variant || '';
    document.getElementById('ep_name').value = data.name || '';
    document.getElementById('ep_cost').value = Number(
      data.cost_price || 0
    );
    document.getElementById('ep_price').value = Number(
      data.selling_price || 0
    );
    document.getElementById('ep_qty').value = Number(
      data.quantity_on_hand || 0
    );
    document.getElementById('ep_color').value = data.color || '';
    document.getElementById('ep_size').value = data.size || '';
    document.getElementById('ep_style').value = data.style || '';
    document.getElementById('ep_reorder').value = Number(
      data.reorder_point || 0
    );

    const form = document.getElementById('editProductForm');
    form.dataset.variantId = data.variant_id || '';
  }

  if (tbody) {
    tbody.addEventListener('click', async (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;

      // Edit
      if (btn.hasAttribute('data-edit')) {
        try {
          const raw = decodeURIComponent(btn.getAttribute('data-edit'));
          const data = JSON.parse(raw);
          fillEditForm(data);
          ep_open();
        } catch (err) {
          console.error(err);
          if (typeof showToast === 'function')
            showToast('เปิดหน้าแก้ไขไม่ได้', 'error');
        }
        return;
      }

      // Delete
      if (btn.hasAttribute('data-del')) {
        const variantId = btn.getAttribute('data-del');
        if (!variantId) return;
        if (!confirm('ลบตัวแปรสินค้านี้หรือไม่?')) return;
        try {
          const delRes = await ap_delete(
            'ProductVariants',
            'variant_id',
            variantId
          );
          if (delRes && delRes.ok) {
            if (typeof showToast === 'function')
              showToast('ลบสำเร็จ ✅', 'success');
            if (typeof loadProductsAll === 'function') loadProductsAll();
          } else {
            const msg =
              (delRes && delRes.error) || 'ลบไม่สำเร็จ';
            if (typeof showToast === 'function')
              showToast(msg, 'error');
          }
        } catch (err) {
          console.error(err);
          if (typeof showToast === 'function')
            showToast('ลบไม่สำเร็จ (ดู Console)', 'error');
        }
      }
    });
  }

  // Edit modal events
  const epClose = document.getElementById('btnCloseEditProduct');
  const epCancel = document.getElementById('btnCancelEditProduct');
  const epModal = document.getElementById('editProductModal');

  if (epClose) epClose.addEventListener('click', ep_close);
  if (epCancel) epCancel.addEventListener('click', ep_close);
  if (epModal) {
    epModal.addEventListener('click', (e) => {
      if (e.target === epModal) ep_close();
    });
  }

  const epForm = document.getElementById('editProductForm');
  if (epForm) {
    epForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const product_id = document
          .getElementById('ep_product_id')
          .value.trim();
        const sku_variant = document
          .getElementById('ep_sku_variant')
          .value.trim();
        const name = document.getElementById('ep_name').value.trim();
        const cost = Number(document.getElementById('ep_cost').value || 0);
        const price = Number(
          document.getElementById('ep_price').value || 0
        );
        const qty = Number(document.getElementById('ep_qty').value || 0);
        const color = document.getElementById('ep_color').value.trim();
        const size = document.getElementById('ep_size').value.trim();
        const style = document.getElementById('ep_style').value.trim();
        const reorder = Number(
          document.getElementById('ep_reorder').value || 0
        );
        const variant_id = epForm.dataset.variantId || '';

        const attributes = JSON.stringify({ color, size, style });

        // upsert Products
        const r1 = await ap_upsert('Products', 'product_id', product_id, {
          product_id,
          sku_master: product_id,
          name,
          description: '',
          cost_price: cost,
          selling_price: price,
        });

        // upsert ProductVariants
        const r2 = await ap_upsert(
          'ProductVariants',
          'variant_id',
          variant_id,
          {
            variant_id,
            product_id,
            sku_variant,
            attributes,
            quantity_on_hand: qty,
            reorder_point: reorder,
          }
        );

        if (r1 && r1.ok && r2 && r2.ok) {
          if (typeof showToast === 'function')
            showToast('อัปเดตสินค้าเรียบร้อย ✅', 'success');
          ep_close();
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
        if (typeof showToast === 'function')
          showToast('บันทึกไม่สำเร็จ (ดู Console)', 'error');
      }
    });
  }
});

// ===== hook router: เวลาเข้า #/products/all ให้โหลดสินค้าทุกครั้ง =====
(function hookProductsRoute() {
  const _render = window.render;
  window.render = function () {
    _render();
    const hash = location.hash || '#/overview';
    if (hash === '#/products/all') {
      if (typeof loadProductsAll === 'function') loadProductsAll();
    }
  };
})();