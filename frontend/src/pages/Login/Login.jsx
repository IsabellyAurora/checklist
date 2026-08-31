import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import logo from '../../assets/image.png'; 

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [esqueciSenha, setEsqueciSenha] = useState(false); 
  
  // Estado para controlar o nosso pop-up customizado
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  
  const navigate = useNavigate();

  const mostrarAlerta = (tipo, titulo, mensagem) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem });
  };

  const fecharAlerta = () => {
    setAlerta({ ...alerta, visivel: false });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const resposta = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: usuario, senha })
      });

      if (resposta.ok) {
        // Converte a resposta inteira para JSON
        const json = await resposta.json();
        
        // Puxa APENAS o objeto "usuario" que está dentro do "data" da resposta
        const dadosDoUsuario = json.data.usuario;
        
        // Salva apenas os dados limpos do usuário no navegador
        localStorage.setItem('usuarioLogado', JSON.stringify(dadosDoUsuario));
        navigate('/home');
      } else {
        mostrarAlerta('erro', 'Falha no login', 'Usuário ou senha incorretos.');
      }
    } catch (erro) {
      console.error('Erro no login:', erro);
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor. Verifique se o backend está rodando.');
    }
  };

  const handleTrocarSenha = async (e) => {
    e.preventDefault();
    
    try {
      const resposta = await fetch('/api/trocar-senha', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: usuario, senha }) 
      });

      if (resposta.ok) {
        mostrarAlerta('sucesso', 'Tudo certo!', 'Senha alterada com sucesso!');
        setEsqueciSenha(false); 
        setSenha(''); 
      } else {
        mostrarAlerta('erro', 'Ops!', 'Erro ao alterar a senha. Verifique se o usuário está correto.');
      }
    } catch (erro) {
      console.error('Erro ao trocar senha:', erro);
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor. Verifique se o backend está rodando.');
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
              setSenha(''); 
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
              setSenha(''); 
            }}
          >
            Voltar para o Login
          </button>
        </form>
      )}

      {/* Renderização condicional do pop-up customizado */}
      {alerta.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            {alerta.tipo === 'sucesso' ? '✅' : '⚠️'}
            <h3 className={alerta.tipo === 'erro' ? 'texto-erro' : 'texto-sucesso'}>
              {alerta.titulo}
            </h3>
            <p>{alerta.mensagem}</p>
            <button className="modal-button" onClick={fecharAlerta}>OK</button>
          </div>
        </div>
      )}

    </div>
  );
}