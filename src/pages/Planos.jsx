import { useEffect, useState } from 'react';
import { listPayments, setPlan } from '../services/api';
import { FEES } from '../config/apiConfig';
import { brl, dateBR } from '../utils/format';

const PLANS = [
  { id: 'taxa_servico', title: 'Taxa por serviço', desc: `${FEES.proServiceRate * 100}% sobre cada serviço concluído. Sem custo fixo.` },
  { id: 'mensal', title: 'Mensalidade', desc: `${brl(FEES.proMonthly)} por mês, sem taxa por serviço.` },
];

export default function Planos({ user }) {
  const [plan, setPlanState] = useState(user.plan);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    listPayments().then((all) => setPayments(all.filter((p) => p.payerId === user.id)));
  }, []);

  const choose = async (id) => {
    await setPlan(user.id, id);
    setPlanState(id);
    localStorage.setItem('user', JSON.stringify({ ...user, plan: id }));
  };

  return (
    <>
      <div className="grid two">
        {PLANS.map((p) => (
          <article key={p.id} className={`card plan ${plan === p.id ? 'selected' : ''}`}>
            <h3>{p.title}</h3>
            <p>{p.desc}</p>
            <button className="btn primary" disabled={plan === p.id} onClick={() => choose(p.id)}>
              {plan === p.id ? 'Plano atual' : 'Escolher plano'}
            </button>
          </article>
        ))}
      </div>

      <h3>Meus pagamentos ao app</h3>
      <div className="table-wrap card">
        <table>
          <thead><tr><th>Data</th><th>Tipo</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id}>
                <td>{dateBR(p.date)}</td><td>{p.type}</td><td>{brl(p.amount)}</td>
                <td><span className={`badge ${p.status}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
