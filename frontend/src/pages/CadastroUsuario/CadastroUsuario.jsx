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
  
  const [buscaSetor, setBuscaSetor] = useState('');
  const [gruposExpandidos, setGruposExpandidos] = useState({});
  
  // Estados para a sanfona de dentro do Modal de Criar/Editar Setor
  const [buscaSetorPai, setBuscaSetorPai] = useState('');
  const [gruposExpandidosPai, setGruposExpandidosPai] = useState({});

  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const [modalSetor, setModalSetor] = useState({ visivel: false, isEdicao: false, id_setor: null, nome: '', id_setor_pai: '' });

  const navigate = useNavigate();

  useEffect(() => {
    carregarSetores();
  }, []);

  // ==========================================
  // LÓGICA BLINDADA: SETOR PAI > FILHO
  // ==========================================
  const construirNomeSetor = (setorAtual, listaCompleta) => {
    if (!setorAtual.id_setor_pai || String(setorAtual.id_setor_pai) === '0') {
      return setorAtual.nome; 
    }
    
    const setorPai = listaCompleta.find(s => String(s.id_setor) === String(setorAtual.id_setor_pai));
    
    if (setorPai && String(setorPai.id_setor) !== String(setorAtual.id_setor)) {
      const nomeDoPai = construirNomeSetor(setorPai, listaCompleta);
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

  // ==========================================
  // AGRUPAMENTO PARA A TELA PRINCIPAL (CHECKBOXES)
  // ==========================================
  const setoresFiltrados = setoresDisponiveis.filter(setor => 
    setor.nomeExibicao.toLowerCase().includes(buscaSetor.toLowerCase())
  );

  const setoresAgrupados = setoresFiltrados.reduce((acc, setor) => {
    const partes = setor.nomeExibicao.split(' > ');
    const pai = partes[0];
    if (!acc[pai]) acc[pai] = [];
    acc[pai].push(setor);
    return acc;
  }, {});

  const toggleGrupo = (nomePai) => {
    setGruposExpandidos(prev => ({ ...prev, [nomePai]: !prev[nomePai] }));
  };

  // ==========================================
  // AGRUPAMENTO PARA O MODAL DE SETOR (RADIO BUTTONS)
  // ==========================================
  const setoresFiltradosPai = setoresDisponiveis
    .filter(s => String(s.id_setor) !== String(modalSetor.id_setor)) // Evita que ele seja pai dele mesmo
    .filter(setor => setor.nomeExibicao.toLowerCase().includes(buscaSetorPai.toLowerCase()));

  const setoresAgrupadosPai = setoresFiltradosPai.reduce((acc, setor) => {
    const partes = setor.nomeExibicao.split(' > ');
    const pai = partes[0];
    if (!acc[pai]) acc[pai] = [];
    acc[pai].push(setor);
    return acc;
  }, {});

  const toggleGrupoPai = (nomePai) => {
    setGruposExpandidosPai(prev => ({ ...prev, [nomePai]: !prev[nomePai] }));
  };

  // ==========================================
  // UTILITÁRIOS E ALERTAS
  // ==========================================
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

  const getAdminHeader = () => {
    const usuarioStorage = localStorage.getItem('usuarioLogado');
    const usuarioLogado = usuarioStorage ? JSON.parse(usuarioStorage) : null;
    const isAdmin = usuarioLogado?.setores?.some(s => String(s).toLowerCase() === 'admin');
    return isAdmin ? 'admin' : JSON.stringify(usuarioLogado?.setores_ids || []);
  };

  // ==========================================
  // LÓGICA DE CRIAR E EDITAR SETORES
  // ==========================================
  const abrirModalNovoSetor = () => {
    setBuscaSetorPai('');
    setGruposExpandidosPai({});
    setModalSetor({ visivel: true, isEdicao: false, id_setor: null, nome: '', id_setor_pai: '' });
  };

  const abrirModalEditarSetor = (setor) => {
    setBuscaSetorPai('');
    setGruposExpandidosPai({});
    setModalSetor({ visivel: true, isEdicao: true, id_setor: setor.id_setor, nome: setor.nome, id_setor_pai: setor.id_setor_pai || '' });
  };

  const salvarSetor = async () => {
    if (!modalSetor.nome.trim()) {
      mostrarAlerta('erro', 'Atenção', 'O nome do setor é obrigatório.');
      return;
    }

    try {
      // ⚠️ MUDANÇA IMPORTANTE: Envia null para o backend se não houver id_setor_pai
      const payload = {
        nome: modalSetor.nome,
        id_setor_pai: modalSetor.id_setor_pai ? Number(modalSetor.id_setor_pai) : null
      };

      const url = modalSetor.isEdicao ? `/api/setores/${modalSetor.id_setor}` : '/api/setores';
      const method = modalSetor.isEdicao ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-setor-usuario': getAdminHeader() 
        },
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
        headers: { 
          'Content-Type': 'application/json',
          'x-setor-usuario': getAdminHeader() 
        },
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
            <input type="text" id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do usuário" required />
          </div>

          <div className="input-group">
            <label htmlFor="email">E-mail</label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@empresa.com.br" required />
          </div>

          <div className="input-group">
            <label htmlFor="senha">Senha</label>
            <input type="password" id="senha" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Crie uma senha" required />
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ margin: 0 }}>Setores de Atuação</label>
              <button type="button" onClick={abrirModalNovoSetor} style={{ backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem', fontWeight: 'bold', color: '#334155', cursor: 'pointer' }}>
                ➕ Criar Setor
              </button>
            </div>

            <input type="text" placeholder="🔍 Pesquisar setor..." value={buscaSetor} onChange={(e) => setBuscaSetor(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '10px', fontSize: '0.85rem', boxSizing: 'border-box' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', maxHeight: '350px', overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
              
              {Object.keys(setoresAgrupados).length > 0 ? (
                Object.entries(setoresAgrupados).map(([nomePai, listaSetores]) => {
                  const pai = listaSetores.find(s => s.nomeExibicao === nomePai);
                  const filhos = listaSetores.filter(s => s.nomeExibicao !== nomePai);
                  const isExpandido = gruposExpandidos[nomePai] || buscaSetor.length > 0;

                  return (
                    <div key={nomePai} style={{ flexShrink: 0, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'white' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '8px 12px' }}>
                        {pai ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#334155', fontSize: '0.85rem', flex: 1, margin: 0 }}>
                            <input type="checkbox" checked={setoresSelecionados.includes(pai.id_setor)} onChange={() => handleCheckboxChange(pai.id_setor)} style={{ width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0, margin: 0 }} />
                            {pai.nomeExibicao}
                          </label>
                        ) : (
                          <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.85rem', flex: 1 }}>{nomePai} (Subsetores encontrados)</span>
                        )}

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {pai && (
                            <button type="button" onClick={() => abrirModalEditarSetor(pai)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.6, padding: 0 }} title="Editar setor pai">✏️</button>
                          )}
                          {filhos.length > 0 && (
                            <button type="button" onClick={() => toggleGrupo(nomePai)} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem', color: '#0284c7', fontWeight: 'bold', transition: '0.2s' }}>
                              {isExpandido ? '▲ Ocultar' : '▼ Ver subsetores'}
                            </button>
                          )}
                        </div>
                      </div>

                      {isExpandido && filhos.length > 0 && (
                        <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #cbd5e1' }}>
                          {filhos.map(filho => (
                            <div key={filho.id_setor} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '24px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal', color: '#555', fontSize: '0.85rem', flex: 1, margin: 0 }}>
                                <input type="checkbox" checked={setoresSelecionados.includes(filho.id_setor)} onChange={() => handleCheckboxChange(filho.id_setor)} style={{ width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0, margin: 0 }} />
                                {filho.nomeExibicao.replace(`${nomePai} > `, '↳ ')} 
                              </label>
                              <button type="button" onClick={() => abrirModalEditarSetor(filho)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', opacity: 0.6, padding: 0 }} title="Editar subsetor">✏️</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <span style={{ fontSize: '0.85rem', color: '#888', textAlign: 'center', padding: '10px 0' }}>
                  {setoresDisponiveis.length === 0 ? 'Nenhum setor cadastrado. Crie um acima!' : 'Nenhum setor encontrado para a busca.'}
                </span>
              )}
            </div>
          </div>

          <div className="botoes-acao">
            <button type="button" className="btn-voltar" onClick={() => navigate('/home')}>Voltar</button>
            <button type="submit" className="btn-salvar">Cadastrar Usuário</button>
          </div>
        </form>
      </div>

      {/* ========================================================= */}
      {/* MODAL PARA CRIAR/EDITAR SETOR */}
      {/* ========================================================= */}
      {modalSetor.visivel && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', textAlign: 'left' }}>
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
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label>Pertence a qual Setor? (Pai)</label>

              <input 
                type="text" 
                placeholder="🔍 Pesquisar setor pai..." 
                value={buscaSetorPai} 
                onChange={(e) => setBuscaSetorPai(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '10px', fontSize: '0.85rem', boxSizing: 'border-box' }} 
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', maxHeight: '220px', overflowY: 'auto', flexShrink: 0, WebkitOverflowScrolling: 'touch' }}>
                
                {/* 🌟 MUDANÇA: OPÇÃO DE SETOR PRINCIPAL DISCRETA */}
                <div style={{ flexShrink: 0, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '10px 12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#334155', fontSize: '0.85rem', flex: 1, margin: 0 }}>
                      <input 
                        type="radio" 
                        name="setorPaiModal" 
                        value="" 
                        checked={modalSetor.id_setor_pai === '' || modalSetor.id_setor_pai === null} 
                        onChange={() => setModalSetor({ ...modalSetor, id_setor_pai: '' })} 
                        style={{ width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0, margin: 0 }} 
                      />
                      Nenhum (Criar como Setor Principal)
                    </label>
                  </div>
                </div>

                {/* SANFONA DOS SETORES EXISTENTES */}
                {Object.keys(setoresAgrupadosPai).length > 0 ? (
                  Object.entries(setoresAgrupadosPai).map(([nomePai, listaSetores]) => {
                    const pai = listaSetores.find(s => s.nomeExibicao === nomePai);
                    const filhos = listaSetores.filter(s => s.nomeExibicao !== nomePai);
                    const isExpandido = gruposExpandidosPai[nomePai] || buscaSetorPai.length > 0;

                    return (
                      <div key={nomePai} style={{ flexShrink: 0, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '8px 12px' }}>
                          {pai ? (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#334155', fontSize: '0.85rem', flex: 1, margin: 0 }}>
                              <input 
                                type="radio" 
                                name="setorPaiModal" 
                                value={pai.id_setor} 
                                checked={String(modalSetor.id_setor_pai) === String(pai.id_setor)} 
                                onChange={(e) => setModalSetor({ ...modalSetor, id_setor_pai: e.target.value })} 
                                style={{ width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0, margin: 0 }} 
                              />
                              {pai.nomeExibicao}
                            </label>
                          ) : (
                            <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.85rem', flex: 1 }}>{nomePai} (Subsetores)</span>
                          )}

                          {filhos.length > 0 && (
                            <button type="button" onClick={() => toggleGrupoPai(nomePai)} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem', color: '#0284c7', fontWeight: 'bold' }}>
                              {isExpandido ? '▲ Ocultar' : '▼ Ver subsetores'}
                            </button>
                          )}
                        </div>

                        {isExpandido && filhos.length > 0 && (
                          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #cbd5e1' }}>
                            {filhos.map(filho => (
                              <label key={filho.id_setor} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal', color: '#555', paddingLeft: '24px', fontSize: '0.85rem', margin: 0 }}>
                                <input 
                                  type="radio" 
                                  name="setorPaiModal" 
                                  value={filho.id_setor} 
                                  checked={String(modalSetor.id_setor_pai) === String(filho.id_setor)} 
                                  onChange={(e) => setModalSetor({ ...modalSetor, id_setor_pai: e.target.value })} 
                                  style={{ width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0, margin: 0 }} 
                                />
                                {filho.nomeExibicao.replace(`${nomePai} > `, '↳ ')} 
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <span style={{ fontSize: '0.85rem', color: '#888', textAlign: 'center', padding: '10px 0' }}>
                    Apenas os setores acima foram encontrados.
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn-voltar" style={{ flex: 1, padding: '10px', margin: 0 }} onClick={() => setModalSetor({ ...modalSetor, visivel: false })}>Cancelar</button>
              <button type="button" className="btn-salvar" style={{ flex: 1, padding: '10px', margin: 0 }} onClick={salvarSetor}>Salvar Setor</button>
            </div>
          </div>
        </div>
      )}

      {alerta.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            {alerta.tipo === 'sucesso' ? '✅' : '⚠️'}
            <h3 className={alerta.tipo === 'erro' ? 'texto-erro' : 'texto-sucesso'}>{alerta.titulo}</h3>
            <p>{alerta.mensagem}</p>
            <button className="modal-button" onClick={fecharAlerta}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}