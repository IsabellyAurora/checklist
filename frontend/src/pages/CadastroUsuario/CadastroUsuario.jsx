import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './CadastroUsuario.css';

export default function CadastroUsuario() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [setor, setSetor] = useState('');
  
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const navigate = useNavigate();

  const mostrarAlerta = (tipo, titulo, mensagem) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem });
  };

  const fecharAlerta = () => {
    setAlerta({ ...alerta, visivel: false });
    // Se foi sucesso, volta para a home após fechar o alerta
    if (alerta.tipo === 'sucesso') {
      navigate('/home');
    }
  };

const handleCadastro = async (e) => {
    e.preventDefault();
    
    try {
      // 1. Recupera os dados do usuário logado no LocalStorage
      const usuarioStorage = localStorage.getItem('usuarioLogado');
      const usuarioLogado = usuarioStorage ? JSON.parse(usuarioStorage) : null;

      // 2. Envia a requisição com o cabeçalho de autorização e a porta correta
      const resposta = await fetch('http://localhost:3000/api/usuarios', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-setor-usuario': usuarioLogado?.setor || '' // Envia o setor para o backend
        },
        body: JSON.stringify({ nome, email, senha, setor })
      });

      if (resposta.ok) {
        mostrarAlerta('sucesso', 'Cadastro concluído!', 'O usuário foi cadastrado com sucesso.');
        setNome(''); setEmail(''); setSenha(''); setSetor('');
      } else {
        // Tenta capturar a mensagem de erro exata enviada pelo backend
        const erroData = await resposta.json();
        mostrarAlerta('erro', 'Erro ao cadastrar', erroData.error || 'Verifique os dados e tente novamente.');
      }
    } catch (erro) {
      console.error('Erro no cadastro:', erro);
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  return (
    <div className="cadastro-container">
      <div className="cadastro-card">
        <h2>Cadastrar Novo Usuário</h2>
        <p>Preencha os dados para adicionar um usuário ao sistema.</p>
        
        <form onSubmit={handleCadastro} className="cadastro-form">
          <div className="input-group">
            <label htmlFor="nome">Nome</label>
            <input
              type="text"
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome do usuário"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="email">E-mail</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@empresa.com.br"
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
              placeholder="Crie uma senha"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="setor">Setor</label>
            <select
              id="setor"
              value={setor}
              onChange={(e) => setSetor(e.target.value)}
              required
            >
              <option value="" disabled>Selecione um setor...</option>
              <option value="admin">Administrador (Admin)</option>
              <option value="ti">Tecnologia da Informação (TI)</option>
              <option value="manutencao">Manutenção</option>
              <option value="rh">Recursos Humanos (RH)</option>
              <option value="operacao">Operacional</option>
              <option value="limpeza">Limpeza</option>
            </select>
          </div>

          <div className="botoes-acao">
            <button type="button" className="btn-voltar" onClick={() => navigate('/home')}>
              Voltar
            </button>
            <button type="submit" className="btn-salvar">
              Cadastrar
            </button>
          </div>
        </form>
      </div>

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