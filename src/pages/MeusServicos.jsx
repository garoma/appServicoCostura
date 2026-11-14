import { useEffect, useState } from 'react';
import AvaliacaoForm from '../components/AvaliacaoForm';
import StarRating from '../components/StarRating';
import { listServices, acceptOffer, concludeService } from '../services/api';
import { brl } from '../utils/format';

const STATUS = { aberto: 'Aberto', em_andamento: 'Em andamento', concluido: 'Concluído' };

export default function MeusServicos({ user, go }) {
  const [services, setServices] = useState([]);
  const [reviewing, setReviewing] = useState(null);

  const load = () => listServices({ ownerId: user.id }).then(setServices);
  useEffect(() => { load(); }, []);

  const accept = async (id) => { await acceptOffer(id); load(); };
  const conclude = async (s) => { await concludeService(s.id); await load(); setReviewing(s); };

  return (
    <>
      {reviewing && (
        <AvaliacaoForm
          fromId={user.id}
          toId={reviewing.proId}
          toName={reviewing.pro?.name || 'o profissional'}
          serviceId={reviewing.id}
          onDone={() => setReviewing(null)}
          onCancel={() => setReviewing(null)}
        />
      )}

      {services.map((s) => (
        <article className="card" key={s.id}>
          <div className="row between">
            <h3>{s.serviceKind} · {s.type}</h3>
            <span className={`badge ${s.status}`}>{STATUS[s.status]}</span>
          </div>
          <p>{s.description}</p>
          <p className="muted">Quantidade: <b>{s.quantity}</b> peça(s){s.price && <> · Valor combinado: {brl(s.price)} por peça, total {brl(s.total)}</>}</p>
          {s.photos.length > 0 && <div className="photos">{s.photos.map((p, i) => <img key={i} src={p} alt="" />)}</div>}

          {s.status === 'aberto' && (
            <>
              <h4>Ofertas recebidas ({s.offers.length})</h4>
              {s.offers.map((o) => (
                <div className="row between offer" key={o.id}>
                  <div>
                    <b>{o.pro.name}</b> <StarRating value={o.pro.rating} showNumber />
                    <div className="muted">{brl(o.price)} por peça · total {brl(o.total)} · prazo {o.days} dia(s)</div>
                  </div>
                  <div className="row">
                    <button className="btn small" onClick={() => go('perfil', { userId: o.pro.id })}>Perfil</button>
                    <button className="btn small primary" onClick={() => accept(o.id)}>Aceitar</button>
                  </div>
                </div>
              ))}
              {!s.offers.length && <p className="muted">Aguardando propostas de profissionais.</p>}
            </>
          )}

          {s.status === 'em_andamento' && (
            <div className="row between">
              <span>Profissional: <b>{s.pro?.name}</b></span>
              <button className="btn primary" onClick={() => conclude(s)}>Marcar como concluído</button>
            </div>
          )}

          {s.status === 'concluido' && s.pro && (
            <button className="btn" onClick={() => setReviewing(s)}>Avaliar {s.pro.name}</button>
          )}
        </article>
      ))}
      {!services.length && <p className="muted">Você ainda não postou serviços.</p>}
    </>
  );
}
