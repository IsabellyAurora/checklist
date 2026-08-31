import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PreencherChecklist.css';

export default function PreencherChecklist() {
  const [usuario, setUsuario] = useState(null);
  const [checklistsDisponiveis, setChecklistsDisponiveis] = useState([]);
  const [idChecklistSelecionado, setIdChecklistSelecionado] = useState('');
  
  // Detalhes do checklist escolhido (inclui os itens/perguntas)
  const [checklistAtual, setChecklistAtual] = useState(null);
  
  // Estado para armazenar as respostas. Ex: { id_item: { valor_resposta: 'Sim', observacao: '' } }
  const [respostas, setRespostas] = useState({});
  
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const navigate = useNavigate();

  useEffect(() => {
    // Pega os dados do usuário logado para saber o setor e o ID dele
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

  // Busca apenas os checklists ativos do setor do usuário
  const carregarChecklistsDoSetor = async (setor) => {
    try {
      const response = await fetch(`/api/checklists?setor=${setor}`);
      if (response.ok) {
        const json = await response.json();
        // Filtra apenas os ativos, caso a API já não faça isso
        const ativos = (json.data || []).filter(c => c.ativo);
        setChecklistsDisponiveis(ativos);
      }
    } catch (erro) {
      console.error('Erro ao buscar checklists do setor:', erro);
    }
  };

  // Quando o usuário escolhe um checklist no select, busca as perguntas dele
  const handleSelecionarChecklist = async (e) => {
    const id = e.target.value;
    setIdChecklistSelecionado(id);
    setRespostas({}); // Limpa respostas anteriores

    if (!id) {
      setChecklistAtual(null);
      return;
    }

    try {
      const response = await fetch(`/api/checklists/${id}`);
      if (response.ok) {
        const json = await response.json();
        const dados = json.data || json;
        setChecklistAtual(dados);
        
        // Prepara o objeto de respostas vazio baseado nos itens recebidos
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

  // Atualiza o valor de uma resposta ou observação específica
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

    // Formata o payload para a tabela de execucao e respostas do banco de dados
    const payload = {
      id_checklist: Number(idChecklistSelecionado),
      id_usuario: usuario.id_usuario, // Puxa o ID de quem está logado
      respostas: Object.entries(respostas).map(([id_item, dados]) => ({
        id_item: Number(id_item),
        valor_resposta: dados.valor_resposta,
        observacao: dados.observacao
      }))
    };

    try {
      // Confirme com seu colega se a rota para salvar a execução será essa
      const response = await fetch('/api/execucoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  return (
    <div className="preencher-container">
      <div className="preencher-card">
        <h2>Preencher Checklist</h2>
        <p>Setor: <strong>{usuario?.setor}</strong></p>

        <div className="selecao-checklist">
          <label htmlFor="select-checklist">Selecione uma tarefa:</label>
          <select 
            id="select-checklist" 
            value={idChecklistSelecionado} 
            onChange={handleSelecionarChecklist}
            className="input-padrao"
          >
            <option value="">-- Escolha um checklist --</option>
            {checklistsDisponiveis.map(c => (
              <option key={c.id_checklist} value={c.id_checklist}>
                {c.titulo}
              </option>
            ))}
          </select>
        </div>

        {checklistAtual && (
          <form onSubmit={handleEnviarChecklist} className="formulario-perguntas">
            <h3 className="titulo-checklist-atual">{checklistAtual.titulo}</h3>
            
            <div className="lista-perguntas">
              {checklistAtual.itens && checklistAtual.itens.length > 0 ? (
                checklistAtual.itens.map((item) => (
                  <div key={item.id_item} className="pergunta-card">
                    <p className="pergunta-texto">
                      <strong>{item.ordem}.</strong> {item.descricao} 
                      {item.obrigatorio && <span className="asterisco"> *</span>}
                    </p>

                    <div className="resposta-area">
                      {/* Renderiza o input correto dependendo do tipo */}
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

                      {/* Campo opcional de observação para todos os itens */}
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
              <button type="button" className="btn-voltar" onClick={() => navigate('/home')}>
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