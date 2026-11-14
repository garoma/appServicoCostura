
import { useState } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import PostarServico from './pages/PostarServico';
import MeusServicos from './pages/MeusServicos';
import BuscarProfissionais from './pages/BuscarProfissionais';
import ServicosDisponiveis from './pages/ServicosDisponiveis';
import MinhasOfertas from './pages/MinhasOfertas';
import Planos from './pages/Planos';
import Perfil from './pages/Perfil';
import AdminPagamentos from './pages/AdminPagamentos';
import AdminBloqueios from './pages/AdminBloqueios';

// Novas páginas
import FazerPecaCompleta from './pages/FazerPecaCompleta';
import MinhasProducoes from './pages/MinhasProducoes';
import EtapasFabricacao from './pages/EtapasFabricacao';
import Producoes from './pages/Producoes';

const PAGES = {
  postarServico: PostarServico,
  meusServicos: MeusServicos,
  buscarProfissionais: BuscarProfissionais,
  servicosDisponiveis: ServicosDisponiveis,
  minhasOfertas: MinhasOfertas,
  planos: Planos,
  perfil: Perfil,
  adminPagamentos: AdminPagamentos,
  adminBloqueios: AdminBloqueios,

  // Fabricação completa
  fazerPecaCompleta: FazerPecaCompleta,
  minhasProducoes: MinhasProducoes,
  etapasFabricacao: EtapasFabricacao,
  producoes: Producoes,
};

// Menu lateral por tipo de conta
const menuFor = (user) => {
  const perfil = {
    page: 'perfil',
    label: 'Meu perfil',
    icon: '👤',
    params: { userId: user.id }
  };

  if (user.role === 'admin')
    return [
      { page: 'adminPagamentos', label: 'Pagamentos', icon: '💳' },
      { page: 'adminBloqueios', label: 'Bloqueios', icon: '🚫' },
      { page: 'etapasFabricacao', label: 'Etapas de fabricação', icon: '⚙️' },
      { page: 'producoes', label: 'Produções completas', icon: '🏭' },
    ];

  if (user.role === 'profissional')
    return [
      { page: 'servicosDisponiveis', label: 'Serviços disponíveis', icon: '🔎' },
      { page: 'minhasOfertas', label: 'Minhas ofertas', icon: '📨' },
      { page: 'planos', label: 'Plano e pagamentos', icon: '💳' },
      perfil,
    ];

  return [
    { page: 'buscarProfissionais', label: 'Buscar profissionais', icon: '🔎' },
    { page: 'postarServico', label: 'Postar serviço', icon: '📝' },
    { page: 'meusServicos', label: 'Meus serviços', icon: '📋' },
    { page: 'fazerPecaCompleta', label: 'Fazer peça completa', icon: '🧵' },
    { page: 'minhasProducoes', label: 'Minhas produções', icon: '🏭' },
    perfil,
  ];
};

export default function App() {
  const [user, setUser] = useState(
    () => JSON.parse(localStorage.getItem('user') || 'null')
  );

  const [authView, setAuthView] = useState('login');
  const [route, setRoute] = useState({ page: null, params: {} });

  const go = (page, params = {}) =>
    setRoute({ page, params });

  const handleAuth = ({ token, user: u }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(u));
    setUser(u);
    setRoute({ page: null, params: {} });
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setAuthView('login');
  };

  if (!user)
    return authView === 'login'
      ? <Login
          onAuth={handleAuth}
          goRegister={() => setAuthView('cadastro')}
        />
      : <Cadastro
          onAuth={handleAuth}
          goLogin={() => setAuthView('login')}
        />;

  const menu = menuFor(user);
  const page = route.page || menu[0].page;
  const Page = PAGES[page];

  if (!Page) {
    return <Layout
      user={user}
      menu={menu}
      page={page}
      go={go}
      onLogout={logout}
    >
      <div>Página não encontrada.</div>
    </Layout>;
  }

  return (
    <Layout
      user={user}
      menu={menu}
      page={page}
      go={go}
      onLogout={logout}
    >
      <Page
        key={page + JSON.stringify(route.params)}
        user={user}
        go={go}
        params={route.params}
      />
    </Layout>
  );
}
