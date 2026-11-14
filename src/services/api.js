import { API_CONFIG, FEES } from '../config/apiConfig';
import { db } from '../data/mockData';
import { averageRating } from '../utils/rating';

const E = API_CONFIG.endpoints;
let seq = 1000;
const nextId = () => ++seq;
const today = () => new Date().toISOString().slice(0, 10);

// ---- infraestrutura: mock ou http real ----
async function http(path, method = 'GET', body) {
  const res = await fetch(API_CONFIG.BASE_URL + path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try { message = JSON.parse(text).message || text; } catch { /* resposta não era JSON */ }
    throw new Error(message || 'Erro na API');
  }
  return res.json();
}

async function call(mock, path, method, body) {
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
export const login = (email, password) =>
  call(() => {
    const u = db.users.find((x) => x.email === email && x.password === password);
    if (!u) throw new Error('E-mail ou senha inválidos');
    if (u.blocked) throw new Error('Conta bloqueada. Fale com o suporte.');
    return { token: 'mock-token', user: safe(u) };
  }, E.login, 'POST', { email, password });

export const register = (data) =>
  call(() => {
    if (db.users.some((u) => u.email === data.email)) throw new Error('E-mail já cadastrado');
    const user = { id: nextId(), blocked: false, plan: 'taxa_servico', ...data };
    db.users.push(user);
    return { token: 'mock-token', user: safe(user) };
  }, E.register, 'POST', data);

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
export const listServiceKinds = () => call(() => db.serviceKinds, E.serviceKinds, 'GET');
export const listServiceTypes = () => call(() => db.serviceTypes, E.serviceTypes, 'GET');

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