import { useEffect, useState } from 'react';
import StarRating from '../components/StarRating';
import Avatar from '../components/Avatar';
import { listProfessionals, listServiceKinds, listServiceTypes } from '../services/api';
import { brl } from '../utils/format';

export default function BuscarProfissionais({ go }) {
  const [filters, setFilters] = useState({ q: '', kind: '', piece: '', maxPrice: '', minRating: 0, sort: 'rating' });
  const [list, setList] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [types, setTypes] = useState([]);

  useEffect(() => {
    listServiceKinds().then(setKinds);
    listServiceTypes().then(setTypes);
  }, []);

  useEffect(() => {
    listProfessionals({ ...filters, maxPrice: Number(filters.maxPrice) || 0 }).then(setList);
  }, [filters]);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <>
      <div className="card filters">
        <label className="field">Buscar por nome<input placeholder="Nome do profissional" value={filters.q} onChange={set('q')} /></label>
        <label className="field">Tipo de serviço
          <select value={filters.kind} onChange={set('kind')}>
            <option value="">Todos</option>
            {kinds.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
        <label className="field">Tipo de peça
          <select value={filters.piece} onChange={set('piece')}>
            <option value="">Todas</option>
            {types.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label className="field">Preço máximo (R$)<input type="number" min="0" value={filters.maxPrice} onChange={set('maxPrice')} /></label>
        <label className="field">Avaliação mínima
          <select value={filters.minRating} onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}>
            {[0, 3, 4, 4.5].map((n) => <option key={n} value={n}>{n ? `${n}+ estrelas` : 'Qualquer'}</option>)}
          </select>
        </label>
        <label className="field">Ordenar por
          <select value={filters.sort} onChange={set('sort')}>
            <option value="rating">Melhor avaliação</option>
            <option value="price">Menor preço</option>
          </select>
        </label>
      </div>

      <div className="grid cards">
        {list.map((p) => (
          <article className="card" key={p.id}>
            <div className="row">
              <Avatar user={p} size={52} />
              <div>
                <h3>{p.name}</h3>
                <p className="muted">{p.category} · {p.city}</p>
              </div>
            </div>
            <StarRating value={p.rating} showNumber /> <small className="muted">({p.reviewCount})</small>
            {p.kinds?.length > 0 && <p className="muted">Serviços: {p.kinds.join(', ')}</p>}
            {p.pieces?.length > 0 && <p className="muted">Peças: {p.pieces.join(', ')}</p>}
            <p className="price">a partir de {brl(p.basePrice)}</p>
            <div className="row">
              <button className="btn" onClick={() => go('perfil', { userId: p.id })}>Ver perfil</button>
              <button className="btn primary" onClick={() => go('postarServico', { proId: p.id })}>Ofertar serviço</button>
            </div>
          </article>
        ))}
        {!list.length && <p className="muted">Nenhum profissional encontrado com esses filtros.</p>}
      </div>
    </>
  );
}
