import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './GerenciarChecklists.css';

export default function GerenciarChecklists() {
  // Estados para o gerenciamento individual
  const [idBusca, setIdBusca] = useState('');
  const [checklist, setChecklist] = useState(null);
  const [editando, setEditando] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState('');
  
  // Estados para a listagem e paginação
  const [listaChecklists, setListaChecklists] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [setorFiltro, setSetorFiltro] = useState('');

  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const navigate = useNavigate();

  const mostrarAlerta = (tipo, titulo, mensagem) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem });
  };

  const fecharAlerta = () => setAlerta({ ...alerta, visivel: false });

  // --------------------------------------------------------
  // LÓGICA DE LISTAGEM (GET /checklists)
  // --------------------------------------------------------
  useEffect(() => {
    carregarLista();
  }, [page, setorFiltro]);

  const carregarLista = async () => {
    try {
      let url = `/api/checklists?page=${page}&limit=5`; // Limitado a 5 para não esticar muito a tela
      if (setorFiltro) url += `&setor=${setorFiltro}`;

      const resposta = await fetch(url);
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

  // --------------------------------------------------------
  // LÓGICA INDIVIDUAL (GET /checklists/{id}, PUT, DELETE)
  // --------------------------------------------------------
  const buscarChecklistPorId = async (id) => {
    if (!id) return;
    try {
      const resposta = await fetch(`/api/checklists/${id}`);
      if (resposta.ok) {
        const json = await resposta.json();
        const dados = json.data || json;
        setChecklist(dados);
        setNovoTitulo(dados.titulo);
        setIdBusca(id); // Atualiza o input se o usuário clicou na tabela
        setEditando(false);
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

  const handleSalvarTitulo = async () => {
    try {
      const resposta = await fetch(`/api/checklists/${checklist.id_checklist}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: novoTitulo })
      });

      if (resposta.ok) {
        mostrarAlerta('sucesso', 'Sucesso!', 'Título atualizado com sucesso.');
        setChecklist({ ...checklist, titulo: novoTitulo });
        setEditando(false);
        carregarLista(); // Atualiza a tabela abaixo
      } else {
        mostrarAlerta('erro', 'Erro', 'Não foi possível atualizar o título.');
      }
    } catch (erro) {
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  const handleInativar = async () => {
    const confirmar = window.confirm("Tem certeza que deseja inativar este checklist?");
    if (!confirmar) return;

    try {
      const resposta = await fetch(`/api/checklists/${checklist.id_checklist}`, { method: 'DELETE' });
      if (resposta.ok) {
        mostrarAlerta('sucesso', 'Inativado!', 'O checklist foi inativado.');
        setChecklist({ ...checklist, ativo: false });
        carregarLista(); // Atualiza a tabela abaixo
      } else {
        mostrarAlerta('erro', 'Erro', 'Não foi possível inativar o checklist.');
      }
    } catch (erro) {
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  return (
    <div className="gerenciar-container">
      <div className="gerenciar-card">
        <h2>Gerenciar Checklists</h2>
        <p>Busque um ID para editar, ou selecione na lista abaixo.</p>

        {/* ÁREA 1: BUSCA INDIVIDUAL */}
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

        {/* ÁREA 2: DETALHES E EDIÇÃO DO CHECKLIST SELECIONADO */}
        {checklist && (
          <div className="checklist-detalhes">
            <div className="status-badge">
              Status: <span className={checklist.ativo ? 'ativo' : 'inativo'}>
                {checklist.ativo ? 'ATIVO' : 'INATIVO'}
              </span>
            </div>

            <div className="edicao-titulo">
              {editando ? (
                <div className="titulo-edit-group">
                  <input 
                    type="text" 
                    value={novoTitulo} 
                    onChange={(e) => setNovoTitulo(e.target.value)}
                    className="input-editar-titulo"
                  />
                  <button onClick={handleSalvarTitulo} className="btn-salvar-titulo">Salvar</button>
                  <button onClick={() => setEditando(false)} className="btn-cancelar">Cancelar</button>
                </div>
              ) : (
                <div className="titulo-view-group">
                  <h3>{checklist.titulo}</h3>
                  <button onClick={() => setEditando(true)} className="btn-editar-titulo">✏️ Editar</button>
                </div>
              )}
            </div>

            <div className="itens-lista">
              <h4>Itens de Verificação:</h4>
              {checklist.itens && checklist.itens.length > 0 ? (
                <ul>
                  {checklist.itens.map((item, index) => (
                    <li key={item.id_item || index}>
                      <strong>{item.ordem}.</strong> {item.descricao} 
                      <em> ({item.tipo}) {item.obrigatorio && '*' }</em>
                    </li>
                  ))}
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

        <hr className="divisor" />

        {/* ÁREA 3: LISTAGEM E PAGINAÇÃO */}
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
                      <td>
                        <button 
                          className="btn-ver-detalhes"
                          onClick={() => buscarChecklistPorId(item.id_checklist)}
                        >
                          Ver
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