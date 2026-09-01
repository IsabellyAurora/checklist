import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('usuarioLogado');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      
      // Proteção: se a flag de troca obrigatória estiver true, expulsa para /nova-senha
      if (parsedUser.forcar_troca_senha) {
        navigate('/nova-senha');
        return;
      }
      
      setUser(parsedUser);
    } else {
      navigate('/'); 
    }
  }, [navigate]);

  if (!user) return null; 

  const isAdmin = user.setor && user.setor.toLowerCase() === 'admin';

  return (
    <div className="home-container">
      {/* O cabeçalho foi removido daqui pois agora é global (<Header /> no App.jsx) */}

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
    </div>
  );
} 