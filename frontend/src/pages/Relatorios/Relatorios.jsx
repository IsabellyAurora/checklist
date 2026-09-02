import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; 
import './Relatorios.css';

export default function Relatorios() {
  const [execucoes, setExecucoes] = useState([]);
  const [page, setPage] = useState(1);
  const [detalhes, setDetalhes] = useState(null);
  
  // ESTADOS PARA OS FILTROS
  const [filtroId, setFiltroId] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroData, setFiltroData] = useState('');
  const [filtroOs, setFiltroOs] = useState('');

  // Estado para a imagem ampliada (Modal)
  const [imagemAmpliada, setImagemAmpliada] = useState(null);

  const navigate = useNavigate();

  // 1. Volta para a página 1 toda vez que o usuário digitar em algum filtro
  useEffect(() => {
    setPage(1);
  }, [filtroId, filtroUsuario, filtroData, filtroOs]);

  // 2. Carrega TODOS os registros apenas UMA vez ao abrir a tela
  useEffect(() => {
    carregarTodasExecucoes();
  }, []);

  const carregarTodasExecucoes = async () => {
    try {
      // Pedimos um limite altíssimo para o backend trazer tudo e podermos filtrar no front
      const resposta = await fetchWithAuth(`/api/execucoes?page=1&limit=5000`);
      if (resposta.ok) {
        const json = await resposta.json();
        const listaBruta = json.data || [];
        
        // Ordena do mais novo para o mais antigo
        const listaOrdenada = listaBruta.sort((a, b) => b.id_execucao - a.id_execucao);
        setExecucoes(listaOrdenada);
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

  // Trava blindada contra as 3 horas a mais do fuso horário
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

  // 3. Aplica os filtros em TODA a base de dados que está na memória
  const execucoesFiltradas = execucoes.filter((exec) => {
    const matchId = filtroId ? String(exec.id_execucao).includes(filtroId) : true;
    const matchUsuario = filtroUsuario 
      ? exec.usuario_nome?.toLowerCase().includes(filtroUsuario.toLowerCase()) 
      : true;
    const matchData = filtroData 
      ? exec.data_inicio?.includes(filtroData) || formatarDataHora(exec.data_inicio).includes(filtroData)
      : true;
    const matchOs = filtroOs 
      ? exec.ordem_servico?.toLowerCase().includes(filtroOs.toLowerCase()) 
      : true;

    return matchId && matchUsuario && matchData && matchOs;
  });

  // 4. LÓGICA DE PAGINAÇÃO NO FRONT-END
  const itensPorPagina = 10;
  const totalPages = Math.ceil(execucoesFiltradas.length / itensPorPagina) || 1;
  const indexInicio = (page - 1) * itensPorPagina;
  const indexFim = indexInicio + itensPorPagina;
  // Pega apenas os 10 itens correspondentes à página atual
  const execucoesPaginadas = execucoesFiltradas.slice(indexInicio, indexFim);

  return (
    <div className="relatorios-container">
      <div className="relatorios-card" style={{ maxWidth: '1100px' }}>
        
        {!detalhes ? (
          <>
            <h2>Relatórios de Execução</h2>
            <p>Histórico de todos os checklists preenchidos.</p>

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
                  {execucoesPaginadas.length > 0 ? (
                    execucoesPaginadas.map((exec) => (
                      <tr key={exec.id_execucao}>
                        <td className="col-destaque">#{exec.id_execucao}</td>
                        <td>
                          <strong>{exec.checklist_titulo || exec.titulo}</strong><br/>
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
                    <li key={resp.id_resposta || index} className="resposta-item" style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                      <p className="pergunta-texto">
                        <strong>Pergunta {resp.ordem || resp.id_item}:</strong> {resp.descricao || 'Descrição indisponível'}
                      </p>
                      
                      <div className="resposta-dados" style={{ marginTop: '0.5rem' }}>
                        <span className="badge-resposta">
                          Resposta: {resp.valor_resposta || 'Não preenchido'}
                        </span>
                        {resp.observacao && (
                          <p className="obs-texto" style={{ marginTop: '0.5rem' }}><strong>Obs:</strong> {resp.observacao}</p>
                        )}
                      </div>

                      {/* Exibição da Imagem de Evidência */}
                      {resp.imagem_evidencia && (
                        <div style={{ marginTop: '1rem' }}>
                          <p style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#475569', marginBottom: '0.3rem' }}>
                            📸 Evidência Fotográfica:
                          </p>
                          <img 
                            src={resp.imagem_evidencia} 
                            alt="Evidência" 
                            title="Clique para ampliar"
                            onClick={() => setImagemAmpliada(resp.imagem_evidencia)}
                            style={{ 
                              width: '120px', height: '120px', objectFit: 'cover', 
                              borderRadius: '6px', border: '1px solid #cbd5e1', 
                              cursor: 'pointer', transition: 'transform 0.2s' 
                            }}
                            onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                          />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhuma resposta registrada para esta execução.</p>
              )}
            </div>

            <div style={{ marginTop: '2rem' }} className="no-print botoes-acao">
              <button className="btn-voltar-home" style={{ width: '100%' }} onClick={() => setDetalhes(null)}>
                Voltar para a Lista
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL PARA AMPLIAR IMAGEM */}
      {imagemAmpliada && (
        <div 
          onClick={() => setImagemAmpliada(null)}
          className="no-print"
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 3000, cursor: 'pointer', padding: '2rem'
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
    </div>
  );
}