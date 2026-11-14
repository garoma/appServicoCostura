import { useEffect, useState } from 'react';
import { listUsers, toggleBlock } from '../services/api';

export default function AdminBloqueios() {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');

  const load = () => listUsers().then(setUsers);
  useEffect(() => { load(); }, []);

  const toggle = async (id) => { await toggleBlock(id); load(); };
  const shown = users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <div className="card filters">
        <label className="field">Buscar usuário ou profissional
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou e-mail" />
        </label>
      </div>
      <div className="table-wrap card">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Tipo</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td>
                <td><span className={`badge ${u.blocked ? 'atrasado' : 'pago'}`}>{u.blocked ? 'Bloqueado' : 'Ativo'}</span></td>
                <td>
                  <button className={`btn small ${u.blocked ? '' : 'danger'}`} onClick={() => toggle(u.id)}>
                    {u.blocked ? 'Desbloquear' : 'Bloquear'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
