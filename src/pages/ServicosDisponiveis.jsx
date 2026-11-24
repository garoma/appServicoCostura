
import { useEffect, useState } from 'react';
import StarRating from '../components/StarRating';
import {
  listServices,
  createOffer,
  listServiceKinds,
  listServiceTypes,
} from '../services/api';
import { brl } from '../utils/format';

export default function ServicosDisponiveis({ user, go }) {
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({});
  const [kinds, setKinds] = useState([]);
  const [types, setTypes] = useState([]);
  const [filter, setFilter] = useState({ kind: '', piece: '' });

  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user?.id) {
      setError('Não foi possível identificar o profissional logado.');
      setLoading(false);
      return;
    }

    try {
      setError('');

      const result = await listServices({
        forProId: user.id,
      });

      setServices(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error('ERRO AO CARREGAR SERVIÇOS DISPONÍVEIS:', err);
      setError(err.message || 'Erro ao carregar serviços disponíveis.');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFilters = async () => {
    try {
      const [serviceKinds, serviceTypes] = await Promise.all([
        listServiceKinds(),
        listServiceTypes(),
      ]);

      setKinds(Array.isArray(serviceKinds) ? serviceKinds : []);
      setTypes(Array.isArray(serviceTypes) ? serviceTypes : []);
    } catch (err) {
      console.error('ERRO AO CARREGAR FILTROS:', err);
    }
  };

  useEffect(() => {
    load();
    loadFilters();
  }, [user?.id]);

  const setField = (id, key, value) => {
    setForm((current) => ({
      ...current,
      [id]: {
        ...current[id],
        [key]: value,
      },
    }));
  };

  const send = async (service) => {
    if (!service?.id || !user?.id || sendingId !== null) {
      return;
    }

    const currentForm = form[service.id] || {};

    const price = Number(currentForm.price);
    const days = Number(currentForm.days);
    const quantity = Number(service.quantity);

    if (!Number.isFinite(price) || price <= 0) {
      setError('Informe um preço unitário maior que zero.');
      return;
    }

    if (!Number.isInteger(days) || days <= 0) {
      setError('Informe um prazo válido em dias.');
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setError('A quantidade de peças deste serviço é inválida.');
      return;
    }

    try {
      setError('');
      setSendingId(service.id);

      await createOffer({
        serviceId: service.id,
        proId: user.id,
        price,
        quantity,
        total: price * quantity,
        days,
      });

      go?.('minhasOfertas');
    } catch (err) {
      console.error('ERRO AO ENVIAR OFERTA:', err);
      setError(err.message || 'Não foi possível enviar sua oferta.');
    } finally {
      setSendingId(null);
    }
  };

  const shown = services.filter((service) => {
    const matchesKind =
      !filter.kind || service.serviceKind === filter.kind;

    const matchesPiece =
      !filter.piece || service.type === filter.piece;

    return matchesKind && matchesPiece;
  });

  if (loading) {
    return <p className="muted">Carregando serviços disponíveis...</p>;
  }

  return (
    <>
      <div className="card filters">
        <label className="field">
          Tipo de serviço

          <select
            value={filter.kind}
            onChange={(e) =>
              setFilter((current) => ({
                ...current,
                kind: e.target.value,
              }))
            }
          >
            <option value="">Todos</option>

            {kinds.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          Tipo de peça

          <select
            value={filter.piece}
            onChange={(e) =>
              setFilter((current) => ({
                ...current,
                piece: e.target.value,
              }))
            }
          >
            <option value="">Todas</option>

            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="card">
          <p className="error">{error}</p>

          <button
            type="button"
            className="btn"
            onClick={load}
          >
            Atualizar serviços
          </button>
        </div>
      )}

      {shown.map((service) => {
        const offers = Array.isArray(service.offers)
          ? service.offers
          : [];

        const photos = Array.isArray(service.photos)
          ? service.photos
          : [];

        const owner = service.owner;

        const already = offers.some(
          (offer) => String(offer.proId) === String(user.id)
        );

        const currentForm = form[service.id] || {};

        const price = Number(currentForm.price) || 0;
        const quantity = Number(service.quantity) || 0;
        const total = price * quantity;

        const isSending = sendingId === service.id;

        const targetPro =
          service.targetProId != null &&
          String(service.targetProId) === String(user.id);

        return (
          <article className="card" key={service.id}>
            <div className="row between wrap">
              <div>
                <h3>{owner?.name || 'Cliente não identificado'}</h3>

                {owner && (
                  <StarRating
                    value={owner.rating || 0}
                    showNumber
                  />
                )}
              </div>

              <div className="row wrap">
                {targetPro && (
                  <span className="badge em_andamento">
                    Oferta direta para você
                  </span>
                )}

                <button
                  type="button"
                  className="btn small"
                  disabled={!owner?.id}
                  onClick={() =>
                    owner?.id &&
                    go?.('perfil', { userId: owner.id })
                  }
                >
                  Ver perfil
                </button>
              </div>
            </div>

            <p>
              <b>
                {service.serviceKind || 'Serviço'}
                {' · '}
                {service.type || 'Peça não informada'}
              </b>
              {' · '}
              <b>{quantity}</b> peça(s)
              {' · '}
              <span className="muted">
                {owner?.city || 'Cidade não informada'}
              </span>
            </p>

            <p>{service.description || 'Sem descrição.'}</p>

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

            {already ? (
              <p className="muted">
                Você já enviou uma oferta para este serviço.
              </p>
            ) : (
              <div className="row wrap">
                <label className="field inline">
                  Seu preço (unidade) R$

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={currentForm.price || ''}
                    disabled={sendingId !== null}
                    onChange={(e) =>
                      setField(service.id, 'price', e.target.value)
                    }
                  />
                </label>

                <label className="field inline">
                  Quantidade

                  <input
                    value={quantity}
                    readOnly
                  />
                </label>

                <label className="field inline">
                  Preço total

                  <input
                    value={brl(total)}
                    readOnly
                  />
                </label>

                <label className="field inline">
                  Prazo (dias)

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={currentForm.days || ''}
                    disabled={sendingId !== null}
                    onChange={(e) =>
                      setField(service.id, 'days', e.target.value)
                    }
                  />
                </label>

                <button
                  type="button"
                  className="btn primary"
                  disabled={
                    sendingId !== null ||
                    price <= 0 ||
                    !Number.isInteger(Number(currentForm.days)) ||
                    Number(currentForm.days) <= 0
                  }
                  onClick={() => send(service)}
                >
                  {isSending ? 'Enviando...' : 'Enviar oferta'}
                </button>
              </div>
            )}
          </article>
        );
      })}

      {!shown.length && (
        <p className="muted">
          Nenhum serviço aberto no momento.
        </p>
      )}
    </>
  );
}
