import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import './Dashboard.css';

// ======================================================
// COMPONENTES GENÉRICOS DE GRÁFICO (COMPONENTIZAÇÃO)
// ======================================================

const GraficoRanking = ({ data }) => {
  // Blindagem: Garante que o total seja lido como número
  const dadosFormatados = Array.isArray(data) ? data.map(item => ({
    ...item,
    total: Number(item.total) || 0
  })) : [];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={dadosFormatados} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} angle={-15} textAnchor="end" />
        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
        <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
        <Bar dataKey="total" name="Total de NCs" fill="#dc2626" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const GraficoTempo = ({ data }) => {
  // Blindagem: Garante que os segundos sejam lidos como números
  const dadosFormatados = Array.isArray(data) ? data.map(item => ({
    ...item,
    tempo_medio_segundos: Number(item.tempo_medio_segundos) || 0
  })) : [];

  const formatarSegundosParaLegivel = (segundos) => {
    if (!segundos) return '0m';
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{ backgroundColor: 'white', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <p style={{ margin: 0, fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>{label}</p>
          <p style={{ margin: 0, color: '#0284c7' }}>Tempo Médio: {formatarSegundosParaLegivel(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={dadosFormatados} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} angle={-15} textAnchor="end" />
        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} tickFormatter={(val) => `${Math.floor(val/3600)}h`} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
        <Bar dataKey="tempo_medio_segundos" name="Tempo Médio" fill="#0284c7" radius={[4, 4, 0, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const GraficoEvolucao = ({ data }) => {
  const formatarDataCurta = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const hora = String(date.getHours()).padStart(2, '0');
    return `${dia}/${mes} ${hora}h`;
  };

  // Blindagem: Garante que as medições sejam números
  const dadosFormatados = Array.isArray(data) ? data.map(item => ({
    ...item,
    data_formatada: formatarDataCurta(item.data_medicao),
    valor: Number(item.valor) || 0
  })) : [];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={dadosFormatados} margin={{ top: 20, right: 30, left: 0, bottom: 25 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="data_formatada" tick={{ fontSize: 12, fill: '#64748b' }} angle={-15} textAnchor="end" />
        <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
        <Line type="monotone" dataKey="valor" name="Medição" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} activeDot={{ r: 6 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

const GraficoCategorico = ({ data }) => {
  const getColor = (nome) => {
    const nomeBaixa = String(nome).toLowerCase();
    if (nomeBaixa.includes('não') || nomeBaixa.includes('vazamento') || nomeBaixa.includes('quebrado') || nomeBaixa.includes('ruim')) return '#dc2626'; 
    if (nomeBaixa.includes('conforme') || nomeBaixa === 'sim' || nomeBaixa.includes('bom')) return '#16a34a'; 
    return '#0284c7'; 
  };

  // Blindagem: Garante que o total seja um número, senão o PieChart não renderiza
  const dadosFormatados = Array.isArray(data) ? data.map(item => ({
    ...item,
    total: Number(item.total) || 0
  })) : [];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie 
          data={dadosFormatados} 
          cx="50%" 
          cy="50%" 
          innerRadius={60} 
          outerRadius={90} 
          paddingAngle={5} 
          dataKey="total" 
          nameKey="name" /* Garante que ele sabe onde ler o nome */
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} 
          isAnimationActive={false}
        >
          {dadosFormatados.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={getColor(entry.name)} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #cbd5e1', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
      </PieChart>
    </ResponsiveContainer>
  );
};

// ======================================================
// COMPONENTE PRINCIPAL: TELA DE DASHBOARD
// ======================================================

export default function Dashboard() {
  const navigate = useNavigate();
  
  const [loadingGeral, setLoadingGeral] = useState(true);
  const [rankingNcs, setRankingNcs] = useState([]);
  const [tempoResolucao, setTempoResolucao] = useState([]);
  
  const [checklistsDisponiveis, setChecklistsDisponiveis] = useState([]);
  const [idChecklistSelecionado, setIdChecklistSelecionado] = useState('');
  const [itensDisponiveis, setItensDisponiveis] = useState([]);
  const [idItemSelecionado, setIdItemSelecionado] = useState('');
  
  const [loadingAnalise, setLoadingAnalise] = useState(false);
  const [dadosAnalise, setDadosAnalise] = useState([]);
  const [tipoGraficoAnalise, setTipoGraficoAnalise] = useState(null); 

  useEffect(() => {
    carregarDadosGerais();
  }, []);

  const carregarDadosGerais = async () => {
    setLoadingGeral(true);
    try {
      const resRanking = await fetchWithAuth('/api/dashboard/ncs-por-checklist');
      if (resRanking.ok) {
        const json = await resRanking.json();
        setRankingNcs(Array.isArray(json.data) ? json.data : []);
      }

      const resTempo = await fetchWithAuth('/api/dashboard/tempo-resolucao');
      if (resTempo.ok) {
        const json = await resTempo.json();
        setTempoResolucao(Array.isArray(json.data) ? json.data : []);
      }

      const resChecklists = await fetchWithAuth('/api/checklists?limit=100');
      if (resChecklists.ok) {
        const json = await resChecklists.json();
        setChecklistsDisponiveis(Array.isArray(json.data) ? json.data : []);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do dashboard:", error);
    } finally {
      setLoadingGeral(false);
    }
  };

  const handleChecklistChange = async (e) => {
    const idChecklist = e.target.value;
    setIdChecklistSelecionado(idChecklist);
    setIdItemSelecionado('');
    setDadosAnalise([]);
    setTipoGraficoAnalise(null);

    if (!idChecklist) return;

    try {
      const res = await fetchWithAuth(`/api/checklists/${idChecklist}`);
      if (res.ok) {
        const json = await res.json();
        const dados = json.data || json;
        setItensDisponiveis(dados.itens || []);
      }
    } catch (error) {
      console.error("Erro ao buscar itens do checklist:", error);
    }
  };

  const handleItemChange = async (e) => {
    const idItem = e.target.value;
    setIdItemSelecionado(idItem);
    
    if (!idItem) {
      setDadosAnalise([]);
      return;
    }

    const itemObj = itensDisponiveis.find(i => String(i.id_item) === String(idItem));
    if (!itemObj) return;

    const tipoFiltro = itemObj.tipo === 'numero' ? 'NUMERICO' : 'CATEGORICO';
    setTipoGraficoAnalise(tipoFiltro);
    setLoadingAnalise(true);

    try {
      const res = await fetchWithAuth(`/api/dashboard/analise-item?idItem=${idItem}&tipo=${tipoFiltro}`);
      if (res.ok) {
        const json = await res.json();
        const arrayResult = Array.isArray(json.data) ? json.data : [];
        setDadosAnalise(arrayResult);
      } else {
        setDadosAnalise([]);
      }
    } catch (error) {
      console.error("Erro ao buscar análise do item:", error);
      setDadosAnalise([]);
    } finally {
      setLoadingAnalise(false);
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <button className="btn-voltar-dash" onClick={() => navigate('/home')}>← Voltar</button>
        <h2>Dashboard Analítico</h2>
      </div>

      {loadingGeral ? (
        <div className="skeleton-container">
          <div className="skeleton-card"></div>
          <div className="skeleton-card"></div>
        </div>
      ) : (
        <>
          <div className="dashboard-grid">
            <div className="dash-card">
              <h3>Volume de Não Conformidades (Por Checklist)</h3>
              <p className="dash-subtitle">Setores/Equipamentos com maior índice de falhas reportadas.</p>
              {rankingNcs.length > 0 ? (
                <GraficoRanking data={rankingNcs} />
              ) : (
                <p className="dash-empty">Dados insuficientes para este gráfico.</p>
              )}
            </div>

            <div className="dash-card">
              <h3>SLA Médio de Resolução de Problemas</h3>
              <p className="dash-subtitle">Tempo que a equipe demora para resolver e dar baixa nas NCs.</p>
              {tempoResolucao.length > 0 ? (
                <GraficoTempo data={tempoResolucao} />
              ) : (
                <p className="dash-empty">Dados insuficientes para este gráfico.</p>
              )}
            </div>
          </div>

          <div className="dash-card full-width" style={{ marginTop: '1.5rem' }}>
            <h3>Análise Específica de Pergunta (Tendência e Qualidade)</h3>
            <p className="dash-subtitle">Selecione um checklist e uma pergunta para visualizar os dados históricos.</p>
            
            <div className="filtros-dinamicos">
              <select value={idChecklistSelecionado} onChange={handleChecklistChange} className="select-dash">
                <option value="">1. Selecione um Checklist...</option>
                {checklistsDisponiveis.map(chk => (
                  <option key={chk.id_checklist} value={chk.id_checklist}>{chk.titulo}</option>
                ))}
              </select>

              <select value={idItemSelecionado} onChange={handleItemChange} className="select-dash" disabled={!idChecklistSelecionado || itensDisponiveis.length === 0}>
                <option value="">2. Selecione uma Pergunta...</option>
                {itensDisponiveis.map(item => (
                  <option key={item.id_item} value={item.id_item}>{item.ordem}. {item.descricao}</option>
                ))}
              </select>
            </div>

            <div className="area-grafico-dinamico">
              {loadingAnalise ? (
                <div className="spinner">Carregando dados...</div>
              ) : dadosAnalise.length > 0 ? (
                tipoGraficoAnalise === 'NUMERICO' ? (
                  <GraficoEvolucao data={dadosAnalise} />
                ) : (
                  <GraficoCategorico data={dadosAnalise} />
                )
              ) : (
                idItemSelecionado && <p className="dash-empty" style={{ margin: 'auto', padding: '2rem' }}>Não há execuções o suficiente para esta pergunta gerar um gráfico.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}