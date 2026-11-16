// Dados fake usados quando API_CONFIG.USE_MOCK = true
export const db = {
  serviceKinds: ['Traseira', 'Frente', 'Cós', 'Travete', 'Cabecinha'],
  serviceTypes: ['Calça', 'Short', 'Bermuda', 'Saia', 'Vestido', 'Camisa', 'Jaqueta'],
  fabricationSteps: [],
  productions: [],
  users: [
    { id: 1, name: 'Ana Souza', email: 'usuario@teste.com', password: '123', role: 'usuario', city: 'Caruaru - PE', phone: '(81) 99999-0001', blocked: false },
    { id: 2, name: 'Carlos Pereira', email: 'pro@teste.com', password: '123', role: 'profissional', category: 'Alfaiate', basePrice: 40, kinds: ['Traseira', 'Frente', 'Cós'], pieces: ['Calça', 'Short', 'Camisa', 'Jaqueta'], plan: 'taxa_servico', bio: 'Alfaiate há 12 anos. Ajustes, barras e reformas de roupas.', city: 'Caruaru - PE', phone: '(81) 99999-0002', blocked: false },
    { id: 3, name: 'Marina Lima', email: 'marina@teste.com', password: '123', role: 'profissional', category: 'Costureira', basePrice: 30, kinds: ['Travete', 'Cós', 'Traseira'], pieces: ['Calça', 'Saia', 'Vestido'], plan: 'mensal', bio: 'Barras, zíperes, cintura e ajustes em geral.', city: 'Caruaru - PE', phone: '(81) 99999-0003', blocked: false },
    { id: 4, name: 'João Alves', email: 'joao@teste.com', password: '123', role: 'profissional', category: 'Costureiro', basePrice: 50, kinds: ['Traseira', 'Frente', 'Cabecinha'], pieces: ['Calça', 'Short', 'Bermuda'], plan: 'taxa_servico', bio: 'Reformas e modelagem de calças, shorts e bermudas.', city: 'Gravatá - PE', phone: '(81) 99999-0004', blocked: false },
    { id: 5, name: 'Admin appServicosCostura', email: 'admin@teste.com', password: '123', role: 'admin', blocked: false },
    { id: 6, name: 'Paulo Reis', email: 'paulo@teste.com', password: '123', role: 'usuario', city: 'Caruaru - PE', phone: '(81) 99999-0006', blocked: false },
  ],
  services: [
    { id: 1, ownerId: 1, serviceKind: 'Traseira', type: 'Calça', quantity: 2, description: 'Fazer a barra de duas calças jeans e apertar a cintura.', photos: [], targetProId: null, proId: null, status: 'aberto' },
    { id: 2, ownerId: 6, serviceKind: 'Cós', type: 'Short', quantity: 3, description: 'Ajustar 3 shorts na cintura e no quadril.', photos: [], targetProId: 4, proId: null, status: 'aberto' },
    { id: 3, ownerId: 1, serviceKind: 'Travete', type: 'Calça', quantity: 2, description: 'Trocar o zíper de duas calças sociais.', photos: [], targetProId: null, proId: 3, price: 35, total: 70, status: 'concluido' },
  ],
  offers: [
    { id: 1, serviceId: 1, proId: 2, price: 25, quantity: 2, total: 50, days: 3, status: 'pendente' },
    { id: 2, serviceId: 3, proId: 3, price: 35, quantity: 2, total: 70, days: 1, status: 'aceita' },
  ],
  reviews: [
    { id: 1, toId: 3, fromId: 1, serviceId: 3, quality: 5, deadline: 5, price: 4, service: 5, comment: 'Rápida e cuidadosa. Recomendo!' },
    { id: 2, toId: 2, fromId: 6, serviceId: 0, quality: 4, deadline: 4, price: 5, service: 4, comment: 'Bom trabalho, preço justo.' },
    { id: 3, toId: 4, fromId: 1, serviceId: 0, quality: 5, deadline: 3, price: 3, service: 4, comment: 'Acabamento perfeito, atrasou um dia.' },
    { id: 4, toId: 1, fromId: 3, serviceId: 3, quality: 5, deadline: 5, price: 5, service: 5, comment: 'Cliente educada e pagou em dia.' },
  ],
  payments: [
    { id: 1, payerId: 3, payerRole: 'profissional', type: 'mensalidade', unitPrice: 49.9, quantity: 1, total: 49.9, amount: 49.9, status: 'pago', date: '2026-10-05' },
    { id: 2, payerId: 1, payerRole: 'usuario', type: 'taxa_servico', serviceKind: 'Travete', pieceType: 'Calça', unitPrice: 35, quantity: 2, total: 70, amount: 2.1, status: 'pago', date: '2026-10-11' },
    { id: 3, payerId: 3, payerRole: 'profissional', type: 'mensalidade', unitPrice: 49.9, quantity: 1, total: 49.9, amount: 49.9, status: 'pendente', date: '2026-11-05' },
    { id: 4, payerId: 2, payerRole: 'profissional', type: 'taxa_servico', serviceKind: 'Frente', pieceType: 'Short', unitPrice: 15, quantity: 3, total: 45, amount: 4.5, status: 'atrasado', date: '2026-10-20' },
  ],
};
