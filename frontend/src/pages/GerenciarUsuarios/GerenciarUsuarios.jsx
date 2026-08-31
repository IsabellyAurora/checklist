import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDevice } from '../../contexts/DeviceContext'; // 1. Importando o hook
import './GerenciarUsuarios.css';

export default function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const [confirmacao, setConfirmacao] = useState({ visivel: false, id_usuario: null, nome: '' });
  
  // 2. Puxando as variáveis de tamanho de tela
  const { isTablet, isMobile } = useDevice();
  
  const navigate = useNavigate();

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const getHeadersAdmin = () => {
    const userData = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
    return {
      'Content-Type': 'application/json',
      'x-setor-usuario': userData.setor
    };
  };

  const carregarUsuarios = async () => {
    try {
      const resposta = await fetch('/api/usuarios?page=1&limit=100', {
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

  const abrirConfirmacao = (id_usuario, nome) => {
    setConfirmacao({ visivel: true, id_usuario, nome });
  };

  const fecharConfirmacao = () => {
    setConfirmacao({ visivel: false, id_usuario: null, nome: '' });
  };

  const executarResetSenha = async () => {
    const { id_usuario, nome } = confirmacao;
    fecharConfirmacao(); 

    try {
      const resposta = await fetch(`/api/usuarios/${id_usuario}/resetar-senha`, {
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

  return (
    // 3. Aplicando estilos dinâmicos no container
    <div className="gerenciar-usuarios-container" style={{ padding: isMobile ? '1rem' : '2rem' }}>
      
      {/* 4. Ajustando a largura e padding do card para o Tablet */}
      <div 
        className="gerenciar-usuarios-card" 
        style={{ 
          maxWidth: isTablet ? '98%' : '900px',
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
                {/* Esconde o cabeçalho de e-mail no celular para a tabela não espremer */}
                {!isMobile && <th>E-mail</th>}
                <th>Setor</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.length > 0 ? (
                usuarios.map((user) => (
                  <tr key={user.id_usuario}>
                    <td className="col-destaque">#{user.id_usuario}</td>
                    <td><strong>{user.nome}</strong></td>
                    {/* Esconde o dado de e-mail no celular */}
                    {!isMobile && <td>{user.email}</td>}
                    <td>{user.setor}</td>
                    <td>
                      <button 
                        className="btn-resetar"
                        onClick={() => abrirConfirmacao(user.id_usuario, user.nome)}
                      >
                        Resetar Senha
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isMobile ? "4" : "5"} className="tabela-vazia">Nenhum usuário encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. Esticando o botão de voltar em telas menores */}
        <button 
          className="btn-voltar-home" 
          style={{ width: isTablet ? '100%' : 'auto' }}
          onClick={() => navigate('/home')}
        >
          Voltar para Home
        </button>
      </div>

      {/* Modais permanecem iguais... */}
      {confirmacao.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>⚠️ Confirmar Reset</h3>
            <p>
              Tem certeza que deseja resetar a senha de <strong>{confirmacao.nome}</strong>? 
              A senha voltará para o padrão temporário e ele será obrigado a trocar no próximo login.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexDirection: isMobile ? 'column' : 'row' }}>
              <button 
                style={{ flex: 1, padding: '0.75rem', backgroundColor: 'white', color: '#333', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }} 
                onClick={fecharConfirmacao}
              >
                Cancelar
              </button>
              <button 
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }} 
                onClick={executarResetSenha}
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