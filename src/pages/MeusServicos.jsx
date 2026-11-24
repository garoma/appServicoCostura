
import { useEffect, useState } from 'react';
import AvaliacaoForm from '../components/AvaliacaoForm';
import StarRating from '../components/StarRating';
import {
  listServices,
  acceptOffer,
  concludeService,
} from '../services/api';
import { brl } from '../utils/format';

const STATUS = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  concluido: 'Concluído',
};

export default function MeusServicos({ user, go }) {
  const [services, setServices] = useState([]);
  const [reviewing, setReviewing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionId, setActionId] = useState(null);

  const load = async () => {
    if (!user?.id) {
      setError('Não foi possível identificar o usuário logado.');
      setServices([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const resultado = await listServices({
        ownerId: user.id,
      });

      setServices(Array.isArray(resultado) ? resultado : []);
    } catch (err) {
      console.error('ERRO AO BUSCAR MEUS SERVIÇOS:', err);
      setError(err.message || 'Erro ao carregar serviços.');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const accept = async (offer) => {
    if (!offer?.id || actionId !== null) return;

    try {
      setActionId(offer.id);
      setError('');

      await acceptOffer(offer.id);
      await load();
    } catch (err) {
      console.error('ERRO AO ACEITAR OFERTA:', err);
      setError(err.message || 'Não foi possível aceitar a oferta.');
    } finally {
      setActionId(null);
    }
  };

  const conclude = async (service) => {
    if (!service?.id || actionId !== null) return;

    try {
      setActionId(service.id);
      setError('');

      await concludeService(service.id);

      await load();

      if (service.proId && service.pro) {
        setReviewing({
          ...service,
          status: 'concluido',
        });
      }
    } catch (err) {
      console.error('ERRO AO CONCLUIR SERVIÇO:', err);
      setError(err.message || 'Não foi possível concluir o serviço.');
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return <p className="muted">Carregando seus serviços...</p>;
  }

  if (!user?.id) {
    return (
      <div className="card">
        <p className="error">
          Não foi possível identificar o usuário logado.
        </p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="card">
          <p className="error">{error}</p>

          <button
            className="btn primary"
            onClick={load}
            disabled={loading || actionId !== null}
          >
            Tentar novamente
          </button>
        </div>
      )}

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

      {services.map((s) => {
        const photos = Array.isArray(s.photos) ? s.photos : [];
        const offers = Array.isArray(s.offers) ? s.offers : [];
        const busy = actionId === s.id;

        return (
          <article className="card" key={s.id}>
            <div className="row between">
              <h3>
                {s.serviceKind} · {s.type}
              </h3>

              <span className={`badge ${s.status}`}>
                {STATUS[s.status] || s.status}
              </span>
            </div>

            <p>{s.description}</p>

            <p className="muted">
              Quantidade: <b>{s.quantity}</b> peça(s)

              {s.price != null && (
                <>
                  {' '}· Valor combinado: {brl(s.price)} por peça,
                  total {brl(s.total)}
                </>
              )}
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

            {s.status === 'aberto' && (
              <>
                <h4>Ofertas recebidas ({offers.length})</h4>

                {offers.map((offer) => (
                  <div className="row between offer" key={offer.id}>
                    <div>
                      <b>
                        {offer.pro?.name || 'Profissional'}
                      </b>

                      {offer.pro && (
                        <StarRating
                          value={offer.pro.rating}
                          showNumber
                        />
                      )}

                      <div className="muted">
                        {brl(offer.price)} por peça
                        {' '}· total {brl(offer.total)}
                        {' '}· prazo {offer.days} dia(s)
                      </div>
                    </div>

                    <div className="row">
                      <button
                        className="btn small"
                        onClick={() =>
                          offer.pro &&
                          go?.('perfil', {
                            userId: offer.pro.id,
                          })
                        }
                        disabled={!offer.pro || actionId !== null}
                      >
                        Perfil
                      </button>

                      <button
                        className="btn small primary"
                        onClick={() => accept(offer)}
                        disabled={actionId !== null}
                      >
                        {actionId === offer.id
                          ? 'Aceitando...'
                          : 'Aceitar'}
                      </button>
                    </div>
                  </div>
                ))}

                {!offers.length && (
                  <p className="muted">
                    Aguardando propostas de profissionais.
                  </p>
                )}
              </>
            )}

            {s.status === 'em_andamento' && (
              <div className="row between">
                <span>
                  Profissional:{' '}
                  <b>
                    {s.pro?.name || 'Não identificado'}
                  </b>
                </span>

                <button
                  className="btn primary"
                  onClick={() => conclude(s)}
                  disabled={actionId !== null}
                >
                  {busy
                    ? 'Concluindo...'
                    : 'Marcar como concluído'}
                </button>
              </div>
            )}

            {s.status === 'concluido' && s.pro && (
              <button
                className="btn"
                onClick={() => setReviewing(s)}
                disabled={actionId !== null}
              >
                Avaliar {s.pro.name}
              </button>
            )}
          </article>
        );
      })}

      {!services.length && !error && (
        <p className="muted">
          Você ainda não postou serviços.
        </p>
      )}
    </>
  );
}
