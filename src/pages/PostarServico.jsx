
import { useEffect, useState } from 'react';
import {
  createService,
  getUser,
  listServiceKindOptions,
  listServiceTypeOptions,
} from '../services/api';

export default function PostarServico({ user, go, params }) {
  const [kinds, setKinds] = useState([]);
  const [kind, setKind] = useState('');
  const [types, setTypes] = useState([]);
  const [type, setType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([null, null, null]);
  const [target, setTarget] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [serviceKinds, serviceTypes] = await Promise.all([
          listServiceKindOptions(),
          listServiceTypeOptions(),
        ]);

        setKinds(serviceKinds);
        setTypes(serviceTypes);

        if (params?.proId) {
          const professional = await getUser(params.proId);
          setTarget(professional);
        }
      } catch (err) {
        setError(err.message || 'Erro ao carregar os tipos.');
      }
    };

    load();
  }, [params?.proId]);

  const pickPhoto = (index, file) => {
    if (!file) return;

    const next = [...photos];

    if (next[index]?.preview) {
      URL.revokeObjectURL(next[index].preview);
    }

    next[index] = {
      file,
      preview: URL.createObjectURL(file),
    };

    setPhotos(next);
  };

  const submit = async (e) => {
    e.preventDefault();

    if (loading) return;

    const selectedKind = kinds.find(
      (item) => String(item.id) === String(kind)
    );

    const selectedType = types.find(
      (item) => String(item.id) === String(type)
    );

    if (!selectedKind) {
      setError('Escolha o tipo de serviço.');
      return;
    }

    if (!selectedType) {
      setError('Escolha o tipo de peça.');
      return;
    }

    if (!user?.id) {
      setError('Não foi possível identificar o cliente logado.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await createService({
        serviceKind: selectedKind.nome,
        type: selectedType.nome,

        serviceKindId: selectedKind.id,
        typeId: selectedType.id,

        quantity: Number(quantity),
        description,
        photos: photos.filter(Boolean),
        ownerId: user.id,
        targetProId: target ? target.id : null,
      });

      go('meusServicos');
    } catch (err) {
      console.error('ERRO AO PUBLICAR SERVIÇO:', err);
      setError(err.message || 'Não foi possível publicar o serviço.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card form-wide" onSubmit={submit}>
      <h2>
        {target
          ? `Ofertar serviço para ${target.name}`
          : 'Postar um serviço'}
      </h2>

      {target && (
        <p className="muted">
          Só este profissional verá o serviço e poderá enviar proposta.
        </p>
      )}

      <label className="field">
        Tipo de serviço
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          required
        >
          <option value="">Selecione...</option>

          {kinds.map((item, index) => (
            <option key={item.id} value={item.id}>
              {index + 1} - {item.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Tipo de peça
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
        >
          <option value="">Selecione...</option>

          {types.map((item, index) => (
            <option key={item.id} value={item.id}>
              {index + 1} - {item.nome}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        Quantidade de peças
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
      </label>

      <label className="field">
        Descrição
        <textarea
          rows="4"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </label>

      <div>
        <b>Fotos</b>{' '}
        <small className="muted">(opcional, até 3)</small>

        <div className="photos">
          {photos.map((photo, index) => (
            <label key={index} className="photo-slot">
              {photo?.preview ? (
                <img
                  src={photo.preview}
                  alt={`Foto ${index + 1}`}
                />
              ) : (
                <span>+ Foto {index + 1}</span>
              )}

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) =>
                  pickPhoto(index, e.target.files[0])
                }
              />
            </label>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <button
        className="btn primary"
        type="submit"
        disabled={loading}
      >
        {loading ? 'Publicando...' : 'Publicar serviço'}
      </button>
    </form>
  );
}
