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
    <header className="global-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
      
      {/* Clicar no título volta para a Home */}
      <h1 onClick={() => navigate('/home')} style={{ cursor: 'pointer', margin: 0, whiteSpace: 'nowrap', fontSize: '1.2rem' }}>
        Painel de Checklists
      </h1>
      
      {/* Contêiner do usuário com Flexbox e Wrap para não estourar a tela */}
      <div className="user-info" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', minWidth: 0 }}>
        
        <span 
          style={{ 
            maxWidth: '130px', /* No celular, nomes muito longos são cortados com ... */
            whiteSpace: 'nowrap', 
            overflow: 'hidden', 
            textOverflow: 'ellipsis',
            display: 'inline-block'
          }}
          title={user.nome} /* Se o usuário colocar o mouse em cima, vê o nome completo */
        >
          Olá, <strong>{user.nome}</strong>
        </span>
        
        {/* Agrupa os botões para que eles sempre fiquem juntos */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => navigate('/meu-perfil')} className="perfil-button" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            Meu Perfil
          </button>
          
          <button onClick={handleLogout} className="logout-button" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
            Sair
          </button>
        </div>
        
      </div>
    </header>
  );
}