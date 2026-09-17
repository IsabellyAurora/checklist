import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api';
import './MeuHistorico.css'; 

export default function MeuHistorico() {
  const [execucoes, setExecucoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    carregarHistorico();
  }, []);

  const carregarHistorico = async () => {
    try {
      const res = await fetchWithAuth('/api/execucoes/historico/pessoal?limit=50');
      if (res.ok) {
        const json = await res.json();
        setExecucoes(json.data || []);
      }
    } catch (e) {
      console.error("Erro ao buscar histórico pessoal", e);
    } finally {
      setCarregando(false);
    }
  };

  const formatarData = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('pt-BR');
  };

  return (
    <div className="meu-historico-container">
      <div className="meu-historico-card" style={{ maxWidth: '900px' }}>
        <h2>Meu Histórico de Execuções</h2>
        <p className="meu-historico-subtitulo">Seus últimos checklists iniciados e finalizados.</p>

        {carregando ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Carregando seus dados...</div>
        ) : execucoes.length > 0 ? (
          <div className="tabela-container">
            <table className="tabela-historico">
              <thead>
                <tr>
                  <th>Execução</th>
                  <th>Checklist</th>
                  <th>Início</th>
                  <th>Conclusão</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {execucoes.map(exec => {
                  // BLINDAGEM DO STATUS REAL VINDO DO BANCO
                  const statusReal = exec.status === 'EM_ANDAMENTO' || !exec.data_conclusao;
                  
                  return (
                    <tr key={exec.id_execucao}>
                      <td className="col-destaque"><strong>#{exec.id_execucao}</strong></td>
                      <td>
                        <strong>{exec.checklist_titulo || exec.titulo}</strong>
                        <br/>
                        {exec.ordem_servico && (
                          <small style={{ color: '#0284c7', fontWeight: 'bold' }}>
                            OS: {exec.ordem_servico}
                          </small>
                        )}
                      </td>
                      <td>{formatarData(exec.data_inicio)}</td>
                      <td>{formatarData(exec.data_conclusao)}</td>
                      <td>
                        <span className="badge-status-final" style={{ 
                          backgroundColor: statusReal ? '#fef08a' : (exec.possui_nc ? '#fee2e2' : '#dcfce7'),
                          color: statusReal ? '#a16207' : (exec.possui_nc ? '#dc2626' : '#16a34a')
                        }}>
                          {statusReal ? 'Em Andamento' : (exec.possui_nc ? 'Concluído c/ NC' : 'Concluído')}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="historico-vazio">
            <p>Você ainda não iniciou ou finalizou nenhum checklist.</p>
          </div>
        )}

        <button className="btn-voltar-historico" onClick={() => navigate('/home')}>
          Voltar para Home
        </button>
      </div>
    </div>
  );
}