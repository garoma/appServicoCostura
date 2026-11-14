import { useState } from 'react';
import Avatar from './Avatar';

// Estrutura fixa do app: menu lateral, cabeçalho, corpo e rodapé
export default function Layout({ user, menu, page, go, onLogout, children }) {
  const [open, setOpen] = useState(false);
  const current = menu.find((m) => m.page === page);

  return (
    <div className="app">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">appServicosCostura</div>
        <nav>
          {menu.map((m) => (
            <button
              key={m.page}
              className={m.page === page ? 'nav-item active' : 'nav-item'}
              onClick={() => { go(m.page, m.params); setOpen(false); }}
            >
              <span aria-hidden>{m.icon}</span> {m.label}
            </button>
          ))}
        </nav>
        <button className="nav-item logout" onClick={onLogout}>Sair</button>
      </aside>
      {open && <div className="backdrop" onClick={() => setOpen(false)} />}

      <div className="main">
        <header className="header">
          <button className="menu-btn" onClick={() => setOpen(true)} aria-label="Abrir menu">☰</button>
          <h1>{current?.label || 'Perfil'}</h1>
          <div className="header-user">
            <Avatar user={user} size={36} />
            <span>{user.name}</span>
            <small className="badge">{user.role}</small>
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="footer">© 2026 appServicosCostura · Serviços de confiança perto de você</footer>
      </div>
    </div>
  );
}
