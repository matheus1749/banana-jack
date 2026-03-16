import { FormEvent, useEffect, useState } from 'react';
import { api } from '../services/api';

type Category = { id: string; name: string; is_default: boolean };

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const data = await api<Category[]>('/categories');
    setCategories(data);
  }

  useEffect(() => { load().catch(() => undefined); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/categories', { method: 'POST', body: JSON.stringify({ name }) });
      setName('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpdate(id: string) {
    setError('');
    try {
      await api(`/categories/${id}`, { method: 'PUT', body: JSON.stringify({ name: editName }) });
      setEditingId(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir categoria?')) return;
    try {
      await api(`/categories/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-title">Nova categoria</div>
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label>Nome</label>
            <input className="input" placeholder="Ex: Laticínios" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <button type="submit">+ Adicionar</button>
        </form>
        {error && <p style={{ color: 'var(--danger)', marginTop: 10, fontSize: 14 }}>{error}</p>}
      </div>

      <div className="card">
        <div className="card-title">Categorias cadastradas</div>
        {categories.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🏷️</div>Nenhuma categoria ainda.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Padrão</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>
                      {editingId === cat.id ? (
                        <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                      ) : cat.name}
                    </td>
                    <td>
                      {cat.is_default
                        ? <span className="badge badge-default">Padrão</span>
                        : <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {editingId === cat.id ? (
                          <>
                            <button className="btn-sm" onClick={() => handleUpdate(cat.id)}>Salvar</button>
                            <button className="btn-sm btn-outline" onClick={() => setEditingId(null)}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button className="btn-sm btn-outline" onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}>Editar</button>
                            <button className="btn-sm btn-danger" onClick={() => handleDelete(cat.id)}>Excluir</button>
                          </>
                        )}
                      </div>
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
