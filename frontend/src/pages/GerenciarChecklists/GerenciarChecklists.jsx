import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; // Interceptor JWT
import './GerenciarChecklists.css';

export default function GerenciarChecklists() {
  const [idBusca, setIdBusca] = useState('');
  const [checklist, setChecklist] = useState(null);
  const [editando, setEditando] = useState(false);
  
  const [novoTitulo, setNovoTitulo] = useState('');
  const [novoSetor, setNovoSetor] = useState('');
  const [novosItens, setNovosItens] = useState([]);
  
  const [listaChecklists, setListaChecklists] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [setorFiltro, setSetorFiltro] = useState('');

  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const [imagemAmpliada, setImagemAmpliada] = useState(null);
  const navigate = useNavigate();

  const mostrarAlerta = (tipo, titulo, mensagem) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem });
  };

  const fecharAlerta = () => setAlerta({ ...alerta, visivel: false });

  useEffect(() => {
    carregarLista();
  }, [page, setorFiltro]);

  const carregarLista = async () => {
    try {
      let url = `/api/checklists?page=${page}&limit=5`;
      if (setorFiltro) url += `&setor=${setorFiltro}`;

      const resposta = await fetchWithAuth(url);
      if (resposta.ok) {
        const json = await resposta.json();
        setListaChecklists(json.data || []);
        setTotalPages(json.totalPages || 1);
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
        setNovoSetor(dados.setor);
        
        // Mapeia os itens garantindo os campos de imagem
        const itensCompletos = (dados.itens || []).map(item => ({
          ...item,
          imagem_url: item.imagem_url || item.imagem_referencia || '',
          novaFotoBase64: null,
          novaFotoArquivo: null
        }));
        
        setNovosItens(itensCompletos);
        setIdBusca(id);
        setEditando(false);

        // Rolagem suave para o topo ao carregar os detalhes
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

  // Compressão de imagem 
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

          if (width > height) {
            if (width > MAX_WIDTH) {
              height = Math.round((height *= MAX_WIDTH / width));
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = Math.round((width *= MAX_HEIGHT / height));
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const base64Comprimido = canvas.toDataURL('image/jpeg', 0.6);
          resolve(base64Comprimido);
        };
      };
    });
  };

  const base64ToBlob = (base64) => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'image/jpeg' });
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
    setNovosItens([
      ...novosItens,
      { ordem: novosItens.length + 1, descricao: '', tipo: 'booleano', obrigatorio: true, imagem_url: '', novaFotoBase64: null, novaFotoArquivo: null }
    ]);
  };

  const handleRemoverItem = (index) => {
    const itensFiltrados = novosItens.filter((_, i) => i !== index);
    const itensReordenados = itensFiltrados.map((item, idx) => ({ ...item, ordem: idx + 1 }));
    setNovosItens(itensReordenados);
  };

  const handleSalvarEdicaoCompleta = async () => {
    try {
      const usuarioString = localStorage.getItem('usuarioLogado') || localStorage.getItem('usuario') || '{}';
      const usuarioSalvo = JSON.parse(usuarioString);
      const setorUsuario = usuarioSalvo.setor || localStorage.getItem('setor') || 'admin';

      // 1. Payload de atualização do checklist
      const payloadCompleto = {
        titulo: novoTitulo,
        setor: novoSetor,
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
          'x-setor-usuario': setorUsuario
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
                const resUpload = await fetchWithAuth(`/api/checklists/itens/${idItemAlvo}/referencia`, {
                  method: 'POST',
                  body: formDataFoto
                });

                if (!resUpload.ok) {
                  console.error("Falha ao salvar a imagem do item:", idItemAlvo, await resUpload.text());
                } else {
                  console.log(`Foto do item ${idItemAlvo} salva com sucesso!`);
                }
              } catch (errFoto) {
                console.error("Erro na requisição da imagem:", errFoto);
              }
            }
          }
        }

        mostrarAlerta('sucesso', 'Sucesso!', json.data?.mensagem || 'Checklist atualizado com sucesso!');
        setEditando(false);
        carregarLista();

        if (novoIdReal !== checklist.id_checklist) {
          buscarChecklistPorId(novoIdReal);
        } else {
          buscarChecklistPorId(checklist.id_checklist);
        }
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
      const resposta = await fetchWithAuth(`/api/checklists/${checklist.id_checklist}`, { 
        method: 'DELETE' 
      });
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

  return (
    <div className="gerenciar-container">
      <div className="gerenciar-card" style={{ maxWidth: '950px' }}>
        <h2>Gerenciar Checklists</h2>
        <p>Busque um ID para editar, ou selecione na lista abaixo.</p>

        <form onSubmit={handleBuscar} className="busca-form">
          <input
            type="number"
            value={idBusca}
            onChange={(e) => setIdBusca(e.target.value)}
            placeholder="Digite o ID do Checklist"
            className="input-busca"
          />
          <button type="submit" className="btn-buscar">Buscar</button>
        </form>

        {checklist && (
          <div className="checklist-detalhes">
            <div className="status-badge" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Status: <span className={checklist.ativo ? 'ativo' : 'inativo'}>
                {checklist.ativo ? 'ATIVO' : 'INATIVO'}
              </span></span>

              <button 
                onClick={() => navigate(`/checklists/historico/${checklist.id_checklist}`)}
                style={{ backgroundColor: '#475569', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600' }}
              >
                📜 Ver Histórico
              </button>
            </div>

            {editando ? (
              <div className="bloco-edicao-completa">
                <h3>Editando Checklist</h3>
                
                <div className="form-group-edicao">
                  <label>Título:</label>
                  <input 
                    type="text" 
                    value={novoTitulo} 
                    onChange={(e) => setNovoTitulo(e.target.value)}
                    className="input-editar-titulo"
                  />
                </div>

                <div className="form-group-edicao">
                  <label>Setor:</label>
                  <select 
                    value={novoSetor} 
                    onChange={(e) => setNovoSetor(e.target.value)} 
                    className="select-filtro"
                  >
                    <option value="admin">Admin</option>
                    <option value="ti">TI</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="rh">RH</option>
                    <option value="operacao">Operacional</option>
                    <option value="limpeza">Limpeza</option>
                  </select>
                </div>

                <div className="itens-edicao-secao">
                  <h4>Editar Itens / Perguntas e Fotos de Referência:</h4>
                  {novosItens.map((item, index) => {
                    const fotoExibicao = item.novaFotoBase64 || item.imagem_url;

                    return (
                      <div key={index} className="item-linha-edicao" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span>#{index + 1}</span>
                          <input 
                            type="text" 
                            value={item.descricao} 
                            onChange={(e) => handleItemChange(index, 'descricao', e.target.value)}
                            placeholder="Descrição da pergunta"
                            style={{ flex: 2 }}
                          />
                          <select 
                            value={item.tipo} 
                            onChange={(e) => handleItemChange(index, 'tipo', e.target.value)}
                            style={{ flex: 1 }}
                          >
                            <option value="booleano">Booleano (Sim/Não)</option>
                            <option value="texto">Texto</option>
                            <option value="numero">Número</option>
                          </select>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                            <input 
                              type="checkbox" 
                              checked={item.obrigatorio} 
                              onChange={(e) => handleItemChange(index, 'obrigatorio', e.target.checked)}
                            />
                            Obrigatório
                          </label>
                          <button type="button" onClick={() => handleRemoverItem(index)} className="btn-remover-item">✕</button>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '25px', fontSize: '0.85rem' }}>
                          {fotoExibicao ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f1f5f9', padding: '4px 8px', borderRadius: '4px' }}>
                              <img 
                                src={fotoExibicao} 
                                alt="Ref" 
                                onClick={() => setImagemAmpliada(fotoExibicao)}
                                style={{ width: '35px', height: '35px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid #cbd5e1' }}
                                title="Clique para ampliar"
                              />
                              <span>Foto de referência ativa</span>
                              <button 
                                type="button" 
                                onClick={() => {
                                  const atualizados = [...novosItens];
                                  atualizados[index].imagem_url = '';
                                  atualizados[index].novaFotoBase64 = null;
                                  atualizados[index].novaFotoArquivo = null;
                                  setNovosItens(atualizados);
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}
                                title="Remover foto"
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#64748b', fontStyle: 'italic' }}>Sem foto de referência</span>
                          )}

                          <label htmlFor={`foto-ref-${index}`} style={{ cursor: 'pointer', backgroundColor: '#0284c7', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                            📷 {fotoExibicao ? 'Alterar Foto' : 'Adicionar Foto'}
                          </label>
                          <input 
                            id={`foto-ref-${index}`}
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleFotoItemChange(index, e)} 
                            style={{ display: 'none' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <button type="button" onClick={handleAdicionarItem} className="btn-adicionar-item">
                    + Adicionar Pergunta
                  </button>
                </div>

                <div className="botoes-edicao-acao">
                  <button onClick={handleSalvarEdicaoCompleta} className="btn-salvar-titulo">Salvar Alterações</button>
                  <button onClick={() => setEditando(false)} className="btn-cancelar">Cancelar</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="titulo-view-group">
                  <h3>{checklist.titulo} (Setor: {checklist.setor})</h3>
                  <button onClick={() => setEditando(true)} className="btn-editar-titulo">✏️ Editar Completo</button>
                </div>

                <div className="itens-lista">
                  <h4>Itens de Verificação:</h4>
                  {checklist.itens && checklist.itens.length > 0 ? (
                    <ul>
                      {checklist.itens.map((item, index) => {
                        const refUrl = item.imagem_url || item.imagem_referencia;
                        return (
                          <li key={item.id_item || index} style={{ marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                            <div>
                              <strong>{item.ordem}.</strong> {item.descricao} 
                              <em> ({item.tipo}) {item.obrigatorio && '*' }</em>
                            </div>
                            {refUrl && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '15px' }}>
                                <img 
                                  src={refUrl} 
                                  alt="Referência" 
                                  onClick={() => setImagemAmpliada(refUrl)}
                                  style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid #cbd5e1' }}
                                  title="Clique para ampliar"
                                />
                                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Foto de referência</span>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p>Nenhum item encontrado para este checklist.</p>
                  )}
                </div>

                <div className="botoes-acao-gerenciar">
                  <button onClick={handleInativar} className="btn-inativar" disabled={!checklist.ativo}>
                    Inativar Checklist
                  </button>
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
              <option value="admin">Admin</option>
              <option value="ti">TI</option>
              <option value="manutencao">Manutenção</option>
              <option value="rh">RH</option>
              <option value="operacao">Operacional</option>
              <option value="limpeza">Limpeza</option>
            </select>
          </div>

          <div className="tabela-container">
            <table className="tabela-checklists">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Título</th>
                  <th>Setor</th>
                  <th>Criação</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {listaChecklists.length > 0 ? (
                  listaChecklists.map((item) => (
                    <tr key={item.id_checklist}>
                      <td className="col-id">#{item.id_checklist}</td>
                      <td><strong>{item.titulo}</strong></td>
                      <td>{item.setor}</td>
                      <td>{formatarData(item.data_criacao)}</td>
                      <td style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button 
                          className="btn-ver-detalhes"
                          onClick={() => buscarChecklistPorId(item.id_checklist)}
                        >
                          Ver
                        </button>
                        <button 
                          className="btn-ver-detalhes"
                          onClick={() => navigate(`/checklists/historico/${item.id_checklist}`)}
                          style={{ backgroundColor: '#475569', color: '#fff' }}
                          title="Ver histórico de versões"
                        >
                          📜 Histórico
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="tabela-vazia">Nenhum checklist encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="paginacao-container">
            <button className="btn-paginacao" disabled={page === 1} onClick={() => setPage(page - 1)}>
              &laquo; Anterior
            </button>
            <span className="indicador-pagina">Página {page} de {totalPages}</span>
            <button className="btn-paginacao" disabled={page === totalPages || totalPages === 0} onClick={() => setPage(page + 1)}>
              Próxima &raquo;
            </button>
          </div>
        </div>

        <button className="btn-voltar-home" onClick={() => navigate('/home')}>Voltar para Home</button>
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
              alt="Ampliada" 
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
            <h3 className={alerta.tipo === 'erro' ? 'texto-erro' : 'texto-sucesso'}>{alerta.titulo}</h3>
            <p>{alerta.mensagem}</p>
            <button className="modal-button" onClick={fecharAlerta}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}