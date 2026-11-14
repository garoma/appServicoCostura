// Pesos dos critérios (soma = 1). Altere aqui para mudar a média ponderada.
export const CRITERIA = [
  { key: 'quality', label: 'Qualidade', weight: 0.35 },
  { key: 'deadline', label: 'Cumprimento de prazo', weight: 0.25 },
  { key: 'price', label: 'Preço', weight: 0.2 },
  { key: 'service', label: 'Atendimento', weight: 0.2 },
];

// Nota ponderada (1 a 5) de uma avaliação
export const reviewScore = (review) =>
  CRITERIA.reduce((sum, c) => sum + (review[c.key] || 0) * c.weight, 0);

// Média das avaliações recebidas por um profissional ou usuário
export const averageRating = (reviews) =>
  reviews.length ? reviews.reduce((s, r) => s + reviewScore(r), 0) / reviews.length : 0;
