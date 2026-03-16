import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../services/api';

type Kpis = {
  currentMonthTotal: number;
  previousMonthTotal: number;
  variationPercent: number;
  topCategory: { name: string; total: string } | null;
  topSupplier: { name: string; total: string } | null;
};

type Alert = {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
};

export function DashboardPage() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [evolution, setEvolution] = useState<Array<{ month: string; total: string }>>([]);
  const [byCategory, setByCategory] = useState<Array<{ category: string; total: string }>>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    Promise.all([
      api<Kpis>('/dashboard/kpis'),
      api<Array<{ month: string; total: string }>>('/dashboard/evolution?months=6'),
      api<Array<{ category: string; total: string }>>('/dashboard/by-category'),
      api<Alert[]>('/alerts'),
    ])
      .then(([kpiData, evolutionData, categoryData, alertData]) => {
        setKpis(kpiData);
        setEvolution(evolutionData);
        setByCategory(categoryData);
        setAlerts(alertData.slice(0, 5));
      })
      .catch(() => undefined);
  }, []);

  const variation = kpis?.variationPercent ?? 0;
  const variationClass = variation > 0 ? 'kpi-negative' : variation < 0 ? 'kpi-positive' : '';

  return (
    <>
      {/* KPIs */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total mês atual</div>
          <div className="kpi-value">R$ {(kpis?.currentMonthTotal ?? 0).toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Total mês anterior</div>
          <div className="kpi-value">R$ {(kpis?.previousMonthTotal ?? 0).toFixed(2)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Variação</div>
          <div className={`kpi-value ${variationClass}`}>{variation.toFixed(2)}%</div>
          <div className="kpi-sub">{variation > 0 ? '▲ acima do mês anterior' : variation < 0 ? '▼ abaixo do mês anterior' : 'sem variação'}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Top categoria</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{kpis?.topCategory?.name ?? '—'}</div>
          {kpis?.topCategory && <div className="kpi-sub">R$ {Number(kpis.topCategory.total).toFixed(2)}</div>}
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Top fornecedor</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>{kpis?.topSupplier?.name ?? '—'}</div>
          {kpis?.topSupplier && <div className="kpi-sub">R$ {Number(kpis.topSupplier.total).toFixed(2)}</div>}
        </div>
      </div>

      {/* Charts */}
      <div className="grid-2">
        <div className="card">
          <div className="card-title">Evolução mensal</div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={evolution.map((x) => ({ ...x, total: Number(x.total) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
              <Line type="monotone" dataKey="total" stroke="#1e3a5f" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="card-title">Gastos por categoria</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byCategory.map((x) => ({ ...x, total: Number(x.total) }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `R$ ${v.toFixed(2)}`} />
              <Bar dataKey="total" fill="#2a5298" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Alerts */}
      <div className="card">
        <div className="card-title">Alertas recentes</div>
        {alerts.length ? (
          alerts.map((alert) => (
            <div key={alert.id} className={`alert-item badge-${alert.severity}`}>
              <strong>{alert.title}</strong>
              <span>{alert.description}</span>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            Nenhum alerta para o período.
          </div>
        )}
      </div>
    </>
  );
}
