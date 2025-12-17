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
  damaged: [
    'damage_id', 'sku', 'product_name', 'quantity', 'unit',
    'damage_reason', 'cost_price', 'unit_price', 'created_at', 'updated_at'
  ],
  dropdowns: ['group', 'value', 'emoji', 'created_at'],
  settings: ['key', 'value', 'updated_at']
};

/**
 * ใช้เรียกครั้งเดียวเพื่อสร้าง/ตรวจสอบแท็บและหัวตาราง
 */
function ensureSheet(tableName) {
  const ss = SpreadsheetApp.getActive();
  const headers = TABLE_SCHEMAS[tableName];
  if (!headers) throw new Error(`ไม่รู้จักตาราง ${tableName}`);

  let sheet = ss.getSheetByName(tableName);
  if (!sheet) {
    sheet = ss.insertSheet(tableName);
  }

  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const alreadyHasHeaders = headers.every((header, index) => firstRow[index] === header);
  if (!alreadyHasHeaders) {
    sheet.clear();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
  }
  return sheet;
}

function setupSheets() {
  Object.keys(TABLE_SCHEMAS).forEach(tableName => ensureSheet(tableName));
}

/**
 * ---------- UTIL ----------
 */
function getSheet(table) {
  return ensureSheet(table);
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
  const idFieldIndex = idField ? schema.indexOf(idField) : -1;
  if (idField && payload[idField]) {
    for (let i = 1; i < values.length; i++) {
      if (values[i][idFieldIndex] == payload[idField]) {
        targetRow = i + 1;
        break;
      }
    }
  }

  if (targetRow > 0) {
    // Update existing row only with payload data
    const range = sheet.getRange(targetRow, 1, 1, schema.length);
    const existingValues = range.getValues()[0];
    const newValues = existingValues.map((val, index) => {
      const key = schema[index];
      return payload.hasOwnProperty(key) ? payload[key] : val;
    });
    range.setValues([newValues]);
  } else {
    const rowValues = schema.map(key => payload[key] ?? '');
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

/**
 * ---------- API ----------
 */
function doGet(e) {
  let responseData;
  try {
    const table = e.parameter.table;
    const action = e.parameter.action || 'list';
    const schema = TABLE_SCHEMAS[table];
    if (!schema) throw new Error('ไม่รู้จักตาราง');
    const sheet = getSheet(table);

    if (action === 'list') {
      responseData = { ok: true, data: mapRows(sheet, schema) };
    } else if (action === 'get') {
      const id = e.parameter.id;
      const rows = mapRows(sheet, schema);
      const found = rows.find(row => row[schema[0]] === id);
      responseData = { ok: true, data: found || null };
    } else {
      responseData = { ok: false, message: 'action ไม่ถูกต้อง' };
    }
  } catch (error) {
    responseData = { ok: false, message: error.message };
  }
  
  var output = ContentService.createTextOutput(JSON.stringify(responseData));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function doPost(e) {
  let responseData;
  try {
    const payload = JSON.parse(e.postData.contents || '{}');

    if (payload.action === 'testConnection') {
      try {
        const ss = SpreadsheetApp.getActiveSpreadsheet();
        const sheetName = ss.getName();
        responseData = { ok: true, message: `เชื่อมต่อสำเร็จกับ "${sheetName}"` };
      } catch (error) {
        responseData = { ok: false, message: `เชื่อมต่อไม่สำเร็จ: ${error.message}` };
      }
      return ContentService.createTextOutput(JSON.stringify(responseData))
          .setMimeType(ContentService.MimeType.JSON);
    }

    const table = e.parameter.table || payload.table;
    const action = payload.action || 'save';
    const schema = TABLE_SCHEMAS[table];
    if (!schema) throw new Error('ไม่รู้จักตาราง');
    const sheet = getSheet(table);    
    let idField = schema[0];

    // Special handling for stock updates to use 'sku' as the key
    if (table === 'products' && payload.sku) {
      idField = 'sku';
    }

    if (action === 'save') {
      payload.updated_at = new Date().toISOString();
      // If it is a new entry (no ID) and schema has 'created_at', set it.
      if (!payload[idField] && schema.includes('created_at')) {
        payload.created_at = payload.updated_at;
      }
      const row = upsertRow(sheet, schema, payload, idField);
      const savedData = {};
      schema.forEach((key, index) => {
        savedData[key] = row[index];
      });
      responseData = { ok: true, data: savedData };
    } else if (action === 'delete') {
      const id = payload.id || e.parameter.id || payload[idField];
      if (!id) throw new Error('ต้องระบุ id');
      const deleted = deleteRow(sheet, id);
      responseData = { ok: deleted, message: deleted ? 'ลบแล้ว' : 'ไม่พบข้อมูล' };
    } else {
      responseData = { ok: false, message: 'action ไม่ถูกต้อง' };
    }
  } catch (error) {
    responseData = { ok: false, message: `[doPost Error] ${error.message}` };
  }
  
  var output = ContentService.createTextOutput(JSON.stringify(responseData));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
