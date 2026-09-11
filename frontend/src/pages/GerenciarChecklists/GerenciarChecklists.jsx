import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; 
import './GerenciarChecklists.css';

export default function GerenciarChecklists() {
  const [idBusca, setIdBusca] = useState('');
  const [checklist, setChecklist] = useState(null);
  const [editando, setEditando] = useState(false);
  
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoIdSetor, setNovoIdSetor] = useState('');
  const [novosItens, setNovosItens] = useState([]);
  
  const [listaChecklists, setListaChecklists] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [setorFiltro, setSetorFiltro] = useState('');
  
  // ESTADO PARA OS SETORES
  const [setoresDisponiveis, setSetoresDisponiveis] = useState([]);
  const [buscaSetorEdit, setBuscaSetorEdit] = useState('');
  const [gruposExpandidos, setGruposExpandidos] = useState({});

  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const [imagemAmpliada, setImagemAmpliada] = useState(null);
  const navigate = useNavigate();

  const mostrarAlerta = (tipo, titulo, mensagem) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem });
  };
  const fecharAlerta = () => setAlerta({ ...alerta, visivel: false });

  useEffect(() => {
    carregarSetores();
  }, []);

  useEffect(() => {
    if (setoresDisponiveis.length > 0) {
      carregarLista();
    }
  }, [page, setorFiltro, setoresDisponiveis]);

  // ==========================================
  // LÓGICA BLINDADA: NOME DO SETOR E CASCATA
  // ==========================================
  const construirNomeSetor = (setorAtual, todosSetores) => {
    if (!setorAtual.id_setor_pai || String(setorAtual.id_setor_pai) === '0') return setorAtual.nome; 
    
    const setorPai = todosSetores.find(s => String(s.id_setor) === String(setorAtual.id_setor_pai));
    
    if (setorPai && String(setorPai.id_setor) !== String(setorAtual.id_setor)) {
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
        const formatados = setoresBrutos.map(s => ({ ...s, nomeExibicao: construirNomeSetor(s, setoresBrutos) }));
        formatados.sort((a, b) => a.nomeExibicao.localeCompare(b.nomeExibicao));
        setSetoresDisponiveis(formatados);
      }
    } catch (erro) {
      console.error("Erro ao carregar setores", erro);
    }
  };

  const pegarIdsCascata = (idPaiSelecionado) => {
    let idsPermitidos = new Set([Number(idPaiSelecionado)]);
    let adicionouNovo = true;
    
    while(adicionouNovo) {
      adicionouNovo = false;
      setoresDisponiveis.forEach(s => {
        if (s.id_setor_pai && idsPermitidos.has(Number(s.id_setor_pai)) && !idsPermitidos.has(Number(s.id_setor))) {
          idsPermitidos.add(Number(s.id_setor));
          adicionouNovo = true;
        }
      });
    }
    return Array.from(idsPermitidos);
  };

  const carregarLista = async () => {
    try {
      if (!setorFiltro) {
        const resposta = await fetchWithAuth(`/api/checklists?page=${page}&limit=5`);
        if (resposta.ok) {
          const json = await resposta.json();
          setListaChecklists(json.data || []);
          setTotalPages(json.totalPages || 1);
        }
      } else {
        const idsCascata = pegarIdsCascata(setorFiltro);
        const promessas = idsCascata.map(id => fetchWithAuth(`/api/checklists?id_setor=${id}&limit=100`));
        const respostasFetch = await Promise.all(promessas);
        
        let checklistsUnidos = [];
        for (const res of respostasFetch) {
          if (res.ok) {
            const json = await res.json();
            const dados = json.data || [];
            checklistsUnidos = [...checklistsUnidos, ...dados];
          }
        }
        
        const checklistsUnicos = Array.from(new Map(checklistsUnidos.map(item => [item.id_checklist, item])).values());
        
        const limit = 5;
        const totalPaginasCalc = Math.ceil(checklistsUnicos.length / limit) || 1;
        setTotalPages(totalPaginasCalc);

        const indexInicio = (page - 1) * limit;
        const checklistsPaginados = checklistsUnicos.slice(indexInicio, indexInicio + limit);
        
        setListaChecklists(checklistsPaginados);
      }
    } catch (erro) {
      console.error('Erro ao buscar a lista:', erro);
    }
  };

  const handleFiltroChange = (e) => {
    setSetorFiltro(e.target.value);
    setPage(1); 
  };

  const formatarData = (dataIso) => {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleDateString('pt-BR');
  };

  const buscarChecklistPorId = async (id) => {
    if (!id) return;
    try {
      const resposta = await fetchWithAuth(`/api/checklists/${id}`);
      if (resposta.ok) {
        const json = await resposta.json();
        const dados = json.data || json;
        setChecklist(dados);
        setNovoTitulo(dados.titulo);
        setNovoIdSetor(dados.id_setor || '');
        setBuscaSetorEdit(''); // Limpa a busca ao abrir a edição
        setGruposExpandidos({}); // Fecha a sanfona ao abrir a edição
        
        const itensCompletos = (dados.itens || []).map(item => ({
          ...item,
          imagem_url: item.imagem_url || item.imagem_referencia || '',
          novaFotoBase64: null,
          novaFotoArquivo: null
        }));
        
        setNovosItens(itensCompletos);
        setIdBusca(id);
        setEditando(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        mostrarAlerta('erro', 'Não encontrado', 'Checklist não encontrado.');
        setChecklist(null);
      }
    } catch (erro) {
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  const handleBuscar = (e) => {
    e.preventDefault();
    buscarChecklistPorId(idBusca);
  };

  const handleItemChange = (index, campo, valor) => {
    const itensAtualizados = [...novosItens];
    itensAtualizados[index][campo] = valor;
    setNovosItens(itensAtualizados);
  };

  const comprimirImagemEGerarBase64 = (arquivo) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(arquivo);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 640; 
          const MAX_HEIGHT = 640;
          let width = img.width;
          let height = img.height;
          if (width > height) { if (width > MAX_WIDTH) { height = Math.round((height *= MAX_WIDTH / width)); width = MAX_WIDTH; }
          } else { if (height > MAX_HEIGHT) { width = Math.round((width *= MAX_HEIGHT / height)); height = MAX_HEIGHT; } }
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  const base64ToBlob = (base64) => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); }
    return new Blob([new Uint8Array(byteNumbers)], { type: 'image/jpeg' });
  };

  const handleFotoItemChange = async (index, e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
      const fotoLeveBase64 = await comprimirImagemEGerarBase64(arquivo);
      const itensAtualizados = [...novosItens];
      itensAtualizados[index].novaFotoBase64 = fotoLeveBase64;
      itensAtualizados[index].novaFotoArquivo = arquivo;
      setNovosItens(itensAtualizados);
    }
  };

  const handleAdicionarItem = () => {
    setNovosItens([...novosItens, { ordem: novosItens.length + 1, descricao: '', tipo: 'booleano', obrigatorio: true, imagem_url: '', novaFotoBase64: null, novaFotoArquivo: null }]);
  };

  const handleRemoverItem = (index) => {
    const itensFiltrados = novosItens.filter((_, i) => i !== index);
    const itensReordenados = itensFiltrados.map((item, idx) => ({ ...item, ordem: idx + 1 }));
    setNovosItens(itensReordenados);
  };

  const handleSalvarEdicaoCompleta = async () => {
    try {
      const usuarioString = localStorage.getItem('usuarioLogado') || '{}';
      const usuarioSalvo = JSON.parse(usuarioString);
      
      const isAdmin = usuarioSalvo.setores?.some(s => String(s).toLowerCase() === 'admin');
      const setorUsuarioHeader = isAdmin ? 'admin' : JSON.stringify(usuarioSalvo.setores_ids || []);

      const payloadCompleto = {
        titulo: novoTitulo,
        id_setor: Number(novoIdSetor),
        itens: novosItens.map((item, idx) => ({
          ordem: idx + 1,
          descricao: item.descricao,
          tipo: item.tipo || 'booleano',
          obrigatorio: Boolean(item.obrigatorio),
          imagem_url: item.imagem_url 
        }))
      };

      const resposta = await fetchWithAuth(`/api/checklists/${checklist.id_checklist}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-setor-usuario': setorUsuarioHeader
        },
        body: JSON.stringify(payloadCompleto)
      });

      if (resposta.ok) {
        const json = await resposta.json();
        const novoIdReal = json.data?.id_checklist || checklist.id_checklist;
        const itensRetornados = json.data?.itens || [];

        for (let i = 0; i < novosItens.length; i++) {
          const itemAtual = novosItens[i];
          if (itemAtual.novaFotoBase64 && itemAtual.novaFotoArquivo) {
            const itemSalvoMatch = itensRetornados.find(r => r.ordem === itemAtual.ordem);
            const idItemAlvo = itemSalvoMatch?.id_item;

            if (idItemAlvo) {
              const formDataFoto = new FormData();
              const arquivoBlob = base64ToBlob(itemAtual.novaFotoBase64);
              formDataFoto.append('imagem', arquivoBlob, itemAtual.novaFotoArquivo.name || `ref_${idItemAlvo}.jpg`);
              try {
                await fetchWithAuth(`/api/checklists/itens/${idItemAlvo}/referencia`, { method: 'POST', body: formDataFoto });
              } catch (errFoto) {
                console.error("Erro na imagem:", errFoto);
              }
            }
          }
        }
        mostrarAlerta('sucesso', 'Sucesso!', json.data?.mensagem || 'Checklist atualizado com sucesso!');
        setEditando(false);
        carregarLista();
        buscarChecklistPorId(novoIdReal);
      } else {
        const erroJson = await resposta.json().catch(() => ({}));
        mostrarAlerta('erro', 'Erro', erroJson.message || 'Não foi possível atualizar o checklist.');
      }
    } catch (erro) {
      console.error('Erro ao atualizar:', erro);
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  const handleInativar = async () => {
    const confirmar = window.confirm("Tem certeza que deseja inativar este checklist?");
    if (!confirmar) return;
    try {
      const resposta = await fetchWithAuth(`/api/checklists/${checklist.id_checklist}`, { method: 'DELETE' });
      if (resposta.ok) {
        mostrarAlerta('sucesso', 'Inativado!', 'O checklist foi inativado.');
        setChecklist({ ...checklist, ativo: false });
        carregarLista(); 
      } else {
        mostrarAlerta('erro', 'Erro', 'Não foi possível inativar o checklist.');
      }
    } catch (erro) {
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  const getNomeSetor = (idSetor) => {
    const setor = setoresDisponiveis.find(s => String(s.id_setor) === String(idSetor));
    return setor ? setor.nomeExibicao : `Setor ID: ${idSetor}`;
  };

  // ==========================================
  // LÓGICA DE AGRUPAMENTO (SANFONA)
  // ==========================================
  const setoresFiltradosEdicao = setoresDisponiveis.filter(setor => 
    setor.nomeExibicao.toLowerCase().includes(buscaSetorEdit.toLowerCase())
  );

  const setoresAgrupadosEdicao = setoresFiltradosEdicao.reduce((acc, setor) => {
    const partes = setor.nomeExibicao.split(' > ');
    const pai = partes[0];
    if (!acc[pai]) acc[pai] = [];
    acc[pai].push(setor);
    return acc;
  }, {});

  const toggleGrupoEdicao = (nomePai) => {
    setGruposExpandidos(prev => ({
      ...prev,
      [nomePai]: !prev[nomePai]
    }));
  };

  return (
    <div className="gerenciar-container">
      <div className="gerenciar-card" style={{ maxWidth: '950px' }}>
        <h2>Gerenciar Checklists</h2>
        <p>Busque um ID para editar, ou selecione na lista abaixo.</p>

        <form onSubmit={handleBuscar} className="busca-form">
          <input type="number" value={idBusca} onChange={(e) => setIdBusca(e.target.value)} placeholder="Digite o ID do Checklist" className="input-busca" />
          <button type="submit" className="btn-buscar">Buscar</button>
        </form>

        {checklist && (
          <div className="checklist-detalhes">
            <div className="status-badge" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Status: <span className={checklist.ativo ? 'ativo' : 'inativo'}>{checklist.ativo ? 'ATIVO' : 'INATIVO'}</span></span>
              <button onClick={() => navigate(`/checklists/historico/${checklist.id_checklist}`)} style={{ backgroundColor: '#475569', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}>📜 Ver Histórico</button>
            </div>

            {editando ? (
              <div className="bloco-edicao-completa">
                <h3>Editando Checklist</h3>
                
                <div className="form-group-edicao">
                  <label>Título:</label>
                  <input type="text" value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} className="input-editar-titulo" />
                </div>

                <div className="form-group-edicao">
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Setor Responsável:</label>
                  
                  <input
                    type="text"
                    placeholder="🔍 Pesquisar setor..."
                    value={buscaSetorEdit}
                    onChange={(e) => setBuscaSetorEdit(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '10px', fontSize: '0.95rem', boxSizing: 'border-box' }}
                  />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', maxHeight: '250px', overflowY: 'auto', flexShrink: 0, WebkitOverflowScrolling: 'touch' }}>
                    {Object.keys(setoresAgrupadosEdicao).length > 0 ? (
                      Object.entries(setoresAgrupadosEdicao).map(([nomePai, listaSetores]) => {
                        const pai = listaSetores.find(s => s.nomeExibicao === nomePai);
                        const filhos = listaSetores.filter(s => s.nomeExibicao !== nomePai);
                        const isExpandido = gruposExpandidos[nomePai] || buscaSetorEdit.length > 0;

                        return (
                          <div key={nomePai} style={{ flexShrink: 0, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'white' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '8px 12px' }}>
                              {pai ? (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#334155', flex: 1 }}>
                                  <input
                                    type="radio"
                                    name="setorSelecionadoEdicao"
                                    value={pai.id_setor}
                                    checked={String(novoIdSetor) === String(pai.id_setor)}
                                    onChange={(e) => setNovoIdSetor(e.target.value)}
                                    style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
                                  />
                                  {pai.nomeExibicao}
                                </label>
                              ) : (
                                <span style={{ fontWeight: 'bold', color: '#334155', flex: 1 }}>{nomePai} (Subsetores)</span>
                              )}

                              {filhos.length > 0 && (
                                <button 
                                  type="button"
                                  onClick={() => toggleGrupoEdicao(nomePai)}
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
                                      name="setorSelecionadoEdicao"
                                      value={filho.id_setor}
                                      checked={String(novoIdSetor) === String(filho.id_setor)}
                                      onChange={(e) => setNovoIdSetor(e.target.value)}
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
                      <span style={{ fontSize: '0.9rem', color: '#888', textAlign: 'center', padding: '10px 0' }}>Nenhum setor encontrado para a busca.</span>
                    )}
                  </div>
                </div>

                <div className="itens-edicao-secao">
                  <h4>Editar Itens / Perguntas e Fotos de Referência:</h4>
                  {novosItens.map((item, index) => {
                    const fotoExibicao = item.novaFotoBase64 || item.imagem_url;
                    return (
                      <div key={index} className="item-linha-edicao" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span>#{index + 1}</span>
                          <input type="text" value={item.descricao} onChange={(e) => handleItemChange(index, 'descricao', e.target.value)} placeholder="Descrição da pergunta" style={{ flex: 2 }} />
                          <select value={item.tipo} onChange={(e) => handleItemChange(index, 'tipo', e.target.value)} style={{ flex: 1 }}>
                            <option value="booleano">Booleano (Sim/Não)</option>
                            <option value="texto">Texto</option>
                            <option value="numero">Número</option>
                          </select>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <input type="checkbox" checked={item.obrigatorio} onChange={(e) => handleItemChange(index, 'obrigatorio', e.target.checked)} />
                            Obrigatório
                          </label>
                          <button type="button" onClick={() => handleRemoverItem(index)} className="btn-remover-item">✕</button>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingLeft: '25px', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                          
                          {/* FOTO APARECENDO INTEIRA (contain) NO MODO DE EDIÇÃO */}
                          {fotoExibicao ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>📷 Foto de referência ativa:</span>
                              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                                <img 
                                  src={fotoExibicao} 
                                  alt="Ref" 
                                  onClick={() => setImagemAmpliada(fotoExibicao)} 
                                  style={{ 
                                    width: '120px', height: 'auto', maxHeight: '120px', objectFit: 'contain', 
                                    borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff',
                                    padding: '2px', cursor: 'pointer', transition: 'transform 0.2s' 
                                  }} 
                                  title="Clique para ampliar" 
                                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                />
                                <button 
                                  type="button" 
                                  onClick={() => { const atualizados = [...novosItens]; atualizados[index].imagem_url = ''; atualizados[index].novaFotoBase64 = null; atualizados[index].novaFotoArquivo = null; setNovosItens(atualizados); }} 
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', padding: 0 }} 
                                  title="Remover foto"
                                >
                                  Remover
                                </button>
                              </div>
                            </div>
                          ) : ( 
                            <span style={{ color: '#64748b', fontStyle: 'italic' }}>Sem foto de referência</span> 
                          )}
                          
                          <label htmlFor={`foto-ref-${index}`} style={{ cursor: 'pointer', backgroundColor: '#0284c7', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', alignSelf: 'center' }}>
                            📷 {fotoExibicao ? 'Alterar Foto' : 'Adicionar Foto'}
                          </label>
                          <input id={`foto-ref-${index}`} type="file" accept="image/*" onChange={(e) => handleFotoItemChange(index, e)} style={{ display: 'none' }} />
                        </div>
                      </div>
                    );
                  })}
                  <button type="button" onClick={handleAdicionarItem} className="btn-adicionar-item">+ Adicionar Pergunta</button>
                </div>
                <div className="botoes-edicao-acao">
                  <button onClick={handleSalvarEdicaoCompleta} className="btn-salvar-titulo">Salvar Alterações</button>
                  <button onClick={() => setEditando(false)} className="btn-cancelar">Cancelar</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="titulo-view-group">
                  <h3>{checklist.titulo} <br/> <small style={{fontWeight:'normal', fontSize:'1rem'}}>Setor: {getNomeSetor(checklist.id_setor)}</small></h3>
                  <button onClick={() => setEditando(true)} className="btn-editar-titulo">✏️ Editar Completo</button>
                </div>
                <div className="itens-lista">
                  <h4>Itens de Verificação:</h4>
                  {checklist.itens && checklist.itens.length > 0 ? (
                    <ul style={{ paddingLeft: 0, listStyleType: 'none' }}>
                      {checklist.itens.map((item, index) => {
                        const refUrl = item.imagem_url || item.imagem_referencia;
                        return (
                          <li key={item.id_item || index} style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            <div>
                              <strong>{item.ordem}.</strong> {item.descricao} 
                              <em style={{ color: '#64748b' }}> ({item.tipo}) {item.obrigatorio && '*' }</em>
                            </div>
                            
                            {/* FOTO APARECENDO INTEIRA (contain) NO MODO DE VISUALIZAÇÃO */}
                            {refUrl && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>📷 Foto de referência:</span>
                                <img 
                                  src={refUrl} 
                                  alt="Referência" 
                                  onClick={() => setImagemAmpliada(refUrl)} 
                                  style={{ 
                                    width: '120px', height: 'auto', maxHeight: '120px', objectFit: 'contain', 
                                    borderRadius: '6px', cursor: 'pointer', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', padding: '2px', transition: 'transform 0.2s'
                                  }} 
                                  title="Clique para ampliar" 
                                  onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                  onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                />
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : ( <p>Nenhum item encontrado.</p> )}
                </div>
                <div className="botoes-acao-gerenciar">
                  <button onClick={handleInativar} className="btn-inativar" disabled={!checklist.ativo}>Inativar Checklist</button>
                </div>
              </div>
            )}
          </div>
        )}

        <hr className="divisor" />

        <div className="listagem-secao">
          <div className="filtros-container">
            <label htmlFor="filtro-setor">Filtrar por Setor:</label>
            <select id="filtro-setor" value={setorFiltro} onChange={handleFiltroChange} className="select-filtro">
              <option value="">Todos os Setores</option>
              {setoresDisponiveis.map(s => (
                <option key={s.id_setor} value={s.id_setor}>{s.nomeExibicao}</option>
              ))}
            </select>
          </div>

          <div className="tabela-container">
            <table className="tabela-checklists">
              <thead><tr><th>ID</th><th>Título</th><th>Setor</th><th>Criação</th><th>Ação</th></tr></thead>
              <tbody>
                {listaChecklists.length > 0 ? (
                  listaChecklists.map((item) => (
                    <tr key={item.id_checklist}>
                      <td className="col-id">#{item.id_checklist}</td>
                      <td><strong>{item.titulo}</strong></td>
                      <td>{getNomeSetor(item.id_setor)}</td>
                      <td>{formatarData(item.data_criacao)}</td>
                      <td style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button className="btn-ver-detalhes" onClick={() => buscarChecklistPorId(item.id_checklist)}>Ver</button>
                        <button className="btn-ver-detalhes" onClick={() => navigate(`/checklists/historico/${item.id_checklist}`)} style={{ backgroundColor: '#475569', color: '#fff' }} title="Ver histórico de versões">📜 Histórico</button>
                      </td>
                    </tr>
                  ))
                ) : ( <tr><td colSpan="5" className="tabela-vazia">Nenhum checklist encontrado para este setor.</td></tr> )}
              </tbody>
            </table>
          </div>

          <div className="paginacao-container">
            <button className="btn-paginacao" disabled={page === 1} onClick={() => setPage(page - 1)}>&laquo; Anterior</button>
            <span className="indicador-pagina">Página {page} de {totalPages}</span>
            <button className="btn-paginacao" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)}>Próxima &raquo;</button>
          </div>
        </div>

        <button className="btn-voltar-home" onClick={() => navigate('/home')}>Voltar para Home</button>
      </div>

      {imagemAmpliada && (
        <div onClick={() => setImagemAmpliada(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, cursor: 'pointer', padding: '2rem' }}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
            <img src={imagemAmpliada} alt="Ampliada" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'block', margin: '0 auto' }} />
            <button onClick={() => setImagemAmpliada(null)} style={{ position: 'absolute', top: '-15px', right: '-15px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>✕</button>
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