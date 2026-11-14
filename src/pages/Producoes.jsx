
import { useEffect, useState } from 'react';
import { listProductions } from '../services/api';

export default function Producoes() {
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listProductions()
      .then(setProductions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Carregando produções...</p>;

  const total = productions.length;
  const active = productions.filter(
    (p) => p.status === 'em_andamento'
  ).length;
  const completed = productions.filter(
    (p) => p.status === 'concluida'
  ).length;

  return (
    <div>
      <h2>Produções completas</h2>

      <div className="grid-cards">
        <div className="card">
          <h3>{total}</h3>
          <p>Total de fabricações</p>
        </div>

        <div className="card">
          <h3>{active}</h3>
          <p>Em andamento</p>
        </div>

        <div className="card">
          <h3>{completed}</h3>
          <p>Concluídas</p>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {!productions.length && (
        <div className="card">
          Nenhuma fabricação cadastrada.
        </div>
      )}

      {productions.map((production) => (
        <div className="card" key={production.id}>
          <h3>
            {production.pieceType} — {production.quantity} peças
          </h3>

          <p>
            <strong>Cliente:</strong>{' '}
            {production.owner?.name || 'Não identificado'}
          </p>

          <p>
            <strong>Data:</strong> {production.createdAt}
          </p>

          <p>
            <strong>Status:</strong>{' '}
            {production.status === 'concluida'
              ? 'Concluída'
              : 'Em andamento'}
          </p>

          <p>{production.description}</p>

          <h4>Histórico de serviços</h4>

          {production.services.map((service) => (
            <div
              key={service.id}
              style={{
                padding: 10,
                marginBottom: 8,
                border: '1px solid #ddd',
                borderRadius: 8,
              }}
            >
              <strong>
                Etapa {service.etapaFabricacaoOrdem}: {service.serviceKind}
              </strong>

              <p>
                Status: {service.status}
              </p>

              <p>
                Profissional: {service.pro?.name || 'Aguardando profissional'}
              </p>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
