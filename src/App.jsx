
import { useState } from 'react';
import Layout from './components/Layout';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import MeuPerfil from './pages/MeuPerfil';
import PostarServico from './pages/PostarServico';
import MeusServicos from './pages/MeusServicos';
import BuscarProfissionais from './pages/BuscarProfissionais';
import ServicosDisponiveis from './pages/ServicosDisponiveis';
import MinhasOfertas from './pages/MinhasOfertas';
import Planos from './pages/Planos';
import Perfil from './pages/Perfil';
import AdminPagamentos from './pages/AdminPagamentos';
import AdminBloqueios from './pages/AdminBloqueios';

import FazerPecaCompleta from './pages/FazerPecaCompleta';
import MinhasProducoes from './pages/MinhasProducoes';
import EtapasFabricacao from './pages/EtapasFabricacao';
import Producoes from './pages/Producoes';
import AdminTiposServicos from './pages/AdminTiposServicos';
import AdminTiposPecas from './pages/AdminTiposPecas';

const PAGES = {
  postarServico: PostarServico,
  meusServicos: MeusServicos,
  buscarProfissionais: BuscarProfissionais,
  servicosDisponiveis: ServicosDisponiveis,
  minhasOfertas: MinhasOfertas,
  planos: Planos,
  adminTiposServicos: AdminTiposServicos,
  adminTiposPecas: AdminTiposPecas,

  // Perfil do próprio usuário
  meuPerfil: MeuPerfil,

  // Perfil público de outro usuário/profissional
  perfil: Perfil,

  adminPagamentos: AdminPagamentos,
  adminBloqueios: AdminBloqueios,
  fazerPecaCompleta: FazerPecaCompleta,
  minhasProducoes: MinhasProducoes,
  etapasFabricacao: EtapasFabricacao,
  producoes: Producoes,
};

const menuFor = (user) => {
  const meuPerfil = {
    page: 'meuPerfil',
    label: 'Meu perfil',
    icon: '👤',
  };

if (user.role === 'admin')
  return [
    { page: 'adminPagamentos', label: 'Pagamentos', icon: '💳' },
    { page: 'adminBloqueios', label: 'Bloqueios', icon: '🚫' },
    { page: 'adminTiposServicos', label: 'Tipos de serviços', icon: '✂️' },
    { page: 'adminTiposPecas', label: 'Tipos de peças', icon: '👖' },
    //{ page: 'etapasFabricacao', label: 'Etapas de fabricação', icon: '⚙️' },
    //{ page: 'producoes', label: 'Produções completas', icon: '🏭' },
  ];

  if (user.role === 'profissional')
    return [
      { page: 'servicosDisponiveis', label: 'Serviços disponíveis', icon: '🔎' },
      { page: 'minhasOfertas', label: 'Minhas ofertas', icon: '📨' },
      { page: 'planos', label: 'Plano e pagamentos', icon: '💳' },
      meuPerfil,
    ];

  return [
    { page: 'buscarProfissionais', label: 'Buscar profissionais', icon: '🔎' },
    { page: 'postarServico', label: 'Postar serviço', icon: '📝' },
    { page: 'meusServicos', label: 'Meus serviços', icon: '📋' },
    //{ page: 'fazerPecaCompleta', label: 'Fazer peça completa', icon: '🧵' },
    //{ page: 'minhasProducoes', label: 'Minhas produções', icon: '🏭' },
    meuPerfil,
  ];
};

export default function App() {
  const [user, setUser] = useState(
    () => JSON.parse(localStorage.getItem('user') || 'null')
  );

  const [authView, setAuthView] = useState('login');
  const [authMessage, setAuthMessage] = useState('');
  const [route, setRoute] = useState({ page: null, params: {} });

  const go = (page, params = {}) =>
    setRoute({ page, params });

  const handleAuth = ({ token, user: u }) => {
    if (!token || !u) {
      throw new Error('Não foi possível iniciar a sessão.');
    }

    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(u));

    setAuthMessage('');
    setUser(u);
    setRoute({ page: null, params: {} });
  };

  const handleRegistered = () => {
    setAuthMessage(
      'Cadastro realizado com sucesso! Entre com seu e-mail ou telefone e senha.'
    );
    setAuthView('login');
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setUser(null);
    setAuthMessage('');
    setRoute({ page: null, params: {} });
    setAuthView('login');
  };

  if (!user) {
    return authView === 'login'
      ? (
        <Login
          onAuth={handleAuth}
          goRegister={() => {
            setAuthMessage('');
            setAuthView('cadastro');
          }}
          message={authMessage}
        />
      )
      : (
        <Cadastro
          onAuth={handleAuth}
          onRegistered={handleRegistered}
          goLogin={() => {
            setAuthMessage('');
            setAuthView('login');
          }}
        />
      );
  }

  //const menu = menuFor(user);
  //const page = route.page || menu[0].page;

  const menu = menuFor(user);

  const paginasSomenteAdmin = [
    'adminTiposServicos',
    'adminTiposPecas',
  ];

  let page = route.page || menu[0].page;

  if (
    paginasSomenteAdmin.includes(page) &&
    user.role !== 'admin'
  ) {
    page = menu[0].page;
  }

  const Page = PAGES[page];

  console.log('PÁGINA ATUAL:', page);
  console.log('COMPONENTE:', Page?.name);

  if (!Page) {
    return (
      <Layout
        user={user}
        menu={menu}
        page={page}
        go={go}
        onLogout={logout}
      >
        <div>Página não encontrada.</div>
      </Layout>
    );
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
