import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; 
import './CadastroChecklist.css';

export default function CadastroChecklist() {
  const [titulo, setTitulo] = useState('');
  const [idSetor, setIdSetor] = useState(''); 
  const [ativo, setAtivo] = useState(true);

  // NOVO: Agendamento
  const [tipoAgendamento, setTipoAgendamento] = useState('NENHUM');
  const [intervaloDias, setIntervaloDias] = useState('');
  const [dataEspecifica, setDataEspecifica] = useState('');
  
  // NOVO: UX em Blocos/Etapas
  const [blocos, setBlocos] = useState([
    { nome_etapa: 'Passo 1: Inspeção Inicial', itens: [{ descricao: '', tipo: 'booleano', obrigatorio: true, imagem: null, preview: null }] }
  ]);
  
  const [setoresDisponiveis, setSetoresDisponiveis] = useState([]);
  const [buscaSetor, setBuscaSetor] = useState('');
  const [gruposExpandidos, setGruposExpandidos] = useState({});
  
  // Estados para a sanfona de dentro do Modal de Criar/Editar Setor
  const [buscaSetorPai, setBuscaSetorPai] = useState('');
  const [gruposExpandidosPai, setGruposExpandidosPai] = useState({});

  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const [modalSetor, setModalSetor] = useState({ visivel: false, isEdicao: false, id_setor: null, nome: '', id_setor_pai: '' });
  const [imagemAmpliada, setImagemAmpliada] = useState(null);

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

  const setoresFiltradosPai = setoresDisponiveis
    .filter(s => String(s.id_setor) !== String(modalSetor.id_setor))
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

  const mostrarAlerta = (tipo, titulo, mensagem) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem });
  };

  const fecharAlerta = () => {
    setAlerta({ ...alerta, visivel: false });
    if (alerta.tipo === 'sucesso') navigate('/home');
  };

  const getAdminHeader = () => {
    const usuarioStorage = localStorage.getItem('usuarioLogado');
    const usuarioLogado = usuarioStorage ? JSON.parse(usuarioStorage) : null;
    const isAdmin = usuarioLogado?.setores?.some(s => String(s).toLowerCase() === 'admin');
    return isAdmin ? 'admin' : JSON.stringify(usuarioLogado?.setores_ids || []);
  };

  const abrirModalNovoSetor = () => {
    setBuscaSetorPai('');
    setGruposExpandidosPai({});
    setModalSetor({ visivel: true, isEdicao: false, id_setor: null, nome: '', id_setor_pai: '' });
  };

  const salvarSetor = async () => {
    if (!modalSetor.nome.trim()) return mostrarAlerta('erro', 'Atenção', 'O nome do setor é obrigatório.');

    try {
      const payload = {
        nome: modalSetor.nome,
        id_setor_pai: modalSetor.id_setor_pai ? Number(modalSetor.id_setor_pai) : null
      };

      const url = modalSetor.isEdicao ? `/api/setores/${modalSetor.id_setor}` : '/api/setores';
      const method = modalSetor.isEdicao ? 'PUT' : 'POST';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-setor-usuario': getAdminHeader() },
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

  const adicionarBloco = () => {
    setBlocos([...blocos, { nome_etapa: `Passo ${blocos.length + 1}: Nova Etapa`, itens: [{ descricao: '', tipo: 'booleano', obrigatorio: true, imagem: null, preview: null }] }]);
  };

  const removerBloco = (bIndex) => {
    if (blocos.length === 1) return mostrarAlerta('erro', 'Atenção', 'O checklist precisa ter pelo menos uma etapa.');
    setBlocos(blocos.filter((_, i) => i !== bIndex));
  };

  const adicionarItem = (bIndex) => {
    const novosBlocos = [...blocos];
    novosBlocos[bIndex].itens.push({ descricao: '', tipo: 'booleano', obrigatorio: true, imagem: null, preview: null });
    setBlocos(novosBlocos);
  };

  const removerItem = (bIndex, iIndex) => {
    const novosBlocos = [...blocos];
    if (novosBlocos[bIndex].itens.length === 1) return mostrarAlerta('erro', 'Atenção', 'A etapa precisa ter pelo menos uma pergunta.');
    novosBlocos[bIndex].itens = novosBlocos[bIndex].itens.filter((_, i) => i !== iIndex);
    setBlocos(novosBlocos);
  };

  const atualizarItem = (bIndex, iIndex, campo, valor) => {
    const novosBlocos = [...blocos];
    novosBlocos[bIndex].itens[iIndex][campo] = valor;
    setBlocos(novosBlocos);
  };

  const handleImagemChange = (bIndex, iIndex, e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
      const novosBlocos = [...blocos];
      novosBlocos[bIndex].itens[iIndex].imagem = arquivo;
      novosBlocos[bIndex].itens[iIndex].preview = URL.createObjectURL(arquivo);
      setBlocos(novosBlocos);
    }
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    
    if (!idSetor) {
      mostrarAlerta('erro', 'Atenção', 'Você precisa selecionar um setor responsável.');
      return;
    }

    if (tipoAgendamento === 'INTERVALO_DIAS' && !intervaloDias) {
      return mostrarAlerta('erro', 'Atenção', 'Informe o intervalo de dias para o agendamento.');
    }
    if (tipoAgendamento === 'DATA_ESPECIFICA' && !dataEspecifica) {
      return mostrarAlerta('erro', 'Atenção', 'Informe a data específica para o agendamento.');
    }
    
    let ordemGlobal = 1;
    const itensFlat = [];

    blocos.forEach((bloco, bIndex) => {
      bloco.itens.forEach(item => {
        itensFlat.push({
          ordem: ordemGlobal++,
          etapa: bloco.nome_etapa,
          ordem_etapa: bIndex + 1,
          descricao: item.descricao,
          tipo: item.tipo,
          obrigatorio: item.obrigatorio,
          imagem_ref_obj: item.imagem 
        });
      });
    });

    const payloadPrincipal = {
      titulo,
      id_setor: Number(idSetor),
      ativo,
      tipo_agendamento: tipoAgendamento,
      intervalo_dias: tipoAgendamento === 'INTERVALO_DIAS' ? Number(intervaloDias) : null,
      data_especifica: tipoAgendamento === 'DATA_ESPECIFICA' ? dataEspecifica : null,
      itens: itensFlat.map(({ imagem_ref_obj, ...rest }) => rest)
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

        for (let i = 0; i < itensFlat.length; i++) {
          const itemOriginal = itensFlat[i];
          if (itemOriginal.imagem_ref_obj) {
            const itemSalvoCorrespondente = itensSalvos.find(itemSalvo => itemSalvo.ordem === itemOriginal.ordem);
            
            if (itemSalvoCorrespondente && itemSalvoCorrespondente.id_item) {
              const formDataImagem = new FormData();
              formDataImagem.append('imagem', itemOriginal.imagem_ref_obj);
              
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
    <div className="cadastro-checklist-container" style={{ padding: '1rem', boxSizing: 'border-box', width: '100%', display: 'flex', justifyContent: 'center' }}>
      <div className="cadastro-checklist-card" style={{ maxWidth: '850px', width: '100%', padding: window.innerWidth < 600 ? '1rem' : '2rem', boxSizing: 'border-box' }}>
        <h2>Criar Novo Checklist</h2>
        <p>Defina o título, agendamento e estruture as perguntas em etapas.</p>
        
        <form onSubmit={handleCadastro} className="checklist-form-container">
          
          <div className="dados-principais" style={{ backgroundColor: '#f8fafc', padding: '1.2rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
            
            <div className="input-group">
              <label htmlFor="titulo">Título do Checklist</label>
              <input
                type="text"
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Inspeção da Máquina X"
                required
                style={{ width: '100%', boxSizing: 'border-box', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            {/* SELETOR DE SETOR COM SANFONA */}
            <div className="input-group" style={{ marginTop: '1.2rem' }}>
              <label>Setor Responsável</label>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Apenas os operadores deste setor verão este checklist.</span>
                <button type="button" onClick={abrirModalNovoSetor} style={{ backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 12px', fontSize: '0.8rem', fontWeight: 'bold', color: '#334155', cursor: 'pointer' }}>
                  ➕ Criar Setor
                </button>
              </div>

              <input
                type="text"
                placeholder="🔍 Pesquisar setor..."
                value={buscaSetor}
                onChange={(e) => setBuscaSetor(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '10px', fontSize: '0.95rem', boxSizing: 'border-box' }}
              />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#ffffff', maxHeight: '250px', overflowY: 'auto' }}>
                {Object.keys(setoresAgrupados).length > 0 ? (
                  Object.entries(setoresAgrupados).map(([nomePai, listaSetores]) => {
                    const pai = listaSetores.find(s => s.nomeExibicao === nomePai);
                    const filhos = listaSetores.filter(s => s.nomeExibicao !== nomePai);
                    const isExpandido = gruposExpandidos[nomePai] || buscaSetor.length > 0;

                    return (
                      <div key={nomePai} style={{ flexShrink: 0, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'white' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '8px 12px', flexWrap: 'wrap', gap: '8px' }}>
                          {pai ? (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#334155', flex: 1, minWidth: '150px' }}>
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
                              <label key={filho.id_setor} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal', color: '#555', paddingLeft: '24px', flexWrap: 'wrap' }}>
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

            {/* SEÇÃO DE AGENDAMENTO (NOVO) */}
            <div className="input-group" style={{ marginTop: '1.5rem', borderTop: '1px dashed #cbd5e1', paddingTop: '1.2rem' }}>
              <label>Periodicidade / Agendamento</label>
              <select value={tipoAgendamento} onChange={e => setTipoAgendamento(e.target.value)} style={{ padding: '10px', borderRadius: '6px', width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', fontSize: '1rem' }}>
                <option value="NENHUM">Sob Demanda (Sem agendamento automático)</option>
                <option value="INTERVALO_DIAS">Intervalo de Dias (Ex: A cada 15 dias)</option>
                <option value="DATA_ESPECIFICA">Data Específica Única (Ex: Apenas hoje)</option>
              </select>
            </div>

            {tipoAgendamento === 'INTERVALO_DIAS' && (
              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label>Repetir a cada (Dias):</label>
                <input type="number" min="1" value={intervaloDias} onChange={e => setIntervaloDias(e.target.value)} required placeholder="Ex: 15" style={{ padding: '10px', boxSizing: 'border-box', borderRadius: '6px', width: '100%', border: '1px solid #cbd5e1' }} />
              </div>
            )}

            {tipoAgendamento === 'DATA_ESPECIFICA' && (
              <div className="input-group" style={{ marginTop: '1rem' }}>
                <label>Data Agendada:</label>
                <input type="date" value={dataEspecifica} onChange={e => setDataEspecifica(e.target.value)} required style={{ padding: '10px', boxSizing: 'border-box', borderRadius: '6px', width: '100%', border: '1px solid #cbd5e1' }} />
              </div>
            )}

            <div className="checkbox-group" style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="checkbox"
                id="ativo"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
              />
              <label htmlFor="ativo" style={{ fontWeight: 'bold' }}>Manter este Checklist Ativo para uso</label>
            </div>
          </div>

          <div className="blocos-section">
            
            {/* CABEÇALHO FIXO DAS ETAPAS */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              borderBottom: '2px solid #e2e8f0', 
              padding: '10px', 
              marginBottom: '1.5rem',
              position: 'sticky',
              top: '10px', 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(5px)',
              zIndex: 10,
              borderRadius: '8px',
              boxShadow: '0 4px 10px rgba(0,0,0,0.08)',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.2rem' }}>Etapas</h3>
              <button type="button" onClick={adicionarBloco} style={{ fontSize: '0.9rem', padding: '10px 15px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)' }}>
                + Adicionar Etapa
              </button>
            </div>

            {blocos.map((bloco, bIndex) => (
              <div key={bIndex} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1.2rem', marginBottom: '1.5rem', background: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', minWidth: '200px', flexWrap: 'wrap' }}>
                    <span style={{ backgroundColor: '#0284c7', color: 'white', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.8rem' }}>Etapa {bIndex + 1}</span>
                    <input 
                      type="text" 
                      value={bloco.nome_etapa} 
                      onChange={e => atualizarItem(bIndex, null, 'nome_etapa', e.target.value)} 
                      onInput={e => { const nb = [...blocos]; nb[bIndex].nome_etapa = e.target.value; setBlocos(nb); }}
                      style={{ fontSize: '1.1rem', fontWeight: 'bold', border: 'none', borderBottom: '2px solid #cbd5e1', outline: 'none', width: '100%', paddingBottom: '4px', color: '#0f172a', boxSizing: 'border-box' }} 
                      required 
                      placeholder="Ex: Inspeção Visual Externa" 
                    />
                  </div>
                  <button type="button" onClick={() => removerBloco(bIndex)} style={{ color: '#ef4444', background: 'none', border: '1px solid #ef4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}>
                    🗑️ Remover Etapa
                  </button>
                </div>

                {bloco.itens.map((item, iIndex) => (
                  <div key={iIndex} className="item-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem', backgroundColor: '#f8fafc', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.8rem', flexWrap: 'wrap' }}>
                      <span className="item-ordem" style={{ fontWeight: 'bold', color: '#64748b', marginTop: '10px' }}>#{iIndex + 1}</span>
                      
                      <div className="item-inputs" style={{ display: 'flex', gap: '0.8rem', flex: 1, flexWrap: 'wrap', minWidth: '220px' }}>
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={(e) => atualizarItem(bIndex, iIndex, 'descricao', e.target.value)}
                          placeholder="Descrição da pergunta ou verificação"
                          required
                          className="input-descricao"
                          style={{ flex: '1 1 100%', minWidth: '180px', padding: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
                        />
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', width: '100%' }}>
                          <select
                            value={item.tipo}
                            onChange={(e) => atualizarItem(bIndex, iIndex, 'tipo', e.target.value)}
                            className="select-tipo"
                            style={{ flex: 1, padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '6px', minWidth: '140px', boxSizing: 'border-box' }}
                          >
                            <option value="booleano">Sim / Não (Conformidade)</option>
                            <option value="texto">Texto Livre (Aberta)</option>
                            <option value="numero">Número (Medição)</option>
                          </select>
                          <label className="checkbox-obrigatorio" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem', color: '#334155', backgroundColor: '#e2e8f0', padding: '0 10px', borderRadius: '6px' }}>
                            <input
                              type="checkbox"
                              checked={item.obrigatorio}
                              onChange={(e) => atualizarItem(bIndex, iIndex, 'obrigatorio', e.target.checked)}
                            />
                            Obrigatório
                          </label>
                        </div>
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={() => removerItem(bIndex, iIndex)}
                        title="Remover Pergunta"
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '10px' }}
                      >
                        ✖
                      </button>
                    </div>

                    <div className="upload-item-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.5rem', paddingLeft: window.innerWidth < 600 ? '0' : '2rem' }}>
                      <label htmlFor={`file-input-${bIndex}-${iIndex}`} style={{ cursor: 'pointer', alignSelf: 'flex-start', backgroundColor: '#e2e8f0', padding: '0.6rem 1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155', border: '1px solid #cbd5e1' }}>
                        📷 {item.imagem ? 'Trocar Padrão Visual' : 'Adicionar Padrão Visual (Foto)'}
                      </label>
                      <input
                        id={`file-input-${bIndex}-${iIndex}`}
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImagemChange(bIndex, iIndex, e)}
                        style={{ display: 'none' }}
                      />

                      {/* IMAGEM DE REFERÊNCIA (contain) */}
                      {item.preview && (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.8rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                          <img 
                            src={item.preview} 
                            alt="Preview" 
                            title="Clique para ampliar"
                            onClick={() => setImagemAmpliada(item.preview)}
                            style={{ 
                              width: '120px', 
                              height: 'auto', 
                              maxHeight: '120px', 
                              objectFit: 'contain', 
                              borderRadius: '6px', 
                              border: '1px solid #cbd5e1', 
                              backgroundColor: '#ffffff',
                              padding: '2px',
                              cursor: 'pointer', 
                              transition: 'transform 0.2s' 
                            }} 
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.imagem?.name}</span>
                            <button 
                              type="button" 
                              onClick={() => {
                                const nb = [...blocos];
                                nb[bIndex].itens[iIndex].imagem = null;
                                nb[bIndex].itens[iIndex].preview = null;
                                setBlocos(nb);
                              }}
                              style={{ background: '#fee2e2', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', padding: '6px 12px', borderRadius: '4px', textAlign: 'center' }}
                            >
                              Remover Foto
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <button type="button" onClick={() => adicionarItem(bIndex)} style={{ marginTop: '0.5rem', background: '#f0f9ff', border: '2px dashed #0284c7', color: '#0284c7', padding: '12px', width: '100%', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s', boxSizing: 'border-box' }}>
                  + Adicionar Pergunta nesta Etapa
                </button>

                {/* BOTÃO PARA ADICIONAR NOVA ETAPA NO FINAL DO PASSO ATUAL */}
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
                  <button 
                    type="button" 
                    onClick={adicionarBloco} 
                    style={{ fontSize: '0.9rem', padding: '8px 16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <span>➕</span> Adicionar Nova Etapa
                  </button>
                </div>

              </div>
            ))}
          </div>

          <div className="botoes-acao" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button type="button" className="btn-voltar" onClick={() => navigate('/home')} style={{ flex: '1 1 100%', minWidth: '150px', padding: '12px' }}>
              Cancelar
            </button>
            <button type="submit" className="btn-salvar" style={{ flex: '2 1 100%', minWidth: '200px', padding: '12px' }}>
              Finalizar e Salvar Checklist
            </button>
          </div>
        </form>
      </div>

      {/* MODAL CRIAR SETOR */}
      {modalSetor.visivel && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px', width: '90%', textAlign: 'left', boxSizing: 'border-box' }}>
            <h3 style={{ marginBottom: '15px', color: '#1e293b' }}>Novo Setor</h3>
            
            <div className="input-group" style={{ marginBottom: '15px' }}>
              <label>Nome do Setor</label>
              <input type="text" value={modalSetor.nome} onChange={(e) => setModalSetor({ ...modalSetor, nome: e.target.value })} placeholder="Ex: TI, Manutenção..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', boxSizing: 'border-box' }} />
            </div>

            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label>Pertence a qual Setor? (Pai)</label>
              <input type="text" placeholder="🔍 Pesquisar setor pai..." value={buscaSetorPai} onChange={(e) => setBuscaSetorPai(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '10px', fontSize: '0.85rem', boxSizing: 'border-box' }} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f8fafc', maxHeight: '220px', overflowY: 'auto' }}>
                <div style={{ flexShrink: 0, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '10px 12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#334155', fontSize: '0.85rem', flex: 1, margin: 0 }}>
                      <input type="radio" name="setorPaiModal" value="" checked={modalSetor.id_setor_pai === '' || modalSetor.id_setor_pai === null} onChange={() => setModalSetor({ ...modalSetor, id_setor_pai: '' })} style={{ width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0, margin: 0 }} />
                      Nenhum (Criar como Setor Principal)
                    </label>
                  </div>
                </div>

                {Object.keys(setoresAgrupadosPai).map((nomePai) => {
                  const listaSetores = setoresAgrupadosPai[nomePai];
                  const pai = listaSetores.find(s => s.nomeExibicao === nomePai);
                  const filhos = listaSetores.filter(s => s.nomeExibicao !== nomePai);
                  const isExpandido = gruposExpandidosPai[nomePai] || buscaSetorPai.length > 0;

                  return (
                    <div key={nomePai} style={{ flexShrink: 0, border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden', backgroundColor: 'white' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f5f9', padding: '8px 12px', flexWrap: 'wrap', gap: '6px' }}>
                        {pai ? (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'bold', color: '#334155', fontSize: '0.85rem', flex: 1, margin: 0, minWidth: '130px' }}>
                            <input type="radio" name="setorPaiModal" value={pai.id_setor} checked={String(modalSetor.id_setor_pai) === String(pai.id_setor)} onChange={(e) => setModalSetor({ ...modalSetor, id_setor_pai: e.target.value })} style={{ width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0, margin: 0 }} />
                            {pai.nomeExibicao}
                          </label>
                        ) : (
                          <span style={{ fontWeight: 'bold', color: '#334155', fontSize: '0.85rem', flex: 1 }}>{nomePai} (Subsetores)</span>
                        )}
                        {filhos.length > 0 && <button type="button" onClick={() => toggleGrupoPai(nomePai)} style={{ background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem', color: '#0284c7', fontWeight: 'bold' }}>{isExpandido ? '▲ Ocultar' : '▼ Ver subsetores'}</button>}
                      </div>
                      {isExpandido && filhos.map(filho => (
                        <div key={filho.id_setor} style={{ padding: '8px 12px', borderTop: '1px solid #cbd5e1' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 'normal', color: '#555', paddingLeft: '24px', fontSize: '0.85rem', margin: 0, flexWrap: 'wrap' }}>
                            <input type="radio" name="setorPaiModal" value={filho.id_setor} checked={String(modalSetor.id_setor_pai) === String(filho.id_setor)} onChange={(e) => setModalSetor({ ...modalSetor, id_setor_pai: e.target.value })} style={{ width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0, margin: 0 }} />
                            {filho.nomeExibicao.replace(`${nomePai} > `, '↳ ')} 
                          </label>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn-voltar" style={{ flex: 1, padding: '10px', margin: 0, minWidth: '100px' }} onClick={() => setModalSetor({ ...modalSetor, visivel: false })}>Cancelar</button>
              <button type="button" className="btn-salvar" style={{ flex: 1, padding: '10px', margin: 0, minWidth: '100px' }} onClick={salvarSetor}>Salvar Setor</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ampliar Imagem */}
      {imagemAmpliada && (
        <div onClick={() => setImagemAmpliada(null)} style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, cursor: 'pointer', padding: '2rem', boxSizing: 'border-box' }}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
            <img src={imagemAmpliada} alt="Preview" style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: '8px', objectFit: 'contain', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'block', margin: '0 auto' }} />
            <button onClick={() => setImagemAmpliada(null)} style={{ position: 'absolute', top: '-15px', right: '-15px', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '35px', height: '35px', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>✕</button>
          </div>
        </div>
      )}

      {/* Modal de Avisos Globais */}
      {alerta.visivel && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '90%', maxWidth: '400px', boxSizing: 'border-box' }}>
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