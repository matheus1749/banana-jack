import { FormEvent, useState } from 'react';
import { API_URL } from '../services/api';

type Props = { onLogin: (token: string, tenantId: string) => void };
type Mode = 'login' | 'first-access';
type ApiErrorIssue = { path?: Array<string | number>; message?: string };

function parseApiError(body: any, fallback: string): string {
  if (body?.errors && Array.isArray(body.errors)) {
    const messages = (body.errors as ApiErrorIssue[])
      .map((issue) => {
        const field = issue.path?.length ? String(issue.path[0]) : 'campo';
        return `${field}: ${issue.message ?? 'valor inválido'}`;
      })
      .join(' | ');
    if (messages) return messages;
  }
  return body?.message ?? fallback;
}

export function LoginPage({ onLogin }: Props) {
  const [mode, setMode] = useState<Mode>('login');
  const [tenantId, setTenantId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [userName, setUserName] = useState('');
  const [firstEmail, setFirstEmail] = useState('');
  const [firstPassword, setFirstPassword] = useState('');
  const [error, setError] = useState('');

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, email, password }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(parseApiError(body, 'Falha no login'));
      onLogin(body.token, tenantId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleFirstAccess(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_URL}/auth/register-first-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantName, userName, email: firstEmail, password: firstPassword }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(parseApiError(body, 'Falha no cadastro inicial'));
      onLogin(body.token, body.tenantId);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <h2>🍌 Banana Jack</h2>
        <p>Sistema de controle de gastos do restaurante</p>

        <div className="tab-buttons">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>
            Entrar
          </button>
          <button type="button" className={mode === 'first-access' ? 'active' : ''} onClick={() => { setMode('first-access'); setError(''); }}>
            Criar conta
          </button>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="form-stack">
            <div className="form-group">
              <label>Tenant ID</label>
              <input className="input" value={tenantId} onChange={(e) => setTenantId(e.target.value)} placeholder="ID do restaurante" required />
            </div>
            <div className="form-group">
              <label>E-mail</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" required />
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
            <button type="submit">Entrar →</button>
          </form>
        ) : (
          <form onSubmit={handleFirstAccess} className="form-stack">
            <div className="form-group">
              <label>Nome do restaurante</label>
              <input className="input" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} placeholder="Ex: Banana Jack" required />
            </div>
            <div className="form-group">
              <label>Seu nome</label>
              <input className="input" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Nome completo" required />
            </div>
            <div className="form-group">
              <label>E-mail</label>
              <input className="input" type="email" value={firstEmail} onChange={(e) => setFirstEmail(e.target.value)} placeholder="seu@email.com" required />
            </div>
            <div className="form-group">
              <label>Senha</label>
              <input className="input" type="password" minLength={6} value={firstPassword} onChange={(e) => setFirstPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: 14 }}>{error}</p>}
            <button type="submit">Criar conta →</button>
          </form>
        )}
      </div>
    </div>
  );
}
