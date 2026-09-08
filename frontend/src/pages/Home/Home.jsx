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

  // Estado para guardar os nomes reais dos setores
  const [nomesSetores, setNomesSetores] = useState([]);

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
      carregarSetores(); // Carrega e traduz os setores do usuário

      // Validação segura convertendo para String (evita quebrar se for número)
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
      // Pega o array de setores do usuário com as novas lógicas do backend
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
        
        // 1. Acha os setores que o usuário tem explicitamente no perfil
        const setoresExplicitos = setoresBrutos.filter(s => 
          arrayNormalizado.includes(String(s.id_setor)) || 
          arrayNormalizado.includes(String(s.nome).toLowerCase())
        );

        // 2. Cascata: Pega o ID dos explícitos e busca todos os filhos, netos, etc
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

        // 3. Pega todos os objetos de setor baseados nos IDs finais permitidos e converte pro texto bonito
        const setoresFinaisDoUsuario = setoresBrutos.filter(s => idsPermitidos.has(Number(s.id_setor)));
        
        const setoresTraduzidos = setoresFinaisDoUsuario.map(s => construirNomeSetor(s, setoresBrutos));
        
        // Ordena alfabeticamente para ficar bonito na tela
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

  const formatarData = (dataIso) => {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleString('pt-BR');
  };

  if (!user) return null; 

  // Checagem segura de Admin para renderizar os botões
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
            {/* EXIBIÇÃO BONITA DOS SETORES */}
            <p>Setores de atuação: <strong>{nomesSetores.length > 0 ? nomesSetores.join(', ') : 'Não especificado'}</strong></p>
            <div className="admin-actions">
              <button className="primary-button" onClick={() => navigate('/preencher-checklist')}>Iniciar Checklist</button>
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