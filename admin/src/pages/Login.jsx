import { useState } from 'react';
import { useAuth } from '../auth';

export default function Login() {
  const { login, error: authError, isDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.code?.includes('invalid-credential') ? 'Incorrect email or password.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <img src="/favicon.svg" alt="" width="48" height="48" />
        <h1>PureFlow Admin</h1>
        <p className="muted">Manage orders, dealers and the service desk.</p>
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error || authError ? <p className="error">{error || authError}</p> : null}
        <button className="btn primary full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {isDemo ? (
          <div className="demo-hint">
            <strong>Demo admin</strong>
            <span>admin@pureflow.test · Admin@123</span>
            <button type="button" className="btn ghost sm" onClick={() => { setEmail('admin@pureflow.test'); setPassword('Admin@123'); }}>
              Fill in
            </button>
          </div>
        ) : null}
      </form>
    </div>
  );
}
