import { useEffect, useState } from 'react';
import StarRating from '../components/StarRating';
import { listServices, createOffer, listServiceKinds, listServiceTypes } from '../services/api';
import { brl } from '../utils/format';

export default function ServicosDisponiveis({ user, go }) {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({}); // { [serviceId]: { price, days } }
  const [kinds, setKinds] = useState([]);
  const [types, setTypes] = useState([]);
  const [filter, setFilter] = useState({ kind: '', piece: '' });

  const load = () => listServices({ forProId: user.id }).then(setServices);
  useEffect(() => {
    load();
    listServiceKinds().then(setKinds);
    listServiceTypes().then(setTypes);
  }, []);

  const setField = (id, k, v) => setForm({ ...form, [id]: { ...form[id], [k]: v } });

  const send = async (s) => {
    const f = form[s.id] || {};
    const price = Number(f.price);
    await createOffer({ serviceId: s.id, proId: user.id, price, quantity: s.quantity, total: price * s.quantity, days: Number(f.days) });
    go('minhasOfertas');
  };

  const shown = services.filter((s) => (!filter.kind || s.serviceKind === filter.kind) && (!filter.piece || s.type === filter.piece));

  return (
    <>
      <div className="card filters">
        <label className="field">Tipo de serviço
          <select value={filter.kind} onChange={(e) => setFilter({ ...filter, kind: e.target.value })}>
            <option value="">Todos</option>
            {kinds.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
        <label className="field">Tipo de peça
          <select value={filter.piece} onChange={(e) => setFilter({ ...filter, piece: e.target.value })}>
            <option value="">Todas</option>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
      </div>

      {shown.map((s) => {
        const already = s.offers.some((o) => o.proId === user.id);
        const f = form[s.id] || {};
        const total = (Number(f.price) || 0) * s.quantity;
        return (
          <article className="card" key={s.id}>
            <div className="row between wrap">
              <div>
                <h3>{s.owner.name}</h3>
                <StarRating value={s.owner.rating} showNumber />
              </div>
              <div className="row">
                {s.targetProId === user.id && <span className="badge em_andamento">Oferta direta para você</span>}
                <button className="btn small" onClick={() => go('perfil', { userId: s.owner.id })}>Ver perfil</button>
              </div>
            </div>

            <p><b>{s.serviceKind} · {s.type}</b> · <b>{s.quantity}</b> peça(s) · <span className="muted">{s.owner.city}</span></p>
            <p>{s.description}</p>
            {s.photos.length > 0 && <div className="photos">{s.photos.map((p, i) => <img key={i} src={p} alt="" />)}</div>}

            {already ? (
              <p className="muted">Você já enviou uma oferta para este serviço.</p>
            ) : (
              <div className="row wrap">
                <label className="field inline">Seu preço (unidade) R$
                  <input type="number" min="0.01" step="0.01" value={f.price || ''} onChange={(e) => setField(s.id, 'price', e.target.value)} />
                </label>
                <label className="field inline">Quantidade
                  <input value={s.quantity} readOnly />
                </label>
                <label className="field inline">Preço total
                  <input value={brl(total)} readOnly />
                </label>
                <label className="field inline">Prazo (dias)
                  <input type="number" min="1" value={f.days || ''} onChange={(e) => setField(s.id, 'days', e.target.value)} />
                </label>
                <button className="btn primary" disabled={!f.price || !f.days} onClick={() => send(s)}>Enviar oferta</button>
              </div>
            )}
          </article>
        );
      })}
      {!shown.length && <p className="muted">Nenhum serviço aberto no momento.</p>}
    </>
  );
}
