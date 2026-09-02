import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; 
import './PreencherChecklist.css';

export default function PreencherChecklist() {
  const [usuario, setUsuario] = useState(null);
  const [checklistsDisponiveis, setChecklistsDisponiveis] = useState([]);
  const [idChecklistSelecionado, setIdChecklistSelecionado] = useState('');
  
  const [busca, setBusca] = useState('');
  const [dropdownAberto, setDropdownAberto] = useState(false);
  
  const [checklistAtual, setChecklistAtual] = useState(null);
  const [respostas, setRespostas] = useState({});
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  
  const [dataInicio, setDataInicio] = useState(null);
  const [ordemServico, setOrdemServico] = useState('');

  // Estado para controlar a imagem ampliada no modal
  const [imagemAmpliada, setImagemAmpliada] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('usuarioLogado');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUsuario(parsedUser);
      carregarChecklistsDoSetor(parsedUser.setor);
    } else {
      navigate('/');
    }
  }, [navigate]);

  const mostrarAlerta = (tipo, titulo, mensagem) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem });
  };

  const fecharAlerta = () => {
    setAlerta({ ...alerta, visivel: false });
    if (alerta.tipo === 'sucesso') navigate('/home');
  };

  const carregarChecklistsDoSetor = async (setor) => {
    try {
      const response = await fetchWithAuth(`/api/checklists?setor=${setor}`);
      if (response.ok) {
        const json = await response.json();
        
        // Log para espiar o que o backend mandou
        console.log("CHECKLISTS QUE VIERAM DO BACKEND:", json.data);
        
        // Mantido sem filtro de 'ativo' temporariamente para validação
        setChecklistsDisponiveis(json.data || []);
      }
    } catch (erro) {
      console.error('Erro ao buscar checklists do setor:', erro);
    }
  };

  const handleMudancaBusca = (e) => {
    setBusca(e.target.value);
    setDropdownAberto(true);
    
    if (e.target.value === '') {
      setIdChecklistSelecionado('');
      setChecklistAtual(null);
      setDataInicio(null);
      setOrdemServico('');
    }
  };

  // Função para pegar a hora local exata sem somar as 3h do UTC
  const obterDataHoraLocal = () => {
    const data = new Date();
    const deslocamento = data.getTimezoneOffset() * 60000;
    const dataLocal = new Date(data.getTime() - deslocamento);
    return dataLocal.toISOString().slice(0, -1);
  };

  const handleSelecionarDoDropdown = async (checklistEscolhido) => {
    setBusca(checklistEscolhido.titulo); 
    setDropdownAberto(false); 
    setIdChecklistSelecionado(checklistEscolhido.id_checklist);
    setRespostas({}); 
    setOrdemServico('');
    
    try {
      const response = await fetchWithAuth(`/api/checklists/${checklistEscolhido.id_checklist}`);
      if (response.ok) {
        const json = await response.json();
        const dados = json.data || json;
        setChecklistAtual(dados);
        
        // Salva a hora local real no início do preenchimento
        setDataInicio(obterDataHoraLocal());
        
        const respostasIniciais = {};
        if (dados.itens) {
          dados.itens.forEach(item => {
            respostasIniciais[item.id_item] = { 
              valor_resposta: '', 
              observacao: '', 
              foto: null, 
              fotoPreview: null 
            };
          });
        }
        setRespostas(respostasIniciais);
      }
    } catch (erro) {
      console.error('Erro ao carregar detalhes do checklist:', erro);
      mostrarAlerta('erro', 'Erro', 'Não foi possível carregar as perguntas deste checklist.');
    }
  };

  const handleRespostaChange = (idItem, campo, valor) => {
    setRespostas(prev => ({
      ...prev,
      [idItem]: {
        ...prev[idItem],
        [campo]: valor
      }
    }));
  };

  // Função para capturar a foto (Câmera ou Galeria)
  const handleFotoItemChange = (idItem, e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
      setRespostas(prev => ({
        ...prev,
        [idItem]: {
          ...prev[idItem],
          foto: arquivo,
          fotoPreview: URL.createObjectURL(arquivo)
        }
      }));
    }
  };

  const handleEnviarChecklist = async (e) => {
    e.preventDefault();
    
    // Usa a função para salvar a hora local real da conclusão
    const dataConclusao = obterDataHoraLocal();

    const payloadPrincipal = {
      id_checklist: Number(idChecklistSelecionado),
      id_usuario: usuario.id_usuario,
      data_inicio: dataInicio,         
      data_conclusao: dataConclusao,
      dataInicio: dataInicio,
      dataConclusao: dataConclusao,
      ordem_servico: ordemServico,
      respostas: Object.entries(respostas).map(([id_item, dados]) => ({
        id_item: Number(id_item),
        valor_resposta: dados.valor_resposta,
        observacao: dados.observacao
      }))
    };

    try {
      const response = await fetchWithAuth('/api/execucoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadPrincipal)
      });

      if (response.ok) {
        const resultadoJson = await response.json();
        const respostasSalvas = resultadoJson.data?.execucao?.respostas || resultadoJson.data?.respostas || [];

        for (const [id_item, dados] of Object.entries(respostas)) {
          if (dados.foto) {
            const respostaCorrespondente = respostasSalvas.find(r => r.id_item === Number(id_item));
            
            if (respostaCorrespondente && respostaCorrespondente.id_resposta) {
              const formDataFoto = new FormData();
              formDataFoto.append('imagem', dados.foto);

              await fetchWithAuth(`/api/respostas/${respostaCorrespondente.id_resposta}/imagem`, {
                method: 'POST',
                body: formDataFoto
              });
            }
          }
        }

        mostrarAlerta('sucesso', 'Checklist Concluído!', 'Suas respostas e evidências foram salvas com sucesso.');
      } else {
        mostrarAlerta('erro', 'Erro ao salvar', 'Ocorreu um erro ao enviar o checklist.');
      }
    } catch (erro) {
      console.error('Erro ao enviar checklist:', erro);
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  const checklistsFiltrados = checklistsDisponiveis.filter(c => {
    const tituloSeguro = c.titulo ? c.titulo.toLowerCase() : '';
    const buscaSegura = busca ? busca.toLowerCase() : '';
    return tituloSeguro.includes(buscaSegura);
  });

  return (
    <div className="preencher-container">
      <div className="preencher-card" style={{ maxWidth: '900px' }}>
        <h2>Preencher Checklist</h2>
        <p>Setor: <strong>{usuario?.setor}</strong></p>

        <div className="selecao-checklist" style={{ position: 'relative' }}>
          <label htmlFor="busca-checklist">Busque ou selecione uma tarefa:</label>
          
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
                >
                  <span className="dropdown-icone">📄</span>
                  {c.titulo}
                </li>
              ))}
            </ul>
          )}
          
          {dropdownAberto && checklistsFiltrados.length === 0 && (
            <div className="dropdown-empty">
              Nenhum checklist encontrado com esse nome.
            </div>
          )}
        </div>

        {checklistAtual && (
          <form onSubmit={handleEnviarChecklist} className="formulario-perguntas">
            <h3 className="titulo-checklist-atual">{checklistAtual.titulo}</h3>
            
            <div className="campo-os" style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <label htmlFor="input-os" style={{ display: 'block', fontWeight: 'bold', marginBottom: '0.5rem', color: '#374151' }}>
                Número da OS (Ordem de Serviço): <span className="asterisco">*</span>
              </label>
              <input
                type="text"
                id="input-os"
                className="input-padrao"
                placeholder="Ex: OS-12345"
                value={ordemServico}
                onChange={(e) => setOrdemServico(e.target.value)}
                required
              />
            </div>

            <div className="lista-perguntas">
              {checklistAtual.itens && checklistAtual.itens.length > 0 ? (
                checklistAtual.itens.map((item) => {
                  const urlReferencia = item.imagem_url || item.imagem_referencia;

                  return (
                    <div key={item.id_item} className="pergunta-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem', backgroundColor: '#fff' }}>
                      
                      <p className="pergunta-texto">
                        <strong>{item.ordem}.</strong> {item.descricao} 
                        {item.obrigatorio && <span className="asterisco"> *</span>}
                      </p>

                      {urlReferencia && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <img 
                            src={urlReferencia} 
                            alt="Referência do Item" 
                            title="Clique para ampliar"
                            onClick={() => setImagemAmpliada(urlReferencia)}
                            style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer' }}
                          />
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Referência do Item</span>
                        </div>
                      )}

                      <div className="resposta-area" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {item.tipo === 'booleano' && (
                          <select
                            required={item.obrigatorio}
                            className="input-padrao"
                            value={respostas[item.id_item]?.valor_resposta || ''}
                            onChange={(e) => handleRespostaChange(item.id_item, 'valor_resposta', e.target.value)}
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
                          />
                        )}

                        {item.tipo === 'numero' && (
                          <input
                            type="number"
                            required={item.obrigatorio}
                            className="input-padrao"
                            placeholder="Digite um valor"
                            value={respostas[item.id_item]?.valor_resposta || ''}
                            onChange={(e) => handleRespostaChange(item.id_item, 'valor_resposta', e.target.value)}
                          />
                        )}

                        <input
                          type="text"
                          className="input-observacao"
                          placeholder="Observação (Opcional)"
                          value={respostas[item.id_item]?.observacao || ''}
                          onChange={(e) => handleRespostaChange(item.id_item, 'observacao', e.target.value)}
                        />

                        <div className="evidencia-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '0.3rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.8rem' }}>
                          
                          <label htmlFor={`camera-input-${item.id_item}`} style={{ cursor: 'pointer', backgroundColor: '#0284c7', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
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

                          <label htmlFor={`galeria-input-${item.id_item}`} style={{ cursor: 'pointer', backgroundColor: '#64748b', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            📁 Escolher da Galeria
                          </label>
                          <input
                            id={`galeria-input-${item.id_item}`}
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleFotoItemChange(item.id_item, e)}
                            style={{ display: 'none' }}
                          />

                          {respostas[item.id_item]?.fotoPreview && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f1f5f9', padding: '0.3rem 0.6rem', borderRadius: '4px' }}>
                              <img 
                                src={respostas[item.id_item].fotoPreview} 
                                alt="Evidência" 
                                title="Clique para ampliar"
                                onClick={() => setImagemAmpliada(respostas[item.id_item].fotoPreview)}
                                style={{ width: '35px', height: '35px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid #cbd5e1' }}
                              />
                              <span style={{ fontSize: '0.8rem', color: '#334155', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {respostas[item.id_item].foto.name}
                              </span>
                              <button 
                                type="button" 
                                onClick={() => {
                                  setRespostas(prev => ({
                                    ...prev,
                                    [item.id_item]: { ...prev[item.id_item], foto: null, fotoPreview: null }
                                  }));
                                }}
                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
                                title="Remover foto"
                              >
                                ✕
                              </button>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p>Este checklist não possui perguntas cadastradas.</p>
              )}
            </div>

            <div className="botoes-acao">
              <button type="button" className="btn-voltar" onClick={() => { setChecklistAtual(null); setBusca(''); setIdChecklistSelecionado(''); setOrdemServico(''); }}>
                Cancelar
              </button>
              <button type="submit" className="btn-salvar" disabled={!checklistAtual.itens?.length}>
                Enviar Respostas
              </button>
            </div>
          </form>
        )}

        {!checklistAtual && (
          <button className="btn-voltar" onClick={() => navigate('/home')} style={{ marginTop: '2rem', width: '100%' }}>
            Voltar para Home
          </button>
        )}
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