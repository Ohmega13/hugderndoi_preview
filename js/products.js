// products.js
// โมดูลจัดการฝั่งสินค้า / ตัวแปรสินค้า (ผูกกับ Google Sheets: Products, ProductVariants)
//
// หมายเหตุ:
// - ใช้ค่า config จาก localStorage.hug_settings_v1 (ตั้งค่าจากหน้า Settings)
//   { appsScriptUrl, apiToken, ... }
// - ดึงข้อมูลจากชีต Products + ProductVariants แล้วรวมมาแสดงในตาราง #productsAllBody
// - ยังไม่ทำฟังก์ชันเพิ่ม/แก้ไข/ลบ แบบเต็ม (รอแบบฟอร์มหน้า UI ใหม่)
//   ตอนนี้เน้นให้ "โหลดข้อมูลสินค้า" ใช้งานได้ก่อน

(function () {
  console.log('products.js loaded');

  const LS_KEY = 'hug_settings_v1';

  // ---------- Helper: config + toast ----------

  function getSettings() {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    } catch (e) {
      console.warn('cannot parse settings from localStorage', e);
      return {};
    }
  }

  function hasConfig() {
    const cfg = getSettings();
    return !!(cfg.appsScriptUrl && cfg.apiToken);
  }

  function getApiBase() {
    const cfg = getSettings();
    return { url: cfg.appsScriptUrl || '', token: cfg.apiToken || '' };
  }

  function notify(msg, type = 'success') {
    // ถ้า base.js หรือไฟล์อื่นมี showToast ให้ใช้ก่อน
    if (typeof window.showToast === 'function') {
      window.showToast(msg, type);
    } else {
      // fallback กันเงียบ
      if (type === 'error') {
        console.error(msg);
      } else {
        console.log(msg);
      }
    }
  }

  // ---------- Helper: เรียก Apps Script (GET / POST) ----------

  async function gsFetchTable(tableName) {
    if (!hasConfig()) {
      notify('ยังไม่ได้ตั้งค่า Apps Script URL / Token', 'error');
      return { ok: false, rows: [] };
    }
    const { url, token } = getApiBase();
    const endpoint =
      url +
      '?table=' +
      encodeURIComponent(tableName) +
      '&token=' +
      encodeURIComponent(token);

    try {
      const res = await fetch(endpoint, { method: 'GET' });
      const json = await res.json();
      if (!json || json.ok !== true) {
        console.warn('gsFetchTable not ok', json);
        return { ok: false, rows: [] };
      }
      return json;
    } catch (err) {
      console.error('gsFetchTable error', err);
      notify('โหลดข้อมูลจาก Google Sheets ไม่สำเร็จ', 'error');
      return { ok: false, rows: [] };
    }
  }

  // (เผื่อใช้ภายหลัง) generic POST ไป Apps Script
  async function gsPost(body) {
    if (!hasConfig()) {
      notify('ยังไม่ได้ตั้งค่า Apps Script URL / Token', 'error');
      throw new Error('missing config');
    }
    const { url, token } = getApiBase();
    const payload = Object.assign({}, body, { token });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        // ใช้ text/plain ลดโอกาสโดน preflight (OPTIONS) 405 จาก Apps Script
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });
    return res.json();
  }

  // ---------- Helper: แปลงตัวเลข / เงิน ----------

  function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function formatTHB(n) {
    const num = toNumber(n, 0);
    return '฿' + num.toLocaleString();
  }

  // ---------- Renderer: productsAll ตารางสินค้า +ตัวแปร ----------

  async function loadProductsAll() {
    const body = document.getElementById('productsAllBody');
    if (!body) {
      // ไม่มีตารางใน DOM ก็ไม่ต้องทำอะไร (กัน error ตอนยังไม่เข้า view สินค้า)
      return;
    }

    body.innerHTML = `<tr><td colspan="7">กำลังโหลดข้อมูล...</td></tr>`;

    // ดึง Products + ProductVariants จากชีต
    const [prodRes, varRes] = await Promise.all([
      gsFetchTable('Products'),
      gsFetchTable('ProductVariants'),
    ]);

    if (!prodRes.ok || !Array.isArray(prodRes.rows)) {
      body.innerHTML =
        `<tr><td colspan="7">ดึงข้อมูล Products ไม่สำเร็จ</td></tr>`;
      return;
    }
    if (!varRes.ok || !Array.isArray(varRes.rows)) {
      body.innerHTML =
        `<tr><td colspan="7">ดึงข้อมูล ProductVariants ไม่สำเร็จ</td></tr>`;
      return;
    }

    const productsById = new Map();
    (prodRes.rows || []).forEach((p) => {
      const id =
        p.product_id ||
        p.ProductID ||
        p.id ||
        p.ID; // กันกรณีหัวคอลัมน์ตั้งไม่เหมือนกัน
      if (!id) return;
      productsById.set(String(id), p);
    });

    const rows = (varRes.rows || []).map((v) => {
      const productId =
        v.product_id ||
        v.ProductID ||
        v.product ||
        ''; // ชื่อ key ที่เป็นไปได้
      const pidKey = String(productId || '');
      const p = productsById.get(pidKey) || {};

      const productName = p.name || p.product_name || '—';

      const opt1 =
        v.opt1_value ||
        v.option1_value ||
        v.opt1 ||
        '';
      const opt2 =
        v.opt2_value ||
        v.option2_value ||
        v.opt2 ||
        '';

      let attrs = '—';
      if (opt1 && opt2) {
        attrs = `${opt1} / ${opt2}`;
      } else if (opt1 || opt2) {
        attrs = opt1 || opt2;
      }

      const sku = v.sku || v.sku_variant || '—';
      const stock = toNumber(v.stock ?? v.quantity_on_hand, 0);
      const price = toNumber(v.price ?? v.selling_price, 0);

      return `
        <tr>
          <td>${sku}</td>
          <td>${productName}</td>
          <td>${attrs}</td>
          <td>${stock}</td>
          <td>${formatTHB(price)}</td>
          <td>
            <!-- ปุ่มเหล่านี้จะ wire event ภายหลังตอนทำฟังก์ชันแก้ไข/ลบ -->
            <button class="btn" data-action="edit-variant" data-variant-id="${(v.variant_id || v.VariantID || '')}">แก้ไข</button>
            <button class="btn danger" data-action="delete-variant" data-variant-id="${(v.variant_id || v.VariantID || '')}">ลบ</button>
          </td>
        </tr>
      `;
    });

    body.innerHTML = rows.length
      ? rows.join('')
      : `<tr><td colspan="7">ไม่มีข้อมูลสินค้า</td></tr>`;
  }

  // ---------- Hook กับ Router / hashchange ----------

  function handleRouteChange() {
    const hash = window.location.hash || '#/overview';
    if (hash === '#/products/all') {
      loadProductsAll();
    }
  }

  // รองรับ router แบบ broadcast event (ถ้าจะใช้ในอนาคต)
  window.addEventListener('hug:route:changed', (evt) => {
    const hash = evt && evt.detail && evt.detail.hash;
    if (hash === '#/products/all') {
      loadProductsAll();
    }
  });

  window.addEventListener('hashchange', handleRouteChange);
  window.addEventListener('DOMContentLoaded', () => {
    // ถ้าเปิดหน้ามาแล้ว hash อยู่ที่ products/all ให้โหลดเลย
    handleRouteChange();
  });

  // เผื่อ debug จาก console: window.HDG_PRODUCTS.reload()
  window.HDG_PRODUCTS = Object.assign(window.HDG_PRODUCTS || {}, {
    reload: loadProductsAll,
  });
})();
