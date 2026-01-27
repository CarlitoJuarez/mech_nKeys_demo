import { getCookie } from './get_cookie.js';

export async function POST_JSON(url, body) {
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
      },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
  } catch (e) {
    return {
      ok: false,
      status: 0,
      data: null,
      errors: ['Network error.'],
    };
  }

  // try to parse JSON, but dont assume its always JSON.
  let data = null;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { data = await res.json(); } catch { data = null; }
  } else {
    // for debugging
    // const text = await res.text().catch(() => '');
  }

  // normalize errors for caller
  let errors = [];
  if (!res.ok) {
    if (Array.isArray(data?.errors)) errors = data.errors;
    else if (typeof data?.error === 'string') errors = [data.error];
    else errors = ['Request failed.'];
  }

  return { ok: res.ok, status: res.status, data, errors };
}
