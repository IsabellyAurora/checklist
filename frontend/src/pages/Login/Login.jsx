import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import logo from '../../assets/image.png'; 

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  // Novo estado para controlar qual tela mostrar
  const [esqueciSenha, setEsqueciSenha] = useState(false); 
  
  const navigate = useNavigate();

const handleLogin = (e) => {
    e.preventDefault();
    
    // Simulação de resposta do Backend (Mock)
    let dadosDoUsuario = {};
    
    if (usuario.toLowerCase() === 'admin') {
      dadosDoUsuario = { nome: 'Administrador', role: 'admin' };
    } else {
      // Se não for admin, simula um usuário comum de um setor específico
      dadosDoUsuario = { nome: usuario, role: 'user', setor: 'TI' };
    }

    // Salva os dados no navegador para a Home conseguir ler
    localStorage.setItem('usuarioLogado', JSON.stringify(dadosDoUsuario));
    
    navigate('/home'); 
  };

  const handleTrocarSenha = (e) => {
    e.preventDefault();
    console.log('Senha alterada para o usuário:', usuario, '| Nova senha:', senha);
    alert('Senha alterada com sucesso!');
    setEsqueciSenha(false); // Volta para a tela de login original
    setSenha(''); // Limpa o campo de senha
  };

  return (
    <div className="login-container">
      
      {/* Condição: Se "esqueciSenha" for falso, mostra o Login. Se for verdadeiro, mostra a troca de senha */}
      {!esqueciSenha ? (
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="logo-container">
            <img src={logo} alt="Logo da Empresa" className="login-logo" />
          </div>

          <h2>Entrar no Sistema</h2>
          
          <div className="input-group">
            <label htmlFor="usuario">Usuário</label>
            <input
              type="text"
              id="usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Digite seu usuário"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="senha">Senha</label>
            <input
              type="password"
              id="senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              required
            />
          </div>

          <button type="submit" className="login-button">Entrar</button>
          
          {/* Botão que ativa a tela de trocar senha */}
          <button 
            type="button" 
            className="link-button" 
            onClick={() => setEsqueciSenha(true)}
          >
            Esqueci minha senha
          </button>
        </form>

      ) : (

        <form onSubmit={handleTrocarSenha} className="login-form">
          <div className="logo-container">
            <img src={logo} alt="Logo da Empresa" className="login-logo" />
          </div>

          <h2>Trocar Senha</h2>
          
          <div className="input-group">
            <label htmlFor="usuario-troca">Usuário</label>
            <input
              type="text"
              id="usuario-troca"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Confirme seu usuário"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="nova-senha">Nova Senha</label>
            <input
              type="password"
              id="nova-senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite a nova senha"
              required
            />
          </div>

          <button type="submit" className="login-button">Salvar Nova Senha</button>
          
          {/* Botão para cancelar e voltar ao login */}
          <button 
            type="button" 
            className="link-button" 
            onClick={() => setEsqueciSenha(false)}
          >
            Voltar para o Login
          </button>
        </form>

      )}

    </div>
  );
}