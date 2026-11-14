
import { useEffect, useState } from 'react';
import {
  listServiceKinds,
  listServiceTypes,
  listFabricationSteps,
  saveFabricationSteps,
} from '../services/api';

export default function EtapasFabricacao() {
  const [types, setTypes] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [pieceType, setPieceType] = useState('');
  const [availableKind, setAvailableKind] = useState('');
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [pieceTypes, serviceKinds] = await Promise.all([
          listServiceTypes(),
          listServiceKinds(),
        ]);

        setTypes(pieceTypes);
        setKinds(
          serviceKinds.filter(
            (kind) => kind !== 'Fabricação de Peça Completa'
          )
        );

        if (pieceTypes.length) {
          setPieceType(pieceTypes[0]);
        }
      } catch (err) {
        setError(err.message || 'Erro ao carregar os dados.');
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (!pieceType) return;

    async function loadSteps() {
      setLoading(true);
      setMessage('');
      setError('');

      try {
        const result = await listFabricationSteps(pieceType);
        setSteps(
          [...result].sort((a, b) => a.order - b.order)
            .map((item) => item.serviceKind)
        );
      } catch (err) {
        setError(err.message || 'Erro ao carregar etapas.');
      } finally {
        setLoading(false);
      }
    }

    loadSteps();
  }, [pieceType]);

  const addStep = () => {
    if (!availableKind) return;

    if (steps.includes(availableKind)) {
      setError('Esse serviço já está na sequência.');
      return;
    }

    setSteps((current) => [...current, availableKind]);
    setAvailableKind('');
    setMessage('');
    setError('');
  };

  const removeStep = (index) => {
    setSteps((current) => current.filter((_, i) => i !== index));
    setMessage('');
  };

  const moveStep = (index, direction) => {
    const destination = index + direction;

    if (destination < 0 || destination >= steps.length) return;

    const updated = [...steps];
    [updated[index], updated[destination]] =
      [updated[destination], updated[index]];

    setSteps(updated);
    setMessage('');
  };

  const save = async () => {
    setError('');
    setMessage('');

    if (!pieceType) {
      setError('Selecione um tipo de peça.');
      return;
    }

    if (steps.length === 0) {
      setError('Adicione pelo menos uma etapa.');
      return;
    }

    try {
      setLoading(true);
      await saveFabricationSteps(pieceType, steps);
      setMessage('Sequência de fabricação salva com sucesso!');
    } catch (err) {
      setError(err.message || 'Erro ao salvar a sequência.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card form-wide">
      <h2>Etapas de fabricação</h2>

      <p className="muted">
        Configure a sequência de serviços que será executada
        quando o cliente solicitar uma peça completa.
      </p>

      <label className="field">
        Tipo de peça
        <select
          value={pieceType}
          onChange={(e) => setPieceType(e.target.value)}
        >
          {types.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <div className="field">
        <label>Adicionar serviço à sequência</label>

        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={availableKind}
            onChange={(e) => setAvailableKind(e.target.value)}
            style={{ flex: 1 }}
          >
            <option value="">Selecione um serviço...</option>
            {kinds
              .filter((kind) => !steps.includes(kind))
              .map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
          </select>

          <button
            type="button"
            className="btn"
            onClick={addStep}
            disabled={!availableKind}
          >
            Adicionar
          </button>
        </div>
      </div>

      <h3>Sequência de execução</h3>

      {loading && <p className="muted">Carregando...</p>}

      {!loading && steps.length === 0 && (
        <p className="muted">
          Nenhuma etapa cadastrada para esta peça.
        </p>
      )}

      {!loading && steps.map((step, index) => (
        <div
          key={`${step}-${index}`}
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
            padding: 12,
          }}
        >
          <strong>{index + 1}.</strong>

          <span style={{ flex: 1 }}>{step}</span>

          <button
            type="button"
            className="btn"
            title="Mover para cima"
            disabled={index === 0}
            onClick={() => moveStep(index, -1)}
          >
            ↑
          </button>

          <button
            type="button"
            className="btn"
            title="Mover para baixo"
            disabled={index === steps.length - 1}
            onClick={() => moveStep(index, 1)}
          >
            ↓
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => removeStep(index)}
          >
            Remover
          </button>
        </div>
      ))}

      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}

      <button
        type="button"
        className="btn primary"
        onClick={save}
        disabled={loading || !steps.length}
      >
        Salvar sequência
      </button>
    </div>
  );
}
