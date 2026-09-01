import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; 
import './Relatorios.css';

export default function Relatorios() {
  const [execucoes, setExecucoes] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [detalhes, setDetalhes] = useState(null);
  
  // NOVOS ESTADOS PARA OS FILTROS
  const [filtroId, setFiltroId] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [filtroOs, setFiltroOs] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    carregarExecucoes();
  }, [page]);

  const carregarExecucoes = async () => {
    try {
      const resposta = await fetchWithAuth(`/api/execucoes?page=${page}&limit=10`);
      if (resposta.ok) {
        const json = await resposta.json();
        setExecucoes(json.data || []);
        setTotalPages(json.totalPages || 1);
      }
    } catch (erro) {
      console.error('Erro ao buscar histórico:', erro);
    }
  };

  const verDetalhes = async (id_execucao) => {
    try {
      const resposta = await fetchWithAuth(`/api/execucoes/${id_execucao}`);
      if (resposta.ok) {
        const json = await resposta.json();
        setDetalhes(json.data || json); 
      } else {
        alert('Erro ao buscar detalhes da execução.');
      }
    } catch (erro) {
      console.error('Erro ao buscar detalhes:', erro);
    }
  };

  const formatarDataHora = (dataIso) => {
    if (!dataIso) return '-';
    const data = new Date(dataIso);
    return data.toLocaleString('pt-BR');
  };

  const formatarTempo = (segundos) => {
    if (segundos === null || segundos === undefined) return '-';
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    const segs = Math.floor(segundos % 60);

    if (horas > 0) return `${horas}h ${minutos}m ${segs}s`;
    if (minutos > 0) return `${minutos}m ${segs}s`;
    return `${segs}s`;
  };

  const handleImprimir = () => {
    window.print();
  };

  // NOVO: Função que filtra a lista atual de execuções com base nos campos preenchidos
  const execucoesFiltradas = execucoes.filter((exec) => {
    // Filtro por ID (ex: digita "5" e acha o ID 5)
    const matchId = filtroId ? String(exec.id_execucao).includes(filtroId) : true;

    // Filtro por Nome do Usuário (case-insensitive)
    const matchUsuario = filtroUsuario 
      ? exec.usuario_nome?.toLowerCase().includes(filtroUsuario.toLowerCase()) 
      : true;

    // Filtro por Data (compara a string ISO ou formato local)
    const matchData = filtroData 
      ? exec.data_inicio?.includes(filtroData) || formatarDataHora(exec.data_inicio).includes(filtroData)
      : true;

    // Filtro por Ordem de Serviço (OS)
    const matchOs = filtroOs 
      ? exec.ordem_servico?.toLowerCase().includes(filtroOs.toLowerCase()) 
      : true;

    return matchId && matchUsuario && matchData && matchOs;
  });

  return (
    <div className="relatorios-container">
      <div className="relatorios-card" style={{ maxWidth: '1100px' }}>
        
        {!detalhes ? (
          <>
            <h2>Relatórios de Execução</h2>
            <p>Histórico de todos os checklists preenchidos.</p>

            {/* NOVO: BARRA DE FILTROS */}
            <div className="filtros-container" style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '1rem', 
              marginBottom: '1.5rem', 
              backgroundColor: '#f8fafc', 
              padding: '1rem', 
              borderRadius: '8px', 
              border: '1px solid #e2e8f0' 
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem', color: '#475569' }}>Filtrar por ID:</label>
                <input 
                  type="text" 
                  placeholder="Ex: 5" 
                  className="input-padrao" 
                  value={filtroId}
                  onChange={(e) => setFiltroId(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem', color: '#475569' }}>Filtrar por Usuário:</label>
                <input 
                  type="text" 
                  placeholder="Nome do operador..." 
                  className="input-padrao" 
                  value={filtroUsuario}
                  onChange={(e) => setFiltroUsuario(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem', color: '#475569' }}>Filtrar por Data:</label>
                <input 
                  type="date" 
                  className="input-padrao" 
                  value={filtroData}
                  onChange={(e) => setFiltroData(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem', color: '#475569' }}>Filtrar por OS:</label>
                <input 
                  type="text" 
                  placeholder="Número da OS..." 
                  className="input-padrao" 
                  value={filtroOs}
                  onChange={(e) => setFiltroOs(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', fontSize: '0.9rem' }}
                />
              </div>
            </div>

            <div className="tabela-container">
              <table className="tabela-relatorios">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Checklist</th>
                    <th>Usuário</th>
                    <th>Início</th>
                    <th>Fim</th>
                    <th>Duração</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {execucoesFiltradas.length > 0 ? (
                    execucoesFiltradas.map((exec) => (
                      <tr key={exec.id_execucao}>
                        <td className="col-destaque">#{exec.id_execucao}</td>
                        <td>
                          <strong>{exec.checklist_titulo}</strong><br/>
                          <small>{exec.setor}</small>
                          {exec.ordem_servico && <><br/><small style={{ color: '#d32f2f', fontWeight: 'bold' }}>OS: {exec.ordem_servico}</small></>}
                        </td>
                        <td>{exec.usuario_nome}</td>
                        <td>{formatarDataHora(exec.data_inicio)}</td>
                        <td>{formatarDataHora(exec.data_conclusao)}</td>
                        <td style={{ fontWeight: 'bold', color: '#1565c0' }}>
                          {formatarTempo(exec.tempo_execucao_segundos)}
                        </td>
                        <td>
                          <button 
                            className="btn-ver-detalhes"
                            onClick={() => verDetalhes(exec.id_execucao)}
                          >
                            Ver
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="tabela-vazia">Nenhuma execução encontrada com esses filtros.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="paginacao-container">
              <button 
                className="btn-paginacao" 
                disabled={page === 1} 
                onClick={() => setPage(page - 1)}
              >
                &laquo; Anterior
              </button>
              <span className="indicador-pagina">Página {page} de {totalPages}</span>
              <button 
                className="btn-paginacao" 
                disabled={page === totalPages || totalPages === 0} 
                onClick={() => setPage(page + 1)}
              >
                Próxima &raquo;
              </button>
            </div>

            <button className="btn-voltar-home" onClick={() => navigate('/home')}>
              Voltar para Home
            </button>
          </>
        ) : (
          
          <div className="detalhes-execucao">
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0 }}>Detalhes do Checklist Preenchido</h2>
              
              <button 
                className="no-print"
                onClick={handleImprimir} 
                style={{ padding: '0.6rem 1.2rem', backgroundColor: '#f57c00', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                🖨️ Imprimir Relatório
              </button>
            </div>
            
            <div className="info-execucao">
              <p><strong>Execução Nº:</strong> {detalhes.id_execucao}</p>
              <p><strong>Ordem de Serviço (OS):</strong> <span style={{ color: '#d32f2f', fontWeight: 'bold' }}>{detalhes.ordem_servico || 'Não informada'}</span></p>
              <p><strong>Checklist:</strong> {detalhes.titulo} ({detalhes.setor})</p>
              <p><strong>Operador:</strong> {detalhes.usuario_nome}</p>
              <p><strong>Status:</strong> {detalhes.status || 'Concluído'}</p>
              <hr style={{ margin: '1rem 0' }} />
              <p><strong>Início:</strong> {formatarDataHora(detalhes.data_inicio)}</p>
              <p><strong>Fim:</strong> {formatarDataHora(detalhes.data_conclusao)}</p>
              <p><strong>Tempo Total de Execução:</strong> {formatarTempo(detalhes.tempo_execucao_segundos)}</p>
            </div>

            <div className="lista-respostas">
              <h3>Respostas:</h3>
              {detalhes.respostas && detalhes.respostas.length > 0 ? (
                <ul>
                  {detalhes.respostas.map((resp, index) => (
                    <li key={resp.id_resposta || index} className="resposta-item">
                      <p className="pergunta-texto">
                        <strong>Pergunta {resp.id_item}:</strong> {resp.descricao || 'Descrição indisponível'}
                      </p>
                      <div className="resposta-dados">
                        <span className="badge-resposta">
                          Resposta: {resp.valor_resposta || 'Não preenchido'}
                        </span>
                        {resp.observacao && (
                          <p className="obs-texto"><strong>Obs:</strong> {resp.observacao}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhuma resposta registrada para esta execução.</p>
              )}
            </div>

            <div style={{ marginTop: '2rem' }} className="no-print botoes-acao">
              <button className="btn-voltar-home" style={{ width: '100광역시' }} onClick={() => setDetalhes(null)}>
                Voltar para a Lista
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}