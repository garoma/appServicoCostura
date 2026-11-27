
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
    if (!user?.id) {
      setError('Não foi possível identificar o profissional logado.');
      setOffers([]);
      setLoading(false);
      return;
    }

    try {
      setError('');

      const result = await listOffers({ proId: user.id });

      setOffers(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('ERRO AO CARREGAR OFERTAS:', err);
      setError(err.message || 'Erro ao carregar suas ofertas.');
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const saveStep = async (service, etapaStatus, percentual = 0) => {
    if (!service?.id || savingId !== null) return;

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
      console.error('ERRO AO ATUALIZAR ETAPA:', err);
      setError(err.message || 'Não foi possível atualizar a etapa.');
    } finally {
      setSavingId(null);
    }
  };

  const openReview = (offer) => {
    if (!offer?.service?.owner?.id) {
      setError('Não foi possível identificar o cliente para avaliação.');
      return;
    }

    setReviewing(offer);
  };

  const shown = offers.filter((offer) => {
    const name = offer?.service?.owner?.name || '';

    return name.toLowerCase().includes(q.toLowerCase());
  });

  if (loading) {
    return <p className="muted">Carregando suas ofertas...</p>;
  }

  const reviewingService = reviewing?.service;
  const reviewingOwner = reviewingService?.owner;

  return (
    <>
      {reviewing && reviewingOwner && (
        <AvaliacaoForm
          fromId={user.id}
          toId={reviewingOwner.id}
          toName={reviewingOwner.name}
          serviceId={reviewingService.id}
          tipoAvaliacao="profissionalAvaliaCliente"
          onDone={async () => {
            setReviewing(null);
            await load();
          }}
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

      {shown.map((offer) => {
        const service = offer?.service;

        if (!service) return null;

        const owner = service.owner;
        const photos = Array.isArray(service.photos)
          ? service.photos
          : [];

        const isCompleteProduction = Boolean(service.pecaCompleta);
        const etapaStatus = service.etapaStatus || 'nao_iniciada';

        const savedPercent =
          Number(service.percentualConclusao) || 0;

        const percentual = Math.min(
          99,
          Math.max(
            1,
            Number(percentages[service.id] ?? savedPercent ?? 1)
          )
        );

        const currentPercent =
          etapaStatus === 'finalizada'
            ? 100
            : Math.min(100, Math.max(0, savedPercent));

        const canUpdate =
          offer.status === 'aceita' &&
          service.status === 'em_andamento' &&
          isCompleteProduction;

        const serviceStatus =
          service.status || 'não informado';

        console.log('AVALIAÇÃO:', {
          servicoId: service.id,
          jaAvaliado: offer.jaAvaliado,
          offer
        });

        return (
          <article className="card" key={offer.id}>
            <div className="row between wrap">
              <div>
                <h3>{owner?.name || 'Cliente não identificado'}</h3>

                {owner && (
                  <>
                    <StarRating
                      value={owner.rating || 0}
                      showNumber
                    />

                    <div className="muted">
                      {owner.city || 'Cidade não informada'}
                      {' · '}
                      {owner.phone || 'Telefone não informado'}
                    </div>
                  </>
                )}
              </div>

              <span className={`badge ${offer.status || ''}`}>
                {LABEL[offer.status] || offer.status || 'Sem situação'}
              </span>
            </div>

            <p>
              <b>
                {service.serviceKind || 'Serviço'}
                {' · '}
                {service.type || 'Peça não informada'}
              </b>
              {' · '}
              {service.description || 'Sem descrição.'}
            </p>

            {photos.length > 0 && (
              <div className="photos">
                {photos.map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt={`Foto do serviço ${index + 1}`}
                  />
                ))}
              </div>
            )}

            <dl className="data-list">
              <div>
                <dt>Quantidade</dt>
                <dd>{service.quantity || 0} peça(s)</dd>
              </div>

              <div>
                <dt>Seu preço (unidade)</dt>
                <dd>{brl(offer.price || 0)}</dd>
              </div>

              <div>
                <dt>Preço total</dt>
                <dd><b>{brl(offer.total || 0)}</b></dd>
              </div>

              <div>
                <dt>Prazo</dt>
                <dd>{offer.days || 0} dia(s)</dd>
              </div>

              <div>
                <dt>Situação do serviço</dt>
                <dd>{serviceStatus.replaceAll('_', ' ')}</dd>
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
                    onClick={() =>
                      saveStep(service, 'iniciada', 0)
                    }
                  >
                    {savingId === service.id
                      ? 'Salvando...'
                      : 'Iniciar etapa'}
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
                          disabled={savingId === service.id}
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
                type="button"
                className="btn small"
                disabled={!owner?.id}
                onClick={() =>
                  owner?.id && go?.('perfil', { userId: owner.id })
                }
              >
                Ver cliente
              </button>
              {offer.status === 'aceita' &&
                service.status === 'concluido' &&
                owner?.id && (
                  <button
                    type="button"
                    className="btn small primary"
                    disabled={offer.jaAvaliado}
                    onClick={() => openReview(offer)}
                  >
                    {offer.jaAvaliado ? 'Cliente avaliado' : 'Avaliar cliente'}
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
