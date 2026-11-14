
import { useEffect, useState } from 'react';
import Avatar from '../components/Avatar';
import {
  register,
  listServiceKinds,
  listServiceTypes
} from '../services/api';
import { fileToDataUrl } from '../utils/image';

export default function Cadastro({ onAuth, goLogin }) {
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
    category: '',
    basePrice: '',
    kinds: [],
    pieces: [],
  });

  const [kinds, setKinds] = useState([]);
  const [types, setTypes] = useState([]);
  const [error, setError] = useState('');

  const isPro = form.role === 'profissional';

  useEffect(() => {
    listServiceKinds().then(setKinds);
    listServiceTypes().then(setTypes);
  }, []);

  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
  };

  const setCep = (e) => {
    const value = e.target.value
      .replace(/\D/g, '')
      .slice(0, 8)
      .replace(/^(\d{5})(\d)/, '$1-$2');

    setForm({ ...form, zipCode: value });
  };

  const toggle = (k, value) =>
    setForm({
      ...form,
      [k]: form[k].includes(value)
        ? form[k].filter((v) => v !== value)
        : [...form[k], value],
    });

  const pickPhoto = async (file) => {
    if (file) {
      setForm({
        ...form,
        photo: await fileToDataUrl(file),
      });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      onAuth(
        await register({
          ...form,
          basePrice: Number(form.basePrice) || 0,
          plan: 'taxa_servico',
        })
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <h2 className="brand-dark">Criar conta</h2>

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
              accept="image/*"
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

            <label className="field">
              Categoria (ex.: Costureira)
              <input
                value={form.category}
                onChange={set('category')}
                required
              />
            </label>

            <label className="field">
              Preço base por peça (R$)
              <input
                type="number"
                min="0"
                value={form.basePrice}
                onChange={set('basePrice')}
              />
            </label>

            <div className="field">
              Tipos de serviço que faço
              <div className="check-group">
                {kinds.map((k) => (
                  <label key={k}>
                    <input
                      type="checkbox"
                      checked={form.kinds.includes(k)}
                      onChange={() => toggle('kinds', k)}
                    />
                    {k}
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              Tipos de peça que atendo
              <div className="check-group">
                {types.map((t) => (
                  <label key={t}>
                    <input
                      type="checkbox"
                      checked={form.pieces.includes(t)}
                      onChange={() => toggle('pieces', t)}
                    />
                    {t}
                  </label>
                ))}
              </div>
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
      </form>
    </div>
  );
}
