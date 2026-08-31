import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './NovaSenha.css'; // Pode reutilizar estilos do Login.css ou criar um novo

export default function NovaSenha() {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [usuario, setUsuario] = useState(null);
  
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('usuarioLogado');
    if (userData) {
      setUsuario(JSON.parse(userData));
    } else {
      navigate('/');
    }
  }, [navigate]);

  const mostrarAlerta = (tipo, titulo, mensagem) => setAlerta({ visivel: true, tipo, titulo, mensagem });
  const fecharAlerta = () => {
    setAlerta({ ...alerta, visivel: false });
    if (alerta.tipo === 'sucesso') navigate('/home');
  };

 const handleAtualizarSenha = async (e) => {
    e.preventDefault();
    
    if (novaSenha !== confirmarSenha) {
      mostrarAlerta('erro', 'Senhas não conferem', 'A nova senha e a confirmação precisam ser iguais.');
      return;
    }

    try {
      // Mantido o caminho relativo, ajustando apenas o payload
      const resposta = await fetch(`/api/usuarios/${usuario.id_usuario}/senha-obrigatoria`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nova_senha: novaSenha,
          confirmacao_senha: confirmarSenha
        })
      });

      if (resposta.ok) {
        // Atualiza o localStorage para remover a flag de bloqueio
        const usuarioAtualizado = { ...usuario, forcar_troca_senha: false };
        localStorage.setItem('usuarioLogado', JSON.stringify(usuarioAtualizado));
        
        mostrarAlerta('sucesso', 'Senha atualizada!', 'Sua nova senha foi salva com sucesso.');
      } else {
        // Lê a mensagem de erro exata vinda do backend
        const erroData = await resposta.json();
        mostrarAlerta('erro', 'Erro ao salvar', erroData.error || 'Não foi possível atualizar a senha.');
      }
    } catch (erro) {
      console.error('Erro de requisição:', erro);
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao comunicar com o servidor.');
    }
  };
  if (!usuario) return null;

  return (
    <div className="login-container">
      <form onSubmit={handleAtualizarSenha} className="login-form">
        <h2>Troca de Senha Obrigatória</h2>
        <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#666' }}>
          Por motivos de segurança, você precisa definir uma nova senha antes de acessar o sistema.
        </p>
        
        <div className="input-group">
          <label>Nova Senha</label>
          <input
            type="password"
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            required
          />
        </div>

        <div className="input-group">
          <label>Confirmar Nova Senha</label>
          <input
            type="password"
            value={confirmarSenha}
            onChange={(e) => setConfirmarSenha(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="login-button">Salvar e Acessar</button>
      </form>

      {alerta.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className={alerta.tipo === 'erro' ? 'texto-erro' : 'texto-sucesso'}>{alerta.titulo}</h3>
            <p>{alerta.mensagem}</p>
            <button className="modal-button" onClick={fecharAlerta}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}