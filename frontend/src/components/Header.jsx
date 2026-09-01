import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Header.css';

export default function Header() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Toda vez que a rota mudar, ele verifica quem está logado
  useEffect(() => {
    const userData = localStorage.getItem('usuarioLogado');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      setUser(null);
    }
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { 
        method: 'POST', 
        credentials: 'include' 
      });
    } catch (erro) {
      console.error('Erro ao deslogar no servidor', erro);
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('usuarioLogado'); 
    setUser(null);
    navigate('/');
  };

  // Se não tiver usuário logado ou estiver na tela de login, esconde o cabeçalho
  if (!user || location.pathname === '/') return null;

  return (
    <header className="global-header">
      {/* Clicar no título volta para a Home */}
      <h1 onClick={() => navigate('/home')} style={{ cursor: 'pointer' }}>
        Painel de Checklists
      </h1>
      
      <div className="user-info">
        <span>Olá, <strong>{user.nome}</strong></span>
        
        <button onClick={() => navigate('/meu-perfil')} className="perfil-button">
          Meu Perfil
        </button>
        
        <button onClick={handleLogout} className="logout-button">Sair</button>
      </div>
    </header>
  );
}