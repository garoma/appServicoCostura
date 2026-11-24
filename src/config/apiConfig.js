// Arquivo único de configuração das APIs.
// USE_MOCK = true  -> usa dados fake (src/data/mockData.js)
// USE_MOCK = false -> chama a API real em BASE_URL
export const API_CONFIG = {
  USE_MOCK: false,
  //BASE_URL: 'https://api.appservicoscostura.com.br',
  BASE_URL: 'https://localhost:7088',
  endpoints: {
    loginAdmin: '/api/auth/login',
    loginCliente: '/api/auth/cliente/login',
    loginProfissional: '/api/auth/profissional/login',
    registerCliente: '/api/clientes/criar',
    registerProfissional: '/api/profissionais/criar',

    fabricationSteps: '/fabrication-steps',
    login: '/auth/login',
    register: '/auth/register',
    professionals: '/api/profissionais/buscar',
    users: '/users',
    user: (id) => `/users/${id}`,
    block: (id) => `/users/${id}/block`,
    plan: (id) => `/users/${id}/plan`,
    serviceKinds: '/service-kinds',
    serviceTypes: '/service-types',
    services: '/services',
    conclude: (id) => `/services/${id}/conclude`,
    offers: '/offers',
    acceptOffer: (id) => `/offers/${id}/accept`,
    reviews: '/reviews',
    payments: '/payments',
    payPayment: (id) => `/payments/${id}/pay`,
    tiposServicos: '/api/tipos-servicos',
    tiposPecas: '/api/tipos-pecas',
  },
};

// Regras de cobrança do app
export const FEES = {
  proServiceRate: 0.1,   // profissional (plano "taxa por serviço"): 10% do serviço
  userServiceRate: 0.03, // usuário: 3% do serviço concluído
  proMonthly: 49.9,      // profissional (plano mensal)
};
