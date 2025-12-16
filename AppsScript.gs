/**
 * ---------- CONFIG ----------
 */
const TABLE_SCHEMAS = {
  products: [
    'sku', 'product_name', 'brand', 'color', 'size', 'category',
    'quantity', 'unit', 'cost_price', 'unit_price', 'status', 'updated_at'
  ],
  orders: [
    'order_id', 'customer_name', 'customer_phone', 'address',
    'sku', 'product_name', 'quantity', 'shipping_fee', 'status',
    'carrier', 'tracking', 'note', 'created_at', 'updated_at'
  ],
  customers: [
    'customer_id', 'name', 'phone', 'email', 'address',
    'note', 'last_order_at', 'created_at', 'updated_at'
  ],
  dropdowns: ['group', 'value', 'emoji', 'created_at'],
  settings: ['key', 'value', 'updated_at']
};

/**
 * ใช้เรียกครั้งเดียวเพื่อสร้าง/ตรวจสอบแท็บและหัวตาราง
 */
function setupSheets() {
  const ss = SpreadsheetApp.getActive();
  Object.entries(TABLE_SCHEMAS).forEach(([tableName, headers]) => {
    let sheet = ss.getSheetByName(tableName);
    if (!sheet) sheet = ss.insertSheet(tableName);
    const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    const alreadyHasHeaders = headers.every((header, index) => firstRow[index] === header);
    if (!alreadyHasHeaders) {
      sheet.clear();
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
    }
  });
}

/**
 * ---------- UTIL ----------
 */
function getSheet(table) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(table);
  if (!sheet) throw new Error(`ไม่พบตาราง ${table}`);
  return sheet;
}

function mapRows(sheet, schema) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  return values.slice(1).map(row => {
    const obj = {};
    schema.forEach((key, idx) => obj[key] = row[idx] ?? '');
    return obj;
  });
}

function upsertRow(sheet, schema, payload, idField) {
  const values = sheet.getDataRange().getValues();
  let targetRow = -1;
  if (idField && payload[idField]) {
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === payload[idField]) {
        targetRow = i + 1;
        break;
      }
    }
  }
  const rowValues = schema.map(key => payload[key] ?? '');
  if (targetRow > 0) {
    sheet.getRange(targetRow, 1, 1, schema.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
    targetRow = sheet.getLastRow();
  }
  return sheet.getRange(targetRow, 1, 1, schema.length).getValues()[0];
}

function deleteRow(sheet, idValue) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === idValue) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function jsonResponse(payload, statusCode = 200) {
  const response = ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);

  // Add CORS headers
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

function doOptions(e) {
  return ContentService
    .createTextOutput()
    .setMimeType(ContentService.MimeType.TEXT)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-control-allow-methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

/**
 * ---------- API ----------
 */
function doGet(e) {
  try {
    const table = e.parameter.table;
    const action = e.parameter.action || 'list';
    const schema = TABLE_SCHEMAS[table];
    if (!schema) throw new Error('ไม่รู้จักตาราง');
    const sheet = getSheet(table);

    if (action === 'list') {
      return jsonResponse({ ok: true, data: mapRows(sheet, schema) });
    }

    if (action === 'get') {
      const id = e.parameter.id;
      const rows = mapRows(sheet, schema);
      const found = rows.find(row => row[schema[0]] === id);
      return jsonResponse({ ok: true, data: found || null });
    }

    return jsonResponse({ ok: false, message: 'action ไม่ถูกต้อง' }, 400);
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message }, 500);
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || '{}');

    if (payload.action === 'testConnection') {
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheetName = ss.getName();
        return jsonResponse({ ok: true, message: `เชื่อมต่อสำเร็จกับ "${sheetName}"` });
      } catch (error) {
        return jsonResponse({ ok: false, message: `เชื่อมต่อไม่สำเร็จ: ${error.message}` }, 500);
      }
    }

    const table = e.parameter.table;
    const action = e.parameter.action || 'save';
    const schema = TABLE_SCHEMAS[table];
    if (!schema) throw new Error('ไม่รู้จักตาราง');
    const sheet = getSheet(table);
    const idField = schema[0];

    if (action === 'save') {
      payload.updated_at = new Date().toISOString();
      const row = upsertRow(sheet, schema, payload, idField);
      return jsonResponse({ ok: true, data: row });
    }

    if (action === 'delete') {
      const id = e.parameter.id || payload[idField];
      if (!id) throw new Error('ต้องระบุ id');
      const deleted = deleteRow(sheet, id);
      return jsonResponse({ ok: deleted, message: deleted ? 'ลบแล้ว' : 'ไม่พบข้อมูล' });
    }

    return jsonResponse({ ok: false, message: 'action ไม่ถูกต้อง' }, 400);
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message }, 500);
  }
}
