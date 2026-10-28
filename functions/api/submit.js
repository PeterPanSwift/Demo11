// Cloudflare Pages Function：POST /api/submit
// 驗證問卷內容後轉送到 Google Apps Script（GAS_URL），由它寫進 Google 試算表。
// 需要的環境變數：
//   GAS_URL        Apps Script 網頁應用程式的 /exec 網址
//   SHARED_SECRET  （選填）與 Apps Script 指令碼屬性 SHARED_SECRET 相同的字串

const LIMITS = { name: 50, course: 100, question: 2000, reflection: 2000 };

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: '資料格式錯誤。' }, 400);
  }

  // 蜜罐欄位有值 → 多半是機器人，假裝成功但不寫入
  if (body.website) return json({ ok: true });

  const text = (key) => String(body[key] ?? '').trim().slice(0, LIMITS[key]);
  const record = {
    name: text('name'),
    course: text('course'),
    rating: Number(body.rating),
    question: text('question'),
    reflection: text('reflection')
  };

  if (!Number.isInteger(record.rating) || record.rating < 1 || record.rating > 5) {
    return json({ ok: false, error: '請選擇 1 到 5 顆星的評價。' }, 400);
  }
  if (!record.reflection) {
    return json({ ok: false, error: '請填寫課後心得。' }, 400);
  }
  if (!env.GAS_URL) {
    return json({ ok: false, error: '伺服器尚未設定 GAS_URL。' }, 500);
  }

  try {
    // Apps Script 會先回 302，fetch 預設會跟著轉址拿到真正的回應
    const res = await fetch(env.GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...record, token: env.SHARED_SECRET || '' })
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !data.ok) {
      console.error('GAS error', res.status, data);
      return json({ ok: false, error: '寫入試算表失敗，請稍後再試。' }, 502);
    }
  } catch (err) {
    console.error('GAS fetch failed', err);
    return json({ ok: false, error: '暫時連不上試算表，請稍後再試。' }, 502);
  }

  return json({ ok: true });
}

export function onRequest() {
  return json({ ok: false, error: 'Method Not Allowed' }, 405);
}
