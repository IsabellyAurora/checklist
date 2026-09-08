import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '../../contexts/DeviceContext'; 
import { fetchWithAuth } from '../../utils/api'; 
import './GerenciarUsuarios.css';

export default function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [setoresDisponiveis, setSetoresDisponiveis] = useState([]);
  
  // Estado para a barra de pesquisa da TABELA principal
  const [buscaSetor, setBuscaSetor] = useState('');
  
  // NOVO: Estado para a barra de pesquisa DENTRO DO MODAL de setores
  const [buscaSetorModal, setBuscaSetorModal] = useState('');
  
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  
  const [confirmacao, setConfirmacao] = useState({ 
    visivel: false, 
    id_usuario: null, 
    nome: '', 
    acao: '', 
    novoStatus: null 
  });

  const [modalSetores, setModalSetores] = useState({
    visivel: false,
    id_usuario: null,
    nome: '',
    setoresSelecionados: []
  });
  
  const { isTablet, isMobile } = useDevice();
  const navigate = useNavigate();

  useEffect(() => {
    carregarSetores();
    carregarUsuarios();
  }, []);

  // ==========================================
  // LÓGICA DE SETORES (PAI > FILHO)
  // ==========================================
  const construirNomeSetor = (setorAtual, todosSetores) => {
    if (!setorAtual.id_setor_pai) return setorAtual.nome; 
    const setorPai = todosSetores.find(s => s.id_setor === setorAtual.id_setor_pai);
    if (setorPai) {
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
        formatados.sort((a, b) => a.nomeExibicao.localeCompare(b.nomeExibicao));
        setSetoresDisponiveis(formatados);
      }
    } catch (erro) {
      console.error("Erro ao carregar setores", erro);
    }
  };

  // ==========================================
  // LÓGICA DE USUÁRIOS E FILTRO
  // ==========================================
  const getHeadersAdmin = () => {
    const userData = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
    return {
      'Content-Type': 'application/json',
      'x-setor-usuario': userData.setor || 'admin'
    };
  };

  const carregarUsuarios = async () => {
    try {
      const resposta = await fetchWithAuth('/api/usuarios?page=1&limit=100', {
        method: 'GET',
        headers: getHeadersAdmin()
      });
      
      if (resposta.ok) {
        const json = await resposta.json();
        setUsuarios(json.data || []);
      } else {
        console.error('Erro ao buscar lista de usuários. Status:', resposta.status);
      }
    } catch (erro) {
      console.error('Erro de conexão:', erro);
    }
  };

  // Filtrando a lista de usuários baseada no que foi digitado na barra de pesquisa principal
  const usuariosFiltrados = usuarios.filter((user) => {
    if (!buscaSetor) return true;
    const setoresString = user.setores ? user.setores.join(', ').toLowerCase() : '';
    return setoresString.includes(buscaSetor.toLowerCase());
  });

  // NOVO: Filtrando a lista de checkboxes dentro do modal de edição
  const setoresFiltradosModal = setoresDisponiveis.filter((setor) => {
    return setor.nomeExibicao.toLowerCase().includes(buscaSetorModal.toLowerCase());
  });

  const mostrarAlerta = (tipo, titulo, mensagem) => setAlerta({ visivel: true, tipo, titulo, mensagem });
  const fecharAlerta = () => setAlerta({ ...alerta, visivel: false });

  const abrirConfirmacao = (id_usuario, nome, acao, novoStatus = null) => {
    setConfirmacao({ visivel: true, id_usuario, nome, acao, novoStatus });
  };

  const fecharConfirmacao = () => {
    setConfirmacao({ visivel: false, id_usuario: null, nome: '', acao: '', novoStatus: null });
  };

  const executarResetSenha = async () => {
    const { id_usuario, nome } = confirmacao;
    fecharConfirmacao(); 

    try {
      const resposta = await fetchWithAuth(`/api/usuarios/${id_usuario}/resetar-senha`, {
        method: 'PUT',
        headers: getHeadersAdmin()
      });

      if (resposta.ok) {
        mostrarAlerta('sucesso', 'Senha Resetada', `A senha de ${nome} foi resetada. Avise-o para usar a senha temporária Mudar@123.`);
      } else {
        mostrarAlerta('erro', 'Acesso Negado', 'Você não tem permissão ou ocorreu um erro no servidor.');
      }
    } catch (erro) {
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  const executarAlteracaoStatus = async () => {
    const { id_usuario, nome, novoStatus } = confirmacao;
    fecharConfirmacao();

    try {
      const resposta = await fetchWithAuth(`/api/usuarios/${id_usuario}/status`, {
        method: 'PUT',
        headers: getHeadersAdmin(),
        body: JSON.stringify({ ativo: novoStatus })
      });

      if (resposta.ok) {
        mostrarAlerta('sucesso', 'Status Atualizado', `O usuário ${nome} foi ${novoStatus ? 'ativado' : 'inativado'} com sucesso.`);
        carregarUsuarios(); 
      } else {
        const erroData = await resposta.json().catch(() => ({}));
        mostrarAlerta('erro', 'Erro', erroData.error || 'Não foi possível alterar o status do usuário.');
      }
    } catch (erro) {
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  const handleConfirmarModal = () => {
    if (confirmacao.acao === 'reset') {
      executarResetSenha();
    } else if (confirmacao.acao === 'status') {
      executarAlteracaoStatus();
    }
  };

  const abrirModalSetores = (user) => {
    let idsSelecionados = [];
    if (user.setores_ids) {
      idsSelecionados = user.setores_ids;
    } else if (Array.isArray(user.setores)) {
      idsSelecionados = setoresDisponiveis
        .filter(s => user.setores.includes(s.nome))
        .map(s => s.id_setor);
    }

    setBuscaSetorModal(''); // Limpa a busca do modal ao abri-lo
    setModalSetores({
      visivel: true,
      id_usuario: user.id_usuario,
      nome: user.nome,
      setoresSelecionados: idsSelecionados
    });
  };

  const handleCheckboxSetorChange = (id_setor) => {
    setModalSetores(prev => {
      const selecionados = prev.setoresSelecionados;
      if (selecionados.includes(id_setor)) {
        return { ...prev, setoresSelecionados: selecionados.filter(id => id !== id_setor) };
      } else {
        return { ...prev, setoresSelecionados: [...selecionados, id_setor] };
      }
    });
  };

  const salvarSetoresUsuario = async () => {
    if (modalSetores.setoresSelecionados.length === 0) {
      mostrarAlerta('erro', 'Atenção', 'O usuário precisa estar vinculado a pelo menos um setor.');
      return;
    }

    try {
      const resposta = await fetchWithAuth(`/api/usuarios/${modalSetores.id_usuario}/setores`, {
        method: 'PUT',
        headers: getHeadersAdmin(),
        body: JSON.stringify({ setores: modalSetores.setoresSelecionados })
      });

      if (resposta.ok) {
        setModalSetores({ visivel: false, id_usuario: null, nome: '', setoresSelecionados: [] });
        mostrarAlerta('sucesso', 'Setores Atualizados', `Os setores de ${modalSetores.nome} foram alterados com sucesso.`);
        carregarUsuarios(); 
      } else {
        const erroData = await resposta.json().catch(() => ({}));
        mostrarAlerta('erro', 'Erro', erroData.error || 'Não foi possível atualizar os setores.');
      }
    } catch (erro) {
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  return (
    <div className="gerenciar-usuarios-container" style={{ padding: isMobile ? '1rem' : '2rem' }}>
      
      <div 
        className="gerenciar-usuarios-card" 
        style={{ 
          maxWidth: isTablet ? '98%' : '1100px', 
          padding: isMobile ? '1.5rem' : '2.5rem' 
        }}
      >
        <h2>Gerenciar Usuários</h2>
        <p>Lista de funcionários cadastrados no sistema.</p>

        {/* ========================================================= */}
        {/* BARRA DE PESQUISA DA TABELA PRINCIPAL */}
        {/* ========================================================= */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', padding: '10px 15px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <label htmlFor="buscaSetor" style={{ fontWeight: 'bold', color: '#475569', margin: 0 }}>
            🔍 Buscar por Setor:
          </label>
          <input
            id="buscaSetor"
            type="text"
            placeholder="Ex: TI, Limpeza, Manutenção..."
            value={buscaSetor}
            onChange={(e) => setBuscaSetor(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.95rem', maxWidth: '300px' }}
          />
        </div>

        <div className="tabela-container">
          <table className="tabela-usuarios">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                {!isMobile && <th>E-mail</th>}
                <th>Setores</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.length > 0 ? (
                usuariosFiltrados.map((user) => {
                  const isAtivo = user.ativo !== false; 

                  return (
                    <tr key={user.id_usuario} style={{ opacity: isAtivo ? 1 : 0.6 }}>
                      <td className="col-destaque">#{user.id_usuario}</td>
                      <td>
                        <strong>{user.nome}</strong>
                        {!isAtivo && (
                          <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#d32f2f', backgroundColor: '#ffebee', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            Inativo
                          </span>
                        )}
                      </td>
                      {!isMobile && <td>{user.email}</td>}
                      
                      <td>{user.setores ? user.setores.join(', ') : '-'}</td>
                      
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button 
                            className="btn-resetar"
                            style={{ flex: 1 }}
                            onClick={() => abrirConfirmacao(user.id_usuario, user.nome, 'reset')}
                          >
                            Resetar Senha
                          </button>
                          
                          <button 
                            style={{ 
                              backgroundColor: '#0284c7', 
                              color: 'white', 
                              border: 'none', 
                              padding: '0.5rem 1rem', 
                              borderRadius: '4px', 
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              flex: 1
                            }}
                            onClick={() => abrirModalSetores(user)}
                          >
                            Setores
                          </button>

                          <button 
                            style={{ 
                              backgroundColor: isAtivo ? '#d32f2f' : '#2e7d32', 
                              color: 'white', 
                              border: 'none', 
                              padding: '0.5rem 1rem', 
                              borderRadius: '4px', 
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              flex: 1
                            }}
                            onClick={() => abrirConfirmacao(user.id_usuario, user.nome, 'status', !isAtivo)}
                          >
                            {isAtivo ? 'Inativar' : 'Ativar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isMobile ? "4" : "5"} className="tabela-vazia">
                    Nenhum usuário encontrado para a busca "{buscaSetor}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <button 
          className="btn-voltar-home" 
          style={{ width: isTablet ? '100%' : 'auto', marginTop: '1.5rem' }}
          onClick={() => navigate('/home')}
        >
          Voltar para Home
        </button>
      </div>

      {/* ========================================================= */}
      {/* MODAL PARA EDITAR SETORES DO USUÁRIO */}
      {/* ========================================================= */}
      {modalSetores.visivel && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'left' }}>
            <h3 style={{ color: '#1e293b', marginBottom: '10px' }}>Editar Setores</h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '15px' }}>
              Selecione os setores de atuação para o usuário <strong>{modalSetores.nome}</strong>.
            </p>

            {/* NOVA BARRA DE PESQUISA DENTRO DO MODAL */}
            <input
              type="text"
              placeholder="🔍 Pesquisar setor na lista..."
              value={buscaSetorModal}
              onChange={(e) => setBuscaSetorModal(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '10px 12px', 
                borderRadius: '6px', 
                border: '1px solid #cbd5e1', 
                fontSize: '0.95rem', 
                marginBottom: '10px',
                boxSizing: 'border-box'
              }}
            />
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', maxHeight: '220px', overflowY: 'auto', marginBottom: '20px' }}>
              {setoresFiltradosModal.map(setor => (
                <label key={setor.id_setor} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal', color: '#334155' }}>
                  <input 
                    type="checkbox" 
                    checked={modalSetores.setoresSelecionados.includes(setor.id_setor)}
                    onChange={() => handleCheckboxSetorChange(setor.id_setor)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  {setor.nomeExibicao}
                </label>
              ))}
              {setoresFiltradosModal.length === 0 && (
                <span style={{ color: '#64748b', fontSize: '0.9rem', textAlign: 'center', padding: '10px 0' }}>
                  Nenhum setor encontrado com esse nome.
                </span>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={() => setModalSetores({ visivel: false, id_usuario: null, nome: '', setoresSelecionados: [] })}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#333', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={salvarSetoresUsuario}
                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: 'none', backgroundColor: '#0284c7', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Salvar Setores
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE CONFIRMAÇÃO (Status e Senha) */}
      {/* ========================================================= */}
      {confirmacao.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{confirmacao.acao === 'reset' ? '⚠️ Confirmar Reset' : '⚠️ Confirmar Status'}</h3>
            
            <p>
              {confirmacao.acao === 'reset' ? (
                <>
                  Tem certeza que deseja resetar a senha de <strong>{confirmacao.nome}</strong>? 
                  A senha voltará para o padrão temporário e ele será obrigado a trocar no próximo login.
                </>
              ) : (
                <>
                  Tem certeza que deseja <strong>{confirmacao.novoStatus ? 'ativar' : 'inativar'}</strong> o usuário <strong>{confirmacao.nome}</strong>?
                  {!confirmacao.novoStatus && ' Ele não poderá mais acessar o sistema.'}
                </>
              )}
            </p>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
              <button 
                style={{ flex: 1, padding: '0.75rem', backgroundColor: 'white', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }} 
                onClick={fecharConfirmacao}
              >
                Cancelar
              </button>
              <button 
                style={{ flex: 1, padding: '0.75rem', backgroundColor: confirmacao.acao === 'reset' ? '#d32f2f' : (confirmacao.novoStatus ? '#2e7d32' : '#d32f2f'), color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} 
                onClick={handleConfirmarModal}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE ALERTAS */}
      {/* ========================================================= */}
      {alerta.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            {alerta.tipo === 'sucesso' ? '✅' : '⚠️'}
            <h3 className={alerta.tipo === 'erro' ? 'texto-erro' : 'texto-sucesso'}>{alerta.titulo}</h3>
            <p>{alerta.mensagem}</p>
            <button className="modal-button" onClick={fecharAlerta}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}