import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; 
import './CadastroUsuario.css';

export default function CadastroUsuario() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  
  const [setoresDisponiveis, setSetoresDisponiveis] = useState([]);
  const [setoresSelecionados, setSetoresSelecionados] = useState([]);
  
  // NOVO: Estado para a barra de pesquisa de setores
  const [buscaSetor, setBuscaSetor] = useState('');
  
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  
  // ESTADOS PARA O GERENCIAMENTO DE SETORES (Criar/Editar na mesma tela)
  const [modalSetor, setModalSetor] = useState({ visivel: false, isEdicao: false, id_setor: null, nome: '', id_setor_pai: '' });

  const navigate = useNavigate();

  useEffect(() => {
    carregarSetores();
  }, []);

  const construirNomeSetor = (setorAtual, todosSetores) => {
    if (!setorAtual.id_setor_pai) {
      return setorAtual.nome; 
    }
    const setorPai = todosSetores.find(s => s.id_setor === setorAtual.id_setor_pai);
    if (setorPai) {
      const nomeDoPai = construirNomeSetor(setorPai, todosSetores);
      return `${nomeDoPai} > ${setorAtual.nome}`;
    }
    return setorAtual.nome;
  };

  const carregarSetores = async () => {
    try {
      const res = await fetchWithAuth('/api/setores');
      if (res.ok) {
        const json = await res.json();
        const setoresBrutos = json.data || [];

        const setoresFormatados = setoresBrutos.map(setor => ({
          ...setor,
          nomeExibicao: construirNomeSetor(setor, setoresBrutos)
        }));

        setoresFormatados.sort((a, b) => a.nomeExibicao.localeCompare(b.nomeExibicao));
        setSetoresDisponiveis(setoresFormatados);
      }
    } catch (erro) {
      console.error("Erro ao carregar setores", erro);
    }
  };

  // NOVO: Lógica para filtrar a lista de checkboxes
  const setoresFiltrados = setoresDisponiveis.filter(setor => 
    setor.nomeExibicao.toLowerCase().includes(buscaSetor.toLowerCase())
  );

  const mostrarAlerta = (tipo, titulo, mensagem) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem });
  };

  const fecharAlerta = () => {
    setAlerta({ ...alerta, visivel: false });
    if (alerta.tipo === 'sucesso' && alerta.titulo === 'Cadastro concluído!') {
      navigate('/home');
    }
  };

  const handleCheckboxChange = (id_setor) => {
    setSetoresSelecionados(prev => {
      if (prev.includes(id_setor)) {
        return prev.filter(id => id !== id_setor); 
      } else {
        return [...prev, id_setor]; 
      }
    });
  };

  // ==========================================
  // LÓGICA DE CRIAR E EDITAR SETORES
  // ==========================================
  const abrirModalNovoSetor = () => {
    setModalSetor({ visivel: true, isEdicao: false, id_setor: null, nome: '', id_setor_pai: '' });
  };

  const abrirModalEditarSetor = (setor) => {
    setModalSetor({ visivel: true, isEdicao: true, id_setor: setor.id_setor, nome: setor.nome, id_setor_pai: setor.id_setor_pai || '' });
  };

  const salvarSetor = async () => {
    if (!modalSetor.nome.trim()) {
      mostrarAlerta('erro', 'Atenção', 'O nome do setor é obrigatório.');
      return;
    }

    try {
      const payload = {
        nome: modalSetor.nome,
        id_setor_pai: modalSetor.id_setor_pai ? Number(modalSetor.id_setor_pai) : 0
      };

      const url = modalSetor.isEdicao ? `/api/setores/${modalSetor.id_setor}` : '/api/setores';
      const method = modalSetor.isEdicao ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setModalSetor({ visivel: false, isEdicao: false, id_setor: null, nome: '', id_setor_pai: '' });
        carregarSetores(); 
        mostrarAlerta('sucesso', 'Sucesso', `Setor ${modalSetor.isEdicao ? 'atualizado' : 'criado'} com sucesso!`);
      } else {
        const erroJson = await res.json().catch(() => ({}));
        mostrarAlerta('erro', 'Erro', erroJson.error || 'Não foi possível salvar o setor.');
      }
    } catch (erro) {
      mostrarAlerta('erro', 'Erro', 'Falha na conexão com o servidor.');
    }
  };

  // ==========================================
  // LÓGICA DE CADASTRO DE USUÁRIO
  // ==========================================
  const handleCadastro = async (e) => {
    e.preventDefault();
    
    if (setoresSelecionados.length === 0) {
      mostrarAlerta('erro', 'Atenção', 'Selecione pelo menos um setor para o usuário.');
      return;
    }
    
    try {
      const payload = { 
        nome, 
        email, 
        senha, 
        setores: setoresSelecionados 
      };

      const resposta = await fetchWithAuth('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (resposta.ok) {
        mostrarAlerta('sucesso', 'Cadastro concluído!', 'O usuário foi cadastrado com sucesso.');
        setNome(''); setEmail(''); setSenha(''); setSetoresSelecionados([]); setBuscaSetor('');
      } else {
        const erroData = await resposta.json().catch(() => ({}));
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
            {/* CABEÇALHO DA LISTA DE SETORES COM O BOTÃO DE CRIAR NOVO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ margin: 0 }}>Setores de Atuação</label>
              <button 
                type="button" 
                onClick={abrirModalNovoSetor}
                style={{ backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 'bold', color: '#334155', cursor: 'pointer' }}
              >
                ➕ Criar Setor
              </button>
            </div>

            {/* NOVA BARRA DE PESQUISA */}
            <input
              type="text"
              placeholder="🔍 Pesquisar setor..."
              value={buscaSetor}
              onChange={(e) => setBuscaSetor(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '8px 12px', 
                borderRadius: '6px', 
                border: '1px solid #cbd5e1', 
                marginBottom: '10px', 
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', maxHeight: '200px', overflowY: 'auto' }}>
              
              {setoresFiltrados.map(setor => (
                <div key={setor.id_setor} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal', color: '#555', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={setoresSelecionados.includes(setor.id_setor)}
                      onChange={() => handleCheckboxChange(setor.id_setor)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    {setor.nomeExibicao} 
                  </label>
                  
                  {/* BOTÃO DE EDITAR SETOR */}
                  <button 
                    type="button"
                    onClick={() => abrirModalEditarSetor(setor)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', opacity: 0.6 }}
                    title="Editar nome ou hierarquia deste setor"
                  >
                    ✏️
                  </button>
                </div>
              ))}
              
              {setoresFiltrados.length === 0 && setoresDisponiveis.length > 0 && (
                <span style={{ fontSize: '0.9rem', color: '#888', textAlign: 'center', padding: '10px 0' }}>Nenhum setor encontrado para a busca.</span>
              )}

              {setoresDisponiveis.length === 0 && (
                <span style={{ fontSize: '0.9rem', color: '#888', textAlign: 'center', padding: '10px 0' }}>Nenhum setor cadastrado. Crie um acima!</span>
              )}
            </div>
          </div>

          <div className="botoes-acao">
            <button type="button" className="btn-voltar" onClick={() => navigate('/home')}>
              Voltar
            </button>
            <button type="submit" className="btn-salvar">
              Cadastrar Usuário
            </button>
          </div>
        </form>
      </div>

      {/* ========================================================= */}
      {/* MODAL PARA CRIAR/EDITAR SETOR (Reaproveitando o estilo) */}
      {/* ========================================================= */}
      {modalSetor.visivel && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'left' }}>
            <h3 style={{ marginBottom: '15px', color: '#1e293b' }}>
              {modalSetor.isEdicao ? 'Editar Setor' : 'Novo Setor'}
            </h3>
            
            <div className="input-group" style={{ marginBottom: '15px' }}>
              <label>Nome do Setor</label>
              <input 
                type="text" 
                value={modalSetor.nome} 
                onChange={(e) => setModalSetor({ ...modalSetor, nome: e.target.value })}
                placeholder="Ex: TI, Manutenção..."
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label>Pertence a qual Setor? (Pai)</label>
              <select 
                value={modalSetor.id_setor_pai} 
                onChange={(e) => setModalSetor({ ...modalSetor, id_setor_pai: e.target.value })}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
              >
                <option value="">Nenhum (Setor Principal)</option>
                {setoresDisponiveis
                  // Evita que um setor seja pai dele mesmo na hora de editar
                  .filter(s => s.id_setor !== modalSetor.id_setor)
                  .map(s => (
                    <option key={s.id_setor} value={s.id_setor}>
                      {s.nomeExibicao}
                    </option>
                  ))
                }
              </select>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button"
                className="btn-voltar" 
                style={{ flex: 1, padding: '10px', margin: 0 }} 
                onClick={() => setModalSetor({ ...modalSetor, visivel: false })}
              >
                Cancelar
              </button>
              <button 
                type="button"
                className="btn-salvar" 
                style={{ flex: 1, padding: '10px', margin: 0 }} 
                onClick={salvarSetor}
              >
                Salvar Setor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE ALERTAS GERAIS */}
      {/* ========================================================= */}
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