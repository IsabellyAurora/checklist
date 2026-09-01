import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '../../contexts/DeviceContext'; 
import { fetchWithAuth } from '../../utils/api'; 
import './GerenciarUsuarios.css';

export default function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  
  // O estado de confirmação agora controla qual ação será feita ('reset' ou 'status')
  const [confirmacao, setConfirmacao] = useState({ 
    visivel: false, 
    id_usuario: null, 
    nome: '', 
    acao: '', 
    novoStatus: null 
  });
  
  const { isTablet, isMobile } = useDevice();
  const navigate = useNavigate();

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const getHeadersAdmin = () => {
    const userData = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
    return {
      'x-setor-usuario': userData.setor
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
        console.error('Erro de autorização ou ao buscar lista de usuários');
      }
    } catch (erro) {
      console.error('Erro de conexão:', erro);
    }
  };

  const mostrarAlerta = (tipo, titulo, mensagem) => setAlerta({ visivel: true, tipo, titulo, mensagem });
  const fecharAlerta = () => setAlerta({ ...alerta, visivel: false });

  // Função unificada para abrir o modal
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

  // NOVA FUNÇÃO: Executa a inativação ou ativação do usuário
  const executarAlteracaoStatus = async () => {
    const { id_usuario, nome, novoStatus } = confirmacao;
    fecharConfirmacao();

    try {
      const resposta = await fetchWithAuth(`/api/usuarios/${id_usuario}/status`, {
        method: 'PUT', // Atualizado para chamar a nova rota
        headers: getHeadersAdmin(),
        body: JSON.stringify({ ativo: novoStatus })
      });

      if (resposta.ok) {
        mostrarAlerta('sucesso', 'Status Atualizado', `O usuário ${nome} foi ${novoStatus ? 'ativado' : 'inativado'} com sucesso.`);
        carregarUsuarios(); // Recarrega a lista para a tabela atualizar a cor e os botões
      } else {
        const erroData = await resposta.json();
        mostrarAlerta('erro', 'Erro', erroData.error || 'Não foi possível alterar o status do usuário.');
      }
    } catch (erro) {
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  // Decide qual função chamar quando o admin clica no botão "Confirmar" do modal
  const handleConfirmarModal = () => {
    if (confirmacao.acao === 'reset') {
      executarResetSenha();
    } else if (confirmacao.acao === 'status') {
      executarAlteracaoStatus();
    }
  };

  return (
    <div className="gerenciar-usuarios-container" style={{ padding: isMobile ? '1rem' : '2rem' }}>
      
      <div 
        className="gerenciar-usuarios-card" 
        style={{ 
          maxWidth: isTablet ? '98%' : '1000px', // Levemente mais largo para caber os 2 botões
          padding: isMobile ? '1.5rem' : '2.5rem' 
        }}
      >
        <h2>Gerenciar Usuários</h2>
        <p>Lista de funcionários cadastrados no sistema.</p>

        <div className="tabela-container">
          <table className="tabela-usuarios">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nome</th>
                {!isMobile && <th>E-mail</th>}
                <th>Setor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length > 0 ? (
                usuarios.map((user) => {
                  const isAtivo = user.ativo !== false; // Assume true se não vier a propriedade

                  return (
                    <tr key={user.id_usuario} style={{ opacity: isAtivo ? 1 : 0.6 }}>
                      <td className="col-destaque">#{user.id_usuario}</td>
                      <td>
                        <strong>{user.nome}</strong>
                        {/* Mostra um selo vermelho se o usuário estiver inativo */}
                        {!isAtivo && (
                          <span style={{ marginLeft: '8px', fontSize: '0.75rem', color: '#d32f2f', backgroundColor: '#ffebee', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                            Inativo
                          </span>
                        )}
                      </td>
                      {!isMobile && <td>{user.email}</td>}
                      <td>{user.setor}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <button 
                            className="btn-resetar"
                            onClick={() => abrirConfirmacao(user.id_usuario, user.nome, 'reset')}
                          >
                            Resetar Senha
                          </button>
                          
                          {/* NOVO BOTÃO: Alterna entre Inativar e Ativar */}
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
                  <td colSpan={isMobile ? "4" : "5"} className="tabela-vazia">Nenhum usuário encontrado.</td>
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

      {confirmacao.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            {/* O texto do modal muda dinamicamente dependendo da ação selecionada */}
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