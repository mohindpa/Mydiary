const noStore = { 'Cache-Control': 'no-store' };

export default {
  async fetch(request) {
    const text = (new URL(request.url).searchParams.get('text') || '').trim();
    if (!/^[A-Za-z.'-]{2,80}$/.test(text)) {
      return Response.json({ result: [] }, { status: 400, headers: noStore });
    }

    const upstream = new URL('https://inputtools.google.com/request');
    upstream.search = new URLSearchParams({
      text, itc: 'ml-t-i0-und', num: '5', cp: '0', cs: '1', ie: 'utf-8', oe: 'utf-8', app: 'my-little-shelf'
    });

    try {
      const response = await fetch(upstream, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Google Input Tools returned ${response.status}`);
      const data = await response.json();
      const result = data?.[0] === 'SUCCESS' ? data?.[1]?.[0]?.[1] || [] : [];
      return Response.json({ result }, { headers: noStore });
    } catch {
      return Response.json({ result: [] }, { status: 502, headers: noStore });
    }
  }
};
