
import { useEffect, useState } from 'react';
import Avatar from '../components/Avatar';
import {
  getMyProfile,
  updateProfile,
  listServiceKinds,
  listServiceTypes
} from '../services/api';

const initialForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  neighborhood: '',
  city: '',
  zipCode: '',
  referencePoint: '',
  kinds: [],
  pieces: []
};

export default function MeuPerfil({ user, go }) {
  const isPro = user?.role === 'profissional';

  const [form, setForm] = useState(initialForm);
  const [photo, setPhoto] = useState(user?.photo || '');
  const [photoFile, setPhotoFile] = useState(null);
  const [removePhoto, setRemovePhoto] = useState(false);

  const [serviceKinds, setServiceKinds] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function carregarPerfil() {
      try {
        setLoading(true);
        setError('');

        const [perfil, servicos, pecas] = await Promise.all([
          getMyProfile(user.role),
          listServiceKinds(),
          listServiceTypes()
        ]);

        if (!active) return;

        setForm({
          ...initialForm,
          name: perfil.name || '',
          phone: perfil.phone || '',
          email: perfil.email || '',
          address: perfil.address || '',
          neighborhood: perfil.neighborhood || '',
          city: perfil.city || '',
          zipCode: perfil.zipCode || '',
          referencePoint: perfil.referencePoint || '',
          kinds: perfil.kinds || [],
          pieces: perfil.pieces || []
        });

        setPhoto(perfil.photo || '');
        setServiceKinds(servicos || []);
        setServiceTypes(pecas || []);
      } catch (err) {
        if (active) {
          setError(err.message || 'Não foi possível carregar seu perfil.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    console.log('MEU PERFIL FOI ABERTO');
    carregarPerfil();

    return () => {
      active = false;
    };
  }, [user?.id, user?.role]);

  function alterarCampo(e) {
    const { name, value } = e.target;
    setForm(current => ({ ...current, [name]: value }));
  }

  function alternarItem(campo, valor) {
    setForm(current => {
      const selecionados = current[campo] || [];

      return {
        ...current,
        [campo]: selecionados.includes(valor)
          ? selecionados.filter(item => item !== valor)
          : [...selecionados, valor]
      };
    });
  }

  function selecionarFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];

    if (!tiposPermitidos.includes(file.type)) {
      setError('Selecione uma imagem JPG, PNG ou WebP.');
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 2 MB.');
      e.target.value = '';
      return;
    }

    setPhotoFile(file);
    setRemovePhoto(false);
    setError('');

    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result);
    reader.readAsDataURL(file);
  }

  function removerFoto() {
    setPhoto('');
    setPhotoFile(null);
    setRemovePhoto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('Informe seu nome.');
      return;
    }

    if (!form.phone.trim()) {
      setError('Informe seu telefone.');
      return;
    }

    if (isPro && !form.kinds.length) {
      setError('Selecione pelo menos um serviço.');
      return;
    }

    if (isPro && !form.pieces.length) {
      setError('Selecione pelo menos uma peça.');
      return;
    }

    try {
      setSaving(true);

      await updateProfile(user.role, {
        ...form,
        id: user.id,
        photoFile,
        removePhoto
      });

      setSuccess('Perfil atualizado com sucesso!');
      setPhotoFile(null);
      setRemovePhoto(false);
    } catch (err) {
      setError(err.message || 'Não foi possível salvar seu perfil.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="muted">Carregando seus dados...</p>;
  }

  return (
    <>
      <section className="card">
        <h2>Meu perfil</h2>
        <p className="muted">
          Consulte e atualize seus dados cadastrais.
        </p>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <form onSubmit={salvar}>
          <div className="profile-photo">
            <Avatar
              user={{ name: form.name, photo }}
              size={96}
            />

            <div>
              <label className="btn secondary">
                Alterar foto
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={selecionarFoto}
                  hidden
                />
              </label>

              {photo && (
                <button
                  type="button"
                  className="btn secondary"
                  onClick={removerFoto}
                >
                  Remover foto
                </button>
              )}

              <small className="muted">
                JPG, PNG ou WebP. Máximo de 2 MB.
              </small>
            </div>
          </div>

          <label>Nome completo</label>
          <input
            name="name"
            value={form.name}
            onChange={alterarCampo}
            required
          />

          <label>Telefone</label>
          <input
            name="phone"
            value={form.phone}
            onChange={alterarCampo}
            required
          />

          <label>E-mail</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={alterarCampo}
          />

          <label>Endereço</label>
          <input
            name="address"
            value={form.address}
            onChange={alterarCampo}
          />

          <label>Bairro</label>
          <input
            name="neighborhood"
            value={form.neighborhood}
            onChange={alterarCampo}
          />

          <label>Cidade</label>
          <input
            name="city"
            value={form.city}
            onChange={alterarCampo}
          />

          <label>CEP</label>
          <input
            name="zipCode"
            value={form.zipCode}
            onChange={alterarCampo}
          />

          <label>Ponto de referência</label>
          <input
            name="referencePoint"
            value={form.referencePoint}
            onChange={alterarCampo}
          />

          {isPro && (
            <>
              <hr />
              <h3>Serviços que realizo</h3>
              <p className="muted">
                Selecione os serviços que você oferece.
              </p>

              <div className="row wrap">
                {serviceKinds.map(item => {
                  const value = typeof item === 'string'
                    ? item
                    : item.nome || item.name;

                  if (!value) return null;

                  return (
                    <label key={value} className="choice">
                      <input
                        type="checkbox"
                        checked={form.kinds.includes(value)}
                        onChange={() => alternarItem('kinds', value)}
                      />
                      {value}
                    </label>
                  );
                })}
              </div>

              <hr />
              <h3>Peças que atendo</h3>
              <p className="muted">
                Selecione os tipos de peças que você trabalha.
              </p>

              <div className="row wrap">
                {serviceTypes.map(item => {
                  const value = typeof item === 'string'
                    ? item
                    : item.nome || item.name;

                  if (!value) return null;

                  return (
                    <label key={value} className="choice">
                      <input
                        type="checkbox"
                        checked={form.pieces.includes(value)}
                        onChange={() => alternarItem('pieces', value)}
                      />
                      {value}
                    </label>
                  );
                })}
              </div>
            </>
          )}

          <p></p>

          <div className="row wrap">
            <button
              type="submit"
              className="btn primary"
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>

            <button
              type="button"
              className="btn secondary"
              onClick={() => go('perfil', { userId: user.id })}
            >
              Visualizar perfil público
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
