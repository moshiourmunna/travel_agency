export default async function Home() {
  const api = process.env.API_URL ?? 'http://127.0.0.1:8000';
  let status = 'unreachable';
  try {
    const res = await fetch(`${api}/api/v1/health`, { cache: 'no-store' });
    status = (await res.json()).status;
  } catch {}
  return (
    <main className="wrap py-16">
      <h1 className="text-3xl font-bold text-brand-700">Musafir frontend is running</h1>
      <p className="mt-2 muted">API status: {status}</p>
    </main>
  );
}
