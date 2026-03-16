import { FormEvent, useEffect, useState } from 'react';
import { API_URL, api, getTenantId, getToken } from '../services/api';

type Supplier = { id: string; name: string };
type Category = { id: string; name: string };
type Purchase = {
  id: string;
  purchase_date: string;
  supplier_name: string;
  category_name: string;
  total_amount: string;
  payment_method: string;
};

const PAYMENT_METHODS = [
  { value: 'pix',      label: 'PIX' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'debito',   label: 'Débito' },
  { value: 'credito',  label: 'Crédito' },
  { value: 'boleto',   label: 'Boleto' },
];

export function PurchasesPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [purchaseDate, setPurchaseDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [error, setError] = useState('');

  async function loadAll() {
    const [supplierData, categoryData, purchaseData] = await Promise.all([
      api<Supplier[]>('/suppliers'),
      api<Category[]>('/categories'),
      api<Purchase[]>('/purchases'),
    ]);
    setSuppliers(supplierData);
    setCategories(categoryData);
    setPurchases(purchaseData);
  }

  useEffect(() => { loadAll().catch(() => undefined); }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      let invoiceImageUrl: string | undefined;

      if (invoiceFile) {
        const formData = new FormData();
        formData.append('file', invoiceFile);
        const response = await fetch(`${API_URL}/uploads/invoice`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}`, 'x-tenant-id': getTenantId() },
          body: formData,
        });
        if (!response.ok) throw new Error('Falha no upload da nota fiscal');
        const body = (await response.json()) as { fileUrl: string };
        invoiceImageUrl = body.fileUrl;
      }

      await api('/purchases', {
        method: 'POST',
        body: JSON.stringify({ purchaseDate, supplierId, categoryId, totalAmount: Number(totalAmount), paymentMethod, notes: notes || undefined, invoiceImageUrl }),
      });

      setPurchaseDate('');
      setSupplierId('');
      setCategoryId('');
      setTotalAmount('');
      setPaymentMethod('pix');
      setNotes('');
      setInvoiceFile(null);
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir compra?')) return;
    try {
      await api(`/purchases/${id}`, { method: 'DELETE' });
      await loadAll();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function openExport(path: string) {
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    const sep = path.includes('?') ? '&' : '?';
    const url = `${API_URL}${path}${query.toString() ? `${sep}${query.toString()}` : ''}`;

    fetch(url, { headers: { Authorization: `Bearer ${getToken()}`, 'x-tenant-id': getTenantId() } })
      .then(async (res) => {
        if (!res.ok) throw new Error('Falha ao exportar');
        const blob = await res.blob();
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = path.includes('.csv') ? 'compras.csv' : 'relatorio.pdf';
        link.click();
        window.URL.revokeObjectURL(link.href);
      })
      .catch(() => undefined);
  }

  return (
    <>
      {/* Form */}
      <div className="card">
        <div className="card-title">Nova compra</div>
        <form onSubmit={handleSubmit}>
          <div className="grid" style={{ marginBottom: 12 }}>
            <div className="form-group">
              <label>Data</label>
              <input className="input" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Fornecedor</label>
              <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
                <option value="">Selecione...</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Categoria</label>
              <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
                <option value="">Selecione...</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Valor total (R$)</label>
              <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Forma de pagamento</label>
              <select className="input" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Nota fiscal (opcional)</label>
              <input className="input" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(e) => setInvoiceFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 14 }}>
            <label>Observações (opcional)</label>
            <input className="input" placeholder="Ex: compra semanal de carnes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p style={{ color: 'var(--danger)', fontSize: 14, marginBottom: 10 }}>{error}</p>}
          <button type="submit">🛒 Salvar compra</button>
        </form>
      </div>

      {/* Export */}
      <div className="card">
        <div className="card-title">Exportações</div>
        <div className="grid">
          <div className="form-group">
            <label>De</label>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Até</label>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
              <button className="btn-outline" onClick={() => openExport('/exports/purchases.csv')}>📄 CSV</button>
              <button className="btn-outline" onClick={() => openExport('/exports/reports.pdf?type=category')}>📑 PDF Cat.</button>
              <button className="btn-outline" onClick={() => openExport('/exports/reports.pdf?type=supplier')}>📑 PDF Forn.</button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-title">Histórico de compras</div>
        {purchases.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🛒</div>Nenhuma compra registrada ainda.</div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Fornecedor</th>
                  <th>Categoria</th>
                  <th>Pagamento</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id}>
                    <td>{p.purchase_date}</td>
                    <td>{p.supplier_name}</td>
                    <td>{p.category_name}</td>
                    <td><span className="badge badge-default">{p.payment_method.toUpperCase()}</span></td>
                    <td style={{ fontWeight: 600 }}>R$ {Number(p.total_amount).toFixed(2)}</td>
                    <td>
                      <button className="btn-sm btn-danger" onClick={() => handleDelete(p.id)}>Excluir</button>
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
