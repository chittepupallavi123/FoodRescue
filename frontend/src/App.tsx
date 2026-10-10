import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  HeartHandshake,
  Leaf,
  Menu,
  ShieldCheck,
  Utensils,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { api } from './lib/api';
import ProviderDashboard from './ProviderDashboard';
import CollectorDashboard from './CollectorDashboard';
type User = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  emailVerified: boolean;
};

function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <Link to="/" className="brand">
        <span className="brand-mark"><Leaf size={19} /></span>
        <span>food<span className="brand-light">rescue</span></span>
      </Link>

      <button
        className="mobile-menu"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>

      <nav className={open ? 'nav-links nav-open' : 'nav-links'}>
        <a href="/#how-it-works" onClick={() => setOpen(false)}>
          How it works
        </a>
        <a href="/#food-safety" onClick={() => setOpen(false)}>
          Food safety
        </a>
        <a href="/#about" onClick={() => setOpen(false)}>
          Our mission
        </a>
        <Link to="/login" className="nav-login" onClick={() => setOpen(false)}>
          Log in
        </Link>
        <Link
          to="/register"
          className="button button-small"
          onClick={() => setOpen(false)}
        >
          Join the network <ArrowRight size={15} />
        </Link>
      </nav>
    </header>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-main">
        <Link to="/" className="brand brand-footer">
          <span className="brand-mark"><Leaf size={18} /></span>
          <span>food<span className="brand-light">rescue</span></span>
        </Link>
        <p>Good food deserves a good next chapter.</p>
        <span className="footer-note">
          Built for a world with less waste and more care.
        </span>
      </div>

      <div className="footer-links">
        <a href="/#how-it-works">How it works</a>
        <a href="/#food-safety">Food safety</a>
        <a href="mailto:hello@foodrescue.example">Contact</a>
        <span>Privacy &amp; terms · Drafts pending review</span>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} FoodRescue</span>
        <span>People first. Food respected.</span>
      </div>
    </footer>
  );
}

function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-text">
            <div className="eyebrow">
              <span className="eyebrow-line" />
              A better way to pass it on
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65 }}
            >
              Good food.
              <br />
              <em>Better futures.</em>
            </motion.h1>

            <p className="hero-copy">
              Every day, good food goes unused while communities need support.
              FoodRescue brings local food providers and verified organizations
              together to make the handoff count.
            </p>

            <div className="hero-actions">
              <Link to="/register" className="button">
                Become a partner <ArrowRight size={17} />
              </Link>
              <a href="#how-it-works" className="text-link">
                Discover how it works <ArrowDownRight size={16} />
              </a>
            </div>

            <div className="trust-note">
              <ShieldCheck size={17} />
              <span>
                Designed around verified organizations, safe handling, and
                accountable handoffs.
              </span>
            </div>
          </div>

          <div
            className="hero-art"
            aria-label="Illustration of a bowl of fresh produce"
            role="img"
          >
            <div className="art-sun" />
            <div className="art-label">LESS WASTE<br />MORE CARE</div>

            <div className="food-illustration">
              <div className="plate" />
              <div className="leaf-shape leaf-a" />
              <div className="leaf-shape leaf-b" />
              <div className="tomato tomato-a" />
              <div className="tomato tomato-b" />
              <div className="carrot" />
              <div className="grain grain-a" />
              <div className="grain grain-b" />
            </div>

            <div className="art-caption">
              <span>01 / THE IDEA</span>
              <span>Keep good food moving.</span>
            </div>
          </div>

          <div className="hero-bottom">
            <span>COMMUNITY-POWERED FOOD RESCUE</span>
            <span>FROM SURPLUS TO SHARED</span>
          </div>
        </section>

        <section className="manifesto" id="about">
          <div className="section-kicker">THE REASON WE EXIST</div>
          <div className="manifesto-grid">
            <h2>Waste is a missed<br /><em>opportunity.</em></h2>
            <div>
              <p>
                Food rescue is a simple idea with a meaningful job: connect
                surplus food to people who can put it to good use, before time
                runs out.
              </p>
              <p>
                FoodRescue is being built to make that process clearer, safer,
                and easier to trust—from the first listing to the final handoff.
              </p>
              <span className="small-rule" />
              <span className="serif-note">
                A little coordination can go a long way.
              </span>
            </div>
          </div>
        </section>

        <section className="steps-section" id="how-it-works">
          <div className="section-heading">
            <div>
              <div className="section-kicker">A CLEARER HANDOFF</div>
              <h2>From extra to <em>essential.</em></h2>
            </div>
            <p>A transparent workflow helps everyone know what happens next.</p>
          </div>

          <div className="steps-grid">
            <article className="step-card">
              <span className="step-number">01</span>
              <div className="step-icon"><Utensils /></div>
              <h3>List the surplus</h3>
              <p>
                Food providers share what is available, the quantity, handling
                details, and a realistic pickup deadline.
              </p>
              <span className="step-foot">FOOD PROVIDERS</span>
            </article>

            <article className="step-card step-highlight">
              <span className="step-number">02</span>
              <div className="step-icon"><HeartHandshake /></div>
              <h3>Find the right fit</h3>
              <p>
                Eligible recipient organizations can discover suitable
                donations and request the amount they can collect.
              </p>
              <span className="step-foot">RECIPIENT ORGANIZATIONS</span>
            </article>

            <article className="step-card">
              <span className="step-number">03</span>
              <div className="step-icon"><Check /></div>
              <h3>Confirm the handoff</h3>
              <p>
                Pickup and delivery confirmations create a traceable record
                instead of relying on assumptions.
              </p>
              <span className="step-foot">ACCOUNTABLE DELIVERY</span>
            </article>
          </div>
        </section>

        <section className="safety-section" id="food-safety">
          <div className="safety-stamp">
            <ShieldCheck size={30} />
            <span>SAFETY<br />FIRST</span>
          </div>

          <div className="safety-copy">
            <div className="section-kicker">CARE IS PART OF THE PROCESS</div>
            <h2>Rescue food.<br /><em>Respect safety.</em></h2>
            <p>
              Food rescue only works when safe handling comes first. Providers
              should share accurate preparation, storage, allergen, and pickup
              information. Recipients must assess and handle food responsibly
              under applicable local requirements.
            </p>
            <span className="safety-disclaimer">
              FoodRescue is not a food-safety certification service. Listings
              do not guarantee that food is safe to consume.
            </span>
          </div>

          <div className="safety-list">
            <div><Check size={17} /><span>Clear pickup deadlines</span></div>
            <div><Check size={17} /><span>Known allergens disclosed</span></div>
            <div><Check size={17} /><span>Storage needs communicated</span></div>
            <div><Check size={17} /><span>Issues can be reported</span></div>
          </div>
        </section>

        <section className="impact-section">
          <div className="impact-mark"><Leaf size={22} /></div>
          <div>
            <div className="section-kicker">REAL IMPACT, NEVER GUESSED</div>
            <h2>Every number should mean <em>something.</em></h2>
            <p>
              Verified impact metrics will appear here once completed donations
              are recorded in the platform. We will not invent totals or
              estimate meals from weight without a documented method.
            </p>
          </div>
          <div className="impact-empty">
            <span className="empty-dot" />
            <strong>Impact data not available yet</strong>
            <span>Verified records will power this space.</span>
          </div>
        </section>

        <section className="join-section">
          <div className="join-decoration">FR<span>·</span></div>
          <div className="section-kicker">MAKE THE NEXT HANDOFF MATTER</div>
          <h2>There is room for<br /><em>one more good thing.</em></h2>
          <p>
            Join the early FoodRescue network as a food provider, recipient
            organization, or collector.
          </p>
          <Link to="/register" className="button button-light">
            Get started <ArrowRight size={17} />
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
});

function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  });

  const submit = handleSubmit(async (values) => {
    setError('');
    setBusy(true);

    try {
      await api<{ data: { user: User } }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      });

      nav('/account');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign in.');
    } finally {
      setBusy(false);
    }
  });

  return (
    <AuthLayout
      title="Welcome back."
      subtitle="Sign in to continue your FoodRescue work."
    >
      <form onSubmit={submit} className="auth-form">
        <Field label="Email address" error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@organization.org"
            {...register('email')}
          />
        </Field>

        <Field label="Password" error={errors.password?.message}>
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            {...register('password')}
          />
        </Field>

        <div className="form-inline">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}

        <button className="button form-submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={16} />
        </button>

        <p className="auth-switch">
          New to FoodRescue? <Link to="/register">Create an account</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

const registerSchema = z.object({
  displayName: z.string().min(2, 'Enter at least 2 characters.').max(100),
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(12, 'Use at least 12 characters.').max(128),
  role: z.enum(['provider', 'recipient', 'collector']),
  orgName: z.string().optional(),
  address: z.string().optional(),
  serviceArea: z.string().optional(),
}).superRefine((v, c) => {
  if (v.role !== 'collector' && (!v.orgName || v.orgName.trim().length < 2)) {
    c.addIssue({
      code: 'custom',
      path: ['orgName'],
      message: 'Organization name is required.',
    });
  }

  if (v.role !== 'collector' && (!v.address || v.address.trim().length < 5)) {
    c.addIssue({
      code: 'custom',
      path: ['address'],
      message: 'Enter a full organization address.',
    });
  }
});

function Register() {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'provider' },
  });

  const role = watch('role');

  const submit = handleSubmit(async (v) => {
    setError('');
    setMessage('');
    setBusy(true);

    const body = {
      displayName: v.displayName,
      email: v.email,
      password: v.password,
      role: v.role,
      ...(v.role !== 'collector'
        ? {
            organization: {
              name: v.orgName,
              address: v.address,
              serviceArea: v.serviceArea,
            },
          }
        : {}),
    };

    try {
      const r = await api<{ data: { message: string } }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      setMessage(r.data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create account.');
    } finally {
      setBusy(false);
    }
  });

  return (
    <AuthLayout
      title="Make good food go further."
      subtitle="Create your FoodRescue account. Organizations start with pending verification."
    >
      <form onSubmit={submit} className="auth-form">
        <Field label="Your name" error={errors.displayName?.message}>
          <input autoComplete="name" placeholder="Full name" {...register('displayName')} />
        </Field>

        <Field label="Email address" error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            placeholder="you@organization.org"
            {...register('email')}
          />
        </Field>

        <Field
          label="Password · 12 characters minimum"
          error={errors.password?.message}
        >
          <input
            type="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            {...register('password')}
          />
        </Field>

        <Field label="I am joining as" error={errors.role?.message}>
          <select {...register('role')}>
            <option value="provider">Restaurant / food provider</option>
            <option value="recipient">NGO / recipient organization</option>
            <option value="collector">Food collector</option>
          </select>
        </Field>

        {role !== 'collector' && (
          <>
            <div className="form-divider">ORGANIZATION DETAILS</div>

            <Field label="Organization name" error={errors.orgName?.message}>
              <input
                placeholder="Registered or commonly used name"
                {...register('orgName')}
              />
            </Field>

            <Field label="Organization address" error={errors.address?.message}>
              <textarea
                rows={2}
                placeholder="Street, area, city"
                {...register('address')}
              />
            </Field>

            <Field label="Service area (optional)" error={errors.serviceArea?.message}>
              <input placeholder="Areas you serve" {...register('serviceArea')} />
            </Field>
          </>
        )}

        {error && <div className="form-error" role="alert">{error}</div>}
        {message && <div className="form-success" role="status">{message}</div>}

        <p className="form-hint">
          Your organization will remain pending until an administrator reviews
          it. No administrator registration is available here.
        </p>

        <button className="button form-submit" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'} <ArrowRight size={16} />
        </button>

        <p className="auth-switch">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function ForgotPassword() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const schema = z.object({
    email: z.string().email('Enter a valid email address.'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string }>({
    resolver: zodResolver(schema),
  });

  const submit = handleSubmit(async (v) => {
    setBusy(true);
    setError('');
    setMessage('');

    try {
      const r = await api<{ data: { message: string } }>('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify(v),
      });

      setMessage(r.data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed.');
    } finally {
      setBusy(false);
    }
  });

  return (
    <AuthLayout
      title="A fresh start."
      subtitle="Enter your account email and we’ll explain the next step."
    >
      <form className="auth-form" onSubmit={submit}>
        <Field label="Email address" error={errors.email?.message}>
          <input
            type="email"
            autoComplete="email"
            {...register('email')}
            placeholder="you@organization.org"
          />
        </Field>

        {message && <div className="form-success" role="status">{message}</div>}
        {error && <div className="form-error" role="alert">{error}</div>}

        <button className="button form-submit" disabled={busy}>
          {busy ? 'Submitting…' : 'Request reset link'} <ArrowRight size={16} />
        </button>

        <p className="auth-switch">
          <Link to="/login">Return to sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}

function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="auth-page">
        <div className="auth-aside">
          <div className="section-kicker">FOODRESCUE NETWORK</div>
          <h2>Better together,<br /><em>by design.</em></h2>
          <p>
            Food moves with more purpose when providers, recipient
            organizations, and collectors can coordinate with care.
          </p>
          <div className="auth-aside-bottom">
            <ShieldCheck size={18} />
            Verified organizations. Accountable handoffs.
          </div>
        </div>

        <div className="auth-panel">
          <Link to="/" className="back-link">← Back to home</Link>
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

function Account() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [logoutBusy, setLogoutBusy] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    let active = true;

    api<{ data: { user: User } }>('/auth/me')
      .then((r) => {
        if (active) setUser(r.data.user);
      })
      .catch((e) => {
        if (active) {
          setError(e instanceof Error ? e.message : 'Please sign in.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    setLogoutBusy(true);
    setError('');

    try {
      await api('/auth/logout', { method: 'POST' });
      nav('/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to sign out.');
    } finally {
      setLogoutBusy(false);
    }
  }

  return (
    <>
      <Header />
      <main className="account-page">
        {loading ? (
          <>
            <div className="section-kicker">YOUR FOODRESCUE SPACE</div>
            <h1>Loading your account…</h1>
          </>
        ) : user ? (user.role === 'provider' ? (
  <ProviderDashboard
    displayName={user.displayName}
    onLogout={logout}
    logoutBusy={logoutBusy}
    error={error}
  />
) : user.role === 'collector' ? (
  <CollectorDashboard
    displayName={user.displayName}
    email={user.email}
    emailVerified={user.emailVerified}
    onLogout={logout}
    logoutBusy={logoutBusy}
    error={error}
  />
) : (
            <>
              <div className="section-kicker">YOUR FOODRESCUE SPACE</div>
              <h1>Hello, <em>{user.displayName}.</em></h1>
              <p>You're signed in as <strong>{user.role}</strong>.</p>

              <div className="account-card">
                <ShieldCheck />
                <div>
                  <strong>
                    {user.emailVerified
                      ? 'Email verified'
                      : 'Email verification pending'}
                  </strong>
                  <p>
                    {user.emailVerified
                      ? 'Your email address has been verified.'
                      : 'Some account actions may require email verification. Email delivery must be configured.'}
                  </p>
                </div>
              </div>

              {error && <div className="form-error" role="alert">{error}</div>}

              <button className="button" onClick={logout} disabled={logoutBusy}>
                {logoutBusy ? 'Signing out…' : 'Sign out'}
              </button>
            </>
          )
        ) : (
          <>
            <div className="section-kicker">YOUR FOODRESCUE SPACE</div>
            <h1>Sign in to continue.</h1>
            <p>{error}</p>
            <Link to="/login" className="button">Go to sign in</Link>
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

function VerifyEmail() {
  const [status, setStatus] = useState('Verifying your email link…');
  const [error, setError] = useState(false);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = new URLSearchParams(window.location.search).get('token');

    if (!token) {
      setStatus('This verification link is missing its token.');
      setError(true);
      return;
    }

    api<{ data: { message: string } }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then((r) => {
        setStatus(r.data.message);
        setDone(true);
      })
      .catch((e) => {
        setStatus(e instanceof Error ? e.message : 'Verification failed.');
        setError(true);
      });
  }, []);

  return (
    <AuthLayout
      title="Email verification"
      subtitle="Confirming your address helps protect the network."
    >
      <div
        className={error ? 'form-error' : done ? 'form-success' : 'form-hint'}
        role="status"
      >
        {status}
      </div>
      <Link className="button form-submit" to="/login">
        Continue to sign in <ArrowRight size={16} />
      </Link>
    </AuthLayout>
  );
}

function ResetPassword() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const schema = z.object({
    password: z.string()
      .min(12, 'Use at least 12 characters.')
      .max(128),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ password: string }>({
    resolver: zodResolver(schema),
  });

  const submit = handleSubmit(async (v) => {
    setError('');
    setMessage('');

    const token = new URLSearchParams(window.location.search).get('token');

    if (!token) {
      setError('Reset token is missing. Request a new reset link.');
      return;
    }

    setBusy(true);

    try {
      const r = await api<{ data: { message: string } }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ ...v, token }),
      });

      setMessage(r.data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Password reset failed.');
    } finally {
      setBusy(false);
    }
  });

  return (
    <AuthLayout
      title="Choose a new password."
      subtitle="Use a long, unique password you do not use elsewhere."
    >
      <form className="auth-form" onSubmit={submit}>
        <Field
          label="New password · 12 characters minimum"
          error={errors.password?.message}
        >
          <input
            type="password"
            autoComplete="new-password"
            {...register('password')}
          />
        </Field>

        {message && <div className="form-success" role="status">{message}</div>}
        {error && <div className="form-error" role="alert">{error}</div>}

        <button className="button form-submit" disabled={busy}>
          {busy ? 'Updating password…' : 'Update password'} <ArrowRight size={16} />
        </button>
      </form>
    </AuthLayout>
  );
}

function NotFound() {
  return (
    <>
      <Header />
      <main className="account-page">
        <div className="section-kicker">404 · WRONG TURN</div>
        <h1>This page hasn't <em>been found.</em></h1>
        <p>Let's get you back to the FoodRescue home page.</p>
        <Link to="/" className="button">
          Back home <ArrowRight size={16} />
        </Link>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/account" element={<Account />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}