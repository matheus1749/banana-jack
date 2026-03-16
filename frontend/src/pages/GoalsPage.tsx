import { FormEvent, useEffect, useState } from 'react';
import { api } from '../services/api';

type Goal = { id: string; month_ref: string; goal_amount: string };

export function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [monthRef, setMonthRef] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const data = await api<Goal[]>('/goals');
    setGoals(data);
  }

  useEffect(() => {
    const now = new Date();
    setMonthRef(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    load().catch(() => undefined);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/goals', { method: 'POST', body: JSON.stringify({ monthRef, goalAmount: Number(goalAmount) }) });
      setGoalAmount('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir meta?')) return;
    try {
      await api(`/goals/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-title">Definir meta mensal</div>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Se já existir uma meta para o mês selecionado, ela será substituída automaticamente.
        </p>
        <form onSubmit={handleSubmit} className="grid">
          <div className="form-group">
            <label>Mês de referência</label>
            <input className="input" type="month" value={monthRef} onChange={(e) => setMonthRef(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Valor da meta (R$)</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="Ex: 5000.00" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} required />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" style={{ marginTop: 'auto' }}>🎯 Salvar meta</button>
          </div>
        </form>
        {error && <p style={{ color: 'var(--danger)', marginTop: 10, fontSize: 14 }}>{error}</p>}
      </div>

      <div className="card">
        <div className="card-title">Metas cadastradas</div>
        {goals.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🎯</div>Nenhuma meta cadastrada ainda.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Meta</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {goals.map((goal) => (
                  <tr key={goal.id}>
                    <td>{goal.month_ref}</td>
                    <td>R$ {Number(goal.goal_amount).toFixed(2)}</td>
                    <td>
                      <button className="btn-sm btn-danger" onClick={() => handleDelete(goal.id)}>Excluir</button>
                    </td>
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
