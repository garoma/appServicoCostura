
import { useEffect, useState } from 'react';

import {
  listAdminServiceKinds,
  createServiceKind,
  updateServiceKind,
  toggleServiceKind,
} from '../services/api';

export default function AdminTiposServicos() {
  const [tipos, setTipos] = useState([]);
  const [nome, setNome] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const carregarTipos = async () => {
    try {
      setCarregando(true);
      setErro('');

      const dados = await listAdminServiceKinds();
      setTipos(dados || []);
    } catch (error) {
      setErro(error.message || 'Erro ao carregar tipos de serviços.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarTipos();
  }, []);

  const salvar = async (event) => {
    event.preventDefault();

    const nomeLimpo = nome.trim();

    if (!nomeLimpo) {
      setErro('Informe o nome do tipo de serviço.');
      return;
    }

    try {
      setSalvando(true);
      setErro('');
      setMensagem('');

      if (editandoId) {
        await updateServiceKind(editandoId, nomeLimpo);
        setMensagem('Tipo de serviço atualizado com sucesso.');
      } else {
        await createServiceKind(nomeLimpo);
        setMensagem('Tipo de serviço cadastrado com sucesso.');
      }

      setNome('');
      setEditandoId(null);
      await carregarTipos();
    } catch (error) {
      setErro(error.message || 'Não foi possível salvar o tipo de serviço.');
    } finally {
      setSalvando(false);
    }
  };

  const editar = (tipo) => {
    setEditandoId(tipo.id);
    setNome(tipo.nome);
    setErro('');
    setMensagem('');
  };

  const cancelarEdicao = () => {
    setEditandoId(null);
    setNome('');
    setErro('');
  };

  const alterarStatus = async (tipo) => {
    try {
      setErro('');
      setMensagem('');

      await toggleServiceKind(tipo.id, !tipo.ativo);

      setMensagem(
        tipo.ativo
          ? 'Tipo de serviço desativado.'
          : 'Tipo de serviço ativado.'
      );

      await carregarTipos();
    } catch (error) {
      setErro(error.message || 'Não foi possível alterar o status.');
    }
  };

  const campo = {
    width: '100%',
    padding: '12px',
    border: '1px solid #ccc',
    borderRadius: '6px',
    fontSize: '15px',
    boxSizing: 'border-box',
  };

  const botao = {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '16px' }}>
      <h2>Tipos de serviços</h2>

      <p style={{ color: '#666' }}>
        Cadastre e gerencie os tipos de serviços oferecidos na plataforma.
      </p>

      <form
        onSubmit={salvar}
        style={{
          background: '#fff',
          padding: '18px',
          borderRadius: '8px',
          border: '1px solid #ddd',
          marginBottom: '24px',
        }}
      >
        <h3>{editandoId ? 'Editar tipo de serviço' : 'Novo tipo de serviço'}</h3>

        <label htmlFor="nomeTipoServico">Nome</label>

        <input
          id="nomeTipoServico"
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Costura, Travete, Caseado"
          maxLength={100}
          style={{ ...campo, marginTop: '6px', marginBottom: '12px' }}
        />

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={salvando}
            style={{ ...botao, background: '#176b3a', color: '#fff' }}
          >
            {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Cadastrar'}
          </button>

          {editandoId && (
            <button
              type="button"
              onClick={cancelarEdicao}
              style={{ ...botao, background: '#777', color: '#fff' }}
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {mensagem && (
        <p style={{ color: 'green' }}>{mensagem}</p>
      )}

      {erro && (
        <p style={{ color: '#c62828' }}>{erro}</p>
      )}

      <h3>Tipos cadastrados</h3>

      {carregando ? (
        <p>Carregando...</p>
      ) : tipos.length === 0 ? (
        <p>Nenhum tipo de serviço cadastrado.</p>
      ) : (
        <div style={{ display: 'grid', gap: '10px' }}>
          {tipos.map((tipo) => (
            <div
              key={tipo.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '14px',
              }}
            >
              <div>
                <strong>{tipo.nome}</strong>
                <div
                  style={{
                    fontSize: '13px',
                    color: tipo.ativo ? 'green' : '#c62828',
                    marginTop: '4px',
                  }}
                >
                  {tipo.ativo ? 'Ativo' : 'Inativo'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => editar(tipo)}
                  style={{ ...botao, background: '#e8eef7', color: '#234' }}
                >
                  Editar
                </button>

                <button
                  type="button"
                  onClick={() => alterarStatus(tipo)}
                  style={{
                    ...botao,
                    background: tipo.ativo ? '#fde8e7' : '#e5f4e8',
                    color: tipo.ativo ? '#a32121' : '#176b3a',
                  }}
                >
                  {tipo.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
