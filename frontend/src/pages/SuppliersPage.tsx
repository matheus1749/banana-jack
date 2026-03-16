import { FormEvent, useEffect, useState } from 'react';
import { api } from '../services/api';

type Supplier = { id: string; name: string; document: string | null };

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDocument, setEditDocument] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const data = await api<Supplier[]>('/suppliers');
    setSuppliers(data);
  }

  useEffect(() => { load().catch(() => undefined); }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await api('/suppliers', { method: 'POST', body: JSON.stringify({ name, document: document || null }) });
      setName('');
      setDocument('');
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleUpdate(id: string) {
    setError('');
    try {
      await api(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify({ name: editName, document: editDocument || null }) });
      setEditingId(null);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir fornecedor?')) return;
    try {
      await api(`/suppliers/${id}`, { method: 'DELETE' });
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <div className="card">
        <div className="card-title">Novo fornecedor</div>
        <form onSubmit={handleCreate} className="grid">
          <div className="form-group">
            <label>Nome</label>
            <input className="input" placeholder="Nome do fornecedor" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>CNPJ / CPF (opcional)</label>
            <input className="input" placeholder="00.000.000/0000-00" value={document} onChange={(e) => setDocument(e.target.value)} />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" style={{ marginTop: 'auto' }}>+ Adicionar</button>
          </div>
        </form>
        {error && <p style={{ color: 'var(--danger)', marginTop: 10, fontSize: 14 }}>{error}</p>}
      </div>

      <div className="card">
        <div className="card-title">Fornecedores cadastrados</div>
        {suppliers.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🏭</div>Nenhum fornecedor ainda.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CNPJ / CPF</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((sup) => (
                  <tr key={sup.id}>
                    <td>
                      {editingId === sup.id
                        ? <input className="input" value={editName} onChange={(e) => setEditName(e.target.value)} />
                        : sup.name}
                    </td>
                    <td>
                      {editingId === sup.id
                        ? <input className="input" value={editDocument} onChange={(e) => setEditDocument(e.target.value)} placeholder="CNPJ / CPF" />
                        : sup.document ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {editingId === sup.id ? (
                          <>
                            <button className="btn-sm" onClick={() => handleUpdate(sup.id)}>Salvar</button>
                            <button className="btn-sm btn-outline" onClick={() => setEditingId(null)}>Cancelar</button>
                          </>
                        ) : (
                          <>
                            <button className="btn-sm btn-outline" onClick={() => { setEditingId(sup.id); setEditName(sup.name); setEditDocument(sup.document ?? ''); }}>Editar</button>
                            <button className="btn-sm btn-danger" onClick={() => handleDelete(sup.id)}>Excluir</button>
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
