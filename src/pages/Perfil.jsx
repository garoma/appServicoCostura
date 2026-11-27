
import { useEffect, useState } from 'react';
import StarRating from '../components/StarRating';
import Avatar from '../components/Avatar';
import { getUser, listReviews } from '../services/api';
import { CRITERIA, reviewScore } from '../utils/rating';
import { brl } from '../utils/format';

// Perfil público: usuários veem o do profissional e o profissional vê o do usuário
export default function Perfil({ user, params, go }) {
  const id = params.userId || user.id;

  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    getUser(id).then(setProfile);
    listReviews(id).then(setReviews);
  }, [id]);

  if (!profile) {
    return <p className="muted">Carregando...</p>;
  }

  const isPro = profile.role === 'profissional';

  return (
    <>
      <section className="card profile">
        <Avatar user={profile} size={96} />

        <div>
          <h2>{profile.name}</h2>

          <p className="muted">
            {isPro ? profile.category : 'Cliente'}
            {' · '}
            {profile.city}
          </p>

          {profile.neighborhood && (
            <p className="muted">
              Bairro: {profile.neighborhood}
            </p>
          )}

          <StarRating value={profile.rating} showNumber />

          <small className="muted">
            ({profile.reviewCount} avaliações)
          </small>

          {isPro && profile.bio && (
            <p>{profile.bio}</p>
          )}

          {isPro && profile.kinds?.length > 0 && (
            <p className="muted">
              Serviços: {profile.kinds.join(', ')}
            </p>
          )}

          {isPro && profile.pieces?.length > 0 && (
            <p className="muted">
              Peças: {profile.pieces.join(', ')}
            </p>
          )}

          {isPro && (
            <p className="price">
              a partir de {brl(profile.basePrice)}
            </p>
          )}

          <p className="muted">
            Contato: {profile.phone}
          </p>

          {isPro && user.role === 'usuario' && (
            <button
              className="btn primary"
              onClick={() => go('postarServico', { proId: profile.id })}
            >
              Ofertar serviço
            </button>
          )}
        </div>
      </section>

      <section className="card">
        <h3>Estatísticas de serviços</h3>

        <div className="row wrap">
          <div>
            <strong>{profile.totalServicos ?? 0}</strong>
            <p className="muted">Total de serviços</p>
          </div>

          <div>
            <strong>{profile.servicosEmAndamento ?? 0}</strong>
            <p className="muted">Em andamento</p>
          </div>

          <div>
            <strong>{profile.servicosFinalizados ?? 0}</strong>
            <p className="muted">Finalizados</p>
          </div>

          <div>
            <strong>{profile.servicosCancelados ?? 0}</strong>
            <p className="muted">Cancelados</p>
          </div>
        </div>
      </section>

      <h3>Avaliações recebidas</h3>

      {reviews.map((r) => (
        <article className="card" key={r.id}>
          <div className="row between">
            <b>{r.fromName}</b>
            <StarRating value={reviewScore(r)} showNumber />
          </div>

          <div className="row wrap muted">
            {CRITERIA.map((c) => (
              <span key={c.key}>
                {c.label}: {r[c.key]}
              </span>
            ))}
          </div>

          {r.comment && <p>“{r.comment}”</p>}
        </article>
      ))}

      {!reviews.length && (
        <p className="muted">Ainda sem avaliações.</p>
      )}
    </>
  );
}
