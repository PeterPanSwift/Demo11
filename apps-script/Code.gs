/**
 * 課後問卷 → Google 試算表
 *
 * 在試算表中選「擴充功能 → Apps Script」，把這個檔案的內容貼進 Code.gs。
 * 1. 先執行一次 setup()，授權並設定標題列。
 * 2. 部署 → 新增部署作業 → 網頁應用程式
 *    執行身分：我；誰可以存取：所有人 → 取得 /exec 網址，填到 Cloudflare 的 GAS_URL。
 * 3. （建議）專案設定 → 指令碼屬性 新增 SHARED_SECRET，Cloudflare 也設定相同的值。
 */

const HEADERS = ['提交時間', '姓名', '課程', '評分', '問題', '心得'];
const TIME_ZONE = 'Asia/Taipei';

function getSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

function setup() {
  const sheet = getSheet_();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  // 文字欄位設為純文字，避免「1/2」之類被轉成日期
  ['B:C', 'E:F'].forEach((a1) => sheet.getRange(a1).setNumberFormat('@'));
  sheet.setColumnWidth(1, 160);
  sheet.setColumnWidths(5, 2, 360);
  sheet.getRange('E:F').setWrap(true);
}

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return reply_({ ok: false, error: 'bad json' });
  }

  const secret = PropertiesService.getScriptProperties().getProperty('SHARED_SECRET');
  if (secret && data.token !== secret) {
    return reply_({ ok: false, error: 'unauthorized' });
  }

  const rating = Number(data.rating);
  if (!(rating >= 1 && rating <= 5)) {
    return reply_({ ok: false, error: 'bad rating' });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    getSheet_().appendRow([
      Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm:ss'),
      text_(data.name, 50),
      text_(data.course, 100),
      rating,
      text_(data.question, 2000),
      text_(data.reflection, 2000)
    ]);
  } finally {
    lock.releaseLock();
  }
  return reply_({ ok: true });
}

function doGet() {
  return reply_({ ok: true, message: 'B612 survey endpoint' });
}

// 避免以 = + - @ 開頭的內容被當成公式執行
function text_(value, max) {
  const s = String(value == null ? '' : value).slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
