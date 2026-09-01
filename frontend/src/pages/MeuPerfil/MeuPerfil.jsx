import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; // 1. Importado o interceptor JWT

export default function MeuPerfil() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [usuario, setUsuario] = useState(null);
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('usuarioLogado');
    if (userData) setUsuario(JSON.parse(userData));
    else navigate('/');
  }, [navigate]);

  const mostrarAlerta = (tipo, titulo, mensagem) => setAlerta({ visivel: true, tipo, titulo, mensagem });
  const fecharAlerta = () => setAlerta({ ...alerta, visivel: false });

  const handleTrocaVoluntaria = async (e) => {
    e.preventDefault();
    
    if (novaSenha !== confirmarSenha) {
      mostrarAlerta('erro', 'Senhas não conferem', 'A nova senha e a confirmação precisam ser iguais.');
      return;
    }

    try {
      // 2. Substituído o 'fetch' padrão pelo 'fetchWithAuth'
      const resposta = await fetchWithAuth(`/api/usuarios/${usuario.id_usuario}/senha`, {
        method: 'PUT',
        body: JSON.stringify({ 
          senha_atual: senhaAtual, 
          nova_senha: novaSenha,
          confirmacao_senha: confirmarSenha
        })
      });

      if (resposta.ok) {
        mostrarAlerta('sucesso', 'Sucesso!', 'Sua senha foi alterada.');
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmarSenha(''); 
      } else {
        const erroData = await resposta.json();
        mostrarAlerta('erro', 'Erro ao alterar', erroData.error || 'Ocorreu um erro ao atualizar a senha.');
      }
    } catch (erro) {
      console.error('Erro de requisição:', erro);
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao comunicar com o servidor.');
    }
  };

  if (!usuario) return null;

  return (
    <div className="gerenciar-container">
      <div className="gerenciar-card">
        <h2>Meu Perfil</h2>
        <p>Usuário: <strong>{usuario.nome}</strong> | Setor: <strong>{usuario.setor}</strong></p>

        <form onSubmit={handleTrocaVoluntaria} style={{ marginTop: '2rem' }}>
          <div className="input-group">
            <label>Senha Atual</label>
            <input
              type="password"
              className="input-busca"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label>Nova Senha</label>
            <input
              type="password"
              className="input-busca"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label>Confirmar Nova Senha</label>
            <input
              type="password"
              className="input-busca"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button type="button" className="btn-voltar-home" onClick={() => navigate('/home')}>
              Voltar
            </button>
            <button type="submit" className="btn-buscar" style={{ width: '100%' }}>
              Atualizar Senha
            </button>
          </div>
        </form>
      </div>

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