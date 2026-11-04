'use client';

import { useEffect, useState } from 'react';

export default function GlobalError({ error, reset }) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error('Fatal global error caught by app/global-error.js:', error);
  }, [error]);

  const errorMessage = error?.message || 'A critical application error occurred.';

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', backgroundColor: '#fafaf9', color: '#1c1917' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ maxWidth: '32rem', width: '100%', backgroundColor: '#ffffff', padding: '2rem', borderRadius: '1.5rem', border: '1px solid #e7e5e4', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
            <div style={{ width: '3rem', height: '3rem', borderRadius: '1rem', backgroundColor: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.5rem' }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', margin: '0 0 0.5rem', color: '#1c1917' }}>
              Application Error
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#78716c', textAlign: 'center', margin: '0 0 1.25rem', lineHeight: '1.5' }}>
              {errorMessage}
            </p>

            {error?.digest && (
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', backgroundColor: '#f5f5f4', padding: '0.25rem 0.75rem', borderRadius: '9999px', color: '#57534e' }}>
                  Error Digest: {error.digest}
                </span>
              </div>
            )}

            <div style={{ margin: '1rem 0', border: '1px solid #e7e5e4', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                style={{ width: '100%', padding: '0.625rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, backgroundColor: '#f5f5f4', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
              >
                <span>Diagnostic Details</span>
                <span>{showDetails ? '▲' : '▼'}</span>
              </button>
              {showDetails && (
                <div style={{ padding: '0.75rem 1rem', backgroundColor: '#1c1917', color: '#f5f5f4', fontSize: '0.75rem', fontFamily: 'monospace', maxHeight: '12rem', overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {JSON.stringify({ message: error?.message, name: error?.name, digest: error?.digest, stack: error?.stack }, null, 2)}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem' }}>
              <button
                type="button"
                onClick={() => reset()}
                style={{ padding: '0.625rem 1.25rem', backgroundColor: '#ea580c', color: '#ffffff', borderRadius: '0.75rem', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                style={{ padding: '0.625rem 1.25rem', backgroundColor: '#f5f5f4', color: '#44403c', borderRadius: '0.75rem', border: 'none', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

