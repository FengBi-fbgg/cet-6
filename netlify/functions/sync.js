import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  const store = getStore('cet6-shared');
  const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
  };
  const json = (body, status) => new Response(JSON.stringify(body), {
    status: status || 200,
    headers: Object.assign({ 'Content-Type': 'application/json' }, CORS)
  });
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS });
  try {
    if (req.method === 'GET') {
      const data = await store.get('data', { type: 'json' });
      return json(data || { read: [], words: {}, log: [] });
    }
    if (req.method === 'POST') {
      const body = await req.json();
      const cur = (await store.get('data', { type: 'json' })) || { read: [], words: {}, log: [] };
      const read = Array.isArray(cur.read) ? cur.read.slice() : [];
      (Array.isArray(body.read) ? body.read : []).forEach((id) => {
        if (id && read.indexOf(id) < 0) read.push(id);
      });
      const words = cur.words && typeof cur.words === 'object' ? Object.assign({}, cur.words) : {};
      const bw = body.words && typeof body.words === 'object' ? body.words : {};
      Object.keys(bw).forEach((k) => { if (!(k in words)) words[k] = bw[k]; });
      const log = Array.isArray(cur.log) ? cur.log.slice() : [];
      const seen = {};
      log.forEach((x) => { if (x && x.id) seen[x.id] = 1; });
      (Array.isArray(body.log) ? body.log : []).forEach((x) => {
        if (x && x.id && !seen[x.id]) { seen[x.id] = 1; log.push(x); }
      });
      while (log.length > 500) log.shift();
      await store.setJSON('data', { read, words, log });
      return json({ ok: true });
    }
    return new Response('Method Not Allowed', { status: 405, headers: CORS });
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
};
