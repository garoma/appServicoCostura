
import { useEffect, useState } from 'react';
import Avatar from '../components/Avatar';
import {
  register,
  listServiceKinds,
  listServiceTypes
} from '../services/api';
import { fileToDataUrl } from '../utils/image';

export default function Cadastro({ onAuth, onRegistered, goLogin }) {
  const [form, setForm] = useState({
    role: 'usuario',
    name: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    neighborhood: '',
    city: '',
    zipCode: '',
    referencePoint: '',
    photo: '',
    kinds: [],
    pieces: [],
  });

  const [kinds, setKinds] = useState([]);
  const [types, setTypes] = useState([]);
  const [photoFile, setPhotoFile] = useState(null);

  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);

  const isPro = form.role === 'profissional';

  useEffect(() => {
    listServiceKinds().then(setKinds);
    listServiceTypes().then(setTypes);
  }, []);


  const set = (k) => (e) => {
    setForm((prev) => ({
      ...prev,
      [k]: e.target.value
    }));
  };

  const setCep = (e) => {
    const value = e.target.value
      .replace(/\D/g, '')
      .slice(0, 8)
      .replace(/^(\d{5})(\d)/, '$1-$2');

    setForm((prev) => ({
      ...prev,
      zipCode: value
    }));
  };

  const toggle = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value]
    }));
  };

  const pickPhoto = async (file) => {
    if (!file) return;

    const tiposPermitidos = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!tiposPermitidos.includes(file.type)) {
      setError('Selecione uma imagem JPG, PNG ou WebP.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('A foto deve possuir no máximo 2 MB.');
      return;
    }

    try {
      const photo = await fileToDataUrl(file);

      setForm((prev) => ({
        ...prev,
        photo
      }));

      setPhotoFile(file);
      setError('');
    } catch {
      setError('Não foi possível carregar a foto.');
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (isPro && form.kinds.length === 0) {
      setError('Selecione pelo menos um serviço que você realiza.');
      return;
    }

    if (isPro && form.pieces.length === 0) {
      setError('Selecione pelo menos um tipo de peça que você atende.');
      return;
    }

    try {
      const resultado = await register({
        ...form,
        photoFile,
        plan: 'taxa_servico',
      });

      // No modo mock, mantém o login automático original.
      if (resultado?.token && resultado?.user) {
        onAuth(resultado);
        return;
      }

      // No modo API, o cadastro não autentica automaticamente.
      setRegistered(true);

    } catch (err) {
      setError(err.message || 'Não foi possível realizar o cadastro.');
    }
  };

  const voltarLogin = () => {
    if (onRegistered) {
      onRegistered();
    } else if (goLogin) {
      goLogin();
    }
  };

  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <h2 className="brand-dark">Criar conta</h2>

        {registered ? (
          <div className="success-message">
            <p>
              Cadastro realizado com sucesso!
              Agora você pode fazer login.
            </p>

            <button
              className="btn primary"
              type="button"
              onClick={voltarLogin}
            >
              Ir para o login
            </button>
          </div>
        ) : (
          <>
            <div className="photo-pick">
              <Avatar
                user={{
                  name: form.name || '?',
                  photo: form.photo
                }}
                size={72}
              />

              <label className="btn small">
                {form.photo ? 'Trocar foto' : 'Escolher foto'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => pickPhoto(e.target.files[0])}
                />
              </label>
            </div>

            <label className="field">
              Tipo de conta
              <select value={form.role} onChange={set('role')}>
                <option value="usuario">
                  Usuário (quero contratar)
                </option>
                <option value="profissional">
                  Profissional (quero trabalhar)
                </option>
              </select>
            </label>

            <label className="field">
              Nome
              <input
                value={form.name}
                onChange={set('name')}
                required
              />
            </label>

            <label className="field">
              E-mail
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
              />
            </label>

            <label className="field">
              Senha
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                required
              />
            </label>

            <label className="field">
              Telefone
              <input
                value={form.phone}
                onChange={set('phone')}
                required
              />
            </label>

            <h3>Endereço</h3>

            <label className="field">
              Endereço
              <input
                value={form.address}
                onChange={set('address')}
                placeholder="Rua, avenida, número..."
                required
              />
            </label>

            <label className="field">
              Bairro
              <input
                value={form.neighborhood}
                onChange={set('neighborhood')}
                required
              />
            </label>

            <label className="field">
              Cidade
              <input
                value={form.city}
                onChange={set('city')}
                required
              />
            </label>

            <label className="field">
              CEP
              <input
                value={form.zipCode}
                onChange={setCep}
                placeholder="00000-000"
                maxLength={9}
                inputMode="numeric"
                required
              />
            </label>

            <label className="field">
              Ponto de referência
              <input
                value={form.referencePoint}
                onChange={set('referencePoint')}
                placeholder="Próximo a..."
              />
            </label>

            {isPro && (
              <>
                <h3>Informações profissionais</h3>

                <div className="field">
                  <strong>Tipos de serviços que faço</strong>

                  <div className="check-group">
                    {kinds.map((kind) => (
                      <label key={kind}>
                        <input
                          type="checkbox"
                          checked={form.kinds.includes(kind)}
                          onChange={() => toggle('kinds', kind)}
                        />
                        {kind}
                      </label>
                    ))}
                  </div>

                  <small>
                    {form.kinds.length} serviço(s) selecionado(s)
                  </small>
                </div>

                <div className="field">
                  <strong>Tipos de peças que atendo</strong>

                  <div className="check-group">
                    {types.map((type) => (
                      <label key={type}>
                        <input
                          type="checkbox"
                          checked={form.pieces.includes(type)}
                          onChange={() => toggle('pieces', type)}
                        />
                        {type}
                      </label>
                    ))}
                  </div>

                  <small>
                    {form.pieces.length} peça(s) selecionada(s)
                  </small>
                </div>

              </>
            )}

            {error && <p className="error">{error}</p>}

            <button className="btn primary" type="submit">
              Cadastrar
            </button>

            <button
              className="btn"
              type="button"
              onClick={goLogin}
            >
              Já tenho conta
            </button>
          </>
        )}
      </form>
    </div>
  );
}
