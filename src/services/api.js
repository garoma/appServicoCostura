import { API_CONFIG, FEES } from '../config/apiConfig';
import { db } from '../data/mockData';
import { averageRating } from '../utils/rating';

const E = API_CONFIG.endpoints;
let seq = 1000;
const nextId = () => ++seq;
const today = () => new Date().toISOString().slice(0, 10);

// ---- infraestrutura: mock ou http real ----

async function http(path, method = 'GET', body) {
  const token = localStorage.getItem('token');

  const isFormData = body instanceof FormData;

  const headers = {};

  // FormData não deve receber Content-Type manualmente.
  // O navegador adiciona o boundary automaticamente.
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_CONFIG.BASE_URL}${path}`, {
    method,
    headers,
    body: body
      ? isFormData
        ? body
        : JSON.stringify(body)
      : undefined,
  });

  //const data = await response.json().catch(() => null);

  const texto = await response.text();

  let data = null;

  try {
    data = texto ? JSON.parse(texto) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const mensagem =
      data?.erro ||
      data?.mensagem ||
      data?.message ||
      data?.title ||
      'Erro ao comunicar com o servidor.';
      
        throw new Error(mensagem);
  }

  return data;
}

async function call(mock, path, method, body) {
  console.log('USE_MOCK:', API_CONFIG.USE_MOCK);
  console.log('BASE_URL:', API_CONFIG.BASE_URL);
  console.log('ENDPOINT:', path);

  if (!API_CONFIG.USE_MOCK) return http(path, method, body);
  await new Promise((r) => setTimeout(r, 200));
  return structuredClone(mock());
}

// ---- helpers do mock ----
const safe = ({ password, ...u }) => u;
const find = (list, id) => list.find((x) => x.id === id);
const withRating = (u) => {
  const rs = db.reviews.filter((r) => r.toId === u.id);
  return { ...safe(u), rating: averageRating(rs), reviewCount: rs.length };
};

// ---- autenticação ----
export const login = (perfil, identificador, senha) => {
  const endpoint =
    perfil === 'admin'
      ? API_CONFIG.endpoints.loginAdmin
      : perfil === 'profissional'
        ? API_CONFIG.endpoints.loginProfissional
        : API_CONFIG.endpoints.loginCliente;

  const body =
    perfil === 'admin'
      ? { email: identificador, senha }
      : { identificador, senha };

  
  return call(
    () => {
      const u = db.users.find((x) => {
        const identificacao =
          perfil === 'admin'
            ? x.email === identificador
            : x.email === identificador || x.phone === identificador;

        return identificacao && x.password === senha && x.role === perfil;
      });

      if (!u) {
        throw new Error('E-mail, telefone ou senha inválidos.');
      }

      if (u.blocked) {
        throw new Error('Conta bloqueada. Fale com o suporte.');
      }

      return {
        token: 'mock-token',
        user: safe(u),
      };
    },
    endpoint,
    'POST',
    body
  ).then((resultado) => {
    if (resultado.user) {
      return resultado;
    }

    if (perfil === 'admin') {
      return {
        token: resultado.token,
        user: {
          id: null,
          name: resultado.nome,
          email: resultado.email,
          role: 'admin',
        },
      };
    }

    const foto = resultado.foto
      ? `data:${resultado.fotoContentType || 'image/jpeg'};base64,${resultado.foto}`
      : null;

    if (perfil === 'profissional') {
      return {
        token: resultado.token,
        user: {
          id: resultado.profissionalId,
          name: resultado.nome,
          phone: resultado.telefone,
          email: resultado.email,
          photo: foto,
          role: 'profissional',
        },
      };
    }

    return {
      token: resultado.token,
      user: {
        id: resultado.clienteId,
        name: resultado.nome,
        phone: resultado.telefone,
        email: resultado.email,
        photo: foto,
        role: 'usuario',
      },
    };
  });
};

export const register = (data) => {
  const profissional = data.role === 'profissional';

  const endpoint = profissional
    ? API_CONFIG.endpoints.registerProfissional
    : API_CONFIG.endpoints.registerCliente;

  // Monta o multipart/form-data para a API.
  const body = new FormData();

  const dadosComuns = {
    Nome: data.name,
    Telefone: data.phone,
    Email: data.email,
    Senha: data.password,
    Endereco: data.address,
    Bairro: data.neighborhood,
    Cidade: data.city,
    Cep: data.zipCode,
    PontoReferencia: data.referencePoint,
  };

  Object.entries(dadosComuns).forEach(([chave, valor]) => {
    body.append(chave, valor ?? '');
  });

  if (profissional) {
    (data.kinds || []).forEach((servico, index) => {
      body.append(`Servicos[${index}]`, servico);
    });

    (data.pieces || []).forEach((peca, index) => {
      body.append(`Pecas[${index}]`, peca);
    });
  }

  // Foto original selecionada pelo usuário.
  if (data.photoFile) {
    body.append('Foto', data.photoFile);
  }

  return call(
    () => {
      if (db.users.some((u) => u.email === data.email)) {
        throw new Error('E-mail já cadastrado.');
      }

      // Não armazenar o objeto File no mock.
      const { photoFile, ...dadosMock } = data;

      const user = {
        id: nextId(),
        blocked: false,
        plan: 'taxa_servico',
        ...dadosMock,
      };

      db.users.push(user);

      return {
        token: 'mock-token',
        user: safe(user),
      };
    },
    endpoint,
    'POST',
    body
  );
};

// ---- atualização de perfil ----
export const updateProfile = (perfil, data) => {
  const profissional = perfil === 'profissional';

  const endpoint = profissional
    ? '/api/profissionais/perfil'
    : '/api/clientes/perfil';

  const body = new FormData();

  const campos = {
    Nome: data.name,
    Telefone: data.phone,
    Email: data.email,
    Endereco: data.address,
    Bairro: data.neighborhood,
    Cidade: data.city,
    Cep: data.zipCode,
    PontoReferencia: data.referencePoint,
    RemoverFoto: data.removePhoto ? 'true' : 'false',
  };

  Object.entries(campos).forEach(([chave, valor]) => {
    body.append(chave, valor ?? '');
  });

  // Dados específicos do profissional
  if (profissional) {
    (data.kinds || []).forEach((servico, index) => {
      body.append(`Servicos[${index}]`, servico);
    });

    (data.pieces || []).forEach((peca, index) => {
      body.append(`Pecas[${index}]`, peca);
    });
  }

  // Foto selecionada
  if (data.photoFile) {
    body.append('Foto', data.photoFile);
  }

  return call(
    () => {
      const user = db.users.find(
        (u) => u.id === data.id
      );

      if (!user) {
        throw new Error('Usuário não encontrado.');
      }

      Object.assign(user, {
        name: data.name,
        phone: data.phone,
        email: data.email,
        address: data.address,
        neighborhood: data.neighborhood,
        city: data.city,
        zipCode: data.zipCode,
        referencePoint: data.referencePoint,
      });

      if (profissional) {
        user.kinds = data.kinds || [];
        user.pieces = data.pieces || [];
      }

      return safe(user);
    },
    endpoint,
    'PUT',
    body
  );
};



export const getMyProfile = async (perfil) => {
  const profissional = perfil === 'profissional';

  const endpoint = profissional
    ? '/api/profissionais/perfil'
    : '/api/clientes/perfil';

  const resultado = await call(
    () => {
      const user = db.users.find(
        u => String(u.id) === String(
          JSON.parse(localStorage.getItem('user') || '{}').id
        )
      );

      if (!user) {
        throw new Error('Usuário não encontrado.');
      }

      return safe(user);
    },
    endpoint
  );

  return {
    id: resultado.id,
    name: resultado.nome || resultado.name || '',
    phone: resultado.telefone || resultado.phone || '',
    email: resultado.email || '',
    address: resultado.endereco || resultado.address || '',
    neighborhood: resultado.bairro || resultado.neighborhood || '',
    city: resultado.cidade || resultado.city || '',
    zipCode: resultado.cep || resultado.zipCode || '',
    referencePoint:
      resultado.pontoReferencia || resultado.referencePoint || '',
    photo: resultado.foto
      ? `data:${resultado.fotoContentType || 'image/jpeg'};base64,${resultado.foto}`
      : resultado.photo || '',
    kinds: resultado.servicos || resultado.kinds || [],
    pieces: resultado.pecas || resultado.pieces || []
  };
};

// ---- usuários / profissionais ----
export const getUser = (id) => call(() => withRating(find(db.users, id)), E.user(id));

export const listProfessionals = (f = {}) =>
  call(() =>
    db.users
      .filter((u) => u.role === 'profissional' && !u.blocked)
      .map(withRating)
      .filter((p) => (!f.maxPrice || p.basePrice <= f.maxPrice) && p.rating >= (f.minRating || 0) &&
        (!f.kind || p.kinds?.includes(f.kind)) && (!f.piece || p.pieces?.includes(f.piece)) &&
        (!f.q || p.name.toLowerCase().includes(f.q.toLowerCase())))
      .sort((a, b) => (f.sort === 'price' ? a.basePrice - b.basePrice : b.rating - a.rating)),
  `${E.professionals}?${new URLSearchParams({ q: f.q || '', maxPrice: f.maxPrice || '', minRating: f.minRating || '', sort: f.sort || 'rating' })}`, 'GET');

export const setPlan = (userId, plan) =>
  call(() => { find(db.users, userId).plan = plan; return { ok: true }; }, E.plan(userId), 'PUT', { plan });

// ---- serviços ----

// export const listServiceKinds = async () => {
//   return structuredClone(db.serviceKinds || []);
// };

// export const listServiceTypes = async () => {
//   return structuredClone(db.serviceTypes || []);
// };

export const listServiceKinds = async () => {
  const resultado = await call(
    () => db.serviceKinds || [],
    E.tiposServicos + '/ativos',
    'GET'
  );

  return resultado.map(item =>
    typeof item === 'string' ? item : item.nome
  );
};

export const listServiceTypes = async () => {
  const resultado = await call(
    () => db.serviceTypes || [],
    E.tiposPecas + '/ativos',
    'GET'
  );

  return resultado.map(item =>
    typeof item === 'string' ? item : item.nome
  );
};

// ---- fabricação completa ----
export const listFabricationSteps = (pieceType) =>
  call(
    () => {
      const config = db.fabricationSteps.find(
        (x) => x.pieceType === pieceType
      );

      return config ? config.steps : [];
    },
    E.fabricationSteps + `?pieceType=${encodeURIComponent(pieceType)}`,
    'GET'
  );

export const saveFabricationSteps = (pieceType, steps) =>
  call(
    () => {
      let config = db.fabricationSteps.find(
        (x) => x.pieceType === pieceType
      );

      if (!config) {
        config = {
          id: nextId(),
          pieceType,
          steps: [],
        };

        db.fabricationSteps.push(config);
      }

      config.steps = steps.map((serviceKind, index) => ({
        serviceKind,
        order: index + 1,
      }));

      return config;
    },
    E.fabricationSteps,
    'PUT',
    { pieceType, steps }
  );

export const listServices = ({ ownerId, forProId } = {}) =>
  call(() =>
    db.services
      .filter((s) => (ownerId ? s.ownerId === ownerId : true))
      .filter((s) => (forProId ? s.status === 'aberto' && (!s.targetProId || s.targetProId === forProId) : true))
      .map((s) => ({
        ...s,
        owner: withRating(find(db.users, s.ownerId)),
        pro: s.proId ? withRating(find(db.users, s.proId)) : null,
        offers: db.offers.filter((o) => o.serviceId === s.id).map((o) => ({ ...o, pro: withRating(find(db.users, o.proId)) })),
      })),
  E.services + (ownerId ? `?ownerId=${ownerId}` : forProId ? `?forProId=${forProId}` : ''), 'GET');

export const createService = (data) =>
  call(() => {
    const s = { id: nextId(), proId: null, status: 'aberto', ...data };
    db.services.unshift(s);
    return s;
  }, E.services, 'POST', data);

// dados do serviço que acompanham cada pagamento (preço unitário, quantidade e total)
const saleInfo = (s) => ({ serviceKind: s.serviceKind, pieceType: s.type, unitPrice: s.price, quantity: s.quantity, total: s.total });


export const concludeService = (id) =>
  call(() => {
    const s = find(db.services, id);

    if (!s) throw new Error('Serviço não encontrado.');

    // Evita cobrar duas vezes e gerar etapas duplicadas.
    if (s.status === 'concluido') return s;

    s.status = 'concluido';

    const pro = find(db.users, s.proId);

    db.payments.push({
      id: nextId(),
      payerId: s.ownerId,
      payerRole: 'usuario',
      type: 'taxa_servico',
      ...saleInfo(s),
      amount: +((s.total || 0) * FEES.userServiceRate).toFixed(2),
      status: 'pendente',
      date: today(),
    });

    if (pro?.plan === 'taxa_servico') {
      db.payments.push({
        id: nextId(),
        payerId: pro.id,
        payerRole: 'profissional',
        type: 'taxa_servico',
        ...saleInfo(s),
        amount: +((s.total || 0) * FEES.proServiceRate).toFixed(2),
        status: 'pendente',
        date: today(),
      });
    }

    // Se for peça completa, gera a próxima etapa.
    advanceProduction(s);

    return s;
  }, E.conclude(id), 'POST');

// ---- ofertas ----
export const listOffers = ({ proId }) =>
  call(() => db.offers.filter((o) => o.proId === proId).map((o) => {
    const s = find(db.services, o.serviceId);
    return { ...o, service: { ...s, owner: withRating(find(db.users, s.ownerId)) } };
  }), E.offers + `?proId=${proId}`, 'GET');

export const createOffer = (data) =>
  call(() => { const o = { id: nextId(), status: 'pendente', ...data }; db.offers.push(o); return o; }, E.offers, 'POST', data);

export const acceptOffer = (id) =>
  call(() => {
    const o = find(db.offers, id);
    db.offers.filter((x) => x.serviceId === o.serviceId).forEach((x) => (x.status = x.id === id ? 'aceita' : 'recusada'));
    Object.assign(find(db.services, o.serviceId), { proId: o.proId, price: o.price, total: o.total, status: 'em_andamento' });
    return o;
  }, E.acceptOffer(id), 'POST');

  // Atualiza o andamento de uma etapa de fabricação.
  // etapaStatus: nao_iniciada | iniciada | em_desenvolvimento | finalizada
export const updateFabricationStepProgress = (
  serviceId,
  etapaStatus,
  percentualConclusao = 0
) =>
  call(
    () => {
      const service = find(db.services, serviceId);

      if (!service) {
        throw new Error('Etapa não encontrada.');
      }

      if (!service.pecaCompleta) {
        throw new Error('Este serviço não pertence a uma fabricação completa.');
      }

      if (service.status === 'concluido') {
        throw new Error('Esta etapa já foi finalizada.');
      }

      const statusPermitidos = [
        'nao_iniciada',
        'iniciada',
        'em_desenvolvimento',
        'finalizada',
      ];

      if (!statusPermitidos.includes(etapaStatus)) {
        throw new Error('Status de etapa inválido.');
      }

      let percentual = Number(percentualConclusao) || 0;
      percentual = Math.max(0, Math.min(100, percentual));

      if (etapaStatus === 'finalizada') {
        percentual = 100;
      } else if (etapaStatus !== 'em_desenvolvimento') {
        percentual = 0;
      } else {
        percentual = Math.min(99, Math.max(1, percentual));
      }

      service.etapaStatus = etapaStatus;
      service.percentualConclusao = percentual;

      return service;
    },
    `${E.services}/${serviceId}/progress`,
    'PUT',
    { etapaStatus, percentualConclusao }
  );

// ---- avaliações ----
export const listReviews = (toId) =>
  call(() => db.reviews.filter((r) => r.toId === toId).map((r) => ({ ...r, fromName: find(db.users, r.fromId)?.name })), E.reviews + `?toId=${toId}`, 'GET');

export const createReview = (data) =>
  call(() => { const r = { id: nextId(), ...data }; db.reviews.push(r); return r; }, E.reviews, 'POST', data);

// ---- admin ----
export const listPayments = () =>
  call(() => db.payments.map((p) => ({ ...p, payerName: find(db.users, p.payerId)?.name })), E.payments, 'GET');

export const payPayment = (id) =>
  call(() => { find(db.payments, id).status = 'pago'; return { ok: true }; }, E.payPayment(id), 'POST');

export const listUsers = () => call(() => db.users.filter((u) => u.role !== 'admin').map(safe), E.users, 'GET');

export const toggleBlock = (id) =>
  call(() => { const u = find(db.users, id); u.blocked = !u.blocked; return safe(u); }, E.block(id), 'POST');


// ---- produções de peças completas ----

export const createCompleteProduction = (data) =>
  call(() => {
    const config = db.fabricationSteps.find(
      (x) => x.pieceType === data.type
    );

    if (!config || !config.steps.length) {
      throw new Error('Não existe sequência cadastrada para esta peça.');
    }

    // Salva uma cópia da sequência para esta produção.
    const stepsSnapshot = config.steps
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((step, index) => ({
        order: index + 1,
        serviceKind: step.serviceKind,
      }));

    const productionId = nextId();

    const production = {
      id: productionId,
      ownerId: data.ownerId,
      pieceType: data.type,
      quantity: Number(data.quantity),
      description: data.description,
      photos: data.photos || [],
      steps: stepsSnapshot,
      status: 'em_andamento',
      currentStepOrder: stepsSnapshot[0].order,
      serviceIds: [],
      createdAt: today(),
      completedAt: null,
    };

    db.productions.unshift(production);

    const firstStep = stepsSnapshot[0];

    const service = {
      id: nextId(),
      ownerId: data.ownerId,
      serviceKind: firstStep.serviceKind,
      type: data.type,
      quantity: Number(data.quantity),
      description: data.description,
      photos: production.photos,
      targetProId: null,
      proId: null,

      // Status comercial do serviço: permanece separado
      // do status de execução da etapa.
      status: 'aberto',

      pecaCompleta: true,
      fabricacaoId: productionId,
      etapaFabricacaoOrdem: firstStep.order,

      etapaStatus: 'nao_iniciada',
      percentualConclusao: 0,
    };

    db.services.unshift(service);
    production.serviceIds.push(service.id);

    return {
      ...production,
      services: [service],
    };
  }, E.services, 'POST', data);

export const listProductions = ({ ownerId } = {}) =>
  call(
    () =>
      db.productions
        .filter((p) => ownerId ? p.ownerId === ownerId : true)
        .map((p) => {
          const services = db.services
            .filter((s) => s.fabricacaoId === p.id)
            .sort(
              (a, b) =>
                a.etapaFabricacaoOrdem - b.etapaFabricacaoOrdem
            );

          // Usa a sequência salva na produção, não a configuração atual.
          const steps = (p.steps || [])
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((step) => {
              const service = services.find(
                (s) => s.etapaFabricacaoOrdem === step.order
              );

              const etapaStatus =
                service?.etapaStatus ||
                (service?.status === 'concluido'
                  ? 'finalizada'
                  : 'nao_iniciada');

              const percentualConclusao =
                etapaStatus === 'finalizada'
                  ? 100
                  : etapaStatus === 'em_desenvolvimento'
                    ? Number(service?.percentualConclusao || 0)
                    : 0;

              return {
                order: step.order,
                serviceKind: step.serviceKind,
                status: etapaStatus,
                percentualConclusao,
                serviceStatus: service?.status || 'nao_criado',
                pro: service?.proId
                  ? withRating(find(db.users, service.proId))
                  : null,
              };
            });

          const total = steps.length;

          const completed = steps.filter(
            (step) => step.status === 'finalizada'
          ).length;

          const sumProgress = steps.reduce(
            (sum, step) => sum + step.percentualConclusao,
            0
          );

          const progress = total
            ? Math.round(sumProgress / total)
            : 0;

          return {
            ...p,
            steps,
            totalSteps: total,
            completedSteps: completed,
            remainingSteps: total - completed,
            progress,
            services: services.map((s) => ({
              ...s,
              pro: s.proId
                ? withRating(find(db.users, s.proId))
                : null,
            })),
            owner: withRating(find(db.users, p.ownerId)),
          };
        }),
    E.services + '/productions' +
      (ownerId ? `?ownerId=${ownerId}` : ''),
    'GET'
  );

function advanceProduction(service) {
  if (!service.pecaCompleta || !service.fabricacaoId) return;

  const production = db.productions.find(
    (p) => p.id === service.fabricacaoId
  );

  if (!production || production.status === 'concluida') return;

  // Usa o snapshot da produção.
  const steps = (production.steps || [])
    .slice()
    .sort((a, b) => a.order - b.order);

  const nextStep = steps.find(
    (step) => step.order > service.etapaFabricacaoOrdem
  );

  // Não existe próxima etapa: fabricação concluída.
  if (!nextStep) {
    const allFinished = steps.every((step) => {
      const currentService = db.services.find(
        (s) =>
          s.fabricacaoId === production.id &&
          s.etapaFabricacaoOrdem === step.order
      );

      return (
        currentService?.etapaStatus === 'finalizada' ||
        currentService?.status === 'concluido'
      );
    });

    if (allFinished) {
      production.status = 'concluida';
      production.completedAt = today();
    }

    return;
  }

  // Proteção contra duplicação.
  const alreadyCreated = db.services.some(
    (s) =>
      s.fabricacaoId === production.id &&
      s.etapaFabricacaoOrdem === nextStep.order
  );

  if (alreadyCreated) return;

  const nextService = {
    id: nextId(),
    ownerId: production.ownerId,
    serviceKind: nextStep.serviceKind,
    type: production.pieceType,
    quantity: production.quantity,
    description: production.description,
    photos: production.photos,
    targetProId: null,
    proId: null,
    status: 'aberto',
    pecaCompleta: true,
    fabricacaoId: production.id,
    etapaFabricacaoOrdem: nextStep.order,
    etapaStatus: 'nao_iniciada',
    percentualConclusao: 0,
  };

  db.services.unshift(nextService);
  production.serviceIds.push(nextService.id);
  production.currentStepOrder = nextStep.order;
}


// ==========================================
// ADMINISTRAÇÃO - TIPOS DE SERVIÇOS
// ==========================================

export const listAdminServiceKinds = async () => {
  return call(
    () => db.serviceKinds || [],
    E.tiposServicos,
    'GET'
  );
};

export const createServiceKind = async (nome) => {
  return call(
    () => null,
    E.tiposServicos,
    'POST',
    { nome }
  );
};

export const updateServiceKind = async (id, nome) => {
  return call(
    () => null,
    `${E.tiposServicos}/${id}`,
    'PUT',
    { id, nome }
  );
};

export const toggleServiceKind = async (id, ativo) => {
  return call(
    () => null,
    `${E.tiposServicos}/${id}/status`,
    'PATCH',
    { id, ativo }
  );
};

// ==========================================
// ADMINISTRAÇÃO - TIPOS DE PEÇAS
// ==========================================

export const listAdminServiceTypes = async () => {
  return call(
    () => db.serviceTypes || [],
    E.tiposPecas,
    'GET'
  );
};

export const createServiceType = async (nome) => {
  return call(
    () => null,
    E.tiposPecas,
    'POST',
    { nome }
  );
};

export const updateServiceType = async (id, nome) => {
  return call(
    () => null,
    `${E.tiposPecas}/${id}`,
    'PUT',
    { id, nome }
  );
};

export const toggleServiceType = async (id, ativo) => {
  return call(
    () => null,
    `${E.tiposPecas}/${id}/status`,
    'PATCH',
    { id, ativo }
  );
};
