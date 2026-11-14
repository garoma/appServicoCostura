import { useState } from 'react';
import { login } from '../services/api';

const DEMO = [
  ['Usuário', 'usuario@teste.com'],
  ['Profissional', 'pro@teste.com'],
  ['Admin', 'admin@teste.com'],
];

export default function Login({ onAuth, goRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      onAuth(await login(email, password));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth">
      <form className="card auth-card" onSubmit={submit}>
        <h2 className="brand-dark">appServicosCostura</h2>
        <p className="muted">Entre para postar serviços ou receber ofertas.</p>
        <label className="field">E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary" type="submit">Entrar</button>
        <button className="btn" type="button" onClick={goRegister}>Criar conta</button>
        <div className="demo">
          <small className="muted">Acesso rápido (dados fake, senha 123):</small>
          <div className="row wrap">
            {DEMO.map(([label, mail]) => (
              <button key={mail} type="button" className="btn small" onClick={() => { setEmail(mail); setPassword('123'); }}>{label}</button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
