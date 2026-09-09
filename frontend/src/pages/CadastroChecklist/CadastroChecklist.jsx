import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; 
import './CadastroChecklist.css';

export default function CadastroChecklist() {
  const [titulo, setTitulo] = useState('');
  const [idSetor, setIdSetor] = useState(''); 
  const [ativo, setAtivo] = useState(true);
  
  const [itens, setItens] = useState([
    { descricao: '', tipo: 'booleano', obrigatorio: true, imagem: null, preview: null }
  ]);
  
  const [setoresDisponiveis, setSetoresDisponiveis] = useState([]);
  const [buscaSetor, setBuscaSetor] = useState('');
  const [gruposExpandidos, setGruposExpandidos] = useState({});
  
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const [imagemAmpliada, setImagemAmpliada] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    carregarSetores();
  }, []);

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
    setGruposExpandidos(prev => ({
      ...prev,
      [nomePai]: !prev[nomePai]
    }));
  };

  const mostrarAlerta = (tipo, titulo, mensagem) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem });
  };

  const fecharAlerta = () => {
    setAlerta({ ...alerta, visivel: false });
    if (alerta.tipo === 'sucesso') navigate('/home');
  };

  const adicionarItem = () => {
    setItens([...itens, { descricao: '', tipo: 'booleano', obrigatorio: true, imagem: null, preview: null }]);
  };

  const removerItem = (indexParaRemover) => {
    if (itens.length === 1) {
      mostrarAlerta('erro', 'Atenção', 'O checklist precisa ter pelo menos um item.');
      return;
    }
    const novosItens = itens.filter((_, index) => index !== indexParaRemover);
    setItens(novosItens);
  };

  const atualizarItem = (index, campo, valor) => {
    const novosItens = [...itens];
    novosItens[index][campo] = valor;
    setItens(novosItens);
  };

  const handleImagemChange = (index, e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
      const novosItens = [...itens];
      novosItens[index].imagem = arquivo;
      novosItens[index].preview = URL.createObjectURL(arquivo);
      setItens(novosItens);
    }
  };

  const getAdminHeader = () => {
    const usuarioStorage = localStorage.getItem('usuarioLogado');
    const usuarioLogado = usuarioStorage ? JSON.parse(usuarioStorage) : null;
    const isAdmin = usuarioLogado?.setores?.some(s => String(s).toLowerCase() === 'admin');
    return isAdmin ? 'admin' : JSON.stringify(usuarioLogado?.setores_ids || []);
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    
    if (!idSetor) {
      mostrarAlerta('erro', 'Atenção', 'Você precisa selecionar um setor responsável.');
      return;
    }
    
    const payloadPrincipal = {
      titulo,
      id_setor: Number(idSetor),
      ativo,
      itens: itens.map((item, index) => ({
        ordem: index + 1,
        descricao: item.descricao,
        tipo: item.tipo,
        obrigatorio: item.obrigatorio
      }))
    };

    try {
      const resposta = await fetchWithAuth('/api/checklists', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-setor-usuario': getAdminHeader()
        },
        body: JSON.stringify(payloadPrincipal)
      });

      if (resposta.ok) {
        const resultadoJson = await resposta.json();
        const itensSalvos = resultadoJson.data?.checklist?.itens || resultadoJson.data?.itens || [];

        for (let index = 0; index < itens.length; index++) {
          const itemAtual = itens[index];
          if (itemAtual.imagem) {
            const itemSalvoCorrespondente = itensSalvos[index] || itensSalvos.find(i => i.ordem === index + 1);
            if (itemSalvoCorrespondente && itemSalvoCorrespondente.id_item) {
              const formDataImagem = new FormData();
              formDataImagem.append('imagem', itemAtual.imagem);
              await fetchWithAuth(`/api/checklists/itens/${itemSalvoCorrespondente.id_item}/referencia`, {
                method: 'POST',
                headers: { 'x-setor-usuario': getAdminHeader() },
                body: formDataImagem
              });
            }
          }
        }
        mostrarAlerta('sucesso', 'Checklist Criado!', 'O novo checklist foi salvo com sucesso.');
      } else {
        const erroData = await resposta.json();
        mostrarAlerta('erro', 'Erro ao salvar', erroData.error || 'Verifique os dados e tente novamente.');
      }
    } catch (erro) {
      console.error('Erro ao cadastrar checklist:', erro);
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  return (
    <div className="cadastro-checklist-container">
      <div className="cadastro-checklist-card" style={{ maxWidth: '800px' }}>
        <h2>Criar Novo Checklist</h2>
        <p>Defina o título, o setor, adicione os itens de verificação e imagens de referência.</p>
        
        <form onSubmit={handleCadastro} className="checklist-form-container">
          <div className="dados-principais">
            
            <div className="input-group">
              <label htmlFor="titulo">Título do Checklist</label>
              <input
                type="text"
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Inspeção da Máquina X"
                required
              />
            </div>

            {/* SELETOR DE SETOR COM SANFONA */}
            <div className="input-group">
              <label>Setor Responsável</label>
              
              <input
                type="text"
                placeholder="🔍 Pesquisar setor..."
                value={buscaSetor}
                onChange={(e) => setBuscaSetor(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '10px', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', maxHeight: '300px', overflowY: 'auto' }}>
                {Object.keys(setoresAgrupados).length > 0 ? (
                  Object.entries(setoresAgrupados).map(([nomePai, listaSetores]) => {
                    const pai = listaSetores.find(s => s.nomeExibicao === nomePai);
                    const filhos = listaSetores.filter(s => s.nomeExibicao !== nomePai);
                    const isExpandido = gruposExpandidos[nomePai] || buscaSetor.length > 0;

                    return (
                      <div key={nomePai} style={{ flexShrink: 0, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'white' }}>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '8px 12px' }}>
                          {pai ? (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#334155', flex: 1 }}>
                              <input
                                type="radio"
                                name="setorSelecionado"
                                value={pai.id_setor}
                                checked={String(idSetor) === String(pai.id_setor)}
                                onChange={(e) => setIdSetor(e.target.value)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                              />
                              {pai.nomeExibicao}
                            </label>
                          ) : (
                            <span style={{ fontWeight: 'bold', color: '#334155', flex: 1 }}>{nomePai}</span>
                          )}

                          {filhos.length > 0 && (
                            <button 
                              type="button"
                              onClick={() => toggleGrupo(nomePai)}
                              style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.8rem', color: '#0284c7', fontWeight: 'bold' }}
                            >
                              {isExpandido ? '▲ Ocultar' : '▼ Ver subsetores'}
                            </button>
                          )}
                        </div>

                        {isExpandido && filhos.length > 0 && (
                          <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #cbd5e1' }}>
                            {filhos.map(filho => (
                              <label key={filho.id_setor} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal', color: '#555', paddingLeft: '24px' }}>
                                <input
                                  type="radio"
                                  name="setorSelecionado"
                                  value={filho.id_setor}
                                  checked={String(idSetor) === String(filho.id_setor)}
                                  onChange={(e) => setIdSetor(e.target.value)}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
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
                  <span style={{ fontSize: '0.9rem', color: '#888', textAlign: 'center', padding: '10px 0' }}>Nenhum setor encontrado.</span>
                )}
              </div>
            </div>

            <div className="checkbox-group" style={{ marginTop: '1rem' }}>
              <input
                type="checkbox"
                id="ativo"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
              />
              <label htmlFor="ativo" style={{ fontWeight: 'bold' }}>Checklist Ativo</label>
            </div>
          </div>

          <div className="itens-section">
            <h3>Itens de Verificação</h3>
            {itens.map((item, index) => (
              <div key={index} className="item-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem', backgroundColor: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span className="item-ordem" style={{ fontWeight: 'bold' }}>#{index + 1}</span>
                  <div className="item-inputs" style={{ display: 'flex', gap: '0.8rem', flex: 1, flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={(e) => atualizarItem(index, 'descricao', e.target.value)}
                      placeholder="Descrição da tarefa/pergunta"
                      required
                      className="input-descricao"
                      style={{ flex: 2, minWidth: '200px', padding: '0.5rem' }}
                    />
                    <select
                      value={item.tipo}
                      onChange={(e) => atualizarItem(index, 'tipo', e.target.value)}
                      className="select-tipo"
                      style={{ padding: '0.5rem' }}
                    >
                      <option value="booleano">Sim / Não</option>
                      <option value="texto">Texto Livre</option>
                      <option value="numero">Número</option>
                    </select>
                    <label className="checkbox-obrigatorio" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={item.obrigatorio}
                        onChange={(e) => atualizarItem(index, 'obrigatorio', e.target.checked)}
                      />
                      Obrigatório
                    </label>
                  </div>
                  <button 
                    type="button" 
                    className="btn-remover-item" 
                    onClick={() => removerItem(index)}
                    title="Remover Item"
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}
                  >
                    ✖
                  </button>
                </div>

                <div className="upload-item-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', paddingLeft: '1.8rem' }}>
                  <label htmlFor={`file-input-${index}`} style={{ cursor: 'pointer', backgroundColor: '#e2e8f0', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500', color: '#334155' }}>
                    📷 {item.imagem ? 'Trocar Imagem' : 'Adicionar Imagem de Referência'}
                  </label>
                  <input
                    id={`file-input-${index}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImagemChange(index, e)}
                    style={{ display: 'none' }}
                  />

                  {item.preview && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img 
                        src={item.preview} 
                        alt="Preview" 
                        title="Clique para ampliar"
                        onClick={() => setImagemAmpliada(item.preview)}
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'transform 0.2s' }} 
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                      />
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.imagem?.name}</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          const novosItens = [...itens];
                          novosItens[index].imagem = null;
                          novosItens[index].preview = null;
                          setItens(novosItens);
                        }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            <button type="button" className="btn-adicionar-item" onClick={adicionarItem} style={{ marginTop: '0.5rem' }}>
              + Adicionar Novo Item
            </button>
          </div>

          <div className="botoes-acao" style={{ marginTop: '2rem' }}>
            <button type="button" className="btn-voltar" onClick={() => navigate('/home')}>
              Voltar
            </button>
            <button type="submit" className="btn-salvar">
              Salvar Checklist
            </button>
          </div>
        </form>
      </div>

      {imagemAmpliada && (
        <div 
          onClick={() => setImagemAmpliada(null)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 2000, cursor: 'pointer', padding: '2rem'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
            <img 
              src={imagemAmpliada} 
              alt="Imagem Ampliada" 
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'block', margin: '0 auto' }} 
            />
            <button 
              onClick={() => setImagemAmpliada(null)}
              style={{
                position: 'absolute', top: '-15px', right: '-15px', backgroundColor: '#ef4444',
                color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px',
                fontSize: '1.2rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

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