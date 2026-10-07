import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DEMO_ACCOUNTS = [
  { label: 'Agent 1', email: 'agent1@demo.com' },
  { label: 'ASM', email: 'asm@demo.com' },
  { label: 'Agent 2', email: 'agent2@demo.com' },
  { label: 'City Manager', email: 'manager@demo.com' },
  { label: 'Business Head', email: 'bhead@demo.com' },
  { label: 'Admin', email: 'admin@demo.com' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/deals');
    } catch {
      setError('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail: string) => {
    setLoading(true);
    setError('');
    try {
      await login(demoEmail, 'demo1234');
      navigate('/deals');
    } catch {
      setError('Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
    }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 40, width: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a237e', marginBottom: 4 }}>Guaranteed Plan CRM</h1>
        <p style={{ color: '#666', fontSize: 14, marginBottom: 28 }}>NoBroker Resale Deal Flow</p>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#333' }}>Email</label>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
              placeholder="you@company.com"
            />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#333' }}>Password</label>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14 }}
              placeholder="••••••••"
            />
          </div>
          {error && <div style={{ color: '#c62828', fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button
            type="submit" disabled={loading}
            style={{ width: '100%', padding: '11px 0', background: '#1a237e', color: '#fff', border: 'none', borderRadius: 6, fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div style={{ marginTop: 28, borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
          <p style={{ fontSize: 12, color: '#999', marginBottom: 10 }}>Quick demo login (password: demo1234)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email} onClick={() => quickLogin(a.email)} disabled={loading}
                style={{ padding: '5px 10px', background: '#f5f5f5', border: '1px solid #e0e0e0', borderRadius: 4, fontSize: 12, cursor: 'pointer', color: '#333' }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
