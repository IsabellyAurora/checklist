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
  
  // NOVO: Estado para armazenar o número da OS
  const [ordemServico, setOrdemServico] = useState('');

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
        const ativos = (json.data || []).filter(c => c.ativo);
        setChecklistsDisponiveis(ativos);
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
      setOrdemServico(''); // Limpa a OS se apagar a busca
    }
  };

  const handleSelecionarDoDropdown = async (checklistEscolhido) => {
    setBusca(checklistEscolhido.titulo); 
    setDropdownAberto(false); 
    setIdChecklistSelecionado(checklistEscolhido.id_checklist);
    setRespostas({}); 
    setOrdemServico(''); // Limpa a OS ao iniciar um novo checklist
    
    try {
      const response = await fetchWithAuth(`/api/checklists/${checklistEscolhido.id_checklist}`);
      if (response.ok) {
        const json = await response.json();
        const dados = json.data || json;
        setChecklistAtual(dados);
        
        setDataInicio(new Date().toISOString());
        
        const respostasIniciais = {};
        if (dados.itens) {
          dados.itens.forEach(item => {
            respostasIniciais[item.id_item] = { valor_resposta: '', observacao: '' };
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

  const handleEnviarChecklist = async (e) => {
    e.preventDefault();
    
    const dataConclusao = new Date().toISOString();

    const payload = {
      id_checklist: Number(idChecklistSelecionado),
      id_usuario: usuario.id_usuario,
      data_inicio: dataInicio,         
      data_conclusao: dataConclusao,
      dataInicio: dataInicio,
      dataConclusao: dataConclusao,
      ordem_servico: ordemServico, // NOVO: Enviando a OS para o backend
      respostas: Object.entries(respostas).map(([id_item, dados]) => ({
        id_item: Number(id_item),
        valor_resposta: dados.valor_resposta,
        observacao: dados.observacao
      }))
    };

    try {
      const response = await fetchWithAuth('/api/execucoes', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        mostrarAlerta('sucesso', 'Checklist Concluído!', 'Suas respostas foram salvas com sucesso.');
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
      <div className="preencher-card">
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
            
            {/* NOVO: Campo de entrada para a Ordem de Serviço */}
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
                checklistAtual.itens.map((item) => (
                  <div key={item.id_item} className="pergunta-card">
                    <p className="pergunta-texto">
                      <strong>{item.ordem}.</strong> {item.descricao} 
                      {item.obrigatorio && <span className="asterisco"> *</span>}
                    </p>

                    <div className="resposta-area">
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
                    </div>
                  </div>
                ))
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