import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; 
import './Home.css';

export default function Home() {
  const [user, setUser] = useState(null);
  
  const [alertas, setAlertas] = useState([]);
  const [modalNotificacoesAberto, setModalNotificacoesAberto] = useState(false);

  const [modalResolver, setModalResolver] = useState({ visivel: false, idExecucao: null });
  const [observacao, setObservacao] = useState('');
  const [modalAviso, setModalAviso] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });

  const [nomesSetores, setNomesSetores] = useState([]);
  
  const [mostrarSubsetores, setMostrarSubsetores] = useState(false);

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
    if (user) {
      carregarSetores(); 
      const isAdmin = user.setores?.some(s => String(s).toLowerCase() === 'admin');
      
      if (isAdmin) {
        buscarNaoConformidadesNoFrontend();
      }
    }
  }, [user]);

  // ==========================================
  // LÓGICA DE SETORES (PAI > FILHO COM CASCATA)
  // ==========================================
  const construirNomeSetor = (setorAtual, listaCompleta) => {
    if (!setorAtual.id_setor_pai || String(setorAtual.id_setor_pai) === '0') {
      return setorAtual.nome; 
    }
    
    const setorPai = listaCompleta.find(s => String(s.id_setor) === String(setorAtual.id_setor_pai));
    
    if (setorPai && String(setorPai.id_setor) !== String(setorAtual.id_setor)) {
      const nomeDoPai = construirNomeSetor(setorPai, listaCompleta);
      return `${nomeDoPai} > ${setorAtual.nome}`;
    }
    
    return setorAtual.nome;
  };

  const carregarSetores = async () => {
    try {
      let arraySetoresId = [];
      if (Array.isArray(user?.setores)) {
        arraySetoresId = user.setores;
      } else if (user?.setores_ids) {
        arraySetoresId = user.setores_ids;
      } else if (user?.setor) {
        arraySetoresId = [user.setor]; 
      }

      const arrayNormalizado = arraySetoresId.map(val => String(val).toLowerCase());

      const res = await fetchWithAuth('/api/setores');
      if (res.ok) {
        const json = await res.json();
        const setoresBrutos = json.data || [];
        
        const setoresExplicitos = setoresBrutos.filter(s => 
          arrayNormalizado.includes(String(s.id_setor)) || 
          arrayNormalizado.includes(String(s.nome).toLowerCase())
        );

        let idsPermitidos = new Set(setoresExplicitos.map(s => Number(s.id_setor)));
        
        let adicionouNovo = true;
        while(adicionouNovo) {
          adicionouNovo = false;
          setoresBrutos.forEach(s => {
            if (s.id_setor_pai && idsPermitidos.has(Number(s.id_setor_pai)) && !idsPermitidos.has(Number(s.id_setor))) {
              idsPermitidos.add(Number(s.id_setor));
              adicionouNovo = true;
            }
          });
        }

        const setoresFinaisDoUsuario = setoresBrutos.filter(s => idsPermitidos.has(Number(s.id_setor)));
        const setoresTraduzidos = setoresFinaisDoUsuario.map(s => construirNomeSetor(s, setoresBrutos));
        
        setoresTraduzidos.sort((a, b) => a.localeCompare(b));
        setNomesSetores(setoresTraduzidos);
      }
    } catch (erro) {
      console.error("Erro ao carregar setores", erro);
    }
  };

  // ==========================================
  // LÓGICA DE NÃO CONFORMIDADES
  // ==========================================
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
              r.valor_resposta === 'Não Conforme' || r.valor_resposta === 'Não' || r.valor_resposta === 'false'
            );
            
            const isPendentePeloBackend = detalhes.status_nc === 'PENDENTE';
            const isResolvido = detalhes.status_nc === 'RESOLVIDO' || detalhes.observacao_resolucao;
            
            if ((temErro || isPendentePeloBackend) && !isResolvido) {
              ncsEncontradas.push({
                id_execucao: exec.id_execucao,
                checklist_titulo: exec.titulo || exec.checklist_titulo,
                operador: exec.usuario_nome,
                data_execucao: detalhes.data_conclusao || detalhes.data_inicio || exec.data_inicio
              });
            }
          }
        }
        
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
        const novosAlertas = alertas.filter(alerta => alerta.id_execucao !== idExecucao);
        setAlertas(novosAlertas);
        setModalResolver({ visivel: false, idExecucao: null });
        
        if (novosAlertas.length === 0) {
          setModalNotificacoesAberto(false);
        }

        setModalAviso({ visivel: true, tipo: 'sucesso', titulo: 'Sucesso!', mensagem: 'Resolvido e salvo no banco de dados!' });
      } else {
        const erroJson = await res.json().catch(() => ({}));
        setModalAviso({ visivel: true, tipo: 'erro', titulo: 'Erro', mensagem: erroJson.error || 'Falha ao salvar a resolução.' });
      }
    } catch (erro) {
      setModalAviso({ visivel: true, tipo: 'erro', titulo: 'Erro', mensagem: 'Falha na conexão com o servidor.' });
    }
  };

  const formatarData = (dataIso) => {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleString('pt-BR');
  };

  // ==========================================
  // LÓGICA DE APRESENTAÇÃO DE SETORES (UI)
  // ==========================================
  const setoresAgrupados = nomesSetores.reduce((acc, nomeCompleto) => {
    const partes = nomeCompleto.split(' > ');
    const pai = partes[0];
    const filho = partes.length > 1 ? partes.slice(1).join(' > ') : null;

    if (!acc[pai]) acc[pai] = [];
    if (filho && !acc[pai].includes(filho)) acc[pai].push(filho);
    return acc;
  }, {});

  const paisList = Object.keys(setoresAgrupados);
  const temSubsetores = Object.values(setoresAgrupados).some(filhos => filhos.length > 0);

  if (!user) return null; 

  const isAdmin = user.setores?.some(s => String(s).toLowerCase() === 'admin');

  return (
    <div className="home-container">
      <main className="home-content">
        {isAdmin ? (
          <div className="form-card">
            <h2>Painel do Administrador</h2>
            <p>Escolha uma das ações abaixo para gerenciar o sistema:</p>
            
            <div className="admin-actions">
             <button className="primary-button" onClick={() => navigate('/cadastro-usuario')}>Cadastrar Novo Usuário</button>
             <button className="primary-button" onClick={() => navigate('/gerenciar-usuarios')}>Gerenciar Usuários (Resetar Senha)</button>
              <button className="primary-button" onClick={() => navigate('/cadastro-checklist')}>Criar Novo Checklist</button>
              <button className="primary-button" onClick={() => navigate('/relatorios')}>Ver Relatórios</button>
              <button className="primary-button" onClick={() => navigate('/gerenciar-checklists')}>Gerenciar Checklists</button>
              <button className="primary-button" onClick={() => navigate('/historico-ncs')}>📜 Histórico de Não Conformidades</button>
            </div>
          </div>
        ) : (
          <div className="form-card">
            <h2>Checklist Diário</h2>
            
            <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
              <p style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '0.9rem', fontWeight: 'bold' }}>Seus Setores:</p>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {paisList.length > 0 ? (
                  paisList.map(pai => (
                    <span key={pai} style={{ backgroundColor: '#0284c7', color: 'white', padding: '4px 12px', borderRadius: '15px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      {pai}
                    </span>
                  ))
                ) : (
                  <span style={{ color: '#64748b' }}>Não especificado</span>
                )}

                {temSubsetores && (
                  <button 
                    onClick={() => setMostrarSubsetores(!mostrarSubsetores)}
                    style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '15px', padding: '4px 12px', fontSize: '0.8rem', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s', backgroundColor: 'white' }}
                  >
                    {mostrarSubsetores ? 'Esconder detalhes ▲' : 'Ver subsetores ▼'}
                  </button>
                )}
              </div>

              {mostrarSubsetores && temSubsetores && (
                <div style={{ marginTop: '15px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(setoresAgrupados).map(([pai, filhos]) => {
                    if (filhos.length === 0) return null;
                    return (
                      <div key={pai} style={{ fontSize: '0.85rem', color: '#334155' }}>
                        <strong style={{ color: '#0284c7' }}>↳ {pai}:</strong> {filhos.join(', ')}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="admin-actions">
              <button className="primary-button" onClick={() => navigate('/preencher-checklist')}>Iniciar Checklist</button>
            </div>
          </div>
        )}
      </main>

      {/* ÍCONE FLUTUANTE DE NOTIFICAÇÃO */}
      {isAdmin && alertas.length > 0 && (
        <>
          {!modalNotificacoesAberto && (
            <button 
              className="icone-notificacao-flutuante"
              onClick={() => setModalNotificacoesAberto(true)}
              style={{
                position: 'fixed', bottom: '30px', right: '30px', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '50%',
                width: '60px', height: '60px', fontSize: '24px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(220, 38, 38, 0.4)',
                display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, animation: 'pulse 2s infinite'
              }}
              title="Ver Não Conformidades Pendentes"
            >
              ⚠️
              <span style={{
                position: 'absolute', top: '-5px', right: '-5px', backgroundColor: 'white', color: '#dc2626', fontSize: '12px', fontWeight: 'bold',
                width: '24px', height: '24px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px solid #dc2626'
              }}>
                {alertas.length}
              </span>
            </button>
          )}

          {modalNotificacoesAberto && (
            <div 
              style={{
                position: 'fixed', bottom: '20px', right: '20px', width: '350px', maxHeight: '80vh', backgroundColor: 'white',
                borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', zIndex: 1000, overflow: 'hidden', border: '1px solid #e2e8f0'
              }}
            >
              <div style={{ backgroundColor: '#dc2626', color: 'white', padding: '15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  <strong style={{ fontSize: '16px' }}>Pendências ({alertas.length})</strong>
                </div>
                <button 
                  onClick={() => setModalNotificacoesAberto(false)}
                  style={{ background: 'none', border: 'none', color: 'white', fontSize: '18px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: '15px', overflowY: 'auto', maxHeight: 'calc(80vh - 60px)', backgroundColor: '#f8fafc' }}>
                {alertas.map((alerta) => (
                  <div key={alerta.id_execucao} style={{ backgroundColor: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px', marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                    <span style={{ display: 'inline-block', backgroundColor: '#fee2e2', color: '#991b1b', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 'bold', marginBottom: '8px' }}>
                      Execução Nº {alerta.id_execucao}
                    </span>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#334155' }}><strong>Checklist:</strong> {alerta.checklist_titulo}</p>
                    <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: '#334155' }}><strong>Operador:</strong> {alerta.operador}</p>
                    <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#64748b' }}>Data: {formatarData(alerta.data_execucao)}</p>
                    
                    <button 
                      onClick={() => abrirModalResolver(alerta.id_execucao)}
                      style={{ width: '100%', backgroundColor: '#0284c7', color: 'white', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    >
                      ✅ Resolver Pendência
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* MODAL DE RESOLUÇÃO PADRONIZADO (BOTÕES IGUAIS)            */}
      {/* ========================================================= */}
      {modalResolver.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Resolver Pendência</h3>
            <p>Qual foi a tratativa realizada para resolver a NC da execução <strong>#{modalResolver.idExecucao}</strong>?</p>
            <textarea 
              style={{ width: '100%', minHeight: '90px', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '15px', fontFamily: 'inherit', resize: 'none' }}
              value={observacao} onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva o que foi feito..."
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#333', fontWeight: 'bold', cursor: 'pointer', margin: 0 }} 
                onClick={() => setModalResolver({ visivel: false, idExecucao: null })}
              >
                Cancelar
              </button>
              <button 
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#F57c00', color: 'white', fontWeight: 'bold', cursor: 'pointer', margin: 0 }} 
                onClick={confirmarResolucao} 
                disabled={!observacao.trim()}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AVISOS */}
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