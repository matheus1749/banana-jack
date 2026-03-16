import { useState } from 'react';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { PurchasesPage } from './pages/PurchasesPage';
import { ReportsPage } from './pages/ReportsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { GoalsPage } from './pages/GoalsPage';

type Screen = 'dashboard' | 'purchases' | 'reports' | 'categories' | 'suppliers' | 'goals';

const NAV_ITEMS: { key: Screen; icon: string; label: string }[] = [
  { key: 'dashboard',  icon: '📊', label: 'Dashboard' },
  { key: 'purchases',  icon: '🛒', label: 'Compras' },
  { key: 'reports',    icon: '📈', label: 'Relatórios' },
  { key: 'categories', icon: '🏷️',  label: 'Categorias' },
  { key: 'suppliers',  icon: '🏭', label: 'Fornecedores' },
  { key: 'goals',      icon: '🎯', label: 'Metas' },
];

const PAGE_TITLES: Record<Screen, string> = {
  dashboard:  'Dashboard',
  purchases:  'Compras',
  reports:    'Relatórios',
  categories: 'Categorias',
  suppliers:  'Fornecedores',
  goals:      'Metas Mensais',
};

export function App() {
  const [token, setToken] = useState(localStorage.getItem('token') ?? '');
  const [screen, setScreen] = useState<Screen>('dashboard');

  function handleLogin(nextToken: string, tenantId: string) {
    localStorage.setItem('token', nextToken);
    localStorage.setItem('tenantId', tenantId);
    setToken(nextToken);
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('tenantId');
    setToken('');
  }

  if (!token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>🍌 Banana Jack</h1>
          <span>Controle de gastos</span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`nav-item${screen === item.key ? ' active' : ''}`}
              onClick={() => setScreen(item.key)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout}>↩ Sair</button>
        </div>
      </aside>

      <main className="main-content">
        <h2 className="page-title">{PAGE_TITLES[screen]}</h2>

        {screen === 'dashboard'  && <DashboardPage />}
        {screen === 'purchases'  && <PurchasesPage />}
        {screen === 'reports'    && <ReportsPage />}
        {screen === 'categories' && <CategoriesPage />}
        {screen === 'suppliers'  && <SuppliersPage />}
        {screen === 'goals'      && <GoalsPage />}
      </main>
    </div>
  );
}
