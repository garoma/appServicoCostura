
import { useState } from 'react';
import StarRating from './StarRating';

import {
  CRITERIA_CLIENTE_AVALIA_PROFISSIONAL,
  CRITERIA_PROFISSIONAL_AVALIA_CLIENTE,
  reviewScore,
} from '../utils/rating';

import { createReview } from '../services/api';

export default function AvaliacaoForm({
  fromId,
  toId,
  toName,
  serviceId,
  tipoAvaliacao,
  onDone,
  onCancel,
}) {
  const criterios =
    tipoAvaliacao === 'clienteAvaliaProfissional'
      ? CRITERIA_CLIENTE_AVALIA_PROFISSIONAL
      : CRITERIA_PROFISSIONAL_AVALIA_CLIENTE;

  const [scores, setScores] = useState({
    quality: 0,
    deadline: 0,
    price: 0,
    service: 0,
    clarity: 0,
  });

  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const complete = criterios.every(
    (criterio) => scores[criterio.key] > 0
  );

  const submit = async (e) => {
    e.preventDefault();

    if (!complete) {
      setError('Dê uma nota de 1 a 5 para cada critério.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const avaliacao = {
        fromId,
        toId,
        serviceId,
        comment,
        quality: tipoAvaliacao === 'clienteAvaliaProfissional'
          ? scores.quality
          : null,
        deadline: scores.deadline,
        price: tipoAvaliacao === 'clienteAvaliaProfissional'
          ? scores.price
          : null,
        service: scores.service,
        clarity: tipoAvaliacao === 'profissionalAvaliaCliente'
          ? scores.clarity
          : null,
      };

      await createReview(avaliacao);

      onDone();
    } catch (err) {
      console.error('ERRO AO ENVIAR A AVALIAÇÃO:', err);
      setError(err.message || 'Não foi possível enviar a avaliação.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="card review-form" onSubmit={submit}>
      <h3>Avaliar {toName}</h3>

      {criterios.map((criterio) => (
        <div className="row between" key={criterio.key}>
          <span>
            {criterio.label}{' '}
            <small className="muted">
              (peso {Math.round(criterio.weight * 100)}%)
            </small>
          </span>

          <StarRating
            value={scores[criterio.key]}
            onChange={(nota) =>
              setScores((anterior) => ({
                ...anterior,
                [criterio.key]: nota,
              }))
            }
          />
        </div>
      ))}

      <p className="muted">
        Nota final ponderada:{' '}
        <b>
          {complete
            ? reviewScore(scores, tipoAvaliacao).toFixed(2)
            : '-'}
        </b>
      </p>

      <label className="field">
        Comentário (opcional)
        <textarea
          rows="3"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </label>

      {error && <p className="error">{error}</p>}

      <div className="row">
        <button
          className="btn primary"
          type="submit"
          disabled={submitting || !tipoAvaliacao}
        >
          {submitting ? 'Enviando...' : 'Enviar avaliação'}
        </button>

        <button
          className="btn"
          type="button"
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
