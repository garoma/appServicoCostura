
import { useEffect, useState } from 'react';
import Avatar from '../components/Avatar';
import {
  listProfessionals,
  listServiceKinds,
  listServiceTypes
} from '../services/api';

export default function BuscarProfissionais({ go }) {
  const [filters, setFilters] = useState({
    q: '',
    kind: '',
    piece: ''
  });

  const [list, setList] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      listServiceKinds(),
      listServiceTypes()
    ])
      .then(([servicos, pecas]) => {
        setKinds(servicos);
        setTypes(pecas);
      })
      .catch((err) => {
        console.error('Erro ao carregar filtros:', err);
      });
  }, []);

  useEffect(() => {
    let ativo = true;

    setLoading(true);
    setError('');

    listProfessionals(filters)
      .then((resultado) => {
        if (!ativo) return;

        setList(Array.isArray(resultado) ? resultado : []);
      })
      .catch((err) => {
        console.error('Erro ao buscar profissionais:', err);

        if (ativo) {
          setList([]);
          setError('Não foi possível carregar os profissionais.');
        }
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, [filters]);

  const atualizarFiltro = (campo) => (e) => {
    setFilters((anterior) => ({
      ...anterior,
      [campo]: e.target.value
    }));
  };

  return (
    <>
      <div className="card filters">
        <label className="field">
          Buscar por nome
          <input
            placeholder="Nome do profissional"
            value={filters.q}
            onChange={atualizarFiltro('q')}
          />
        </label>

        <label className="field">
          Tipo de serviço
          <select
            value={filters.kind}
            onChange={atualizarFiltro('kind')}
          >
            <option value="">Todos</option>
            {kinds.map((servico) => (
              <option key={servico} value={servico}>
                {servico}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          Tipo de peça
          <select
            value={filters.piece}
            onChange={atualizarFiltro('piece')}
          >
            <option value="">Todas</option>
            {types.map((peca) => (
              <option key={peca} value={peca}>
                {peca}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid cards">
        {loading && (
          <p className="muted">Carregando profissionais...</p>
        )}

        {!loading && error && (
          <p className="muted">{error}</p>
        )}

        {!loading && !error && list.map((p) => {
          const id = p.id;
          const nome = p.nome ?? p.name;
          const bairro = p.bairro ?? '';
          const cidade = p.cidade ?? p.city ?? '';
          const servicos = p.servicos ?? p.kinds ?? [];
          const pecas = p.pecas ?? p.pieces ?? [];

          return (
            <article className="card" key={id}>
              <div className="row">
                <Avatar user={p} size={52} />

                <div>
                  <h3>{nome}</h3>
                  <p className="muted">
                    {[bairro, cidade].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              {servicos.length > 0 && (
                <p className="muted">
                  Serviços: {servicos.join(', ')}
                </p>
              )}

              {pecas.length > 0 && (
                <p className="muted">
                  Peças: {pecas.join(', ')}
                </p>
              )}

              <div className="row">
                <button
                  className="btn"
                  onClick={() => go('perfil', { userId: id })}
                >
                  Ver perfil
                </button>

                <button
                  className="btn primary"
                  onClick={() => go('postarServico', { proId: id })}
                >
                  Ofertar serviço
                </button>
              </div>
            </article>
          );
        })}

        {!loading && !error && list.length === 0 && (
          <p className="muted">
            Nenhum profissional encontrado com esses filtros.
          </p>
        )}
      </div>
    </>
  );
}
