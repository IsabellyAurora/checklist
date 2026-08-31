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
      setUser(parsedUser);
    } else {
      navigate('/'); 
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('usuarioLogado'); 
    navigate('/');
  };

  if (!user) return null; 

  // Verifica se o setor retornado pelo banco de dados é "admin"
  const isAdmin = user.setor && user.setor.toLowerCase() === 'admin';

  return (
    <div className="home-container">
      <header className="home-header">
        <h1>Painel de Checklists</h1>
        <div className="user-info">
          <span>Olá, <strong>{user.nome}</strong></span>
          <button onClick={handleLogout} className="logout-button">Sair</button>
        </div>
      </header>

      <main className="home-content">
        {isAdmin ? (
          <div className="form-card">
            <h2>Painel do Administrador</h2>
            <p>Escolha uma das ações abaixo para gerenciar o sistema:</p>
            
            <div className="admin-actions">
             <button className="primary-button" onClick={() => navigate('/cadastro-usuario')}>
                 Cadastrar Novo Usuário
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