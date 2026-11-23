import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { Building2, Lock, Mail, Eye, EyeOff, UserPlus, LogIn, AlertTriangle, ExternalLink } from 'lucide-react';

export default function Login() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isFetchError, setIsFetchError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsFetchError(false);
    setLoading(true);

    if (!isSupabaseConfigured) {
      setError('Supabase credentials are not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
      setLoading(false);
      return;
    }

    let result: { error: string | null };
    if (mode === 'login') {
      result = await signIn(email, password);
      if (!result.error) {
        window.location.href = '/dashboard';
        return;
      }
    } else {
      if (!fullName.trim()) { setError('Full name is required'); setLoading(false); return; }
      result = await signUp(email, password, fullName);
      if (!result.error) {
        setSuccess('Account created successfully! If email verification is enabled on your Supabase project, check your email to confirm before signing in.');
        setMode('login');
      }
    }

    if (result.error) {
      if (result.error.toLowerCase().includes('failed to fetch')) {
        setIsFetchError(true);
        setError('Failed to fetch: Unable to reach the Supabase backend.');
      } else {
        setError(result.error);
      }
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-2xl shadow-lg mb-4">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Vigo Immigration</h1>
          <p className="text-slate-400 mt-1 text-sm">Case Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">
            {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
          </h2>

          {!isSupabaseConfigured && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg p-3.5 mb-4 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Configuration Missing</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Supabase credentials are not found in your <code>.env</code> file. Please configure <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>.
                </p>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-lg p-3.5 mb-4">
              {success}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3.5 mb-4 space-y-2">
              <div className="font-medium">{error}</div>
              {isFetchError && (
                <div className="text-xs text-red-600 leading-relaxed border-t border-red-200 pt-2 space-y-1">
                  <p className="font-semibold text-red-700">Why this happens:</p>
                  <p>• <strong>Paused Project:</strong> Supabase free projects automatically pause after 7 days of inactivity. Go to your Supabase dashboard and click <strong>&quot;Restore project&quot;</strong>.</p>
                  <p>• <strong>Network Block:</strong> An ad blocker, firewall, or VPN may be blocking connections to <code>supabase.co</code>.</p>
                  <p>• <strong>Invalid Credentials:</strong> Verify the <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file.</p>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-semibold mt-1"
                  >
                    Open Supabase Dashboard <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Jane Smith"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="you@vigoimm.ie"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <><LogIn className="w-4 h-4" /> Sign In</>
              ) : (
                <><UserPlus className="w-4 h-4" /> Create Account</>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login' ? (
              <>No account yet?{' '}
                <button onClick={() => { setMode('signup'); setError(''); setSuccess(''); setIsFetchError(false); }} className="text-blue-600 hover:underline font-medium">
                  Create one
                </button>
              </>
            ) : (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('login'); setError(''); setSuccess(''); setIsFetchError(false); }} className="text-blue-600 hover:underline font-medium">
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

