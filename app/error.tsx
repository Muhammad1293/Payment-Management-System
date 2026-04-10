'use client';
// app/error.tsx
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: 'var(--red-dim)', border: '1px solid var(--red)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24, color: 'var(--red)',
      }}>!</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
        Something went wrong
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 360, textAlign: 'center' }}>
        An unexpected error occurred. Please try again or contact your administrator.
      </p>
      <button
        className="btn btn-primary"
        onClick={reset}
        style={{ marginTop: 8 }}
      >
        Try again
      </button>
    </div>
  );
}
