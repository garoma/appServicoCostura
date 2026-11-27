
// Critérios para CLIENTE avaliando PROFISSIONAL
export const CRITERIA_CLIENTE_AVALIA_PROFISSIONAL = [
  { key: 'quality', label: 'Qualidade do serviço executado', weight: 0.35 },
  { key: 'deadline', label: 'Cumprimento do prazo de entrega', weight: 0.35 },
  { key: 'price', label: 'Aderência do preço ao mercado local', weight: 0.15 },
  { key: 'service', label: 'Atendimento e comunicação', weight: 0.15 },
];

// Critérios para PROFISSIONAL avaliando CLIENTE
export const CRITERIA_PROFISSIONAL_AVALIA_CLIENTE = [
  { key: 'deadline', label: 'Cumprimento do prazo no pagamento', weight: 0.40 },
  { key: 'service', label: 'Atendimento e comunicação', weight: 0.25 },
  { key: 'clarity', label: 'Clareza das especificações do serviço', weight: 0.35 },
];

// Calcula a nota ponderada de uma avaliação
export const reviewScore = (review, tipoAvaliacao) => {
  const criterios =
    tipoAvaliacao === 'clienteAvaliaProfissional'
      ? CRITERIA_CLIENTE_AVALIA_PROFISSIONAL
      : CRITERIA_PROFISSIONAL_AVALIA_CLIENTE;

  return criterios.reduce(
    (sum, criterio) =>
      sum + (Number(review[criterio.key]) || 0) * criterio.weight,
    0
  );
};

// Calcula a média das avaliações recebidas
export const averageRating = (reviews, tipoAvaliacao) => {
  if (!reviews?.length) return 0;

  return (
    reviews.reduce(
      (total, review) => total + reviewScore(review, tipoAvaliacao),
      0
    ) / reviews.length
  );
};
