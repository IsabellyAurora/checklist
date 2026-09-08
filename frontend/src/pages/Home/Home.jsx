import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; 
import './Home.css';

export default function Home() {
  const [user, setUser] = useState(null);
  
  const [alertas, setAlertas] = useState([]);
  const [popupAberto, setPopupAberto] = useState(true);

  const [modalResolver, setModalResolver] = useState({ visivel: false, idExecucao: null });
  const [observacao, setObservacao] = useState('');
  const [modalAviso, setModalAviso] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });

  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('usuarioLogado');
    const token = localStorage.getItem('accessToken');

    if (!userData || !token) {
      navigate('/'); 
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.forcar_troca_senha) {
      navigate('/nova-senha');
      return;
    }
    
    setUser(parsedUser);
  }, [navigate]);

  useEffect(() => {
    if (user && user.setor && user.setor.toLowerCase() === 'admin') {
      buscarNaoConformidadesNoFrontend();
    }
  }, [user]);

  const buscarNaoConformidadesNoFrontend = async () => {
    try {
      const res = await fetchWithAuth('/api/execucoes?page=1&limit=15');
      if (res.ok) {
        const json = await res.json();
        const ultimasExecucoes = json.data || [];
        const ncsEncontradas = [];

        for (let exec of ultimasExecucoes) {
          const resDet = await fetchWithAuth(`/api/execucoes/${exec.id_execucao}`);
          if (resDet.ok) {
            const detJson = await resDet.json();
            const detalhes = detJson.data || detJson;
            
            const temErro = detalhes.respostas?.some(r => 
              r.valor_resposta === 'Não Conforme' || 
              r.valor_resposta === 'Não' || 
              r.valor_resposta === 'false'
            );
            
            const isPendentePeloBackend = detalhes.status_nc === 'PENDENTE';
            const isResolvido = detalhes.status_nc === 'RESOLVIDO' || detalhes.observacao_resolucao;
            
            if ((temErro || isPendentePeloBackend) && !isResolvido) {
              ncsEncontradas.push({
                id_execucao: exec.id_execucao,
                checklist_titulo: exec.titulo || exec.checklist_titulo,
                operador: exec.usuario_nome,
                // Garantindo que puxa a data mais precisa disponível
                data_execucao: detalhes.data_conclusao || detalhes.data_inicio || exec.data_inicio
              });
            }
          }
        }
        
        // Ordena para exibir a NC mais recente no topo do popup
        ncsEncontradas.sort((a, b) => new Date(b.data_execucao) - new Date(a.data_execucao));
        
        setAlertas(ncsEncontradas);
      }
    } catch (erro) {
      console.error("Erro ao rastrear pendências:", erro);
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
        setAlertas(prev => prev.filter(alerta => alerta.id_execucao !== idExecucao));
        setModalResolver({ visivel: false, idExecucao: null });
        setModalAviso({ visivel: true, tipo: 'sucesso', titulo: 'Sucesso!', mensagem: 'Resolvido e salvo no banco de dados!' });
      } else {
        const erroJson = await res.json().catch(() => ({}));
        setModalAviso({ visivel: true, tipo: 'erro', titulo: 'Erro', mensagem: erroJson.error || 'Falha ao salvar a resolução.' });
      }
    } catch (erro) {
      setModalAviso({ visivel: true, tipo: 'erro', titulo: 'Erro', mensagem: 'Falha na conexão com o servidor.' });
    }
  };

  // MESMA FUNÇÃO DE FORMATAR DATA DA PÁGINA DE HISTÓRICO
  const formatarData = (dataIso) => {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleString('pt-BR');
  };

  if (!user) return null; 
  const isAdmin = user.setor && user.setor.toLowerCase() === 'admin';

  return (
    <div className="home-container">
      <main className="home-content">
        {isAdmin ? (
          <div className="form-card">
            <h2>Painel do Administrador</h2>
            <p>Escolha uma das ações abaixo para gerenciar o sistema:</p>
            
            <div className="admin-actions">
             <button className="primary-button" onClick={() => navigate('/cadastro-usuario')}>
               Cadastrar Novo Usuário
             </button>
             
             <button className="primary-button" onClick={() => navigate('/gerenciar-usuarios')}>
               Gerenciar Usuários (Resetar Senha)
             </button>

              <button className="primary-button" onClick={() => navigate('/cadastro-checklist')}>
                Criar Novo Checklist
              </button>
              
              <button className="primary-button" onClick={() => navigate('/relatorios')}>
                Ver Relatórios
              </button>
              
              <button className="primary-button" onClick={() => navigate('/gerenciar-checklists')}>
                Gerenciar Checklists
              </button>

              <button className="primary-button" onClick={() => navigate('/historico-ncs')}>
                📜 Histórico de Não Conformidades
              </button>
            </div>
          </div>
        ) : (
          <div className="form-card">
            <h2>Checklist Diário</h2>
            <p>Setor de atuação: <strong>{user.setor || 'Não especificado'}</strong></p>
            
            <div className="admin-actions">
              <button className="primary-button" onClick={() => navigate('/preencher-checklist')}>
                Iniciar Checklist {user.setor ? `- ${user.setor}` : ''}
              </button>
            </div>
          </div>
        )}
      </main>

      {isAdmin && alertas.length > 0 && (
        <div className={`alerta-flutuante-container ${popupAberto ? 'aberto' : 'fechado'}`}>
          <div className="alerta-header" onClick={() => setPopupAberto(!popupAberto)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="alerta-icone">⚠️</span>
              <strong>Atenção: Não Conformidades pendentes ({alertas.length})</strong>
            </div>
            <button className="btn-toggle-alerta">{popupAberto ? '▼' : '▲'}</button>
          </div>
          
          {popupAberto && (
            <div className="alerta-body">
              {alertas.map((alerta) => (
                <div key={alerta.id_execucao} className="alerta-item">
                  <span className="alerta-os">Execução Nº {alerta.id_execucao}</span>
                  <p className="alerta-checklist"><strong>Checklist:</strong> {alerta.checklist_titulo}</p>
                  <p className="alerta-operador"><strong>Operador:</strong> {alerta.operador}</p>
                  
                  {/* AQUI A DATA É FORMATADA IGUAL NO HISTÓRICO */}
                  <p className="alerta-pergunta"><small>Data: {formatarData(alerta.data_execucao)}</small></p>
                  
                  <button className="btn-arrumado" onClick={() => abrirModalResolver(alerta.id_execucao)}>
                    ✅ Adicionar Tratativa e Resolver
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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