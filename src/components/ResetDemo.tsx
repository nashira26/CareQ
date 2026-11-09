import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { RotateCcw, KeyRound } from 'lucide-react';
import { RESET_TOKEN_SESSION_KEY, clearDemoStorage, sessionStore, suspendSaving } from '../lib/demoStorage';
import { resetServerDemo, DataMode } from '../lib/store';

/**
 * Where "Reset demo" applies:
 *  - local mode: clears this browser only (anyone can use it).
 *  - mongo mode: resets the shared database. Hidden from normal users: shown only to a signed-in
 *    seeded demo account AFTER the admin token was entered once in the "Admin reset" dialog
 *    (kept in sessionStorage for this tab). The server checks the token (X-Reset-Token).
 */
export const ResetContext = createContext<{ mode: DataMode; isDemoAccount: boolean; resetAvailable: boolean }>({
  mode: 'local',
  isDemoAccount: false,
  resetAvailable: false,
});

/** Local mode: clears this browser's saved demo and reloads with the original data. */
export function resetDemoAndReload() {
  suspendSaving(); // a pending save must not write the old world back
  clearDemoStorage();
  window.location.reload();
}

const readToken = () => {
  try {
    return sessionStore()?.getItem(RESET_TOKEN_SESSION_KEY) ?? null;
  } catch {
    return null;
  }
};
const writeToken = (t: string | null) => {
  try {
    if (t) sessionStore()?.setItem(RESET_TOKEN_SESSION_KEY, t);
    else sessionStore()?.removeItem(RESET_TOKEN_SESSION_KEY);
  } catch {
    /* storage blocked: token lasts until the dialog closes */
  }
};

interface ResetDemoProps {
  /** "sidebar": button + note under it; "link": small inline link (login page, footer) */
  variant?: 'sidebar' | 'link';
  className?: string;
}

type Dialog = null | 'confirm' | 'token';

export const ResetDemo: React.FC<ResetDemoProps> = ({ variant = 'sidebar', className = '' }) => {
  const { mode, isDemoAccount, resetAvailable } = useContext(ResetContext);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [token, setToken] = useState<string | null>(readToken);
  const [tokenInput, setTokenInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!dialog) return;
    firstButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDialog(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  // Mongo mode: only seeded demo accounts on a server that allows resets ever see anything
  if (mode === 'mongo' && (!isDemoAccount || !resetAvailable)) return null;
  const adminLocked = mode === 'mongo' && !token;

  const handleReset = async () => {
    setError(null);
    if (mode === 'local') return resetDemoAndReload();
    setBusy(true);
    try {
      await resetServerDemo(token!);
      window.location.reload(); // everyone was signed out: back to the login page
    } catch (e) {
      setBusy(false);
      const status = (e as { status?: number }).status;
      if (status === 403) {
        writeToken(null);
        setToken(null);
      }
      setError((e as Error).message);
    }
  };

  const trigger =
    variant === 'sidebar' ? (
      <div className={className}>
        <button
          type="button"
          onClick={() => setDialog(adminLocked ? 'token' : 'confirm')}
          className="flex items-center gap-2 text-xs text-cq-muted hover:text-cq-ink pl-2 transition-colors cursor-pointer"
        >
          {adminLocked ? <KeyRound className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
          <span>{adminLocked ? 'Admin reset' : 'Reset demo'}</span>
        </button>
        <p className="text-[10px] text-cq-soft pl-2 mt-1">
          {mode === 'local' ? 'Demo data is saved only in this browser.' : 'Demo data is shared by everyone using this demo.'}
        </p>
      </div>
    ) : (
      <span className={`inline-flex flex-col items-center sm:items-start ${className}`}>
        <button
          type="button"
          onClick={() => setDialog(adminLocked ? 'token' : 'confirm')}
          className="text-xs text-cq-muted hover:text-cq-ink underline cursor-pointer"
        >
          {adminLocked ? 'Admin reset' : 'Reset demo'}
        </button>
        {mode === 'local' && <span className="text-[10px] text-cq-soft">Demo data is saved only in this browser.</span>}
      </span>
    );

  return (
    <>
      {trigger}
      {dialog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-cq-ink/40 backdrop-blur-xs" onClick={() => setDialog(null)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-demo-title"
            onClick={(e) => e.stopPropagation()}
            className="max-w-sm w-full rounded-2xl bg-white border border-cq-line p-6 shadow-xl space-y-4"
          >
            {dialog === 'token' ? (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!tokenInput.trim()) return;
                  writeToken(tokenInput.trim());
                  setToken(tokenInput.trim());
                  setTokenInput('');
                  setError(null);
                  setDialog('confirm');
                }}
              >
                <h3 id="reset-demo-title" className="text-lg font-bold text-cq-ink">
                  Admin reset
                </h3>
                <p className="text-sm text-cq-muted">Enter the admin reset token to enable “Reset demo” in this tab.</p>
                <div>
                  <label htmlFor="reset-token" className="block text-sm font-medium text-cq-ink-2 mb-1.5">
                    Reset token
                  </label>
                  <input
                    id="reset-token"
                    type="password"
                    autoComplete="off"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    className="h-11 w-full rounded-xl border border-cq-line-input bg-cq-input px-3.5 text-sm outline-none focus:border-cq-secondary focus:ring-2 focus:ring-cq-secondary/25"
                  />
                </div>
                {error && <p className="text-xs font-medium text-cq-rust">{error}</p>}
                <div className="flex justify-end gap-2">
                  <button
                    ref={firstButton}
                    type="button"
                    onClick={() => setDialog(null)}
                    className="h-10 px-4 rounded-xl border border-cq-line bg-white text-sm font-semibold text-cq-ink hover:bg-cq-page cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="h-10 px-4 rounded-xl bg-cq-brand text-white text-sm font-semibold cursor-pointer">
                    Continue
                  </button>
                </div>
              </form>
            ) : (
              <>
                <h3 id="reset-demo-title" className="text-lg font-bold text-cq-ink">
                  Reset the demo?
                </h3>
                <p className="text-sm text-cq-muted">
                  {mode === 'local'
                    ? 'This clears everything saved in this browser: applications, drafts, messages, notifications, support requests, new accounts, centre changes and your shortlist. The demo goes back to its original data.'
                    : 'This resets the SHARED demo database for everyone: all new accounts, centres, applications and messages are removed, and everyone is signed out.'}
                </p>
                {error && <p className="text-xs font-medium text-cq-rust">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    ref={firstButton}
                    type="button"
                    onClick={() => setDialog(null)}
                    className="h-10 px-4 rounded-xl border border-cq-line bg-white text-sm font-semibold text-cq-ink hover:bg-cq-page cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleReset}
                    className="h-10 px-4 rounded-xl bg-cq-rust hover:bg-cq-rust-deep text-white text-sm font-semibold cursor-pointer disabled:opacity-60"
                  >
                    {busy ? 'Resetting…' : 'Reset demo'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};
