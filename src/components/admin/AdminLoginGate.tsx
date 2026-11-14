import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  KeyRound,
  Lock,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext.tsx';

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (cfg: {
            client_id: string;
            callback: (resp: { credential?: string }) => void;
          }) => void;
          renderButton: (
            el: HTMLElement,
            options: { theme?: string; size?: string; width?: number | string; text?: string }
          ) => void;
        };
      };
    };
  }
}

interface AuthStatus {
  googleOAuthConfigured: boolean;
  googleClientId: string | null;
  needsInitialOwnerPassword: boolean;
  smtpConfigured: boolean;
}

export const AdminLoginGate: React.FC = () => {
  const {
    adminPasswordLogin,
    adminGoogleLogin,
    bootstrapOwnerPassword,
    requestAdminPasswordReset,
    confirmAdminPasswordReset,
    setActiveView,
  } = useStore();

  const [authStatus, setAuthStatus] = useState<AuthStatus | null>(null);
  const [mode, setMode] = useState<'login' | 'bootstrap' | 'forgot' | 'reset'>('login');

  // Login fields — intentionally blank, NO hardcoded defaults or autofill chips
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Bootstrap fields
  const [bootstrapCode, setBootstrapCode] = useState('');
  const [bootstrapPassword, setBootstrapPassword] = useState('');

  // Recovery fields
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const googleBtnRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch('/api/admin/auth/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setAuthStatus(data);
          if (data.needsInitialOwnerPassword) {
            setMode('bootstrap');
          }
        }
      })
      .catch(() => {});
  }, []);

  // Load Google Identity Services SDK ONLY when server reports GOOGLE_CLIENT_ID configured
  useEffect(() => {
    if (mode !== 'login' || !authStatus?.googleOAuthConfigured || !authStatus.googleClientId) {
      return;
    }

    const clientId = authStatus.googleClientId;
    let cancelled = false;

    const initGsi = () => {
      if (cancelled || !window.google?.accounts?.id || !googleBtnRef.current) return;
      googleBtnRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (!response?.credential) {
            setErrorMsg('Google Sign-In did not return a valid ID token.');
            return;
          }
          setErrorMsg(null);
          setSuccessMsg(null);
          setLoading(true);
          const res = await adminGoogleLogin({ idToken: response.credential });
          setLoading(false);
          if (!res.success) {
            setErrorMsg(res.error || 'Google OAuth authorization denied.');
          } else {
            setSuccessMsg('Google ID token verified. Opening Admin Console...');
          }
        },
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: 'outline',
        size: 'large',
        width: 360,
        text: 'continue_with',
      });
    };

    if (window.google?.accounts?.id) {
      initGsi();
      return;
    }

    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', initGsi);
      return () => {
        cancelled = true;
        existingScript.removeEventListener('load', initGsi);
      };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGsi;
    document.head.appendChild(script);

    return () => {
      cancelled = true;
    };
  }, [mode, authStatus, adminGoogleLogin]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid authorized admin email address.');
      return;
    }
    if (!passwordInput) {
      setErrorMsg('Password is required.');
      return;
    }
    setLoading(true);
    const res = await adminPasswordLogin(email, passwordInput);
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Authentication failed.');
    } else {
      setSuccessMsg(`Authenticated as ${email}. Loading dashboard...`);
    }
  };

  const handleBootstrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (bootstrapPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const res = await bootstrapOwnerPassword(
      emailInput.trim().toLowerCase(),
      bootstrapCode.trim(),
      bootstrapPassword
    );
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Owner initialization failed.');
    } else {
      setSuccessMsg(res.message || 'Owner password initialized. Please sign in.');
      setAuthStatus((prev) => (prev ? { ...prev, needsInitialOwnerPassword: false } : prev));
      setBootstrapCode('');
      setBootstrapPassword('');
      setMode('login');
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);
    const res = await requestAdminPasswordReset(emailInput.trim().toLowerCase());
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to initiate password recovery.');
    } else {
      setSuccessMsg(res.message || 'Recovery token issued if account exists.');
      setMode('reset');
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    if (resetNewPassword.length < 8) {
      setErrorMsg('New password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const res = await confirmAdminPasswordReset(
      emailInput.trim().toLowerCase(),
      resetTokenInput.trim(),
      resetNewPassword
    );
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Password reset failed.');
    } else {
      setSuccessMsg(res.message || 'Password updated. All prior sessions revoked.');
      setResetTokenInput('');
      setResetNewPassword('');
      setMode('login');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F6F2] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-[#141413]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-lg bg-[#141413] flex items-center justify-center text-[#D4AF6A] shadow-sm">
          <Shield className="w-7 h-7" />
        </div>
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#141413]">
          Zohra Luxe Admin Console
        </h2>
        <p className="text-xs text-[#63615C] max-w-sm mx-auto">
          Server-verified authentication for Primary Store Owner, Store Partners, and Staff Roles.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-9 rounded-xl border border-[#E2DFD7] shadow-sm space-y-5">
          {errorMsg && (
            <div className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-[#B91C1C] text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <p className="font-bold">Security Check</p>
                <p className="text-[11px] mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-[#ECFDF5] border border-[#A7F3D0] rounded-md text-[#166534] text-xs flex items-start gap-2">
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* BOOTSTRAP OWNER PASSWORD FLOW */}
          {mode === 'bootstrap' && (
            <form onSubmit={handleBootstrapSubmit} className="space-y-4">
              <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-md text-[11px] text-[#92400E] leading-relaxed">
                <p className="font-bold flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" /> First-Time Primary Owner Setup
                </p>
                <p className="mt-1">
                  Enter the Primary Owner email and one-time bootstrap code from <code className="font-mono">data/owner-bootstrap.txt</code> to initialize your salted password.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#63615C] uppercase tracking-wider block mb-1">
                  Primary Owner Email
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="owner@domain.com"
                  className="w-full text-xs px-3.5 py-2.5 border border-[#E2DFD7] rounded-md focus:outline-none focus:border-[#164E3F] font-mono bg-[#F7F6F2] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#63615C] uppercase tracking-wider block mb-1">
                  One-Time Bootstrap Code
                </label>
                <input
                  type="text"
                  required
                  value={bootstrapCode}
                  onChange={(e) => setBootstrapCode(e.target.value)}
                  placeholder="Paste setup code from server data/owner-bootstrap.txt"
                  className="w-full text-xs px-3.5 py-2.5 border border-[#E2DFD7] rounded-md focus:outline-none focus:border-[#164E3F] font-mono bg-[#F7F6F2] focus:bg-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-[#63615C] uppercase tracking-wider block mb-1">
                  New Owner Password (Min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={bootstrapPassword}
                  onChange={(e) => setBootstrapPassword(e.target.value)}
                  placeholder="Create strong private password"
                  className="w-full text-xs px-3.5 py-2.5 border border-[#E2DFD7] rounded-md focus:outline-none focus:border-[#164E3F] font-mono bg-[#F7F6F2] focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Initializing...' : 'Set Primary Owner Password'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setErrorMsg(null);
                  setMode('login');
                }}
                className="w-full text-center text-xs text-[#63615C] hover:text-[#164E3F] font-semibold cursor-pointer"
              >
                Already initialized or signing in with Google? Go to Sign In
              </button>
            </form>
          )}

          {/* STANDARD LOGIN FLOW */}
          {mode === 'login' && (
            <>
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div>
                  <label className="text-[11px] font-bold text-[#63615C] uppercase tracking-wider block mb-1">
                    Authorized Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="Enter authorized store email"
                    autoComplete="username"
                    className="w-full text-xs px-3.5 py-2.5 border border-[#E2DFD7] rounded-md focus:outline-none focus:border-[#164E3F] font-mono text-[#141413] bg-[#F7F6F2] focus:bg-white"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-[#63615C] uppercase tracking-wider">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMsg(null);
                        setSuccessMsg(null);
                        setMode('forgot');
                      }}
                      className="text-[11px] font-semibold text-[#164E3F] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="Enter your private password"
                      autoComplete="current-password"
                      className="w-full text-xs px-3.5 py-2.5 pr-10 border border-[#E2DFD7] rounded-md focus:outline-none focus:border-[#164E3F] font-mono text-[#141413] bg-[#F7F6F2] focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-2.5 text-[#63615C] hover:text-[#141413] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold uppercase tracking-wider rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{loading ? 'Verifying...' : 'Sign In to Admin Panel'}</span>
                </button>
              </form>

              <div className="pt-1">
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-[#E2DFD7]" />
                  <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-[#63615C]">
                    Google Identity Verification
                  </span>
                  <div className="flex-grow border-t border-[#E2DFD7]" />
                </div>

                {authStatus?.googleOAuthConfigured ? (
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <div ref={googleBtnRef} className="min-h-[40px] flex items-center justify-center" />
                    <p className="text-[10px] text-[#63615C] text-center">
                      ID tokens are verified cryptographically on the server against GOOGLE_CLIENT_ID.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-[#F7F6F2] border border-[#E2DFD7] rounded-md text-[11px] text-[#63615C] text-center">
                    Google OAuth Sign-In is disabled. Set <code className="font-mono text-[#141413]">GOOGLE_CLIENT_ID</code> in environment configuration to enable verified Google Login.
                  </div>
                )}
              </div>

              {authStatus?.needsInitialOwnerPassword && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setMode('bootstrap')}
                    className="text-[11px] text-[#8E6D3B] font-semibold hover:underline cursor-pointer"
                  >
                    First-time Primary Owner password setup pending
                  </button>
                </div>
              )}
            </>
          )}

          {/* FORGOT PASSWORD STEP 1 */}
          {mode === 'forgot' && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="text-xs text-[#63615C] leading-relaxed">
                Enter your authorized admin email to issue a 15-minute password recovery token.
                {!authStatus?.smtpConfigured && (
                  <span className="block mt-1 text-[11px] text-[#8E6D3B]">
                    Note: SMTP is not configured; recovery token is logged securely in server logs.
                  </span>
                )}
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#63615C] uppercase tracking-wider block mb-1">
                  Authorized Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@domain.com"
                  className="w-full text-xs px-3.5 py-2.5 border border-[#E2DFD7] rounded-md font-mono bg-[#F7F6F2]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#164E3F] text-white text-xs font-semibold uppercase tracking-wider rounded-md cursor-pointer"
              >
                {loading ? 'Issuing Token...' : 'Request Recovery Token'}
              </button>
              <div className="flex justify-between text-[11px]">
                <button
                  type="button"
                  onClick={() => setMode('reset')}
                  className="text-[#164E3F] font-semibold hover:underline cursor-pointer"
                >
                  I have a recovery token
                </button>
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-[#63615C] hover:text-[#141413] cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD STEP 2 */}
          {mode === 'reset' && (
            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-[#63615C] uppercase tracking-wider block mb-1">
                  Authorized Email
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-[#E2DFD7] rounded-md font-mono bg-[#F7F6F2]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#63615C] uppercase tracking-wider block mb-1">
                  Recovery Token
                </label>
                <input
                  type="text"
                  required
                  value={resetTokenInput}
                  onChange={(e) => setResetTokenInput(e.target.value)}
                  placeholder="Paste 32-char recovery token"
                  className="w-full text-xs px-3.5 py-2.5 border border-[#E2DFD7] rounded-md font-mono bg-[#F7F6F2]"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-[#63615C] uppercase tracking-wider block mb-1">
                  New Password (Min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={resetNewPassword}
                  onChange={(e) => setResetNewPassword(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-[#E2DFD7] rounded-md font-mono bg-[#F7F6F2]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#164E3F] text-white text-xs font-semibold uppercase tracking-wider rounded-md cursor-pointer"
              >
                {loading ? 'Updating Password...' : 'Reset Password & Revoke Old Sessions'}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-center text-[11px] text-[#63615C] hover:text-[#141413] cursor-pointer"
              >
                Back to Sign In
              </button>
            </form>
          )}

          <div className="pt-3 text-center border-t border-[#E2DFD7]">
            <button
              type="button"
              onClick={() => setActiveView('store')}
              className="text-xs text-[#63615C] hover:text-[#164E3F] inline-flex items-center justify-center gap-1.5 font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Customer Storefront</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
