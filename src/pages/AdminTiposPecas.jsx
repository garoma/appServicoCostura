
import { useEffect, useState } from 'react';

import {
  listAdminServiceTypes,
  createServiceType,
  updateServiceType,
  toggleServiceType,
} from '../services/api';

export default function AdminTiposPecas() {
  const [tipos, setTipos] = useState([]);
  const [nome, setNome] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [alterandoId, setAlterandoId] = useState(null);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');

  const carregarTipos = async () => {
    try {
      setCarregando(true);
      setErro('');

      const dados = await listAdminServiceTypes();

      setTipos(
        Array.isArray(dados)
          ? dados.map((tipo, index) => ({
              id: tipo.id ?? index + 1,
              nome:
                typeof tipo === 'string'
                  ? tipo
                  : tipo.nome || tipo.name || '',
              ativo:
                typeof tipo === 'string'
                  ? true
                  : tipo.ativo !== false,
            }))
          : []
      );
    } catch (error) {
      console.error('Erro ao carregar tipos de peças:', error);
      setErro(error.message || 'Erro ao carregar tipos de peças.');
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
      setErro('Informe o nome do tipo de peça.');
      return;
    }

    if (salvando) return;

    try {
      setSalvando(true);
      setErro('');
      setMensagem('');

      if (editandoId !== null) {
        await updateServiceType(editandoId, nomeLimpo);
        setMensagem('Tipo de peça atualizado com sucesso.');
      } else {
        await createServiceType(nomeLimpo);
        setMensagem('Tipo de peça cadastrado com sucesso.');
      }

      setNome('');
      setEditandoId(null);

      await carregarTipos();
    } catch (error) {
      console.error('Erro ao salvar tipo de peça:', error);
      setErro(error.message || 'Não foi possível salvar o tipo de peça.');
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
    setMensagem('');
  };

  const alterarStatus = async (tipo) => {
    if (alterandoId !== null) return;

    try {
      setAlterandoId(tipo.id);
      setErro('');
      setMensagem('');

      await toggleServiceType(tipo.id, !tipo.ativo);

      setMensagem(
        tipo.ativo
          ? 'Tipo de peça desativado com sucesso.'
          : 'Tipo de peça ativado com sucesso.'
      );

      await carregarTipos();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      setErro(error.message || 'Não foi possível alterar o status.');
    } finally {
      setAlterandoId(null);
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
      <h2>Tipos de peças</h2>

      <p style={{ color: '#666' }}>
        Cadastre e gerencie os tipos de peças disponíveis na plataforma.
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
        <h3>
          {editandoId !== null
            ? 'Editar tipo de peça'
            : 'Novo tipo de peça'}
        </h3>

        <label htmlFor="nomeTipoPeca">Nome</label>

        <input
          id="nomeTipoPeca"
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Calça, Short, Bermuda"
          maxLength={100}
          disabled={salvando}
          style={{ ...campo, marginTop: '6px', marginBottom: '12px' }}
        />

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={salvando || !nome.trim()}
            style={{
              ...botao,
              background: '#176b3a',
              color: '#fff',
              opacity: salvando || !nome.trim() ? 0.6 : 1,
            }}
          >
            {salvando
              ? 'Salvando...'
              : editandoId !== null
                ? 'Salvar alterações'
                : 'Cadastrar'}
          </button>

          {editandoId !== null && (
            <button
              type="button"
              onClick={cancelarEdicao}
              disabled={salvando}
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
        <p>Carregando tipos de peças...</p>
      ) : tipos.length === 0 ? (
        <p>Nenhum tipo de peça cadastrado.</p>
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
                  disabled={alterandoId !== null || salvando}
                  onClick={() => editar(tipo)}
                  style={{
                    ...botao,
                    background: '#e8eef7',
                    color: '#234',
                  }}
                >
                  Editar
                </button>

                <button
                  type="button"
                  disabled={alterandoId !== null || salvando}
                  onClick={() => alterarStatus(tipo)}
                  style={{
                    ...botao,
                    background: tipo.ativo ? '#fde8e7' : '#e5f4e8',
                    color: tipo.ativo ? '#a32121' : '#176b3a',
                    opacity: alterandoId === tipo.id ? 0.6 : 1,
                  }}
                >
                  {alterandoId === tipo.id
                    ? 'Aguarde...'
                    : tipo.ativo
                      ? 'Desativar'
                      : 'Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
