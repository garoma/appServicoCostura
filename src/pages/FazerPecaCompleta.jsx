
import { useEffect, useState } from 'react';
import {
  listServiceTypes,
  listFabricationSteps,
  createCompleteProduction,
} from '../services/api';

export default function FazerPecaCompleta({ user, go }) {
  const [types, setTypes] = useState([]);
  const [type, setType] = useState('');
  const [steps, setSteps] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([null, null, null]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listServiceTypes()
      .then((result) => {
        setTypes(result);
        if (result.length) setType(result[0]);
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!type) {
      setSteps([]);
      return;
    }

    listFabricationSteps(type)
      .then(setSteps)
      .catch((err) => setError(err.message));
  }, [type]);

  const pickPhoto = (index, file) => {
    if (!file) return;

    const next = [...photos];
    next[index] = URL.createObjectURL(file);
    setPhotos(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!steps.length) {
      setError('Esta peça ainda não possui sequência de fabricação cadastrada.');
      return;
    }

    if (Number(quantity) < 1) {
      setError('Informe uma quantidade válida.');
      return;
    }

    try {
      setLoading(true);

      await createCompleteProduction({
        ownerId: user.id,
        type,
        quantity: Number(quantity),
        description,
        photos: photos.filter(Boolean),
      });

      go('minhasProducoes');
    } catch (err) {
      setError(err.message || 'Não foi possível iniciar a fabricação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card form-wide" onSubmit={submit}>
      <h2>Fazer peça completa</h2>

      <p className="muted">
        A fabricação será dividida em etapas. Cada etapa será
        disponibilizada após a conclusão da anterior.
      </p>

      <label className="field">
        Tipo de peça
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
        >
          {types.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </label>

      <div className="card" style={{ padding: 12 }}>
        <strong>Sequência prevista</strong>

        {steps.length ? (
          <ol>
            {[...steps]
              .sort((a, b) => a.order - b.order)
              .map((step) => (
                <li key={step.order}>{step.serviceKind}</li>
              ))}
          </ol>
        ) : (
          <p className="muted">
            Não há sequência cadastrada para esta peça.
          </p>
        )}
      </div>

      <label className="field">
        Quantidade de peças
        <input
          type="number"
          min="1"
          step="1"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          required
        />
      </label>

      <label className="field">
        Descrição e observações
        <textarea
          rows="4"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Informe detalhes da fabricação..."
          required
        />
      </label>

      <div>
        <b>Fotos de referência</b>
        <small className="muted"> (opcional, até 3)</small>

        <div className="photos">
          {photos.map((src, index) => (
            <label key={index} className="photo-slot">
              {src
                ? <img src={src} alt={`Referência ${index + 1}`} />
                : <span>+ Foto {index + 1}</span>}

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => pickPhoto(index, e.target.files[0])}
              />
            </label>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <button
        className="btn primary"
        type="submit"
        disabled={loading || !steps.length}
      >
        {loading ? 'Criando fabricação...' : 'Solicitar fabricação completa'}
      </button>
    </form>
  );
}
