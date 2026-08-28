import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Quando a tela carregar, busca quem está logado
    const userData = localStorage.getItem('usuarioLogado');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      // Se não tiver ninguém logado, expulsa de volta pro login
      navigate('/'); 
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('usuarioLogado'); // Limpa os dados
    navigate('/');
  };

  // Enquanto carrega os dados, não mostra nada para evitar erros na tela
  if (!user) return null; 

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
        {/* Renderização Condicional: Se for admin, mostra os cadastros */}
        {user.role === 'admin' ? (
          <div className="form-card">
            <h2>Painel do Administrador</h2>
            <p>Escolha uma das ações abaixo para gerenciar o sistema:</p>
            
            <div className="admin-actions">
              <button className="primary-button">Cadastrar Novo Usuário</button>
              <button className="primary-button">Criar Novo Checklist</button>
              <button className="primary-button">Ver Relatórios</button>
            </div>
          </div>
        ) : (
          /* Se for usuário comum, mostra apenas o checklist do setor dele */
          <div className="form-card">
            <h2>Checklist Diário</h2>
            <p>Setor de atuação: <strong>{user.setor}</strong></p>
            
            <div className="admin-actions">
              <button className="primary-button">
                Iniciar Checklist - {user.setor}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}