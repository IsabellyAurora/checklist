import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api';
import './HistoricoNCs.css';

export default function HistoricoNCs() {
  const [user, setUser] = useState(null);
  const [ncs, setNcs] = useState([]);
  const [carregando, setCarregando] = useState(true);
  
  const [filtroStatus, setFiltroStatus] = useState('');
  
  const [page, setPage] = useState(1);
  const itensPorPagina = 10;
  
  const [modalResolver, setModalResolver] = useState({ visivel: false, idExecucao: null });
  const [observacao, setObservacao] = useState('');
  
  const [modalAviso, setModalAviso] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const [modalJustificativa, setModalJustificativa] = useState({ visivel: false, texto: '', idExecucao: null });

  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('usuarioLogado');
    if (!userData) {
      navigate('/');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.setor?.toLowerCase() !== 'admin') {
      alert("Acesso negado. Apenas administradores.");
      navigate('/home');
      return;
    }
    setUser(parsedUser);
  }, [navigate]);

  useEffect(() => {
    if (user) {
      carregarTodoOHistoricoNoFrontend();
    }
  }, [user]);

const carregarTodoOHistoricoNoFrontend = async () => {
    setCarregando(true);
    try {
      const res = await fetchWithAuth('/api/execucoes?page=1&limit=50');
      if (res.ok) {
        const json = await res.json();
        const execucoes = json.data || [];
        const listaNCs = [];

        await Promise.all(execucoes.map(async (exec) => {
          const resDet = await fetchWithAuth(`/api/execucoes/${exec.id_execucao}`);
          if (resDet.ok) {
            const detJson = await resDet.json();
            const detalhes = detJson.data || detJson;
            
            // CORREÇÃO AQUI TAMBÉM
            const temErro = detalhes.respostas?.some(r => 
              r.valor_resposta === 'Não Conforme' || 
              r.valor_resposta === 'Não' || 
              r.valor_resposta === 'false'
            );
            
            const isPendentePeloBackend = detalhes.status_nc === 'PENDENTE';

            if (temErro || isPendentePeloBackend) {
              const isResolvido = detalhes.status_nc === 'RESOLVIDO' || detalhes.observacao_resolucao;
              const statusAtual = isResolvido ? 'RESOLVIDO' : 'PENDENTE';
              const justificativa = detalhes.observacao_resolucao || 'Nenhuma tratativa registrada.';

              listaNCs.push({
                id_execucao: exec.id_execucao,
                ordem_servico: exec.ordem_servico,
                checklist_titulo: exec.titulo || exec.checklist_titulo,
                operador: exec.usuario_nome,
                data_execucao: exec.data_inicio,
                status: statusAtual,
                tratativa: justificativa 
              });
            }
          }
        }));

        listaNCs.sort((a, b) => new Date(b.data_execucao) - new Date(a.data_execucao));
        setNcs(listaNCs);
      }
    } catch (erro) {
      console.error("Erro ao carregar o histórico:", erro);
    } finally {
      setCarregando(false);
    }
  };

  const abrirModalResolver = (idExecucao) => {
    setObservacao('');
    setModalResolver({ visivel: true, idExecucao });
  };

  const confirmarResolucao = async () => {
    if (observacao.trim() === "") {
      setModalAviso({ visivel: true, tipo: 'erro', titulo: 'Atenção', mensagem: 'A observação da tratativa é obrigatória.' });
      return;
    }

    const idExecucao = modalResolver.idExecucao;

    try {
      // 🚀 SALVANDO DIRETO NO BANCO DE DADOS (API Oficial)
      const res = await fetchWithAuth(`/api/execucoes/${idExecucao}/resolver-nc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacao })
      });

      if (res.ok) {
        // Atualiza a tabela na hora
        setNcs(prev => prev.map(nc => 
          nc.id_execucao === idExecucao ? { ...nc, status: 'RESOLVIDO', tratativa: observacao } : nc
        ));
        
        setModalResolver({ visivel: false, idExecucao: null });
        setModalAviso({ visivel: true, tipo: 'sucesso', titulo: 'Sucesso!', mensagem: 'Não Conformidade resolvida e salva no banco de dados!' });
      } else {
        const erroJson = await res.json().catch(() => ({}));
        setModalAviso({ visivel: true, tipo: 'erro', titulo: 'Erro', mensagem: erroJson.error || 'Não foi possível salvar no banco.' });
      }
    } catch (erro) {
      setModalAviso({ visivel: true, tipo: 'erro', titulo: 'Erro de Conexão', mensagem: 'Falha ao conectar com o servidor.' });
    }
  };

  const formatarData = (dataIso) => {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleString('pt-BR');
  };

  const handleMudarFiltro = (e) => {
    setFiltroStatus(e.target.value);
    setPage(1);
  };

  const ncsFiltradas = ncs.filter(nc => filtroStatus === '' || nc.status === filtroStatus);
  const totalPages = Math.ceil(ncsFiltradas.length / itensPorPagina) || 1;
  const indexInicio = (page - 1) * itensPorPagina;
  const indexFim = indexInicio + itensPorPagina;
  const ncsPaginadas = ncsFiltradas.slice(indexInicio, indexFim);

  if (!user) return null;

  return (
    <div className="historico-nc-container">
      <div className="historico-nc-card">
        <h2>Histórico de Não Conformidades (NC)</h2>
        <p>Acompanhe e gerencie todos os problemas reportados nos checklists.</p>

        <div className="filtros-container">
          <label htmlFor="filtro-status">Filtrar por Status:</label>
          <select id="filtro-status" value={filtroStatus} onChange={handleMudarFiltro} className="select-filtro">
            <option value="">Todas (Pendentes e Resolvidas)</option>
            <option value="PENDENTE">🔴 Apenas Pendentes</option>
            <option value="RESOLVIDO">✅ Apenas Resolvidas</option>
          </select>
        </div>

        {carregando ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>Consultando o banco de dados, aguarde...</p>
        ) : (
          <>
            <div className="tabela-container">
              <table className="tabela-ncs">
                <thead>
                  <tr>
                    <th>OS / Execução</th>
                    <th>Checklist</th>
                    <th>Operador</th>
                    <th>Data</th>
                    <th>Status</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {ncsPaginadas.length > 0 ? (
                    ncsPaginadas.map((nc) => (
                      <tr key={nc.id_execucao}>
                        <td className="col-destaque">
                          <strong>{nc.ordem_servico ? `OS: ${nc.ordem_servico}` : 'S/ OS'}</strong>
                          <br/><small>Exec: #{nc.id_execucao}</small>
                        </td>
                        <td><strong>{nc.checklist_titulo}</strong></td>
                        <td>{nc.operador}</td>
                        <td>{formatarData(nc.data_execucao)}</td>
                        <td>
                          <span className={`badge-status-nc ${nc.status === 'PENDENTE' ? 'pendente' : 'resolvido'}`}>
                            {nc.status}
                          </span>
                        </td>
                        <td>
                          {nc.status === 'PENDENTE' ? (
                            <button className="btn-resolver-nc" onClick={() => abrirModalResolver(nc.id_execucao)}>
                              Resolver
                            </button>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                              <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.80rem' }}>✓ Baixa dada</span>
                              <button 
                                onClick={() => setModalJustificativa({ visivel: true, texto: nc.tratativa, idExecucao: nc.id_execucao })}
                                style={{ 
                                  backgroundColor: '#e2e8f0', color: '#475569', border: '1px solid #cbd5e1', 
                                  padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' 
                                }}
                              >
                                👁️ Ver Tratativa
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="tabela-vazia">Nenhuma Não Conformidade encontrada para este filtro.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="paginacao-container">
              <button className="btn-paginacao" disabled={page === 1} onClick={() => setPage(page - 1)}>
                &laquo; Anterior
              </button>
              <span className="indicador-pagina">Página {page} de {totalPages}</span>
              <button className="btn-paginacao" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)}>
                Próxima &raquo;
              </button>
            </div>
          </>
        )}

        <button className="btn-voltar-home" onClick={() => navigate('/home')}>
          Voltar para Home
        </button>
      </div>

      {modalResolver.visivel && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'left' }}>
            <h3 style={{ color: '#1e293b', marginBottom: '10px' }}>Resolver Pendência</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '15px' }}>
              Qual foi a tratativa realizada para resolver a NC da execução <strong>#{modalResolver.idExecucao}</strong>?
            </p>
            
            <textarea 
              style={{ width: '100%', minHeight: '90px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '15px', fontFamily: 'inherit', resize: 'none' }}
              placeholder="Ex: Válvula substituída conforme OS..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setModalResolver({ visivel: false, idExecucao: null })}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#64748b', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmarResolucao}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                disabled={!observacao.trim()}
              >
                Salvar no Banco
              </button>
            </div>
          </div>
        </div>
      )}

      {modalJustificativa.visivel && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'left' }}>
            <h3 style={{ color: '#1e293b', marginBottom: '10px' }}>
              Tratativa da Execução #{modalJustificativa.idExecucao}
            </h3>
            
            <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <p style={{ color: '#334155', margin: 0, fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                {modalJustificativa.texto}
              </p>
            </div>
            
            <button 
              onClick={() => setModalJustificativa({ visivel: false, texto: '', idExecucao: null })}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#f57c00', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {modalAviso.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            {modalAviso.tipo === 'erro' ? '⚠️' : '✅'}
            <h3 className={modalAviso.tipo === 'erro' ? 'texto-erro' : 'texto-sucesso'} style={{ marginTop: '10px' }}>
              {modalAviso.titulo}
            </h3>
            <p>{modalAviso.mensagem}</p>
            <button 
              style={{ marginTop: '15px', padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#f57c00', color: 'white', fontWeight: 'bold', cursor: 'pointer' }} 
              onClick={() => setModalAviso({ ...modalAviso, visivel: false })}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}