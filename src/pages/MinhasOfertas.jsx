
import { useEffect, useState } from 'react';
import AvaliacaoForm from '../components/AvaliacaoForm';
import StarRating from '../components/StarRating';
import {
  listOffers,
  updateFabricationStepProgress,
  concludeService,
} from '../services/api';
import { brl } from '../utils/format';

const LABEL = {
  pendente: 'Pendente',
  aceita: 'Aceita',
  recusada: 'Recusada',
};

const ETAPA_LABEL = {
  nao_iniciada: 'Não iniciada',
  iniciada: 'Iniciada',
  em_desenvolvimento: 'Em desenvolvimento',
  finalizada: 'Finalizada',
};

export default function MinhasOfertas({ user, go }) {
  const [offers, setOffers] = useState([]);
  const [reviewing, setReviewing] = useState(null);
  const [q, setQ] = useState('');
  const [percentages, setPercentages] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = async () => {
    try {
      const result = await listOffers({ proId: user.id });
      setOffers(result || []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar suas ofertas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user.id]);

  const saveStep = async (service, etapaStatus, percentual = 0) => {
    try {
      setError('');
      setMessage('');
      setSavingId(service.id);

      await updateFabricationStepProgress(
        service.id,
        etapaStatus,
        percentual
      );

      if (etapaStatus === 'finalizada') {
        await concludeService(service.id);
      }

      setMessage(
        etapaStatus === 'finalizada'
          ? 'Etapa finalizada! A próxima etapa foi liberada, se houver.'
          : 'Andamento da etapa atualizado.'
      );

      await load();
    } catch (err) {
      setError(err.message || 'Não foi possível atualizar a etapa.');
    } finally {
      setSavingId(null);
    }
  };

  const shown = offers.filter((o) =>
    o.service?.owner?.name
      ?.toLowerCase()
      .includes(q.toLowerCase())
  );

  if (loading) return <p className="muted">Carregando suas ofertas...</p>;

  return (
    <>
      {reviewing && (
        <AvaliacaoForm
          fromId={user.id}
          toId={reviewing.service.owner.id}
          toName={reviewing.service.owner.name}
          serviceId={reviewing.service.id}
          onDone={() => setReviewing(null)}
          onCancel={() => setReviewing(null)}
        />
      )}

      <div className="card filters">
        <label className="field">
          Buscar por nome do usuário
          <input
            placeholder="Nome do cliente"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
      </div>

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      {shown.map((o) => {
        const service = o.service;
        const isCompleteProduction = Boolean(service.pecaCompleta);
        const etapaStatus = service.etapaStatus || 'nao_iniciada';

        const percentual =
          percentages[service.id] ??
          service.percentualConclusao ??
          1;

        const canUpdate =
          o.status === 'aceita' &&
          service.status === 'em_andamento' &&
          isCompleteProduction;

        const currentPercent =
          etapaStatus === 'finalizada'
            ? 100
            : service.percentualConclusao || 0;

        return (
          <article className="card" key={o.id}>
            <div className="row between wrap">
              <div>
                <h3>{service.owner.name}</h3>
                <StarRating value={service.owner.rating} showNumber />
                <div className="muted">
                  {service.owner.city} · {service.owner.phone}
                </div>
              </div>

              <span className={`badge ${o.status}`}>
                {LABEL[o.status]}
              </span>
            </div>

            <p>
              <b>{service.serviceKind} · {service.type}</b>
              {' · '}
              {service.description}
            </p>

            {service.photos?.length > 0 && (
              <div className="photos">
                {service.photos.map((p, i) => (
                  <img key={i} src={p} alt="" />
                ))}
              </div>
            )}

            <dl className="data-list">
              <div>
                <dt>Quantidade</dt>
                <dd>{service.quantity} peça(s)</dd>
              </div>
              <div>
                <dt>Seu preço (unidade)</dt>
                <dd>{brl(o.price)}</dd>
              </div>
              <div>
                <dt>Preço total</dt>
                <dd><b>{brl(o.total)}</b></dd>
              </div>
              <div>
                <dt>Prazo</dt>
                <dd>{o.days} dia(s)</dd>
              </div>
              <div>
                <dt>Situação do serviço</dt>
                <dd>{service.status.replace('_', ' ')}</dd>
              </div>
            </dl>

            {isCompleteProduction && (
              <section
                style={{
                  marginTop: 18,
                  padding: 14,
                  border: '1px solid #e5e7eb',
                  borderRadius: 10,
                }}
              >
                <h4>Andamento desta etapa</h4>

                <div className="row between wrap">
                  <strong>
                    {ETAPA_LABEL[etapaStatus] || etapaStatus}
                  </strong>
                  <strong>{currentPercent}%</strong>
                </div>

                <div
                  style={{
                    height: 10,
                    background: '#e5e7eb',
                    borderRadius: 10,
                    overflow: 'hidden',
                    margin: '8px 0 14px',
                  }}
                >
                  <div
                    style={{
                      width: `${currentPercent}%`,
                      height: '100%',
                      background: '#16a34a',
                      transition: 'width .2s',
                    }}
                  />
                </div>

                {canUpdate && etapaStatus === 'nao_iniciada' && (
                  <button
                    type="button"
                    className="btn primary"
                    disabled={savingId === service.id}
                    onClick={() => saveStep(service, 'iniciada', 0)}
                  >
                    Iniciar etapa
                  </button>
                )}

                {canUpdate &&
                  ['iniciada', 'em_desenvolvimento'].includes(etapaStatus) && (
                    <>
                      <label className="field">
                        Percentual de conclusão: {percentual}%
                        <input
                          type="range"
                          min="1"
                          max="99"
                          value={percentual}
                          onChange={(e) =>
                            setPercentages((current) => ({
                              ...current,
                              [service.id]: Number(e.target.value),
                            }))
                          }
                        />
                      </label>

                      <div className="row wrap">
                        <button
                          type="button"
                          className="btn"
                          disabled={savingId === service.id}
                          onClick={() =>
                            saveStep(
                              service,
                              'em_desenvolvimento',
                              percentual
                            )
                          }
                        >
                          Salvar andamento
                        </button>

                        <button
                          type="button"
                          className="btn primary"
                          disabled={savingId === service.id}
                          onClick={() =>
                            saveStep(service, 'finalizada', 100)
                          }
                        >
                          Finalizar etapa
                        </button>
                      </div>
                    </>
                  )}

                {etapaStatus === 'finalizada' && (
                  <p className="success">
                    Etapa finalizada com 100% de conclusão.
                  </p>
                )}
              </section>
            )}

            <div className="row" style={{ marginTop: 14 }}>
              <button
                className="btn small"
                onClick={() =>
                  go('perfil', { userId: service.owner.id })
                }
              >
                Ver cliente
              </button>

              {o.status === 'aceita' &&
                service.status === 'concluido' && (
                  <button
                    className="btn small primary"
                    onClick={() => setReviewing(o)}
                  >
                    Avaliar cliente
                  </button>
                )}
            </div>
          </article>
        );
      })}

      {!shown.length && (
        <p className="muted">Você ainda não enviou ofertas.</p>
      )}
    </>
  );
}
