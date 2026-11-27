
import { API_CONFIG, FEES } from '../config/apiConfig';
import { db, persistMockDb } from '../data/mockData';
import { averageRating } from '../utils/rating';
import {
  CRITERIA_CLIENTE_AVALIA_PROFISSIONAL,
  CRITERIA_PROFISSIONAL_AVALIA_CLIENTE,
  averageRating,
} from '../utils/rating';

const E = API_CONFIG.endpoints;

let seq = 1000;

const nextId = () => ++seq;
const today = () => new Date().toISOString().slice(0, 10);
const sameId = (a, b) => String(a) === String(b);

const safe = ({ password, ...user }) => user;

const find = (list, id) =>
  list.find((item) => sameId(item.id, id));


const withRating = (user) => {
  if (!user) return null;

  const reviews = db.reviews.filter(
    (review) => sameId(review.toId, user.id)
  );

  const tipoAvaliacao =
    user.role === 'profissional'
      ? 'clienteAvaliaProfissional'
      : 'profissionalAvaliaCliente';

  const criterios =
    user.role === 'profissional'
      ? CRITERIA_CLIENTE_AVALIA_PROFISSIONAL
      : CRITERIA_PROFISSIONAL_AVALIA_CLIENTE;

  // Considera somente avaliações que possuem todos
  // os critérios exigidos para aquela modalidade.
  const avaliacoesValidas = reviews.filter((review) =>
    criterios.every(
      (criterio) =>
        review[criterio.key] !== null &&
        review[criterio.key] !== undefined &&
        Number(review[criterio.key]) >= 1 &&
        Number(review[criterio.key]) <= 5
    )
  );

  return {
    ...safe(user),
    rating: averageRating(avaliacoesValidas, tipoAvaliacao),
    reviewCount: avaliacoesValidas.length,
  };
};

const obterEstatisticasServicos = (source = {}) => ({
  totalServicos: Number(
    source.totalServicos ?? source.TotalServicos ?? 0
  ),
  servicosEmAndamento: Number(
    source.servicosEmAndamento ?? source.ServicosEmAndamento ?? 0
  ),
  servicosFinalizados: Number(
    source.servicosFinalizados ?? source.ServicosFinalizados ?? 0
  ),
  servicosCancelados: Number(
    source.servicosCancelados ?? source.ServicosCancelados ?? 0
  ),
});

const withServiceStats = (user) => {
  if (!user) return null;

  const services = db.services.filter((service) =>
    user.role === 'profissional'
      ? sameId(service.proId, user.id)
      : sameId(service.ownerId, user.id)
  );

  return {
    ...user,
    totalServicos: services.length,
    servicosEmAndamento: services.filter(
      (s) => s.status === 'em_andamento'
    ).length,
    servicosFinalizados: services.filter(
      (s) => s.status === 'concluido'
    ).length,
    servicosCancelados: services.filter(
      (s) => s.status === 'cancelado'
    ).length,
  };
};

// ======================================================
// INFRAESTRUTURA: MOCK OU API REAL
// ======================================================

async function http(path, method = 'GET', body) {
  const token = localStorage.getItem('token');
  const isFormData = body instanceof FormData;

  const headers = {};

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

  const texto = await response.text();

  let data = null;

  try {
    data = texto ? JSON.parse(texto) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      data?.erro ||
      data?.mensagem ||
      data?.message ||
      data?.title ||
      'Erro ao comunicar com o servidor.'
    );
  }

  return data;
}

async function call(mock, path, method = 'GET', body) {
  if (!API_CONFIG.USE_MOCK) {
    return http(path, method, body);
  }

  await new Promise((resolve) => setTimeout(resolve, 200));

  const result = mock();

  // Salva as alterações feitas no banco fake.
  // Também é seguro executar em operações de consulta.
  persistMockDb();

  return structuredClone(result);
}

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const resultado = String(reader.result || '');
      resolve(resultado.split(',')[1] || '');
    };

    reader.onerror = () => {
      reject(new Error('Não foi possível ler uma das fotos.'));
    };

    reader.readAsDataURL(file);
  });

// ======================================================
// AUTENTICAÇÃO
// ======================================================

export const login = (perfil, identificador, senha) => {
  const endpoint =
    perfil === 'admin'
      ? E.loginAdmin
      : perfil === 'profissional'
        ? E.loginProfissional
        : E.loginCliente;

  const body =
    perfil === 'admin'
      ? { email: identificador, senha }
      : { identificador, senha };

  return call(
    () => {
      const user = db.users.find((item) => {
        const identification =
          perfil === 'admin'
            ? item.email === identificador
            : item.email === identificador ||
              item.phone === identificador;

        return (
          identification &&
          item.password === senha &&
          item.role === perfil
        );
      });

      if (!user) {
        throw new Error('E-mail, telefone ou senha inválidos.');
      }

      if (user.blocked) {
        throw new Error('Conta bloqueada. Fale com o suporte.');
      }

      return {
        token: 'mock-token',
        user: safe(user),
      };
    },
    endpoint,
    'POST',
    body
  ).then((result) => {
    if (result.user) return result;

    if (perfil === 'admin') {
      return {
        token: result.token,
        user: {
          id: null,
          name: result.nome,
          email: result.email,
          role: 'admin',
        },
      };
    }

    const photo = result.foto
      ? `data:${result.fotoContentType || 'image/jpeg'};base64,${result.foto}`
      : null;

    if (perfil === 'profissional') {
      return {
        token: result.token,
        user: {
          id: result.profissionalId,
          name: result.nome,
          phone: result.telefone,
          email: result.email,
          photo,
          role: 'profissional',
        },
      };
    }

    return {
      token: result.token,
      user: {
        id: result.clienteId,
        name: result.nome,
        phone: result.telefone,
        email: result.email,
        photo,
        role: 'usuario',
      },
    };
  });
};

export const register = (data) => {
  const profissional = data.role === 'profissional';

  const endpoint = profissional
    ? E.registerProfissional
    : E.registerCliente;

  const body = new FormData();

  const commonData = {
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

  Object.entries(commonData).forEach(([key, value]) => {
    body.append(key, value ?? '');
  });

  if (profissional) {
    (data.kinds || []).forEach((service, index) => {
      body.append(`Servicos[${index}]`, service);
    });

    (data.pieces || []).forEach((piece, index) => {
      body.append(`Pecas[${index}]`, piece);
    });
  }

  if (data.photoFile) {
    body.append('Foto', data.photoFile);
  }

  return call(
    () => {
      if (db.users.some((user) => user.email === data.email)) {
        throw new Error('E-mail já cadastrado.');
      }

      const { photoFile, ...mockData } = data;

      const user = {
        id: nextId(),
        blocked: false,
        plan: 'taxa_servico',
        ...mockData,
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

// ======================================================
// PERFIL
// ======================================================

export const updateProfile = (perfil, data) => {
  const profissional = perfil === 'profissional';

  const endpoint = profissional
    ? '/api/profissionais/perfil'
    : '/api/clientes/perfil';

  const body = new FormData();

  const fields = {
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

  Object.entries(fields).forEach(([key, value]) => {
    body.append(key, value ?? '');
  });

  if (profissional) {
    (data.kinds || []).forEach((service, index) => {
      body.append(`Servicos[${index}]`, service);
    });

    (data.pieces || []).forEach((piece, index) => {
      body.append(`Pecas[${index}]`, piece);
    });
  }

  if (data.photoFile) {
    body.append('Foto', data.photoFile);
  }

  return call(
    () => {
      const user = find(db.users, data.id);

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

  const result = await call(
    () => {
      const loggedUser = JSON.parse(
        localStorage.getItem('user') || '{}'
      );

      const user = find(db.users, loggedUser.id);

      if (!user) {
        throw new Error('Usuário não encontrado.');
      }

      return safe(user);
    },
    endpoint
  );

  return {
    id: result.id,
    name: result.nome || result.name || '',
    phone: result.telefone || result.phone || '',
    email: result.email || '',
    address: result.endereco || result.address || '',
    neighborhood: result.bairro || result.neighborhood || '',
    city: result.cidade || result.city || '',
    zipCode: result.cep || result.zipCode || '',
    referencePoint:
      result.pontoReferencia || result.referencePoint || '',
    photo: result.foto
      ? `data:${result.fotoContentType || 'image/jpeg'};base64,${result.foto}`
      : result.photo || '',
    kinds: result.servicos || result.kinds || [],
    pieces: result.pecas || result.pieces || [],
  };
};

// ======================================================
// USUÁRIOS E PROFISSIONAIS
// ======================================================

export const getUser = (id) => {
  if (API_CONFIG.USE_MOCK) {
    return call(
      () => withServiceStats(
        withRating(find(db.users, id))
      ),
      E.user(id)
    );
  }

  return buscarPerfilPublico(id);
};

export const listProfessionals = (filters = {}) =>
  call(
    // MODO MOCK: mantém o comportamento dos dados simulados
    () =>
      db.users
        .filter(
          (user) =>
            user.role === 'profissional' &&
            !user.blocked
        )
        .map(withRating)
        .filter(
          (professional) =>
            (!filters.maxPrice ||
              professional.basePrice <= filters.maxPrice) &&
            professional.rating >= (filters.minRating || 0) &&
            (!filters.kind ||
              professional.kinds?.includes(filters.kind)) &&
            (!filters.piece ||
              professional.pieces?.includes(filters.piece)) &&
            (!filters.q ||
              professional.name
                .toLowerCase()
                .includes(filters.q.toLowerCase()))
        )
        .sort((a, b) =>
          filters.sort === 'price'
            ? a.basePrice - b.basePrice
            : b.rating - a.rating
        ),

    // MODO API: utiliza os parâmetros esperados pelo backend
    `${E.professionals}?${new URLSearchParams({
      nome: filters.q || '',
      servico: filters.kind || '',
      peca: filters.piece || ''
    })}`,

    'GET'
  );

export const setPlan = (userId, plan) =>
  call(
    () => {
      const user = find(db.users, userId);

      if (!user) throw new Error('Usuário não encontrado.');

      user.plan = plan;

      return { ok: true };
    },
    E.plan(userId),
    'PUT',
    { plan }
  );

// ======================================================
// TIPOS DE SERVIÇOS E PEÇAS
// ======================================================

// export const listServiceTypes = async () => {
//   const result = await call(
//     () => db.serviceTypes || [],
//     E.tiposPecas + '/ativos',
//     'GET'
//   );

//   return (Array.isArray(result) ? result : []).map((item) =>
//     typeof item === 'string' ? item : item.nome
//   );
// };

// ======================================================
// SERVIÇOS
// ======================================================

export const listServices = async ({ ownerId, forProId } = {}) => {
  // API REAL
  if (!API_CONFIG.USE_MOCK) {
    const endpoint = forProId != null
      ? E.servicosDisponiveis
      : E.meusServicos;

    const resultado = await http(endpoint);

    return (Array.isArray(resultado) ? resultado : []).map((item) => ({
      id: item.id,
      serviceKind: item.serviceKind,
      type: item.type,
      quantity: item.quantidade,
      description: item.descricao,
      targetProId: item.targetProId,
      proId: item.proId,
      status: item.status,
      jaAvaliado: item.jaAvaliado ?? item.JaAvaliado ?? false,

      owner: {
        id: item.clienteId,
        name: item.clienteNome,
        city: item.clienteCidade,
        neighborhood: item.clienteBairro,
      },

      pro: item.proId
        ? {
            id: item.proId,
            name: item.profissionalNome,
          }
        : null,

      photos: [1, 2, 3]
        .map((numero) => {
          const foto = item[`foto${numero}`];
          const contentType = item[`foto${numero}ContentType`];

          return foto
            ? `data:${contentType || 'image/jpeg'};base64,${foto}`
            : null;
        })
        .filter(Boolean),

      createdAt: item.criadoEmUtc,

      offers: (Array.isArray(item.ofertas) ? item.ofertas : []).map(
        (oferta) => ({
          id: oferta.id,
          price: oferta.preco,
          quantity: oferta.quantidade,
          total: oferta.valorTotal,
          days: oferta.prazoDias,
          status: oferta.status,
          proId: oferta.profissionalId,
          pro: {
            id: oferta.profissionalId,
            name: oferta.profissionalNome,
          },
        })
      ),
    }));
  }

  // MOCK: mantém o comportamento anterior
  return call(
    () =>
      db.services
        .filter((service) =>
          ownerId == null ? true : sameId(service.ownerId, ownerId)
        )
        .filter(
          (service) =>
            forProId == null ||
            (service.status === 'aberto' &&
              (service.targetProId == null ||
                sameId(service.targetProId, forProId)))
        )
        .map((service) => ({
          ...service,
          owner: withRating(find(db.users, service.ownerId)),
          pro: service.proId
            ? withRating(find(db.users, service.proId))
            : null,
          offers: db.offers
            .filter((offer) => sameId(offer.serviceId, service.id))
            .map((offer) => ({
              ...offer,
              pro: withRating(find(db.users, offer.proId)),
            })),
        })),
    E.services +
      (ownerId != null
        ? `?ownerId=${ownerId}`
        : forProId != null
          ? `?forProId=${forProId}`
          : ''),
    'GET'
  );
};


export const createService = async (data) => {
  // Mantém o comportamento atual do Mock
  if (API_CONFIG.USE_MOCK) {
    return call(
      () => {
        const service = {
          id: nextId(),
          proId: null,
          status: 'aberto',
          ...data,
        };

        db.services.unshift(service);

        return service;
      },
      E.services,
      'POST',
      data
    );
  }

  // API real
  const fotos = data.photos || [];

  const payload = {
    tipoServicoId: data.serviceKindId,
    tipoPecaId: data.typeId,
    quantidade: Number(data.quantity),
    descricao: data.description,
    targetProId: data.targetProId || null,
  };

  for (let i = 0; i < 3; i++) {
    const foto = fotos[i];
    const numero = i + 1;

    payload[`foto${numero}`] = foto?.file
      ? await fileToBase64(foto.file)
      : null;

    payload[`foto${numero}ContentType`] = foto?.file
      ? foto.file.type || 'image/jpeg'
      : null;
  }

  return http(E.criarServico, 'POST', payload);
};

export const concludeService = (id) =>
  call(
    () => {
      const service = find(db.services, id);

      if (!service) {
        throw new Error('Serviço não encontrado.');
      }

      // Evita gerar pagamentos e avançar a produção duas vezes.
      if (service.status === 'concluido') {
        return service;
      }

      if (!service.proId) {
        throw new Error('Este serviço ainda não possui profissional.');
      }

      service.status = 'concluido';

      const professional = find(db.users, service.proId);

      const saleInfo = {
        serviceKind: service.serviceKind,
        pieceType: service.type,
        unitPrice: service.price,
        quantity: service.quantity,
        total: service.total,
      };

      db.payments.push({
        id: nextId(),
        payerId: service.ownerId,
        payerRole: 'usuario',
        type: 'taxa_servico',
        ...saleInfo,
        amount: +(
          (service.total || 0) * FEES.userServiceRate
        ).toFixed(2),
        status: 'pendente',
        date: today(),
      });

      if (professional?.plan === 'taxa_servico') {
        db.payments.push({
          id: nextId(),
          payerId: professional.id,
          payerRole: 'profissional',
          type: 'taxa_servico',
          ...saleInfo,
          amount: +(
            (service.total || 0) * FEES.proServiceRate
          ).toFixed(2),
          status: 'pendente',
          date: today(),
        });
      }

      advanceProduction(service);

      return service;
    },
    E.conclude(id),
    'POST'
  );

// ======================================================
// OFERTAS
// ======================================================

export const listOffers = ({ proId } = {}) =>
  call(
    () =>
      db.offers
        .filter((offer) =>
          proId == null
            ? true
            : sameId(offer.proId, proId)
        )
        .map((offer) => {
          const service = find(db.services, offer.serviceId);

          if (!service) {
            return {
              ...offer,
              jaAvaliado: false,
              service: null,
            };
          }

          const jaAvaliado = db.reviews.some(
            (review) =>
              sameId(review.serviceId, service.id) &&
              sameId(review.fromId, proId)
          );

          console.log('RESULTADO AVALIAÇÃO:', jaAvaliado);

          console.log('DEBUG AVALIAÇÃO', {
            proIdRecebido: proId,
            proIdDaOferta: offer.proId,
            avaliacoes: db.reviews,
            servicoId: offer.serviceId
          });

          return {
            ...offer,
            jaAvaliado,
            service: {
              ...service,
              owner: withRating(
                find(db.users, service.ownerId)
              ),
            },
          };
        }),
    E.offers,
    'GET'
  );

export const createOffer = (data) =>
  call(
    () => {
      const service = find(db.services, data.serviceId);

      if (!service) {
        throw new Error('Serviço não encontrado.');
      }

      if (service.status !== 'aberto') {
        throw new Error('Este serviço não está mais disponível.');
      }

      if (
        service.targetProId != null &&
        !sameId(service.targetProId, data.proId)
      ) {
        throw new Error('Este serviço foi direcionado a outro profissional.');
      }

      const professional = find(db.users, data.proId);

      if (
        !professional ||
        professional.role !== 'profissional' ||
        professional.blocked
      ) {
        throw new Error('Profissional inválido ou bloqueado.');
      }

      const price = Number(data.price);
      const quantity = Number(service.quantity);
      const days = Number(data.days);

      if (!Number.isFinite(price) || price <= 0) {
        throw new Error('Informe um preço válido.');
      }

      if (!Number.isInteger(days) || days <= 0) {
        throw new Error('Informe um prazo válido.');
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error('Quantidade de peças inválida.');
      }

      const existingOffer = db.offers.find(
        (offer) =>
          sameId(offer.serviceId, service.id) &&
          sameId(offer.proId, data.proId)
      );

      if (existingOffer) {
        throw new Error('Você já enviou uma oferta para este serviço.');
      }

      const offer = {
        id: nextId(),
        serviceId: service.id,
        proId: data.proId,
        price,
        quantity,
        total: +(price * quantity).toFixed(2),
        days,
        status: 'pendente',
      };

      db.offers.push(offer);

      return offer;
    },
    E.offers,
    'POST',
    API_CONFIG.USE_MOCK
      ? data
      : {
          servicoId: data.serviceId,
          preco: Number(data.price),
          quantidade: Number(data.quantity),
          prazoDias: Number(data.days),
        }
  );

export const acceptOffer = (id) =>
  call(
    () => {
      const offer = find(db.offers, id);

      if (!offer) {
        throw new Error('Oferta não encontrada.');
      }

      const service = find(db.services, offer.serviceId);

      if (!service) {
        throw new Error('Serviço relacionado à oferta não encontrado.');
      }

      if (offer.status === 'aceita') {
        return offer;
      }

      if (offer.status !== 'pendente') {
        throw new Error('Esta oferta não está mais disponível.');
      }

      if (service.status !== 'aberto') {
        throw new Error('Este serviço não está mais aberto.');
      }

      offer.status = 'aceita';

      db.offers
        .filter(
          (item) =>
            sameId(item.serviceId, service.id) &&
            !sameId(item.id, offer.id)
        )
        .forEach((item) => {
          item.status = 'recusada';
        });

      Object.assign(service, {
        proId: offer.proId,
        price: offer.price,
        total: offer.total,
        status: 'em_andamento',
      });

      return offer;
    },
    E.acceptOffer(id),
    'POST'
  );

// ======================================================
// FABRICAÇÃO COMPLETA
// ======================================================

export const listFabricationSteps = (pieceType) =>
  call(
    () => {
      const config = db.fabricationSteps.find(
        (item) => item.pieceType === pieceType
      );

      return config ? config.steps : [];
    },
    E.fabricationSteps +
      `?pieceType=${encodeURIComponent(pieceType)}`,
    'GET'
  );

export const saveFabricationSteps = (pieceType, steps) =>
  call(
    () => {
      let config = db.fabricationSteps.find(
        (item) => item.pieceType === pieceType
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
        throw new Error(
          'Este serviço não pertence a uma fabricação completa.'
        );
      }

      if (service.status === 'concluido') {
        throw new Error('Esta etapa já foi finalizada.');
      }

      if (service.status !== 'em_andamento') {
        throw new Error(
          'A etapa precisa ter uma oferta aceita antes de iniciar.'
        );
      }

      const allowedStatuses = [
        'nao_iniciada',
        'iniciada',
        'em_desenvolvimento',
        'finalizada',
      ];

      if (!allowedStatuses.includes(etapaStatus)) {
        throw new Error('Status de etapa inválido.');
      }

      let percentage = Number(percentualConclusao) || 0;

      percentage = Math.max(0, Math.min(100, percentage));

      if (etapaStatus === 'finalizada') {
        percentage = 100;
      } else if (etapaStatus !== 'em_desenvolvimento') {
        percentage = 0;
      } else {
        percentage = Math.min(99, Math.max(1, percentage));
      }

      service.etapaStatus = etapaStatus;
      service.percentualConclusao = percentage;

      return service;
    },
    `${E.services}/${serviceId}/progress`,
    'PUT',
    { etapaStatus, percentualConclusao }
  );

export const createCompleteProduction = (data) =>
  call(
    () => {
      const config = db.fabricationSteps.find(
        (item) => item.pieceType === data.type
      );

      if (!config || !config.steps?.length) {
        throw new Error(
          'Não existe sequência cadastrada para esta peça.'
        );
      }

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
    },
    E.services,
    'POST',
    data
  );

export const listProductions = ({ ownerId } = {}) =>
  call(
    () =>
      db.productions
        .filter((production) =>
          ownerId == null
            ? true
            : sameId(production.ownerId, ownerId)
        )
        .map((production) => {
          const services = db.services
            .filter((service) =>
              sameId(service.fabricacaoId, production.id)
            )
            .sort(
              (a, b) =>
                a.etapaFabricacaoOrdem - b.etapaFabricacaoOrdem
            );

          const steps = (production.steps || [])
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((step) => {
              const service = services.find((item) =>
                sameId(item.etapaFabricacaoOrdem, step.order)
              );

              const status =
                service?.etapaStatus ||
                (service?.status === 'concluido'
                  ? 'finalizada'
                  : 'nao_iniciada');

              const percentage =
                status === 'finalizada'
                  ? 100
                  : status === 'em_desenvolvimento'
                    ? Number(service?.percentualConclusao || 0)
                    : 0;

              return {
                order: step.order,
                serviceKind: step.serviceKind,
                status,
                percentualConclusao: percentage,
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
            ...production,
            steps,
            totalSteps: total,
            completedSteps: completed,
            remainingSteps: total - completed,
            progress,
            services: services.map((service) => ({
              ...service,
              pro: service.proId
                ? withRating(find(db.users, service.proId))
                : null,
            })),
            owner: withRating(
              find(db.users, production.ownerId)
            ),
          };
        }),
    E.services + '/productions' +
      (ownerId != null ? `?ownerId=${ownerId}` : ''),
    'GET'
  );

// Libera a próxima etapa da fabricação completa.
function advanceProduction(service) {
  if (!service.pecaCompleta || !service.fabricacaoId) {
    return;
  }

  const production = db.productions.find(
    (item) => sameId(item.id, service.fabricacaoId)
  );

  if (!production || production.status === 'concluida') {
    return;
  }

  const steps = (production.steps || [])
    .slice()
    .sort((a, b) => a.order - b.order);

  const nextStep = steps.find(
    (step) => step.order > service.etapaFabricacaoOrdem
  );

  // Última etapa: verifica se todas foram concluídas.
  if (!nextStep) {
    const allFinished = steps.every((step) => {
      const currentService = db.services.find(
        (item) =>
          sameId(item.fabricacaoId, production.id) &&
          sameId(item.etapaFabricacaoOrdem, step.order)
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

  // Não cria novamente uma etapa que já existe.
  const alreadyCreated = db.services.some(
    (item) =>
      sameId(item.fabricacaoId, production.id) &&
      sameId(item.etapaFabricacaoOrdem, nextStep.order)
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

// ======================================================
// AVALIAÇÕES
// ======================================================

export const listReviews = (toId) =>
  call(
    () =>
      db.reviews
        .filter((review) => sameId(review.toId, toId))
        .map((review) => ({
          ...review,
          fromName: find(db.users, review.fromId)?.name,
        })),
    E.reviews + `?toId=${toId}`,
    'GET'
  );


export const createReview = (data) =>
  call(
    () => {
      const service = find(db.services, data.serviceId);

      if (data.serviceId && !service) {
        throw new Error('Serviço não encontrado.');
      }

      const duplicate = db.reviews.some(
        (review) =>
          sameId(review.serviceId, data.serviceId) &&
          sameId(review.fromId, data.fromId)
      );

      if (duplicate) {
        throw new Error('Este serviço já foi avaliado por você.');
      }

      const review = {
        id: nextId(),
        ...data,
        quality: data.quality ?? null,
        price: data.price ?? null,
        clarity: data.clarity ?? null,
      };

      db.reviews.push(review);

      return review;
    },
    E.reviews,
    'POST',
    {
      servicoId: data.serviceId,
      quality: data.quality ?? null,
      deadline: data.deadline,
      price: data.price ?? null,
      service: data.service,
      clarity: data.clarity ?? null,
      comment: data.comment,
    }
  );
    
// ======================================================
// ADMINISTRAÇÃO: PAGAMENTOS E USUÁRIOS
// ======================================================

export const listPayments = () =>
  call(
    () =>
      db.payments.map((payment) => ({
        ...payment,
        payerName: find(db.users, payment.payerId)?.name,
      })),
    E.payments,
    'GET'
  );

export const payPayment = (id) =>
  call(
    () => {
      const payment = find(db.payments, id);

      if (!payment) {
        throw new Error('Pagamento não encontrado.');
      }

      payment.status = 'pago';

      return { ok: true };
    },
    E.payPayment(id),
    'POST'
  );

export const listUsers = () =>
  call(
    () =>
      db.users
        .filter((user) => user.role !== 'admin')
        .map(safe),
    E.users,
    'GET'
  );

export const toggleBlock = (id) =>
  call(
    () => {
      const user = find(db.users, id);

      if (!user) {
        throw new Error('Usuário não encontrado.');
      }

      user.blocked = !user.blocked;

      return safe(user);
    },
    E.block(id),
    'POST'
  );

// ======================================================
// ADMINISTRAÇÃO: TIPOS DE SERVIÇOS
// ======================================================

// ======================================================
// TIPOS DE SERVIÇOS - CONTROLE DOS DADOS FAKE
// ======================================================

const getServiceKindRecords = () => {
  const dadosAtuais = Array.isArray(db.serviceKindsAdmin)
    ? db.serviceKindsAdmin
    : [];

  // Migra automaticamente os tipos antigos, que eram strings.
  if (
    !Array.isArray(db.serviceKindsAdmin) ||
    (dadosAtuais.length === 0 &&
      Array.isArray(db.serviceKinds) &&
      db.serviceKinds.length > 0)
  ) {
    db.serviceKindsAdmin = (db.serviceKinds || []).map(
      (item, index) => ({
        id: index + 1,
        nome: typeof item === 'string' ? item : item.nome,
        ativo: typeof item === 'string' ? true : item.ativo !== false,
      })
    );
  } else {
    db.serviceKindsAdmin = dadosAtuais
      .map((item, index) => ({
        id: item.id ?? index + 1,
        nome: typeof item === 'string' ? item : item.nome || item.name || '',
        ativo: typeof item === 'string' ? true : item.ativo !== false,
      }))
      .filter((item) => item.nome);
  }

  return db.serviceKindsAdmin;
};

const syncActiveServiceKinds = () => {
  const records = getServiceKindRecords();

  // Mantém a estrutura antiga para não quebrar outras telas.
  db.serviceKinds = records
    .filter((item) => item.ativo)
    .map((item) => item.nome);
};

const getActiveServiceKindNames = () => {
  const records = getServiceKindRecords();

  return records
    .filter((item) => item.ativo)
    .map((item) => item.nome);
};

// ======================================================
// LISTAR TIPOS ATIVOS - PROFISSIONAIS E CLIENTES
// ======================================================

export const listServiceKinds = async () => {
  const result = await call(
    () => getActiveServiceKindNames(),
    E.tiposServicos + '/ativos',
    'GET'
  );

  return (Array.isArray(result) ? result : []).map((item) =>
    typeof item === 'string' ? item : item.nome
  );
};

export const listServiceKindOptions = async () => {
  const result = await call(
    () => getServiceKindRecords().filter((item) => item.ativo),
    E.tiposServicos + '/ativos',
    'GET'
  );

  return (Array.isArray(result) ? result : []).map((item) => ({
    id: item.id,
    nome: item.nome ?? item.name ?? '',
  }));
};

// ======================================================
// LISTAR TIPOS CADASTRADOS - ADMINISTRADOR
// ======================================================

export const listAdminServiceKinds = () =>
  call(
    () => getServiceKindRecords(),
    E.tiposServicos,
    'GET'
  );

// ======================================================
// CADASTRAR TIPO DE SERVIÇO
// ======================================================

export const createServiceKind = (nome) =>
  call(
    () => {
      const nomeLimpo = String(nome || '').trim();

      if (!nomeLimpo) {
        throw new Error('Informe o nome do tipo de serviço.');
      }

      const records = getServiceKindRecords();

      const existe = records.some(
        (item) => item.nome.toLowerCase() === nomeLimpo.toLowerCase()
      );

      if (existe) {
        throw new Error('Este tipo de serviço já está cadastrado.');
      }

      const nextId =
        records.reduce(
          (max, item) => Math.max(max, Number(item.id) || 0),
          0
        ) + 1;

      const novoTipo = {
        id: nextId,
        nome: nomeLimpo,
        ativo: true,
      };

      records.push(novoTipo);

      syncActiveServiceKinds();

      return novoTipo;
    },
    E.tiposServicos,
    'POST',
    { nome }
  );

// ======================================================
// EDITAR TIPO DE SERVIÇO
// ======================================================

export const updateServiceKind = (id, nome) =>
  call(
    () => {
      const nomeLimpo = String(nome || '').trim();

      if (!nomeLimpo) {
        throw new Error('Informe o nome do tipo de serviço.');
      }

      const records = getServiceKindRecords();

      const tipo = records.find(
        (item) => String(item.id) === String(id)
      );

      if (!tipo) {
        throw new Error('Tipo de serviço não encontrado.');
      }

      const duplicado = records.some(
        (item) =>
          String(item.id) !== String(id) &&
          item.nome.toLowerCase() === nomeLimpo.toLowerCase()
      );

      if (duplicado) {
        throw new Error('Já existe outro tipo com esse nome.');
      }

      tipo.nome = nomeLimpo;

      syncActiveServiceKinds();

      return tipo;
    },
    `${E.tiposServicos}/${id}`,
    'PUT',
    { id, nome }
  );

// ======================================================
// ATIVAR / DESATIVAR TIPO DE SERVIÇO
// ======================================================

export const toggleServiceKind = (id, ativo) =>
  call(
    () => {
      const records = getServiceKindRecords();

      const tipo = records.find(
        (item) => String(item.id) === String(id)
      );

      if (!tipo) {
        throw new Error('Tipo de serviço não encontrado.');
      }

      tipo.ativo = Boolean(ativo);

      syncActiveServiceKinds();

      return tipo;
    },
    `${E.tiposServicos}/${id}/status`,
    'PATCH',
    { id, ativo }
  );

  
// ======================================================
// ADMINISTRAÇÃO: TIPOS DE PEÇAS
// ======================================================


// ======================================================
// TIPOS DE PEÇAS - CONTROLE DOS DADOS FAKE
// ======================================================

const getServiceTypeRecords = () => {
  const dadosAtuais = Array.isArray(db.serviceTypesAdmin)
    ? db.serviceTypesAdmin
    : [];

  // Migra automaticamente os tipos antigos, que eram strings.
  if (
    !Array.isArray(db.serviceTypesAdmin) ||
    (dadosAtuais.length === 0 &&
      Array.isArray(db.serviceTypes) &&
      db.serviceTypes.length > 0)
  ) {
    db.serviceTypesAdmin = (db.serviceTypes || []).map(
      (item, index) => ({
        id: index + 1,
        nome: typeof item === 'string' ? item : item.nome,
        ativo: typeof item === 'string' ? true : item.ativo !== false,
      })
    );
  } else {
    db.serviceTypesAdmin = dadosAtuais
      .map((item, index) => ({
        id: item.id ?? index + 1,
        nome: typeof item === 'string' ? item : item.nome || item.name || '',
        ativo: typeof item === 'string' ? true : item.ativo !== false,
      }))
      .filter((item) => item.nome);
  }

  return db.serviceTypesAdmin;
};

const syncActiveServiceTypes = () => {
  const records = getServiceTypeRecords();

  // Mantém a lista de textos para compatibilidade com as telas existentes.
  db.serviceTypes = records
    .filter((item) => item.ativo)
    .map((item) => item.nome);
};

const getActiveServiceTypeNames = () => {
  return getServiceTypeRecords()
    .filter((item) => item.ativo)
    .map((item) => item.nome);
};

// ======================================================
// LISTAR TIPOS DE PEÇAS ATIVOS
// ======================================================

export const listServiceTypes = async () => {
  const result = await call(
    () => getActiveServiceTypeNames(),
    E.tiposPecas + '/ativos',
    'GET'
  );

  return (Array.isArray(result) ? result : []).map((item) =>
    typeof item === 'string' ? item : item.nome
  );
};

export const listServiceTypeOptions = async () => {
  const result = await call(
    () => getServiceTypeRecords().filter((item) => item.ativo),
    E.tiposPecas + '/ativos',
    'GET'
  );

  return (Array.isArray(result) ? result : []).map((item) => ({
    id: item.id,
    nome: item.nome ?? item.name ?? '',
  }));
};

// ======================================================
// LISTAR TODOS OS TIPOS DE PEÇAS - ADMIN
// ======================================================

export const listAdminServiceTypes = () =>
  call(
    () => getServiceTypeRecords(),
    E.tiposPecas,
    'GET'
  );

// ======================================================
// CADASTRAR TIPO DE PEÇA
// ======================================================

export const createServiceType = (nome) =>
  call(
    () => {
      const nomeLimpo = String(nome || '').trim();

      if (!nomeLimpo) {
        throw new Error('Informe o nome do tipo de peça.');
      }

      const records = getServiceTypeRecords();

      const existe = records.some(
        (item) => item.nome.toLowerCase() === nomeLimpo.toLowerCase()
      );

      if (existe) {
        throw new Error('Este tipo de peça já está cadastrado.');
      }

      const nextId =
        records.reduce(
          (max, item) => Math.max(max, Number(item.id) || 0),
          0
        ) + 1;

      const novoTipo = {
        id: nextId,
        nome: nomeLimpo,
        ativo: true,
      };

      records.push(novoTipo);
      syncActiveServiceTypes();

      return novoTipo;
    },
    E.tiposPecas,
    'POST',
    { nome }
  );

// ======================================================
// EDITAR TIPO DE PEÇA
// ======================================================

export const updateServiceType = (id, nome) =>
  call(
    () => {
      const nomeLimpo = String(nome || '').trim();

      if (!nomeLimpo) {
        throw new Error('Informe o nome do tipo de peça.');
      }

      const records = getServiceTypeRecords();

      const tipo = records.find(
        (item) => String(item.id) === String(id)
      );

      if (!tipo) {
        throw new Error('Tipo de peça não encontrado.');
      }

      const duplicado = records.some(
        (item) =>
          String(item.id) !== String(id) &&
          item.nome.toLowerCase() === nomeLimpo.toLowerCase()
      );

      if (duplicado) {
        throw new Error('Já existe outro tipo de peça com esse nome.');
      }

      tipo.nome = nomeLimpo;

      syncActiveServiceTypes();

      return tipo;
    },
    `${E.tiposPecas}/${id}`,
    'PUT',
    { id, nome }
  );

// ======================================================
// ATIVAR / DESATIVAR TIPO DE PEÇA
// ======================================================

export const toggleServiceType = (id, ativo) =>
  call(
    () => {
      const records = getServiceTypeRecords();

      const tipo = records.find(
        (item) => String(item.id) === String(id)
      );

      if (!tipo) {
        throw new Error('Tipo de peça não encontrado.');
      }

      tipo.ativo = Boolean(ativo);

      syncActiveServiceTypes();

      return tipo;
    },
    `${E.tiposPecas}/${id}/status`,
    'PATCH',
    { id, ativo }
  );


async function buscarPerfilPublico(id) {
  try {
    const cliente = await http(`/api/clientes/${id}`);

    return {
      id: cliente.id,
      name: cliente.nome,
      role: 'usuario',
      phone: cliente.telefone,
      city: cliente.cidade,
      neighborhood: cliente.bairro,
      photo: cliente.foto
        ? `data:${cliente.fotoContentType || 'image/jpeg'};base64,${cliente.foto}`
        : null,
      rating: 0,
      reviewCount: 0,
      ...obterEstatisticasServicos(cliente),
    };
  } catch (erro) {
    if (
      !erro.message.includes('404') &&
      !erro.message.toLowerCase().includes('cliente não encontrado')
    ) {
      throw erro;
    }
  }

  const profissional = await http(`/api/profissionais/${id}`);

  return {
    id: profissional.id,
    name: profissional.nome,
    role: 'profissional',
    phone: profissional.telefone,
    city: profissional.cidade,
    neighborhood: profissional.bairro,
    category: profissional.servicos?.[0] || '',
    kinds: profissional.servicos || [],
    pieces: profissional.pecas || [],
    photo: profissional.foto
      ? `data:${profissional.fotoContentType || 'image/jpeg'};base64,${profissional.foto}`
      : null,
    rating: 0,
    reviewCount: 0,
    ...obterEstatisticasServicos(profissional),
  };
}

