import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import logo from '../../assets/image.png'; 

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false); // 1. Novo estado para controlar a visibilidade
  
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
        const json = await resposta.json();
        const dadosDoUsuario = json.data.usuario;
        
        localStorage.setItem('usuarioLogado', JSON.stringify(dadosDoUsuario));
        
        if (dadosDoUsuario.forcar_troca_senha) {
          navigate('/nova-senha');
        } else {
          navigate('/home');
        }
      } else {
        mostrarAlerta('erro', 'Falha no login', 'Usuário ou senha incorretos.');
      }
    } catch (erro) {
      console.error('Erro no login:', erro);
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  const handleEsqueciSenha = () => {
    mostrarAlerta(
      'aviso', 
      'Esqueceu sua senha?', 
      'Para sua segurança, solicite a redefinição de senha diretamente ao seu gerente ou ao Administrador do sistema.'
    );
  };

  return (
    <div className="login-container">
      
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
          
          {/* 2. Wrapper para alinhar o input e o botão do olhinho */}
          <div className="senha-input-wrapper">
            <input
              type={mostrarSenha ? "text" : "password"} // Muda de password para text dinamicamente
              id="senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Digite sua senha"
              required
            />
            
            <button 
              type="button" 
              className="btn-mostrar-senha" 
              onClick={() => setMostrarSenha(!mostrarSenha)}
              title={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
            >
              {mostrarSenha ? (
                // Ícone de Olho Fechado (Riscado)
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icone-olho">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              ) : (
                // Ícone de Olho Aberto
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="icone-olho">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              )}
            </button>
          </div>
        </div>

        <button type="submit" className="login-button">Entrar</button>
        
        <button 
          type="button" 
          className="link-button" 
          onClick={handleEsqueciSenha}
        >
          Esqueci minha senha
        </button>
      </form>

      {alerta.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            {alerta.tipo === 'sucesso' ? '✅' : alerta.tipo === 'aviso' ? 'ℹ️' : '⚠️'}
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