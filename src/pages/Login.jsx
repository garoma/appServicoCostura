
import { useState } from 'react';
import { login } from '../services/api';

export default function Login({ onAuth, goRegister, message }) {
  const [perfil, setPerfil] = useState('usuario');
  const [identificador, setIdentificador] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const resultado = await login(
        perfil,
        identificador,
        password
      );

      onAuth(resultado);
    } catch (err) {
      setError(err.message || 'Não foi possível realizar o login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <h2 className="brand-dark">appServicosCostura</h2>

        <p className="muted">
          Entre para postar serviços ou receber ofertas.
        </p>

        {message && (
          <p className="success-message">
            {message}
          </p>
        )}

        <label className="field">
          Tipo de acesso
          <select
            value={perfil}
            onChange={(e) => {
              setPerfil(e.target.value);
              setIdentificador('');
              setError('');
            }}
          >
            <option value="usuario">Cliente</option>
            <option value="profissional">Profissional</option>
            <option value="admin">Administrador</option>
          </select>
        </label>

        <label className="field">
          {perfil === 'admin' ? 'E-mail' : 'E-mail ou telefone'}
          <input
            type={perfil === 'admin' ? 'email' : 'text'}
            value={identificador}
            onChange={(e) => setIdentificador(e.target.value)}
            placeholder={
              perfil === 'admin'
                ? 'Digite seu e-mail'
                : 'Digite seu e-mail ou telefone'
            }
            required
          />
        </label>

        <label className="field">
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {error && <p className="error">{error}</p>}

        <button
          className="btn primary"
          type="submit"
          disabled={loading}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        {perfil !== 'admin' && (
          <button
            className="btn"
            type="button"
            onClick={goRegister}
          >
            Criar conta
          </button>
        )}
      </form>
    </div>
  );
}
