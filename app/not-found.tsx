// app/not-found.tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ fontSize: 72, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>404</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>Page not found</h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
        The page you are looking for does not exist.
      </p>
      <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: 8 }}>
        Go to Dashboard
      </Link>
    </div>
  );
}
