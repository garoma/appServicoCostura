import { useEffect, useState } from 'react';
import { createService, getUser, listServiceKinds, listServiceTypes } from '../services/api';

export default function PostarServico({ user, go, params }) {
  const [kinds, setKinds] = useState([]);
  const [kind, setKind] = useState('');
  const [types, setTypes] = useState([]);
  const [type, setType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState([null, null, null]);
  const [target, setTarget] = useState(null); // profissional que receberá a oferta direta
  const [error, setError] = useState('');

  useEffect(() => {
    listServiceKinds().then(setKinds);
    listServiceTypes().then(setTypes);
    if (params.proId) getUser(params.proId).then(setTarget);
  }, [params.proId]);

  const pickPhoto = (i, file) => {
    if (!file) return;
    const next = [...photos];
    next[i] = URL.createObjectURL(file);
    setPhotos(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!kind) return setError('Escolha o tipo de serviço.');
    if (!type) return setError('Escolha o tipo de peça.');
    await createService({
      serviceKind: kind,
      type,
      quantity: Number(quantity),
      description,
      photos: photos.filter(Boolean),
      ownerId: user.id,
      targetProId: target ? target.id : null,
    });
    go('meusServicos');
  };

  return (
    <form className="card form-wide" onSubmit={submit}>
      <h2>{target ? `Ofertar serviço para ${target.name}` : 'Postar um serviço'}</h2>
      {target && <p className="muted">Só este profissional verá o serviço e poderá enviar proposta.</p>}

      <label className="field">Tipo de serviço
        <select value={kind} onChange={(e) => setKind(e.target.value)} required>
          <option value="">Selecione...</option>
          {kinds.map((k, i) => <option key={k} value={k}>{i + 1} - {k}</option>)}
        </select>
      </label>

      <label className="field">Tipo de peça
        <select value={type} onChange={(e) => setType(e.target.value)} required>
          <option value="">Selecione...</option>
          {types.map((t, i) => <option key={t} value={t}>{i + 1} - {t}</option>)}
        </select>
      </label>

      <label className="field">Quantidade de peças
        <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
      </label>

      <label className="field">Descrição
        <textarea rows="4" value={description} onChange={(e) => setDescription(e.target.value)} required />
      </label>

      <div>
        <b>Fotos</b> <small className="muted">(opcional, até 3)</small>
        <div className="photos">
          {photos.map((src, i) => (
            <label key={i} className="photo-slot">
              {src ? <img src={src} alt={`Foto ${i + 1}`} /> : <span>+ Foto {i + 1}</span>}
              <input type="file" accept="image/*" hidden onChange={(e) => pickPhoto(i, e.target.files[0])} />
            </label>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      <button className="btn primary" type="submit">Publicar serviço</button>
    </form>
  );
}
