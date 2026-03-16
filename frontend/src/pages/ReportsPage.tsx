import { FormEvent, useEffect, useState } from 'react';
import { api } from '../services/api';

type PeriodRow    = { period: string; total: number; purchases: number };
type CategoryRow  = { category: string; total: number; percentTotal: number; previousTotal: number; variationPercent: number };
type SupplierRow  = { supplier: string; total: number; frequency: number; previousTotal: number; variationPercent: number };

function VariationCell({ value }: { value: number }) {
  const color = value > 0 ? 'var(--danger)' : value < 0 ? 'var(--success)' : 'var(--text-muted)';
  const arrow = value > 0 ? '▲' : value < 0 ? '▼' : '—';
  return <span style={{ color, fontWeight: 600 }}>{arrow} {Math.abs(value).toFixed(2)}%</span>;
}

export function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month');

  const [periodRows, setPeriodRows]     = useState<PeriodRow[]>([]);
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([]);
  const [supplierRows, setSupplierRows] = useState<SupplierRow[]>([]);

  useEffect(() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    setFrom(`${y}-${m}-01`);
    setTo(`${y}-${m}-${String(now.getUTCDate()).padStart(2, '0')}`);
  }, []);

  async function loadReports(event?: FormEvent) {
    event?.preventDefault();
    if (!from || !to) return;
    const [period, category, supplier] = await Promise.all([
      api<PeriodRow[]>(`/reports/period?groupBy=${groupBy}&from=${from}&to=${to}`),
      api<CategoryRow[]>(`/reports/category?from=${from}&to=${to}&compare=true`),
      api<SupplierRow[]>(`/reports/supplier?from=${from}&to=${to}&compare=true`),
    ]);
    setPeriodRows(period);
    setCategoryRows(category);
    setSupplierRows(supplier);
  }

  return (
    <>
      <div className="card">
        <div className="card-title">Filtros</div>
        <form onSubmit={loadReports} className="grid">
          <div className="form-group">
            <label>De</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Até</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Agrupar por</label>
            <select className="input" value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'day' | 'week' | 'month')}>
              <option value="day">Dia</option>
              <option value="week">Semana</option>
              <option value="month">Mês</option>
            </select>
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" style={{ marginTop: 'auto' }}>📈 Gerar relatório</button>
          </div>
        </form>
      </div>

      <div className="card">
        <div className="card-title">Por período</div>
        {periodRows.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📅</div>Aplique os filtros para ver os dados.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>Período</th><th>Compras</th><th>Total</th></tr></thead>
              <tbody>
                {periodRows.map((row) => (
                  <tr key={row.period}>
                    <td>{row.period}</td>
                    <td>{row.purchases}</td>
                    <td style={{ fontWeight: 600 }}>R$ {row.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Por categoria</div>
        {categoryRows.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🏷️</div>Aplique os filtros para ver os dados.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Categoria</th><th>Total</th><th>% do total</th><th>Período anterior</th><th>Variação</th></tr>
              </thead>
              <tbody>
                {categoryRows.map((row) => (
                  <tr key={row.category}>
                    <td>{row.category}</td>
                    <td style={{ fontWeight: 600 }}>R$ {row.total.toFixed(2)}</td>
                    <td>{row.percentTotal.toFixed(2)}%</td>
                    <td>R$ {row.previousTotal.toFixed(2)}</td>
                    <td><VariationCell value={row.variationPercent} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Por fornecedor</div>
        {supplierRows.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🏭</div>Aplique os filtros para ver os dados.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr><th>Fornecedor</th><th>Total</th><th>Frequência</th><th>Período anterior</th><th>Variação</th></tr>
              </thead>
              <tbody>
                {supplierRows.map((row) => (
                  <tr key={row.supplier}>
                    <td>{row.supplier}</td>
                    <td style={{ fontWeight: 600 }}>R$ {row.total.toFixed(2)}</td>
                    <td>{row.frequency}x</td>
                    <td>R$ {row.previousTotal.toFixed(2)}</td>
                    <td><VariationCell value={row.variationPercent} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
