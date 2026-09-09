import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  ArrowRight,
  PawPrint,
  ShieldCheck,
  Users,
  BarChart3,
  Heart,
  Headphones,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext.jsx';
import logo from '../assets/logo.png';
// Dog + cat cutout graphic. Replace this file with the real artwork (keep the
// same path/name) and it flows straight into the layout below.
import petsImg from '../assets/login-pets.png';

export default function Login() {
  const { login, isAuthenticated, loading: sessionLoading, admin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const homeFor = (role) => (role === 'PARTNER' ? '/portal' : '/');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const year = new Date().getFullYear();

  if (!sessionLoading && isAuthenticated) {
    return <Navigate to={location.state?.from || homeFor(admin?.role)} replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const user = await login(email, password);
      toast.success('Welcome back');
      navigate(location.state?.from || homeFor(user?.role), { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || 'Could not sign in. Check your details and try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* ---------- Brand panel ---------- */}
      <div className="relative hidden overflow-hidden bg-[#EAF1FD] lg:block">
        {/* soft background scenery */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* organic blob behind the pets */}
          <div className="absolute right-[-14%] top-[26%] h-[86%] w-[90%] rounded-[46%_54%_50%_50%/56%_52%_48%_44%] bg-[#DAE7FB]" />
          <div className="absolute right-[2%] top-[40%] h-[62%] w-[64%] rounded-[52%_48%_44%_56%/48%_56%_44%_52%] bg-[#E4EDFC]" />
          {/* blurred foliage at the lower corners */}
          <div className="absolute -left-20 bottom-[-14%] h-72 w-72 rounded-[60%_40%_55%_45%/55%_45%_60%_40%] bg-[#8FBF6B] opacity-45 blur-[8px]" />
          <div className="absolute -right-24 bottom-[-10%] h-80 w-80 rounded-[45%_55%_40%_60%/50%_60%_40%_50%] bg-[#8FBF6B] opacity-45 blur-[8px]" />
          {/* paw watermarks */}
          <Paw className="absolute right-[8%] top-[38%] h-40 w-40 text-white/70" />
          <Paw className="absolute left-4 top-[20%] h-14 w-14 -rotate-12 text-white/40" />
          <Paw className="absolute bottom-32 right-[38%] h-10 w-10 rotate-6 text-white/35" />
        </div>

        {/* content */}
        <div className="relative flex min-h-screen flex-col px-12 py-12 xl:px-16">
          {/* logo */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="h-11 w-11 object-contain" />
            <div className="leading-tight">
              <p className="text-lg font-extrabold text-brand-ink">Across Assist</p>
              <p className="text-[11px] font-semibold tracking-[0.22em] text-brand-slate">PET INSURANCE</p>
            </div>
          </div>

          {/* handwritten note, top-right */}
          <div className="pointer-events-none absolute right-12 top-14 -rotate-6 text-right xl:right-16">
            <p className="font-script text-[32px] font-bold leading-[1.02] text-brand-ink/75">
              Happy
              <br />
              Healthier
              <br />
              Together <Heart size={16} className="mb-1 inline fill-brand-blue text-brand-blue" />
            </p>
            <Swoosh className="ml-auto mt-1 w-24" />
          </div>

          {/* headline + value props */}
          <div className="relative z-20 mt-[9vh] max-w-[400px]">
            <h1 className="text-[40px] font-extrabold leading-[1.08] text-brand-ink">
              Partners in
              <span className="block text-brand-blue">Pet Protection</span>
            </h1>
            <p className="mt-3 text-[22px] font-bold text-brand-ink/90">Manage. Sell. Grow. Together.</p>
            <p className="mt-3 text-[15px] leading-relaxed text-brand-slate">
              Access plans, manage proposals, track sales and serve more pet parents — all in one powerful
              portal.
            </p>

            <div className="mt-7 space-y-4">
              <Feature icon={ShieldCheck} title="Trusted Plans" sub="Backed by leading insurers" />
              <Feature icon={Users} title="Support for Partners" sub="Tools, resources and quick service" />
              <Feature icon={BarChart3} title="Grow Your Business" sub="Track performance and unlock more" />
            </div>
          </div>

          {/* handwritten note, bottom-left */}
          <div className="pointer-events-none absolute bottom-[24%] left-12 z-20 -rotate-6 xl:left-16">
            <p className="font-script text-[30px] font-bold leading-[1.02] text-brand-ink/75">
              Because
              <br />
              they&rsquo;re family <Heart size={15} className="mb-1 inline fill-brand-blue text-brand-blue" />
            </p>
            <Swoosh className="mt-1 w-24" />
          </div>

          {/* pets */}
          <img
            src={petsImg}
            alt=""
            className="pointer-events-none absolute bottom-0 right-0 z-10 w-[58%] max-w-[520px] select-none object-contain"
            style={{ filter: 'drop-shadow(0 18px 28px rgba(16,24,40,0.18))' }}
          />

          {/* floating pill */}
          <div className="absolute bottom-7 left-1/2 z-20 flex -translate-x-1/2 items-center gap-5 whitespace-nowrap rounded-full bg-white/95 px-6 py-3 shadow-[0_12px_34px_rgba(16,24,40,0.14)]">
            <PillItem icon={PawPrint} label="Healthier Pets" />
            <PillItem icon={Heart} label="Happier Families" />
            <PillItem icon={Users} label="Stronger Together" />
          </div>
        </div>
      </div>

      {/* ---------- Form panel ---------- */}
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-10">
        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <img src={logo} alt="" className="h-10 w-10 object-contain" />
          <span className="text-lg font-extrabold text-brand-ink">Across Assist</span>
        </div>

        <div className="w-full max-w-[420px] rounded-2xl border border-brand-line bg-white p-8 shadow-[0_10px_40px_rgba(16,24,40,0.08)]">
          <div className="flex flex-col items-center text-center">
            <PawPrint size={30} className="text-brand-blue" />
            <h1 className="mt-3 text-[26px] font-extrabold text-brand-ink">Welcome Back!</h1>
            <p className="mt-1.5 text-sm text-brand-slate">
              Sign in to access the Across Assist portal for admins and partners.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
            {error && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-semibold text-brand-ink">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-slate"
                />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full rounded-lg border border-brand-line bg-white py-2.5 pl-10 pr-3.5 text-sm text-brand-ink placeholder:text-brand-slate/60 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-brand-ink">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-slate"
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-brand-line bg-white py-2.5 pl-10 pr-10 text-sm text-brand-ink placeholder:text-brand-slate/60 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-slate hover:text-brand-ink"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </div>

            <label className="flex select-none items-center gap-2 text-sm text-brand-slate">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-4 w-4 rounded border-brand-line text-brand-blue focus:ring-brand-blue"
              />
              Remember me
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blueDark disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Signing in…
                </>
              ) : (
                <>
                  Sign in <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* trust strip */}
        <div className="mt-8 flex w-full max-w-[520px] flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <Trust icon={ShieldCheck} title="Secure Access" sub="Your data is safe" />
          <Trust icon={Lock} title="Role Based" sub="Access control" />
          <Trust icon={Headphones} title="Dedicated Support" sub="We're here to help" />
        </div>

        <p className="mt-6 text-center text-xs text-brand-slate">
          © {year} Across Assist Private Limited. All rights reserved.
        </p>
      </div>
    </div>
  );
}

/* ---------- small building blocks ---------- */

function Feature({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-blue shadow-[0_4px_14px_rgba(19,99,223,0.15)]">
        <Icon size={22} />
      </div>
      <div>
        <p className="font-semibold text-brand-ink">{title}</p>
        <p className="text-sm text-brand-slate">{sub}</p>
      </div>
    </div>
  );
}

function PillItem({ icon: Icon, label }) {
  return (
    <span className="flex items-center gap-2 text-sm font-semibold text-brand-ink">
      <Icon size={16} className="text-brand-blue" />
      {label}
    </span>
  );
}

function Trust({ icon: Icon, title, sub }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blueTint text-brand-blue">
        <Icon size={16} />
      </div>
      <div className="leading-tight">
        <p className="text-[12px] font-semibold text-brand-ink">{title}</p>
        <p className="text-[11px] text-brand-slate">{sub}</p>
      </div>
    </div>
  );
}

// Underline flourish under the handwritten notes.
function Swoosh({ className = '' }) {
  return (
    <svg
      viewBox="0 0 120 12"
      className={`h-2.5 text-brand-blue ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 8C30 2 80 2 117 6" />
    </svg>
  );
}

// Decorative paw print.
function Paw({ className = '' }) {
  return (
    <svg viewBox="0 0 100 100" className={className} fill="currentColor" aria-hidden="true">
      <ellipse cx="28" cy="40" rx="9" ry="12" />
      <ellipse cx="44" cy="30" rx="9" ry="13" />
      <ellipse cx="60" cy="30" rx="9" ry="13" />
      <ellipse cx="76" cy="42" rx="9" ry="12" />
      <ellipse cx="52" cy="66" rx="21" ry="19" />
    </svg>
  );
}
