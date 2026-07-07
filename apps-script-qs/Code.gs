/************************************************************
 * QS WEB APP – Hệ thống bóc tách khối lượng / báo giá (Decox)
 * ----------------------------------------------------------
 * Sheet dữ liệu (tự tạo nếu chưa có):
 *   1. "DANH SÁCH SẢN PHẨM" – danh mục gốc (đọc theo TÊN CỘT)
 *   2. "Dự án"              – mỗi dòng 1 dự án
 *   3. "Chi tiết báo giá"   – mỗi dòng 1 hạng mục, gắn Mã DA
 *
 * Tất cả trang trên web app làm việc theo 1 "dự án đang chọn" (Mã DA).
 ************************************************************/

/*** ===== CẤU HÌNH ===== ***/
const SPREADSHEET_ID = '1DDbw4W8v5UelNOQnxjWYJwzaQY7r2U7E44l_pwPlqRo';
const SHEET_PRODUCTS = 'DANH SÁCH SẢN PHẨM';
const SHEET_PROJECTS = 'Dự án';
const SHEET_LINES    = 'Chi tiết báo giá';

const PROJECT_HEADERS = [
  'Mã DA', 'Tên dự án', 'Khách hàng', 'Địa chỉ', 'SĐT',
  'Trạng thái', 'VAT (%)', 'Tiến độ (%)', 'Ghi chú', 'Ngày tạo', 'Cập nhật'
];

const LINE_HEADERS = [
  'Line ID', 'Mã DA', 'STT', 'Nhóm', 'Loại', 'Mã SP', 'Tên sản phẩm',
  'Thương hiệu', 'Mô tả', 'Kích thước', 'Hình ảnh', 'ĐVT', 'Số lượng',
  'Đơn giá vốn', '% Lợi nhuận', 'Đơn giá bán', 'Thành tiền vốn', 'Thành tiền bán'
];
// Vị trí cột (1-based) trong sheet Chi tiết báo giá
const LC = {
  lineId:1, maDA:2, stt:3, nhom:4, loai:5, maSP:6, ten:7, thuongHieu:8,
  moTa:9, kichThuoc:10, hinhAnh:11, dvt:12, soLuong:13, donGiaVon:14,
  lnPct:15, donGiaBan:16, thanhTienVon:17, thanhTienBan:18
};

/*** ===== ENTRY POINT ===== ***/
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('QS Decox – Bóc tách & Báo giá')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getSS_() {
  return SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

/*** ===== SETUP ===== ***/
function setup() {
  const ss = getSS_();
  ensureSheetWithHeaders_(ss, SHEET_PROJECTS, PROJECT_HEADERS);
  ensureSheetWithHeaders_(ss, SHEET_LINES, LINE_HEADERS);
  return 'OK: ' + SHEET_PROJECTS + ', ' + SHEET_LINES;
}

function ensureSheetWithHeaders_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#12324a').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

function getSheet_(name) {
  const ss = getSS_();
  var sh = ss.getSheetByName(name);
  const headers = name === SHEET_PROJECTS ? PROJECT_HEADERS
                : name === SHEET_LINES    ? LINE_HEADERS : null;
  if (!sh) {
    if (headers) sh = ensureSheetWithHeaders_(ss, name, headers);
    else throw new Error('Không tìm thấy sheet: ' + name);
  } else if (headers && sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers])
      .setFontWeight('bold').setBackground('#12324a').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

/*** ===== HELPER ĐỌC HEADER ===== ***/
function getHeaderMap_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return {};
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const map = {};
  headers.forEach(function (h, i) { map[normalize_(h)] = i; });
  return map;
}
function normalize_(s) {
  return String(s == null ? '' : s).toUpperCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/Đ/g, 'D').replace(/\s+/g, ' ').trim();
}
function findCol_(map, keywords) {
  for (var k = 0; k < keywords.length; k++) {
    const key = normalize_(keywords[k]);
    if (map.hasOwnProperty(key)) return map[key];
  }
  const keys = Object.keys(map);
  for (var i = 0; i < keywords.length; i++) {
    const kw = normalize_(keywords[i]);
    for (var j = 0; j < keys.length; j++) if (keys[j].indexOf(kw) !== -1) return map[keys[j]];
  }
  return -1;
}
function pick_(row, idx) { return (idx === -1 || idx == null) ? '' : row[idx]; }
function cleanText_(v) {
  if (v == null) return '';
  if (Object.prototype.toString.call(v) === '[object Date]')
    return Utilities.formatDate(v, 'GMT+7', 'dd/MM/yyyy');
  if (typeof v === 'object') return '';
  return String(v);
}
function toNumber_(v) {
  if (typeof v === 'number') return v;
  if (v == null || v === '') return 0;
  var s = String(v).replace(/[^\d,.-]/g, '');
  if (s.indexOf(',') > -1 && s.indexOf('.') > -1) s = s.replace(/\./g, '').replace(',', '.');
  else if ((s.match(/\./g) || []).length > 1) s = s.replace(/\./g, '');
  else if (/\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
  var n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function round0_(n) { return Math.round(Number(n) || 0); }

/*** ===== SẢN PHẨM ===== ***/
function getProducts() {
  const ss = getSS_();
  const sh = ss.getSheetByName(SHEET_PRODUCTS);
  if (!sh || sh.getLastRow() < 2) return [];
  const map = getHeaderMap_(sh);
  const col = {
    ma:        findCol_(map, ['MÃ SẢN PHẨM', 'MA SP', 'MÃ']),
    ten:       findCol_(map, ['TÊN SẢN PHẨM']),
    thuongHieu:findCol_(map, ['THƯƠNG HIỆU']),
    ncc:       findCol_(map, ['NHÀ CUNG CẤP']),
    sku:       findCol_(map, ['SKU']),
    hangMuc:   findCol_(map, ['HẠNG MỤC', 'LOẠI SẢN PHẨM', 'LOẠI']),
    moTa:      findCol_(map, ['MÔ TẢ']),
    kichThuoc: findCol_(map, ['KÍCH THƯỚC']),
    hinhAnh:   findCol_(map, ['HÌNH ẢNH', 'ẢNH']),
    link:      findCol_(map, ['LINK']),
    dvt:       findCol_(map, ['ĐVT', 'ĐƠN VỊ']),
    von:       findCol_(map, ['ĐƠN GIÁ GỐC', 'GIÁ GỐC', 'GIÁ VỐN']),
    ban:       findCol_(map, ['GIÁ BÁN LẺ', 'GIÁ BÁN', 'ĐƠN GIÁ'])
  };
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  const out = [];
  rows.forEach(function (r) {
    const ten = cleanText_(pick_(r, col.ten));
    const ma  = cleanText_(pick_(r, col.ma));
    if (!ten && !ma) return;
    const von = toNumber_(pick_(r, col.von));
    const ban = toNumber_(pick_(r, col.ban)) || von;
    const lnPct = von > 0 ? Math.round((ban - von) / von * 100) : 0;
    out.push({
      ma: ma, ten: ten,
      thuongHieu: cleanText_(pick_(r, col.thuongHieu)),
      ncc: cleanText_(pick_(r, col.ncc)),
      sku: cleanText_(pick_(r, col.sku)),
      hangMuc: cleanText_(pick_(r, col.hangMuc)),
      moTa: cleanText_(pick_(r, col.moTa)),
      kichThuoc: cleanText_(pick_(r, col.kichThuoc)),
      hinhAnh: cleanText_(pick_(r, col.hinhAnh)),
      link: cleanText_(pick_(r, col.link)),
      dvt: cleanText_(pick_(r, col.dvt)) || 'Cái',
      donGiaVon: von, donGiaBan: ban, lnPct: lnPct
    });
  });
  return out;
}

// Danh mục ít đổi -> cache 6 giờ để khỏi đọc lại toàn bộ sheet mỗi lần
function getProductsCached() {
  try {
    var cache = CacheService.getScriptCache();
    var hit = cache.get('qs_products');
    if (hit) return JSON.parse(hit);
    var data = getProducts();
    cache.put('qs_products', JSON.stringify(data), 21600);
    return data;
  } catch (e) { return getProducts(); }
}
function clearProductsCache() {
  try { CacheService.getScriptCache().remove('qs_products'); } catch (e) {}
  return 'Đã xoá cache danh mục';
}

// Gộp mọi thứ cần khi mở app vào 1 lần gọi
function bootstrap(maDA) {
  return {
    projects: getProjects(),
    products: getProductsCached(),
    lines: maDA ? getLines(maDA) : []
  };
}

/*** ===== DỰ ÁN ===== ***/
function rowToProject_(r) {
  return {
    maDA: cleanText_(r[0]), ten: cleanText_(r[1]), khachHang: cleanText_(r[2]),
    diaChi: cleanText_(r[3]), sdt: cleanText_(r[4]), trangThai: cleanText_(r[5]) || 'Bản nháp',
    vat: toNumber_(r[6]), tienDo: toNumber_(r[7]), ghiChu: cleanText_(r[8]),
    ngayTao: cleanText_(r[9]), capNhat: cleanText_(r[10])
  };
}
function getProjects() {
  const sh = getSheet_(SHEET_PROJECTS);
  if (sh.getLastRow() < 2) return [];
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, PROJECT_HEADERS.length).getValues();
  return values.filter(function (r) { return r[0]; })
               .map(rowToProject_).reverse();
}
function getProject(maDA) {
  return getProjects().filter(function (p) { return p.maDA === maDA; })[0] || null;
}
function createProject(data) {
  const sh = getSheet_(SHEET_PROJECTS);
  const maDA = 'DA' + Utilities.formatDate(new Date(), 'GMT+7', 'yyMMdd-HHmmss');
  const now  = Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm');
  sh.appendRow([
    maDA, data.ten || 'Dự án mới', data.khachHang || '', data.diaChi || '',
    data.sdt || '', data.trangThai || 'Bản nháp', Number(data.vat) || 0,
    Number(data.tienDo) || 0, data.ghiChu || '', now, now
  ]);
  return getProject(maDA);
}
function updateProject(maDA, data) {
  const sh = getSheet_(SHEET_PROJECTS);
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, PROJECT_HEADERS.length).getValues();
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] === maDA) {
      const row = i + 2;
      const now = Utilities.formatDate(new Date(), 'GMT+7', 'dd/MM/yyyy HH:mm');
      const map = { ten:2, khachHang:3, diaChi:4, sdt:5, trangThai:6, vat:7, tienDo:8, ghiChu:9 };
      Object.keys(map).forEach(function (k) {
        if (data.hasOwnProperty(k)) sh.getRange(row, map[k]).setValue(
          (k === 'vat' || k === 'tienDo') ? Number(data[k]) || 0 : data[k]);
      });
      sh.getRange(row, 11).setValue(now);
      break;
    }
  }
  return getProject(maDA);
}
function deleteProject(maDA) {
  deleteRowsWhere_(getSheet_(SHEET_PROJECTS), 0, maDA);
  deleteRowsWhere_(getSheet_(SHEET_LINES), 1, maDA);
  return getProjects();
}

/*** ===== DÒNG BÁO GIÁ / HẠNG MỤC ===== ***/
function rowToLine_(r) {
  return {
    lineId: r[0], maDA: r[1], stt: r[2], nhom: cleanText_(r[3]), loai: cleanText_(r[4]),
    maSP: cleanText_(r[5]), ten: cleanText_(r[6]), thuongHieu: cleanText_(r[7]),
    moTa: cleanText_(r[8]), kichThuoc: cleanText_(r[9]), hinhAnh: cleanText_(r[10]),
    dvt: cleanText_(r[11]), soLuong: toNumber_(r[12]), donGiaVon: toNumber_(r[13]),
    lnPct: toNumber_(r[14]), donGiaBan: toNumber_(r[15]),
    thanhTienVon: toNumber_(r[16]), thanhTienBan: toNumber_(r[17])
  };
}
function getLines(maDA) {
  const sh = getSheet_(SHEET_LINES);
  if (sh.getLastRow() < 2) return [];
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, LINE_HEADERS.length).getValues();
  const out = [];
  values.forEach(function (r) { if (r[1] === maDA) out.push(rowToLine_(r)); });
  return out;
}
function addLine(maDA, product, soLuong) {
  const sh = getSheet_(SHEET_LINES);
  const sl  = Number(soLuong) || 1;
  const von = toNumber_(product.donGiaVon);
  var   ban = toNumber_(product.donGiaBan) || von;
  var   ln  = von > 0 ? Math.round((ban - von) / von * 100) : (Number(product.lnPct) || 0);
  const stt = getLines(maDA).length + 1;
  sh.appendRow([
    Utilities.getUuid(), maDA, stt, product.nhom || product.hangMuc || '', product.loai || '',
    product.ma || '', product.ten || '', product.thuongHieu || '', product.moTa || '',
    product.kichThuoc || '', product.hinhAnh || product.link || '', product.dvt || 'Cái',
    sl, von, ln, ban, sl * von, sl * ban
  ]);
  return getLines(maDA);
}
function addBlankLine(maDA) {
  return addLine(maDA, { ten: 'Hạng mục mới', dvt: 'Cái', donGiaVon: 0, donGiaBan: 0 }, 0);
}
// fields: object có thể chứa nhom, loai, ten, moTa, dvt, soLuong, donGiaVon, lnPct, donGiaBan
function updateLine(lineId, fields) {
  const sh = getSheet_(SHEET_LINES);
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, LINE_HEADERS.length).getValues();
  var maDA = '';
  for (var i = 0; i < values.length; i++) {
    if (values[i][0] !== lineId) continue;
    const row = i + 2;
    const cur = rowToLine_(values[i]);
    maDA = cur.maDA;

    // text fields
    const tmap = { nhom:LC.nhom, loai:LC.loai, ten:LC.ten, moTa:LC.moTa, dvt:LC.dvt };
    Object.keys(tmap).forEach(function (k) {
      if (fields.hasOwnProperty(k)) sh.getRange(row, tmap[k]).setValue(fields[k]);
    });

    // số liệu + tự tính
    var sl  = fields.hasOwnProperty('soLuong')   ? Number(fields.soLuong)   || 0 : cur.soLuong;
    var von = fields.hasOwnProperty('donGiaVon') ? toNumber_(fields.donGiaVon)   : cur.donGiaVon;
    var ln  = fields.hasOwnProperty('lnPct')     ? Number(fields.lnPct)     || 0 : cur.lnPct;
    var ban;
    if (fields.hasOwnProperty('donGiaBan')) {
      ban = toNumber_(fields.donGiaBan);
      ln  = von > 0 ? Math.round((ban - von) / von * 100) : 0;   // sửa giá bán -> tính lại % LN
    } else {
      ban = round0_(von * (1 + ln / 100));                        // sửa vốn/%LN -> tính giá bán
    }
    sh.getRange(row, LC.soLuong, 1, 6)
      .setValues([[sl, von, ln, ban, round0_(sl * von), round0_(sl * ban)]]);
    break;
  }
  return getLines(maDA);
}
function deleteLine(lineId) {
  const sh = getSheet_(SHEET_LINES);
  if (sh.getLastRow() < 2) return [];
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, LINE_HEADERS.length).getValues();
  var maDA = '';
  for (var i = values.length - 1; i >= 0; i--) {
    if (values[i][0] === lineId) { maDA = values[i][1]; sh.deleteRow(i + 2); break; }
  }
  return getLines(maDA);
}

/*** ===== TỔNG HỢP / DASHBOARD ===== ***/
function getDashboard(maDA) {
  const project = getProject(maDA);
  const lines = getLines(maDA);
  var von = 0, ban = 0, kl = 0;
  const groups = {};
  lines.forEach(function (l) {
    von += l.thanhTienVon; ban += l.thanhTienBan; kl += l.soLuong;
    const key = l.nhom || 'Khác';
    if (!groups[key]) groups[key] = { nhom: key, von: 0, ban: 0, ln: 0, count: 0 };
    groups[key].von += l.thanhTienVon;
    groups[key].ban += l.thanhTienBan;
    groups[key].ln  += (l.thanhTienBan - l.thanhTienVon);
    groups[key].count++;
  });
  const byGroup = Object.keys(groups).map(function (k) { return groups[k]; })
    .sort(function (a, b) { return b.ban - a.ban; });
  const loiNhuan = ban - von;
  return {
    project: project,
    tongHangMuc: lines.length,
    tongKhoiLuong: kl,
    giaTriVon: von,
    tongGiaBan: ban,
    loiNhuan: loiNhuan,
    bienLN: ban > 0 ? loiNhuan / ban * 100 : 0,
    byGroup: byGroup
  };
}

function getQuote(maDA) {
  const project = getProject(maDA);
  const lines = getLines(maDA);
  var subtotal = 0;
  lines.forEach(function (l) { subtotal += l.thanhTienBan; });
  const vatPct = project ? Number(project.vat) || 0 : 0;
  const vat = round0_(subtotal * vatPct / 100);
  return { project: project, lines: lines, subtotal: subtotal, vatPct: vatPct, vat: vat, total: subtotal + vat };
}

/*** ===== XUẤT BÁO GIÁ (Excel / PDF) ===== ***/
// cols: [{key,label,num}], format: 'xlsx' | 'pdf'
function exportBaoGia(maDA, cols, format) {
  format = (format === 'pdf') ? 'pdf' : 'xlsx';
  const q = getQuote(maDA);
  const p = q.project || {};
  const ncol = cols.length;

  const ss = SpreadsheetApp.create('BAOGIA_' + (maDA || 'DA'));
  const sh = ss.getActiveSheet();
  sh.setName('Báo giá');

  var r = 1;
  sh.getRange(r, 1, 1, ncol).merge();
  sh.getRange(r, 1).setValue('CÔNG TY THIẾT KẾ & THI CÔNG DECOX').setFontWeight('bold').setFontSize(13); r++;
  sh.getRange(r, 1, 1, ncol).merge();
  sh.getRange(r, 1).setValue('BÁO GIÁ').setFontWeight('bold').setFontSize(16).setHorizontalAlignment('center'); r++;
  sh.getRange(r, 1, 1, ncol).merge();
  sh.getRange(r, 1).setValue('Dự án: ' + (p.ten || '')); r++;
  sh.getRange(r, 1, 1, ncol).merge();
  sh.getRange(r, 1).setValue('Khách hàng: ' + (p.khachHang || '') + '     Địa chỉ: ' + (p.diaChi || '')); r++;
  r++; // dòng trống

  const headerRow = r;
  sh.getRange(r, 1, 1, ncol).setValues([cols.map(function (c) { return c.label; })])
    .setFontWeight('bold').setBackground('#12324a').setFontColor('#ffffff')
    .setHorizontalAlignment('center'); r++;

  const data = q.lines.map(function (l, i) {
    return cols.map(function (c) {
      if (c.key === 'stt') return i + 1;
      if (c.key === 'hinhAnh') return '';
      if (c.key === 'soLuong') return l.soLuong;
      if (c.key === 'donGiaBan') return l.donGiaBan;
      if (c.key === 'thanhTienBan') return l.thanhTienBan;
      return l[c.key] || '';
    });
  });
  if (data.length) { sh.getRange(r, 1, data.length, ncol).setValues(data); r += data.length; }

  cols.forEach(function (c, ci) {
    if (c.num) sh.getRange(headerRow + 1, ci + 1, Math.max(data.length, 1), 1).setNumberFormat('#,##0');
  });

  // dòng tổng: canh vào cột "Thành tiền" nếu có, không thì cột cuối
  var ttCol = ncol;
  cols.forEach(function (c, ci) { if (c.key === 'thanhTienBan') ttCol = ci + 1; });
  const labelCol = Math.max(1, ttCol - 1);
  function totalRow(label, val) {
    sh.getRange(r, labelCol).setValue(label).setFontWeight('bold').setHorizontalAlignment('right');
    sh.getRange(r, ttCol).setValue(val).setNumberFormat('#,##0').setFontWeight('bold'); r++;
  }
  totalRow('Tạm tính', q.subtotal);
  totalRow('VAT ' + q.vatPct + '%', q.vat);
  totalRow('TỔNG CỘNG', q.total);

  sh.getRange(headerRow, 1, r - headerRow, ncol).setBorder(true, true, true, true, true, true);
  for (var ci = 1; ci <= ncol; ci++) sh.autoResizeColumn(ci);
  SpreadsheetApp.flush();

  const id = ss.getId();
  const params = format === 'pdf'
    ? '&size=A4&portrait=true&fitw=true&gridlines=false&sheetnames=false&printtitle=false&pagenumbers=false&fzr=false&top_margin=0.5&bottom_margin=0.5&left_margin=0.4&right_margin=0.4'
    : '';
  const url = 'https://docs.google.com/spreadsheets/d/' + id + '/export?format=' + format + params;
  const resp = UrlFetchApp.fetch(url, {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  });
  const blob = resp.getBlob();
  const safe = (p.ten || maDA || 'BaoGia').toString().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w\-]+/g, '_');
  const out = { name: 'BaoGia_' + safe + '.' + format, mimeType: blob.getContentType(), base64: Utilities.base64Encode(blob.getBytes()) };
  try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {}
  return out;
}

// Chạy 1 lần trong trình soạn thảo để cấp thêm quyền xuất file (Drive + tải mạng)
function authorizeExport() {
  const s = SpreadsheetApp.create('__auth_check__');
  UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json',
    { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  DriveApp.getFileById(s.getId()).setTrashed(true);
  return 'Đã cấp quyền xuất file';
}

/*** ===== TIỆN ÍCH ===== ***/
function deleteRowsWhere_(sheet, colIdx, value) {
  if (sheet.getLastRow() < 2) return;
  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  for (var i = data.length - 1; i >= 0; i--) if (data[i][colIdx] === value) sheet.deleteRow(i + 2);
}
