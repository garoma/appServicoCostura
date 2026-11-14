import { useState } from 'react';
import StarRating from './StarRating';
import { CRITERIA, reviewScore } from '../utils/rating';
import { createReview } from '../services/api';

// Formulário de avaliação: qualidade, prazo, preço, atendimento + comentário
export default function AvaliacaoForm({ fromId, toId, toName, serviceId, onDone, onCancel }) {
  const [scores, setScores] = useState({ quality: 0, deadline: 0, price: 0, service: 0 });
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  const complete = CRITERIA.every((c) => scores[c.key] > 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!complete) return setError('Dê uma nota de 1 a 5 para cada critério.');
    await createReview({ fromId, toId, serviceId, comment, ...scores });
    onDone();
  };

  return (
    <form className="card review-form" onSubmit={submit}>
      <h3>Avaliar {toName}</h3>
      {CRITERIA.map((c) => (
        <div className="row between" key={c.key}>
          <span>{c.label} <small className="muted">(peso {Math.round(c.weight * 100)}%)</small></span>
          <StarRating value={scores[c.key]} onChange={(n) => setScores({ ...scores, [c.key]: n })} />
        </div>
      ))}
      <p className="muted">Nota final ponderada: <b>{complete ? reviewScore(scores).toFixed(2) : '-'}</b></p>
      <label className="field">
        Comentário (opcional)
        <textarea rows="3" value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn primary" type="submit">Enviar avaliação</button>
        <button className="btn" type="button" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
