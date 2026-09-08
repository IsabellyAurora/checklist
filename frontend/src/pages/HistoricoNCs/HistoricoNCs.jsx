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
  
  // ESTADOS PARA OS SETORES
  const [setoresDisponiveis, setSetoresDisponiveis] = useState([]);
  
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
    
    // Verificação de Admin convertendo array para String (blindada)
    if (!parsedUser.setores?.some(s => String(s).toLowerCase() === 'admin')) {
      alert("Acesso negado. Apenas administradores.");
      navigate('/home');
      return;
    }
    setUser(parsedUser);
  }, [navigate]);

  useEffect(() => {
    if (user) {
      carregarSetores();
      carregarTodoOHistoricoNoFrontend();
    }
  }, [user]);

  // ==========================================
  // LÓGICA DE SETORES (PAI > FILHO BLINDADA)
  // ==========================================
  const construirNomeSetor = (setorAtual, todosSetores) => {
    if (!setorAtual.id_setor_pai || String(setorAtual.id_setor_pai) === '0') {
      return setorAtual.nome; 
    }
    const setorPai = todosSetores.find(s => String(s.id_setor) === String(setorAtual.id_setor_pai));
    
    if (setorPai && String(setorPai.id_setor) !== String(setorAtual.id_setor)) {
      const nomeDoPai = construirNomeSetor(setorPai, todosSetores);
      return `${nomeDoPai} > ${setorAtual.nome}`;
    }
    return setorAtual.nome;
  };

  const carregarSetores = async () => {
    try {
      const res = await fetchWithAuth('/api/setores');
      if (res.ok) {
        const json = await res.json();
        const setoresBrutos = json.data || [];
        const formatados = setoresBrutos.map(s => ({ ...s, nomeExibicao: construirNomeSetor(s, setoresBrutos) }));
        setSetoresDisponiveis(formatados);
      }
    } catch (erro) {
      console.error("Erro ao carregar setores", erro);
    }
  };

  const getNomeSetor = (identificador) => {
    if (!identificador) return '-';
    const setor = setoresDisponiveis.find(s => String(s.id_setor) === String(identificador) || s.nome === identificador);
    return setor ? setor.nomeExibicao : identificador;
  };

  // ==========================================
  // LÓGICA DE NÃO CONFORMIDADES
  // ==========================================
const carregarTodoOHistoricoNoFrontend = async () => {
    setCarregando(true);
    try {
      // ⚠️ MUDANÇA AQUI: Batendo direto na rota focada em NCs
      const res = await fetchWithAuth('/api/execucoes/pendencias/ncs');
      
      if (res.ok) {
        const json = await res.json();
        const execucoesNC = json.data || [];
        
        // O backend já devolve tudo filtrado, basta mapear para o padrão visual do seu state
        const listaNCs = execucoesNC.map(exec => ({
          id_execucao: exec.id_execucao,
          ordem_servico: exec.ordem_servico,
          checklist_titulo: exec.checklist_titulo,
          id_setor: exec.checklist_setor || exec.id_setor, // Pega o nome vindo do backend
          operador: exec.operador,
          data_execucao: exec.data_execucao,
          status: exec.status_nc, // PENDENTE ou RESOLVIDO
          tratativa: exec.observacao_resolucao || 'Nenhuma tratativa registrada.'
        }));

        setNcs(listaNCs);
      }
    } catch (erro) {
      console.error("Erro ao carregar o histórico de NCs:", erro);
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
      const res = await fetchWithAuth(`/api/execucoes/${idExecucao}/resolver-nc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observacao })
      });
      if (res.ok) {
        setNcs(prev => prev.map(nc => nc.id_execucao === idExecucao ? { ...nc, status: 'RESOLVIDO', tratativa: observacao } : nc));
        setModalResolver({ visivel: false, idExecucao: null });
        setModalAviso({ visivel: true, tipo: 'sucesso', titulo: 'Sucesso!', mensagem: 'Resolvido com sucesso!' });
      } else {
        const erroJson = await res.json().catch(() => ({}));
        setModalAviso({ visivel: true, tipo: 'erro', titulo: 'Erro', mensagem: erroJson.error || 'Falha ao salvar a resolução.' });
      }
    } catch (erro) {
      setModalAviso({ visivel: true, tipo: 'erro', titulo: 'Erro de Conexão', mensagem: 'Falha ao conectar.' });
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
  const ncsPaginadas = ncsFiltradas.slice(indexInicio, indexInicio + itensPorPagina);

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
                    <th>Checklist / Setor</th>
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
                        <td>
                          <strong>{nc.checklist_titulo}</strong>
                          <br/>
                          {/* Nome inteligente do Setor */}
                          <small style={{ color: '#475569' }}>{getNomeSetor(nc.id_setor)}</small>
                        </td>
                        <td>{nc.operador}</td>
                        <td>{formatarData(nc.data_execucao)}</td>
                        <td>
                          <span className={`badge-status-nc ${nc.status === 'PENDENTE' ? 'pendente' : 'resolvido'}`}>{nc.status}</span>
                        </td>
                        <td>
                          {nc.status === 'PENDENTE' ? (
                            <button className="btn-resolver-nc" onClick={() => abrirModalResolver(nc.id_execucao)}>Resolver</button>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-start' }}>
                              <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '0.80rem' }}>✓ Baixa dada</span>
                              <button 
                                onClick={() => setModalJustificativa({ visivel: true, texto: nc.tratativa, idExecucao: nc.id_execucao })}
                                style={{ backgroundColor: '#e2e8f0', color: '#475569', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                              >
                                👁️ Ver Tratativa
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" className="tabela-vazia">Nenhuma Não Conformidade encontrada para este filtro.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="paginacao-container">
              <button className="btn-paginacao" disabled={page === 1} onClick={() => setPage(page - 1)}>&laquo; Anterior</button>
              <span className="indicador-pagina">Página {page} de {totalPages}</span>
              <button className="btn-paginacao" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)}>Próxima &raquo;</button>
            </div>
          </>
        )}

        <button className="btn-voltar-home" onClick={() => navigate('/home')}>Voltar para Home</button>
      </div>

      {/* MODAIS (MANTIDOS ORIGINAIS) */}
      {modalResolver.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Resolver Pendência</h3>
            <p>Qual foi a tratativa realizada para resolver a NC da execução <strong>#{modalResolver.idExecucao}</strong>?</p>
            <textarea 
              style={{ width: '100%', minHeight: '90px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '15px', fontFamily: 'inherit', resize: 'none' }}
              value={observacao} onChange={(e) => setObservacao(e.target.value)}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="secondary-button" style={{ flex: 1 }} onClick={() => setModalResolver({ visivel: false, idExecucao: null })}>Cancelar</button>
              <button className="primary-button" style={{ flex: 1 }} onClick={confirmarResolucao} disabled={!observacao.trim()}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {modalJustificativa.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Tratativa da Execução #{modalJustificativa.idExecucao}</h3>
            <div style={{ backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{modalJustificativa.texto}</p>
            </div>
            <button className="modal-button" onClick={() => setModalJustificativa({ visivel: false, texto: '', idExecucao: null })}>Fechar</button>
          </div>
        </div>
      )}

      {modalAviso.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            {modalAviso.tipo === 'erro' ? '⚠️' : '✅'}
            <h3 className={modalAviso.tipo === 'erro' ? 'texto-erro' : 'texto-sucesso'}>{modalAviso.titulo}</h3>
            <p>{modalAviso.mensagem}</p>
            <button className="modal-button" onClick={() => setModalAviso({ ...modalAviso, visivel: false })}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}