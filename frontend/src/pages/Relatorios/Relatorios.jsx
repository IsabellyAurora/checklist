import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Relatorios.css';

export default function Relatorios() {
  const [execucoes, setExecucoes] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [detalhes, setDetalhes] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    carregarExecucoes();
  }, [page]);

  const carregarExecucoes = async () => {
    try {
      const resposta = await fetch(`/api/execucoes?page=${page}&limit=10`);
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
      const resposta = await fetch(`/api/execucoes/${id_execucao}`);
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

  return (
    <div className="relatorios-container">
      <div className="relatorios-card">
        
        {!detalhes ? (
          <>
            <h2>Relatórios de Execução</h2>
            <p>Histórico de todos os checklists preenchidos.</p>

            <div className="tabela-container">
              <table className="tabela-relatorios">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Checklist</th>
                    <th>Setor</th>
                    <th>Usuário</th>
                    <th>Data/Hora</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {execucoes.length > 0 ? (
                    execucoes.map((exec) => (
                      <tr key={exec.id_execucao}>
                        <td className="col-destaque">#{exec.id_execucao}</td>
                        {/* Puxando os nomes literais enviados pela nova API */}
                        <td><strong>{exec.checklist_titulo}</strong></td>
                        <td>{exec.setor}</td>
                        <td>{exec.usuario_nome}</td>
                        <td>{formatarDataHora(exec.data_inicio)}</td>
                        <td>
                          <button 
                            className="btn-ver-detalhes"
                            onClick={() => verDetalhes(exec.id_execucao)}
                          >
                            Ver Respostas
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="tabela-vazia">Nenhuma execução encontrada.</td>
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
            <h2>Detalhes do Checklist Preenchido</h2>
            
            <div className="info-execucao">
              <p><strong>Execução Nº:</strong> {detalhes.id_execucao}</p>
              <p><strong>Data/Hora:</strong> {formatarDataHora(detalhes.data_inicio)}</p>
              <p><strong>Status:</strong> {detalhes.status || 'Concluído'}</p>
            </div>

            <div className="lista-respostas">
              <h3>Respostas:</h3>
              {detalhes.respostas && detalhes.respostas.length > 0 ? (
                <ul>
                  {detalhes.respostas.map((resp, index) => (
                    <li key={resp.id_resposta || index} className="resposta-item">
                      <p className="pergunta-texto">
                        <strong>Pergunta {resp.id_item}:</strong> {resp.item?.descricao || 'Descrição indisponível'}
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

            <button className="btn-voltar-home" onClick={() => setDetalhes(null)}>
              Voltar para a Lista
            </button>
          </div>
        )}

      </div>
    </div>
  );
}