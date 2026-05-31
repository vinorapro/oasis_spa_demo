import { useState } from 'react';
import { useAuth, demoUsers } from '../contexts/AuthContext';
import { useRole } from '../contexts/RoleContext';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { setCurrentRole } = useRole();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const result = login(email, password);
      if (result.ok) {
        const persona = demoUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
        if (persona) setCurrentRole(persona.role);
      } else {
        setError(result.error || 'Unable to sign in.');
        setLoading(false);
      }
    }, 450);
  };

  const fillDemo = (e: React.MouseEvent, demoEmail: string, demoPassword: string) => {
    e.preventDefault();
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-forest-gradient overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-brand/25 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 w-[30rem] h-[30rem] rounded-full bg-gold/10 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.05] flex items-center justify-center text-[40rem] leading-none select-none pointer-events-none">
        🌿
      </div>

      <div className="relative w-full max-w-[400px] animate-fade-in">
        {/* Brand */}
        <div className="flex flex-col items-center text-center mb-7">
          <span className="w-14 h-14 rounded-2xl bg-white/10 ring-1 ring-white/15 flex items-center justify-center text-3xl mb-4">
            🌿
          </span>
          <h1 className="font-display text-3xl font-semibold text-white tracking-tight">Oasis Spa</h1>
          <p className="text-[11px] uppercase tracking-widest2 text-gold-light/80 mt-1.5">Management Suite</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lift overflow-hidden">
          <div className="h-1 bg-gold-sheen" />
          <div className="p-7">
            <h2 className="font-display text-xl font-semibold text-ink">Sign in</h2>
            <p className="text-sm text-ink/55 mt-1">Welcome back, please enter your details.</p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <div>
                <label className="field-label">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@oasisspa.com"
                  className="field"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="field-label mb-0">Password</label>
                  <button type="button" className="text-xs font-medium text-brand hover:text-brand-600">
                    Forgot?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="field pr-11"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/35 hover:text-ink/70"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-xl bg-rose-50 ring-1 ring-inset ring-rose-600/15 px-3.5 py-2.5 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-3">
                {loading ? 'Signing in…' : 'Sign in'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-7">
              <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-ink/35">
                <span className="h-px flex-1 bg-black/[0.08]" />
                Demo accounts
                <span className="h-px flex-1 bg-black/[0.08]" />
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                {demoUsers.map((u) => (
                  <button
                    key={u.role}
                    onClick={(e) => fillDemo(e, u.email, u.password)}
                    className="text-left rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 hover:border-brand/40 hover:bg-sand/40 transition-colors"
                  >
                    <span className="block text-sm font-semibold text-ink">{u.role}</span>
                    <span className="block text-[11px] text-ink/45 truncate">{u.email}</span>
                  </button>
                ))}
              </div>
              <p className="text-center text-[11px] text-ink/40 mt-3">
                Password for all demo accounts: <span className="font-semibold text-ink/60">oasis123</span>
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-white/40 mt-6">© 2026 Oasis Spa · Bengaluru, India</p>
      </div>
    </div>
  );
}
