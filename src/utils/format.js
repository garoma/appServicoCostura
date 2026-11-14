export const brl = (value) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const dateBR = (iso) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '-');
