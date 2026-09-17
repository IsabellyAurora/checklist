import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; 
import './PreencherChecklist.css';

const carregarRascunho = () => {
  try {
    const rascunho = sessionStorage.getItem('checklistRascunho');
    return rascunho ? JSON.parse(rascunho) : null;
  } catch (e) {
    return null;
  }
};

export default function PreencherChecklist() {
  const rascunho = carregarRascunho();

  const [usuario, setUsuario] = useState(() => {
    const userData = localStorage.getItem('usuarioLogado');
    return userData ? JSON.parse(userData) : null;
  });
  
  const [checklistsDisponiveis, setChecklistsDisponiveis] = useState([]);
  const [busca, setBusca] = useState(rascunho?.busca || '');
  const [dropdownAberto, setDropdownAberto] = useState(false);

  // =====================================
  // ESTADOS DA EXECUÇÃO
  // =====================================
  const [idExecucao, setIdExecucao] = useState(rascunho?.idExecucao || null);
  const [checklistAtual, setChecklistAtual] = useState(rascunho?.checklistAtual || null);
  const [ordemServico, setOrdemServico] = useState(rascunho?.ordemServico || '');
  const [respostas, setRespostas] = useState(rascunho?.respostas || {});
  
  const [etapas, setEtapas] = useState(rascunho?.etapas || []);
  const [etapaExpandida, setEtapaExpandida] = useState(rascunho?.etapaExpandida !== undefined ? rascunho.etapaExpandida : 0);

  // MODAIS E ALERTAS
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const [modalConfirmacao, setModalConfirmacao] = useState({ visivel: false, mensagem: '', acao: null });
  const [imagemAmpliada, setImagemAmpliada] = useState(null);
  
  const [nomesSetores, setNomesSetores] = useState([]);
  const [todosSetores, setTodosSetores] = useState([]); 
  const [mostrarSubsetores, setMostrarSubsetores] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const scrollSalvo = sessionStorage.getItem('scrollChecklist');
    if (scrollSalvo && checklistAtual) {
      window.scrollTo({ top: parseInt(scrollSalvo), behavior: 'instant' });
      sessionStorage.removeItem('scrollChecklist'); 
    }
  }, [checklistAtual]);

  useEffect(() => {
    if (!usuario) {
      navigate('/');
    } else {
      carregarChecklistsDoSetor();
    }
  }, [navigate, usuario]);

  useEffect(() => {
    if (location.state?.autoIniciarId && checklistsDisponiveis.length > 0) {
      const chk = checklistsDisponiveis.find(c => String(c.id_checklist) === String(location.state.autoIniciarId));
      if (chk && !idExecucao) {
        handleSelecionarDoDropdown(chk);
      }
      navigate(location.pathname, { replace: true });
    }
  }, [checklistsDisponiveis, location.state]);

  useEffect(() => {
    if (checklistAtual && idExecucao) {
      try {
        sessionStorage.setItem('checklistRascunho', JSON.stringify({
          idExecucao,
          checklistAtual,
          etapas,
          etapaExpandida,
          respostas, 
          ordemServico,
          busca
        }));
      } catch (e) {
        console.error("Erro ao salvar rascunho.", e);
      }
    }
  }, [checklistAtual, respostas, ordemServico, idExecucao, busca, etapas, etapaExpandida]);

  const mostrarAlerta = (tipo, titulo, mensagem) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem });
  };

  const fecharAlerta = () => {
    setAlerta({ ...alerta, visivel: false });
    if (alerta.tipo === 'sucesso' || alerta.tipo === 'bloqueio') navigate('/home');
  };

  const limparFluxo = () => {
    setChecklistAtual(null); 
    setBusca(''); 
    setIdExecucao(null); 
    setOrdemServico(''); 
    setEtapas([]);
    setEtapaExpandida(0);
    sessionStorage.removeItem('checklistRascunho'); 
  };

  const handleCancelarExecucao = () => {
    setModalConfirmacao({
      visivel: true,
      mensagem: "Tem certeza que deseja cancelar esta execução? Suas respostas serão perdidas e a tarefa voltará para a lista de pendentes para outros operadores.",
      acao: async () => {
        setModalConfirmacao({ visivel: false, mensagem: '', acao: null });
        
        try {
          const response = await fetchWithAuth(`/api/execucoes/${idExecucao}/cancelar`, {
            method: 'DELETE'
          });
          
          if (response.ok) {
            limparFluxo();
            navigate('/home'); 
          } else {
            mostrarAlerta('erro', 'Erro ao cancelar', 'Não foi possível cancelar a execução no servidor.');
          }
        } catch (e) {
          console.error("Erro ao cancelar:", e);
          mostrarAlerta('erro', 'Erro de Conexão', 'Falha ao comunicar com o servidor.');
        }
      }
    });
  };

  // ==========================================
  // CÁLCULO DE PROGRESSO (CIRCULAR)
  // ==========================================
  const calcularProgresso = () => {
    if (!checklistAtual || !checklistAtual.itens || checklistAtual.itens.length === 0) return 0;
    const itensObrigatorios = checklistAtual.itens.filter(i => i.obrigatorio);
    
    if (itensObrigatorios.length === 0) {
      const respondidosGeral = checklistAtual.itens.filter(i => respostas[i.id_item]?.valor_resposta).length;
      return checklistAtual.itens.length > 0 ? Math.round((respondidosGeral / checklistAtual.itens.length) * 100) : 100;
    }

    const respondidos = itensObrigatorios.filter(i => respostas[i.id_item]?.valor_resposta).length;
    return Math.round((respondidos / itensObrigatorios.length) * 100);
  };

  const progresso = calcularProgresso();
  
  // Variáveis matemáticas para desenhar o círculo SVG
  const raioCirculo = 24;
  const circunferencia = 2 * Math.PI * raioCirculo;
  const offsetCirculo = circunferencia - (progresso / 100) * circunferencia;

  // ==========================================
  // LÓGICA BLINDADA: SETOR PAI > FILHO
  // ==========================================
  const construirNomeSetor = (setorAtual, listaCompleta) => {
    if (!setorAtual.id_setor_pai || String(setorAtual.id_setor_pai) === '0') return setorAtual.nome; 
    const setorPai = listaCompleta.find(s => String(s.id_setor) === String(setorAtual.id_setor_pai));
    if (setorPai && String(setorPai.id_setor) !== String(setorAtual.id_setor)) {
      return `${construirNomeSetor(setorPai, listaCompleta)} > ${setorAtual.nome}`;
    }
    return setorAtual.nome;
  };

  const getNomeSetorParaDropdown = (idSetor) => {
    if (!idSetor) return '';
    const setor = todosSetores.find(s => String(s.id_setor) === String(idSetor));
    return setor ? construirNomeSetor(setor, todosSetores) : '';
  };

  const carregarChecklistsDoSetor = async () => {
    try {
      let arraySetoresId = [];
      if (Array.isArray(usuario?.setores)) arraySetoresId = usuario.setores;
      else if (usuario?.setores_ids) arraySetoresId = usuario.setores_ids;
      else if (usuario?.setor) arraySetoresId = [usuario.setor]; 

      const arrayNormalizado = arraySetoresId.map(val => String(val).toLowerCase());
      
      const resSetores = await fetchWithAuth('/api/setores');
      if (resSetores.ok) {
        const jsonSetores = await resSetores.json();
        const setoresBrutos = jsonSetores.data || [];
        setTodosSetores(setoresBrutos);
        
        const setoresExplicitos = setoresBrutos.filter(s => 
          arrayNormalizado.includes(String(s.id_setor)) || arrayNormalizado.includes(String(s.nome).toLowerCase())
        );

        setNomesSetores(setoresExplicitos.map(s => construirNomeSetor(s, setoresBrutos)));

        let idsPermitidos = new Set(setoresExplicitos.map(s => Number(s.id_setor)));
        let adicionouNovo = true;
        while(adicionouNovo) {
          adicionouNovo = false;
          setoresBrutos.forEach(s => {
            if (s.id_setor_pai && idsPermitidos.has(Number(s.id_setor_pai)) && !idsPermitidos.has(Number(s.id_setor))) {
              idsPermitidos.add(Number(s.id_setor));
              adicionouNovo = true;
            }
          });
        }

        const idsReaisDeBusca = Array.from(idsPermitidos);
        if (idsReaisDeBusca.length === 0) return setChecklistsDisponiveis([]);

        const promessas = idsReaisDeBusca.map(id => fetchWithAuth(`/api/checklists?id_setor=${id}`));
        const respostasFetch = await Promise.all(promessas);
        
        let checklistsUnidos = [];
        for (const res of respostasFetch) {
          if (res.ok) {
            const json = await res.json();
            checklistsUnidos = [...checklistsUnidos, ...(json.data || [])];
          }
        }
        
        const checklistsUnicos = Array.from(new Map(checklistsUnidos.map(item => [item.id_checklist, item])).values());
        setChecklistsDisponiveis(checklistsUnicos);
      }
    } catch (erro) { console.error('Erro ao buscar checklists do setor:', erro); }
  };

  const handleMudancaBusca = (e) => {
    setBusca(e.target.value);
    setDropdownAberto(true);
    if (e.target.value === '') limparFluxo();
  };

  // ==========================================
  // PASSO A: INICIAR EXECUÇÃO NO BANCO
  // ==========================================
  const handleSelecionarDoDropdown = async (checklistEscolhido) => {
    limparFluxo(); 
    setBusca(checklistEscolhido.titulo); 
    setDropdownAberto(false); 
    
    try {
      const resLock = await fetchWithAuth('/api/execucoes/iniciar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_checklist: checklistEscolhido.id_checklist })
      });

      if (resLock.status === 409) {
        return mostrarAlerta('bloqueio', 'Tarefa Assumida', 'Este checklist acabou de ser iniciado por outro operador na rede. Por favor, selecione outra tarefa.');
      }

      if (resLock.ok) {
        const jsonLock = await resLock.json();
        const novaExecucaoId = jsonLock.data.id_execucao;

        const response = await fetchWithAuth(`/api/checklists/${checklistEscolhido.id_checklist}`);
        if (response.ok) {
          const json = await response.json();
          const dadosBasicos = json.data || json;
          
          const checklistExtraido = dadosBasicos.checklist || dadosBasicos;
          const listaItens = checklistExtraido.itens || dadosBasicos.itens || [];
          
          if (listaItens.length === 0) {
            return mostrarAlerta('erro', 'Checklist Vazio', 'Este checklist não possui perguntas cadastradas. Peça ao administrador para revisar.');
          }

          const respostasIniciais = {};
          const agrupados = {}; 

          listaItens.forEach(item => {
            respostasIniciais[item.id_item] = { valor_resposta: '', observacao: '', fotoBase64: null, fotoNome: '' };
            
            const nomeEtapa = item.etapa || 'Verificação Única';
            if (!agrupados[nomeEtapa]) agrupados[nomeEtapa] = [];
            agrupados[nomeEtapa].push(item);
          });
          
          setChecklistAtual(checklistExtraido);
          setRespostas(respostasIniciais);
          setEtapas(Object.keys(agrupados).map(nome => ({ nome, itens: agrupados[nome] })));
          setEtapaExpandida(0); 
          setIdExecucao(novaExecucaoId);
        } else {
          mostrarAlerta('erro', 'Erro', 'Não foi possível buscar as perguntas no servidor.');
        }
      } else {
        mostrarAlerta('erro', 'Erro', 'Não foi possível iniciar o checklist no servidor.');
      }
    } catch (erro) {
      console.error('Erro ao carregar checklist:', erro);
      mostrarAlerta('erro', 'Erro', 'Falha na comunicação com a API.');
    }
  };

  const handleRespostaChange = (idItem, campo, valor) => {
    setRespostas(prev => ({ ...prev, [idItem]: { ...prev[idItem], [campo]: valor } }));
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
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/jpeg', 0.6));
        };
      };
    });
  };

  const handleFotoItemChange = async (idItem, e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
      const fotoLeveBase64 = await comprimirImagemEGerarBase64(arquivo);
      setRespostas(prev => ({ ...prev, [idItem]: { ...prev[idItem], fotoBase64: fotoLeveBase64, fotoNome: arquivo.name || `evidencia_${idItem}.jpg` } }));
    }
  };

  const base64ToBlob = (base64) => {
    const byteCharacters = atob(base64.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); }
    return new Blob([new Uint8Array(byteNumbers)], { type: 'image/jpeg' });
  };

  const salvarPosicaoScroll = () => {
    sessionStorage.setItem('scrollChecklist', window.scrollY.toString());
  };

  // ==========================================
  // VALIDAÇÃO E FINALIZAÇÃO
  // ==========================================
  const validarTudo = () => {
    for (let index = 0; index < etapas.length; index++) {
      const etapa = etapas[index];
      for (let item of etapa.itens) {
        if (item.obrigatorio && !respostas[item.id_item]?.valor_resposta) {
          mostrarAlerta('erro', 'Atenção', `A pergunta "${item.descricao}" na etapa "${etapa.nome}" é obrigatória.`);
          setEtapaExpandida(index); 
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return false;
        }
      }
    }
    return true;
  };

  const handleFinalizarChecklist = async () => {
    if (!validarTudo()) return;

    const payloadFinalizar = {
      ordem_servico: ordemServico,
      respostas: Object.entries(respostas).map(([id_item, dados]) => {
        const listaItens = checklistAtual?.itens || [];
        const itemOriginal = listaItens.find(i => String(i.id_item) === String(id_item));
        
        let respostaFormatada = dados.valor_resposta;
        if (respostaFormatada === 'Não Conforme') respostaFormatada = 'Não'; 

        return {
          id_item: Number(id_item),
          tipo: itemOriginal?.tipo || 'booleano', 
          valor_resposta: respostaFormatada,
          observacao: dados.observacao
        };
      })
    };

    try {
      const response = await fetchWithAuth(`/api/execucoes/${idExecucao}/finalizar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFinalizar)
      });
      
      if (response.ok) {
        const resultadoJson = await response.json();
        const respostasSalvas = resultadoJson.data?.execucao?.respostas || resultadoJson.data?.respostas || [];

        for (const [id_item, dados] of Object.entries(respostas)) {
          if (dados.fotoBase64) {
            const respostaCorrespondente = respostasSalvas.find(r => r.id_item === Number(id_item));
            if (respostaCorrespondente && respostaCorrespondente.id_resposta) {
              const formDataFoto = new FormData();
              const arquivoBlob = base64ToBlob(dados.fotoBase64);
              formDataFoto.append('imagem', arquivoBlob, dados.fotoNome);

              await fetchWithAuth(`/api/respostas/${respostaCorrespondente.id_resposta}/imagem`, {
                method: 'POST', body: formDataFoto
              });
            }
          }
        }

        sessionStorage.removeItem('checklistRascunho'); 
        const possuiNC = resultadoJson.data?.possui_nc;
        
        if (possuiNC) {
           mostrarAlerta('sucesso', 'Salvo com Ressalvas', 'Checklist enviado! A Não Conformidade foi detectada e encaminhada ao painel do Admin.');
        } else {
           mostrarAlerta('sucesso', 'Checklist Concluído!', 'Suas respostas e evidências foram salvas com sucesso.');
        }
        
      } else  {
        mostrarAlerta('erro', 'Erro ao salvar', 'Ocorreu um erro ao enviar o checklist finalizado.');
      }
    } catch (erro) {
      console.error('Erro ao finalizar checklist:', erro);
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  const checklistsFiltrados = checklistsDisponiveis.filter(c => {
    const tituloSeguro = c.titulo ? c.titulo.toLowerCase() : '';
    const buscaSegura = busca ? busca.toLowerCase() : '';
    return tituloSeguro.includes(buscaSegura);
  });

  const setoresAgrupados = nomesSetores.reduce((acc, nomeCompleto) => {
    const partes = nomeCompleto.split(' > ');
    const pai = partes[0];
    const filho = partes.length > 1 ? partes.slice(1).join(' > ') : null;
    if (!acc[pai]) acc[pai] = [];
    if (filho && !acc[pai].includes(filho)) acc[pai].push(filho);
    return acc;
  }, {});

  const paisList = Object.keys(setoresAgrupados);
  const temSubsetores = Object.values(setoresAgrupados).some(filhos => filhos.length > 0);

  return (
    <div className="preencher-container">
      <div className="preencher-card" style={{ maxWidth: '900px' }}>
        <h2>{idExecucao ? `Execução #${idExecucao}` : 'Preencher Checklist'}</h2>
        
        {!idExecucao && (
          <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'left' }}>
            <p style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '0.9rem', fontWeight: 'bold' }}>Seus Setores Ativos:</p>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {paisList.length > 0 ? (
                paisList.map(pai => (
                  <span key={pai} style={{ backgroundColor: '#0284c7', color: 'white', padding: '4px 12px', borderRadius: '15px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {pai}
                  </span>
                ))
              ) : (
                <span style={{ color: '#64748b' }}>Buscando setores...</span>
              )}

              {temSubsetores && (
                <button 
                  type="button"
                  onClick={() => setMostrarSubsetores(!mostrarSubsetores)}
                  style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: '15px', padding: '4px 12px', fontSize: '0.8rem', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', transition: 'all 0.2s', backgroundColor: 'white' }}
                >
                  {mostrarSubsetores ? 'Esconder detalhes ▲' : 'Ver subsetores ▼'}
                </button>
              )}
            </div>

            {mostrarSubsetores && temSubsetores && (
              <div style={{ marginTop: '15px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(setoresAgrupados).map(([pai, filhos]) => {
                  if (filhos.length === 0) return null;
                  return (
                    <div key={pai} style={{ fontSize: '0.85rem', color: '#334155' }}>
                      <strong style={{ color: '#0284c7' }}>↳ {pai}:</strong> {filhos.join(', ')}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!idExecucao && (
          <div className="selecao-checklist" style={{ position: 'relative' }}>
            <label htmlFor="busca-checklist">Busque ou selecione uma tarefa para iniciar:</label>
            <input
              type="text"
              id="busca-checklist"
              placeholder="Clique para ver ou digite para buscar..."
              className="input-padrao"
              value={busca}
              onChange={handleMudancaBusca}
              onFocus={() => setDropdownAberto(true)}
              onBlur={() => setTimeout(() => setDropdownAberto(false), 200)} 
              autoComplete="off"
            />
            {dropdownAberto && checklistsFiltrados.length > 0 && (
              <ul className="dropdown-checklists">
                {checklistsFiltrados.map(c => (
                  <li 
                    key={c.id_checklist}
                    className="dropdown-item"
                    onClick={() => handleSelecionarDoDropdown(c)}
                    style={{ display: 'flex', flexDirection: 'column', padding: '10px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span className="dropdown-icone" style={{ marginRight: '8px' }}>📄</span>
                      <strong>{c.titulo}</strong>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '28px' }}>
                      Setor: {getNomeSetorParaDropdown(c.id_setor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {dropdownAberto && checklistsFiltrados.length === 0 && (
              <div className="dropdown-empty">Nenhum checklist encontrado para seus setores.</div>
            )}
          </div>
        )}

        {/* ======================================================= */}
        {/* CABEÇALHO STICKY (ACOMPANHA O SCROLL COM A PORCENTAGEM) */}
        {/* ======================================================= */}
        {idExecucao && (
          <div style={{ 
            position: 'sticky', 
            top: '15px', 
            zIndex: 50, 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(5px)',
            border: '1px solid #cbd5e1', 
            padding: '12px 20px', 
            borderRadius: '12px', 
            marginBottom: '1.5rem', 
            boxShadow: '0 6px 15px rgba(0,0,0,0.08)' 
          }}>
            <div>
              <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.1rem' }}>{checklistAtual?.titulo || busca || 'Carregando...'}</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#10b981', fontWeight: 'bold' }}>Sessão iniciada e travada no banco.</p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', display: window.innerWidth < 450 ? 'none' : 'flex' }}>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 'bold' }}>Progresso</span>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Obrigatórios</span>
              </div>
              <div style={{ position: 'relative', width: '56px', height: '56px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <svg width="56" height="56" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="28" cy="28" r={raioCirculo} stroke="#e2e8f0" strokeWidth="6" fill="none" />
                  <circle 
                    cx="28" cy="28" r={raioCirculo} 
                    stroke="#10b981" strokeWidth="6" fill="none" strokeLinecap="round"
                    strokeDasharray={circunferencia} 
                    strokeDashoffset={offsetCirculo} 
                    style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }} 
                  />
                </svg>
                <span style={{ position: 'absolute', fontSize: '0.85rem', fontWeight: 'bold', color: '#334155' }}>
                  {progresso}%
                </span>
              </div>
            </div>
          </div>
        )}

        {idExecucao && etapas.length > 0 && (
          <div className="formulario-perguntas">
            
            <div className="campo-os" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <label htmlFor="input-os" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                Número da OS (Ordem de Serviço Opcional):
              </label>
              <input
                type="text"
                id="input-os"
                className="input-padrao"
                placeholder="Ex: OS-12345"
                value={ordemServico}
                onChange={(e) => setOrdemServico(e.target.value)}
              />
            </div>

            {/* SANFONA DE ETAPAS */}
            <div className="accordion-container">
              {etapas.map((etapa, indexEtapa) => {
                const isExpanded = etapaExpandida === indexEtapa;
                const itensObrigatoriosEtapa = etapa.itens.filter(i => i.obrigatorio);
                const etapaConcluida = itensObrigatoriosEtapa.length > 0 
                  ? itensObrigatoriosEtapa.every(i => respostas[i.id_item]?.valor_resposta)
                  : true; 

                return (
                  <div key={indexEtapa} style={{ marginBottom: '1rem' }}>
                    <div 
                      onClick={() => setEtapaExpandida(isExpanded ? null : indexEtapa)}
                      style={{ backgroundColor: isExpanded ? '#0f172a' : '#f8fafc', color: isExpanded ? 'white' : '#334155', padding: '14px 20px', borderRadius: isExpanded ? '8px 8px 0 0' : '8px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s', border: isExpanded ? 'none' : '1px solid #cbd5e1' }}
                    >
                      <strong style={{ fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span>{etapaConcluida ? '✅' : '⏳'}</span>
                        {etapa.nome}
                      </strong>
                      <span style={{ fontSize: '0.85rem', fontWeight: 'bold', backgroundColor: isExpanded ? '#334155' : '#e2e8f0', color: isExpanded ? 'white' : '#475569', padding: '4px 10px', borderRadius: '15px' }}>
                        {isExpanded ? '▲ Fechar' : '▼ Abrir'}
                      </span>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '1.5rem 1rem', border: '1px solid #cbd5e1', borderTop: 'none', borderRadius: '0 0 8px 8px', backgroundColor: '#ffffff' }}>
                        {etapa.itens.map((item) => {
                          const urlReferencia = item.imagem_url || item.imagem_referencia;

                          return (
                            <div key={item.id_item} className="pergunta-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem', backgroundColor: '#f8fafc' }}>
                              <p className="pergunta-texto" style={{ fontSize: '0.95rem' }}>
                                <strong>{item.ordem}.</strong> {item.descricao} 
                                {item.obrigatorio && <span className="asterisco"> *</span>}
                              </p>

                              {urlReferencia && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                                  <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>📋 Foto Padrão (Referência):</span>
                                  <img 
                                    src={urlReferencia} 
                                    alt="Referência do Item" 
                                    title="Clique para ampliar"
                                    onClick={() => setImagemAmpliada(urlReferencia)}
                                    style={{ 
                                      width: '120px', height: 'auto', maxHeight: '120px', objectFit: 'contain', 
                                      borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff',
                                      padding: '2px', cursor: 'pointer', transition: 'transform 0.2s' 
                                    }}
                                    onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                    onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                  />
                                </div>
                              )}

                              <div className="resposta-area" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                                {item.tipo === 'booleano' && (
                                  <select
                                    required={item.obrigatorio}
                                    className="input-padrao"
                                    value={respostas[item.id_item]?.valor_resposta || ''}
                                    onChange={(e) => handleRespostaChange(item.id_item, 'valor_resposta', e.target.value)}
                                    style={{ backgroundColor: 'white' }}
                                  >
                                    <option value="" disabled>Selecione...</option>
                                    <option value="Conforme">Conforme</option>
                                    <option value="Não Conforme">Não Conforme</option>
                                    <option value="Não se Aplica">Não se Aplica</option>
                                  </select>
                                )}

                                {item.tipo === 'texto' && (
                                  <input
                                    type="text"
                                    required={item.obrigatorio}
                                    className="input-padrao"
                                    placeholder="Digite sua resposta"
                                    value={respostas[item.id_item]?.valor_resposta || ''}
                                    onChange={(e) => handleRespostaChange(item.id_item, 'valor_resposta', e.target.value)}
                                    style={{ backgroundColor: 'white' }}
                                  />
                                )}

                                {item.tipo === 'numero' && (
                                  <input
                                    type="number"
                                    required={item.obrigatorio}
                                    className="input-padrao"
                                    placeholder="Digite um valor numérico"
                                    value={respostas[item.id_item]?.valor_resposta || ''}
                                    onChange={(e) => handleRespostaChange(item.id_item, 'valor_resposta', e.target.value)}
                                    style={{ backgroundColor: 'white' }}
                                  />
                                )}

                                <input
                                  type="text"
                                  className="input-observacao"
                                  placeholder="Observação (Opcional)"
                                  value={respostas[item.id_item]?.observacao || ''}
                                  onChange={(e) => handleRespostaChange(item.id_item, 'observacao', e.target.value)}
                                  style={{ backgroundColor: 'white' }}
                                />

                                <div className="evidencia-container" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexDirection: 'column', marginTop: '0.3rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.8rem' }}>
                                  
                                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                    <label 
                                      htmlFor={`camera-input-${item.id_item}`} 
                                      onClick={salvarPosicaoScroll}
                                      style={{ cursor: 'pointer', backgroundColor: '#0284c7', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      📸 Tirar Foto
                                    </label>
                                    <input
                                      id={`camera-input-${item.id_item}`}
                                      type="file"
                                      accept="image/*"
                                      capture="environment"
                                      onChange={(e) => handleFotoItemChange(item.id_item, e)}
                                      style={{ display: 'none' }}
                                    />

                                    <label 
                                      htmlFor={`galeria-input-${item.id_item}`} 
                                      onClick={salvarPosicaoScroll}
                                      style={{ cursor: 'pointer', backgroundColor: '#64748b', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      📁 Escolher da Galeria
                                    </label>
                                    <input
                                      id={`galeria-input-${item.id_item}`}
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handleFotoItemChange(item.id_item, e)}
                                      style={{ display: 'none' }}
                                    />
                                  </div>

                                  {/* IMAGEM DA EVIDÊNCIA DO OPERADOR (contain) */}
                                  {respostas[item.id_item]?.fotoBase64 && (
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.8rem', marginTop: '0.5rem' }}>
                                      <img 
                                        src={respostas[item.id_item].fotoBase64} 
                                        alt="Evidência" 
                                        title="Clique para ampliar"
                                        onClick={() => setImagemAmpliada(respostas[item.id_item].fotoBase64)}
                                        style={{ 
                                          width: '120px', height: 'auto', maxHeight: '120px', objectFit: 'contain', 
                                          borderRadius: '6px', border: '2px solid #0284c7', backgroundColor: '#ffffff',
                                          padding: '2px', cursor: 'pointer', transition: 'transform 0.2s' 
                                        }}
                                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                                      />
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {respostas[item.id_item].fotoNome}
                                        </span>
                                        <button 
                                          type="button" 
                                          onClick={() => {
                                            setRespostas(prev => ({
                                              ...prev,
                                              [item.id_item]: { ...prev[item.id_item], fotoBase64: null, fotoNome: '' }
                                            }));
                                          }}
                                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem', padding: '0', textAlign: 'left' }}
                                          title="Remover foto"
                                        >
                                          Remover Foto
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* BOTÕES DE AÇÃO GERAIS */}
            <div className="botoes-acao" style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem' }}>
              <button 
                type="button" 
                className="btn-voltar" 
                style={{ flex: 1 }}
                onClick={handleCancelarExecucao}
              >
                Cancelar Execução
              </button>
              
              <button 
                type="button" 
                className="btn-salvar" 
                style={{ flex: 2, backgroundColor: '#10b981' }} 
                onClick={handleFinalizarChecklist}
              >
                Finalizar Checklist ✅
              </button>
            </div>
          </div>
        )}

        {!idExecucao && (
          <button className="btn-voltar" onClick={() => navigate('/home')} style={{ marginTop: '2rem', width: '100%' }}>
            Voltar para Home
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL DE CONFIRMAÇÃO DE CANCELAMENTO (PADRONIZADO)        */}
      {/* ========================================================= */}
      {modalConfirmacao.visivel && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center' }}>
            <h3 style={{ color: '#ef4444', fontSize: '1.4rem' }}>⚠️ Atenção</h3>
            <p style={{ margin: '15px 0 25px 0', color: '#334155', lineHeight: '1.5' }}>
              {modalConfirmacao.mensagem}
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#333', fontWeight: 'bold', cursor: 'pointer' }} 
                onClick={() => setModalConfirmacao({ visivel: false, acao: null, mensagem: '' })}
              >
                Não, voltar
              </button>
              <button 
                style={{ flex: 1, padding: '12px', borderRadius: '6px', border: 'none', backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold', cursor: 'pointer' }} 
                onClick={() => { modalConfirmacao.acao(); setModalConfirmacao({ visivel: false, acao: null, mensagem: '' }); }}
              >
                Sim, cancelar tarefa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AMPLIAR IMAGEM */}
      {imagemAmpliada && (
        <div 
          onClick={() => setImagemAmpliada(null)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 3000, cursor: 'pointer', padding: '2rem'
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

      {/* ALERTAS GERAIS */}
      {alerta.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            {alerta.tipo === 'sucesso' ? '✅' : alerta.tipo === 'bloqueio' ? '🛑' : '⚠️'}
            <h3 className={alerta.tipo === 'erro' || alerta.tipo === 'bloqueio' ? 'texto-erro' : 'texto-sucesso'}>{alerta.titulo}</h3>
            <p>{alerta.mensagem}</p>
            <button className="modal-button" onClick={fecharAlerta}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}