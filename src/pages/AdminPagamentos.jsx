import { useEffect, useState } from 'react';
import { listPayments, payPayment } from '../services/api';
import { brl, dateBR } from '../utils/format';

export default function AdminPagamentos() {
  const [payments, setPayments] = useState([]);
  const [role, setRole] = useState('todos');
  const [status, setStatus] = useState('todos');

  const load = () => listPayments().then(setPayments);
  useEffect(() => { load(); }, []);

  const shown = payments.filter((p) => (role === 'todos' || p.payerRole === role) && (status === 'todos' || p.status === status));
  // Recebido, pendente e atrasado são somados pelo PREÇO TOTAL
  const sum = (st) => payments.filter((p) => p.status === st).reduce((s, p) => s + p.total, 0);

  const markPaid = async (id) => { await payPayment(id); load(); };

  return (
    <>
      <div className="grid cards">
        <div className="card"><small className="muted">Recebido (preço total)</small><h2>{brl(sum('pago'))}</h2></div>
        <div className="card"><small className="muted">Pendente (preço total)</small><h2>{brl(sum('pendente'))}</h2></div>
        <div className="card"><small className="muted">Atrasado (preço total)</small><h2 className="error">{brl(sum('atrasado'))}</h2></div>
      </div>

      <div className="card filters">
        <label className="field">Quem paga
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="usuario">Usuários</option>
            <option value="profissional">Profissionais</option>
          </select>
        </label>
        <label className="field">Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {['todos', 'pago', 'pendente', 'atrasado'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
      </div>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr><th>Data</th><th>Pagador</th><th>Cobrança</th><th>Serviço</th><th>Preço (un.)</th><th>Qtd. peças</th><th>Preço total</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <td>{dateBR(p.date)}</td>
                <td>{p.payerName} <small className="muted">({p.payerRole})</small></td>
                <td>{p.type}</td>
                <td>{p.serviceKind ? `${p.serviceKind} · ${p.pieceType}` : '-'}</td>
                <td>{brl(p.unitPrice)}</td>
                <td>{p.quantity}</td>
                <td><b>{brl(p.total)}</b></td>
                <td><span className={`badge ${p.status}`}>{p.status}</span></td>
                <td>{p.status !== 'pago' && <button className="btn small" onClick={() => markPaid(p.id)}>Confirmar pagamento</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
