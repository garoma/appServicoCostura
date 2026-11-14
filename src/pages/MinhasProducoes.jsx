
import { useEffect, useState } from 'react';
import { listProductions } from '../services/api';

const statusLabel = {
  nao_iniciada: 'Não iniciada',
  iniciada: 'Iniciada',
  em_desenvolvimento: 'Em desenvolvimento',
  finalizada: 'Finalizada',
};

const productionLabel = {
  aguardando: 'Aguardando início',
  em_andamento: 'Em fabricação',
  em_fabricacao: 'Em fabricação',
  em_espera: 'Em espera',
  concluida: 'Fabricação concluída',
  cancelada: 'Cancelada',
};

function calcularProducao(etapas) {
  const total = etapas.length;

  if (!total) {
    return {
      percentual: 0,
      feitas: 0,
      faltam: 0,
    };
  }

  const feitas = etapas.filter(
    (etapa) => etapa.status === 'finalizada'
  ).length;

  const soma = etapas.reduce((acumulado, etapa) => {
    if (etapa.status === 'finalizada') {
      return acumulado + 100;
    }

    if (etapa.status === 'em_desenvolvimento') {
      return acumulado + Number(etapa.percentualConclusao || 0);
    }

    return acumulado;
  }, 0);

  return {
    percentual: Math.round(soma / total),
    feitas,
    faltam: total - feitas,
  };
}

export default function MinhasProducoes({ user }) {
  const [productions, setProductions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listProductions({ ownerId: user.id })
      .then(setProductions)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user.id]);

  if (loading) {
    return <p>Carregando suas produções...</p>;
  }

  return (
    <div>
      <h2>Minhas produções</h2>

      <p className="muted">
        Acompanhe o andamento de cada fase da fabricação das suas peças.
      </p>

      {error && <p className="error">{error}</p>}

      {!productions.length && (
        <div className="card">
          Você ainda não iniciou nenhuma fabricação.
        </div>
      )}

      {productions.map((production) => {
        const steps = production.steps || [];

        const result = calcularProducao(steps);
        const progress = result.percentual;
        const faltaPercent = 100 - progress;

        return (
          <article className="card" key={production.id}>
            <div className="row between wrap">
              <div>
                <h3>{production.pieceType}</h3>
                <span className="muted">
                  Produção #{production.id}
                </span>
              </div>

              <span className="badge">
                {productionLabel[production.status] ||
                  production.status}
              </span>
            </div>

            <p>
              <strong>Quantidade:</strong>{' '}
              {production.quantity} peças
            </p>

            <p>
              <strong>Início:</strong> {production.createdAt}
            </p>

            <p>{production.description}</p>

            {/* PROGRESSO GERAL */}
            <section style={{ marginTop: 20 }}>
              <div className="row between">
                <h4>Progresso da fabricação</h4>
                <strong>{progress}%</strong>
              </div>

              <div
                style={{
                  height: 14,
                  background: '#e5e7eb',
                  borderRadius: 20,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: '#16a34a',
                    borderRadius: 20,
                    transition: 'width .3s',
                  }}
                />
              </div>

              <small className="muted">
                {result.feitas} de {steps.length} etapas finalizadas.
              </small>
            </section>

            {/* FEITO X FALTA */}
            <section style={{ marginTop: 22 }}>
              <h4>O que foi feito e o que falta</h4>

              <div
                style={{
                  display: 'flex',
                  height: 24,
                  borderRadius: 8,
                  overflow: 'hidden',
                  background: '#e5e7eb',
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    background: '#16a34a',
                    transition: 'width .3s',
                  }}
                />

                <div
                  style={{
                    width: `${faltaPercent}%`,
                    background: '#f59e0b',
                    transition: 'width .3s',
                  }}
                />
              </div>

              <div
                className="row between wrap"
                style={{ marginTop: 10 }}
              >
                <span style={{ color: '#16a34a' }}>
                  ● Feito: {progress}%
                </span>

                <span style={{ color: '#d97706' }}>
                  ● Falta: {faltaPercent}%
                </span>
              </div>
            </section>

            {/* ETAPAS INDIVIDUAIS */}
            <section style={{ marginTop: 24 }}>
              <h4>Detalhamento das etapas</h4>

              {steps.map((step) => {
                const phasePercent =
                  step.status === 'finalizada'
                    ? 100
                    : step.status === 'em_desenvolvimento'
                      ? Number(step.percentualConclusao || 0)
                      : 0;

                return (
                  <div
                    key={step.order}
                    style={{ marginBottom: 18 }}
                  >
                    <div className="row between wrap">
                      <strong>
                        {step.order}. {step.serviceKind}
                      </strong>

                      <small>
                        {statusLabel[step.status] || step.status}
                      </small>
                    </div>

                    <div
                      style={{
                        height: 9,
                        background: '#e5e7eb',
                        borderRadius: 10,
                        overflow: 'hidden',
                        marginTop: 7,
                      }}
                    >
                      <div
                        style={{
                          width: `${phasePercent}%`,
                          height: '100%',
                          background: '#16a34a',
                          transition: 'width .3s',
                        }}
                      />
                    </div>

                    <small className="muted">
                      {phasePercent}% concluído
                      {step.pro?.name
                        ? ` · ${step.pro.name}`
                        : ''}
                    </small>
                  </div>
                );
              })}
            </section>

            {production.status === 'concluida' && (
              <p className="success">
                Todas as etapas foram concluídas!
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
