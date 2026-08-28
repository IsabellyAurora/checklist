import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import logo from '../../assets/image.png'; 

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [esqueciSenha, setEsqueciSenha] = useState(false); 
  
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      // Faz a requisição POST para a rota de login do backend
      const resposta = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ usuario, senha })
      });

      if (resposta.ok) {
        // Se o login der certo, converte a resposta e salva no localStorage
        const dadosDoUsuario = await resposta.json();
        localStorage.setItem('usuarioLogado', JSON.stringify(dadosDoUsuario));
        navigate('/home');
      } else {
        // Se o backend retornar erro (ex: 401 Unauthorized)
        alert('Usuário ou senha incorretos.');
      }
    } catch (erro) {
      console.error('Erro no login:', erro);
      alert('Erro ao conectar com o servidor. Verifique se o backend está rodando.');
    }
  };

  const handleTrocarSenha = async (e) => {
    e.preventDefault();
    
    try {
      // Faz a requisição POST para a rota de troca de senha
      const resposta = await fetch('/api/trocar-senha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        // Envia o usuário e a senha nova. (Verifique com seu colega se ele espera a chave como "senha" ou "novaSenha" no JSON)
        body: JSON.stringify({ usuario, senha }) 
      });

      if (resposta.ok) {
        alert('Senha alterada com sucesso!');
        setEsqueciSenha(false); // Volta para a tela de login
        setSenha(''); // Limpa o campo de senha
      } else {
        alert('Erro ao alterar a senha. Verifique se o usuário está correto.');
      }
    } catch (erro) {
      console.error('Erro ao trocar senha:', erro);
      alert('Erro ao conectar com o servidor. Verifique se o backend está rodando.');
    }
  };

  return (
    <div className="login-container">
      
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
          
          <button 
            type="button" 
            className="link-button" 
            onClick={() => {
              setEsqueciSenha(true);
              setSenha(''); // Limpa a senha ao mudar de tela
            }}
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
          
          <button 
            type="button" 
            className="link-button" 
            onClick={() => {
              setEsqueciSenha(false);
              setSenha(''); // Limpa a senha ao voltar
            }}
          >
            Voltar para o Login
          </button>
        </form>

      )}

    </div>
  );
}