import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api';
import './CalendarioAdmin.css';

export default function CalendarioAdmin() {
  const [dataAtual, setDataAtual] = useState(new Date());
  const [checklists, setChecklists] = useState([]);
  const [setoresDisponiveis, setSetoresDisponiveis] = useState([]);

  // Estados do Modal de Agendamento
  const [modalVisivel, setModalVisivel] = useState(false);
  const [dataSelecionada, setDataSelecionada] = useState('');
  const [idChecklistSelecionado, setIdChecklistSelecionado] = useState('');
  const [tipoAgendamento, setTipoAgendamento] = useState('DATA_ESPECIFICA');
  const [intervaloDias, setIntervaloDias] = useState('');

  // Novo: Estado para ver detalhes de um checklist agendado
  const [detalhesEvento, setDetalhesEvento] = useState(null);

  // Estados da Barra de Pesquisa
  const [buscaDia, setBuscaDia] = useState('');
  const [buscaMes, setBuscaMes] = useState(dataAtual.getMonth());
  const [buscaAno, setBuscaAno] = useState(dataAtual.getFullYear());

  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const navigate = useNavigate();

  const mesesNome = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  useEffect(() => {
    carregarDadosBase();
  }, []);

  useEffect(() => {
    setBuscaMes(dataAtual.getMonth());
    setBuscaAno(dataAtual.getFullYear());
  }, [dataAtual]);

  const carregarDadosBase = async () => {
    try {
      const resChk = await fetchWithAuth('/api/checklists?limit=500');
      if (resChk.ok) {
        const json = await resChk.json();
        setChecklists(json.data || []);
      }

      const resSet = await fetchWithAuth('/api/setores');
      if (resSet.ok) {
        const jsonSet = await resSet.json();
        setSetoresDisponiveis(jsonSet.data || []);
      }
    } catch (erro) {
      console.error("Erro ao carregar dados do calendário:", erro);
    }
  };

  const getNomeSetor = (idSetor) => {
    const setor = setoresDisponiveis.find(s => String(s.id_setor) === String(idSetor));
    return setor ? setor.nome : `Setor ${idSetor}`;
  };

  const mostrarAlerta = (tipo, titulo, mensagem) => setAlerta({ visivel: true, tipo, titulo, mensagem });
  
  // ==========================================
  // LÓGICA DO CALENDÁRIO 
  // ==========================================
  const ano = dataAtual.getFullYear();
  const mes = dataAtual.getMonth();

  const primeiroDiaDaSemana = new Date(ano, mes, 1).getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();

  const diasDoCalendario = [];
  for (let i = 0; i < primeiroDiaDaSemana; i++) diasDoCalendario.push(null);
  for (let i = 1; i <= diasNoMes; i++) diasDoCalendario.push(new Date(ano, mes, i));

  const alterarMes = (incremento) => {
    setDataAtual(new Date(ano, mes + incremento, 1));
  };

  const getChecklistsDoDia = (diaDate) => {
    if (!diaDate) return [];
    
    const dataCalendarioNormalizada = new Date(diaDate.getFullYear(), diaDate.getMonth(), diaDate.getDate()).getTime();

    return checklists.filter(c => {
      if (c.tipo_agendamento === 'DATA_ESPECIFICA' && c.data_especifica) {
        const dataStr = String(c.data_especifica).substring(0, 10);
        const [anoE, mesE, diaE] = dataStr.split('-');
        const dataEspNormalizada = new Date(Number(anoE), Number(mesE) - 1, Number(diaE)).getTime();
        return dataEspNormalizada === dataCalendarioNormalizada;
      }

      if (c.tipo_agendamento === 'INTERVALO_DIAS' && c.intervalo_dias && c.data_criacao) {
        const dataCriacaoStr = String(c.data_criacao).substring(0, 10);
        const [anoC, mesC, diaC] = dataCriacaoStr.split('-');
        const criacaoNormalizada = new Date(Number(anoC), Number(mesC) - 1, Number(diaC)).getTime();
        
        if (dataCalendarioNormalizada >= criacaoNormalizada) {
          const diffTempo = Math.abs(dataCalendarioNormalizada - criacaoNormalizada);
          const diffDias = Math.floor(diffTempo / (1000 * 60 * 60 * 24));
          if (diffDias % c.intervalo_dias === 0) return true;
        }
      }
      return false;
    });
  };

  // ==========================================
  // BUSCA INTELIGENTE DE DATA
  // ==========================================
  const handlePesquisarData = (e) => {
    e.preventDefault();
    const anoSelecionado = Number(buscaAno);
    const mesSelecionado = Number(buscaMes);
    
    setDataAtual(new Date(anoSelecionado, mesSelecionado, 1));

    if (buscaDia) {
      const diaSelecionado = Number(buscaDia);
      const dataBuscada = new Date(anoSelecionado, mesSelecionado, diaSelecionado);
      
      if (dataBuscada.getMonth() === mesSelecionado) {
        abrirModalParaData(dataBuscada);
        setBuscaDia(''); 
      } else {
        mostrarAlerta('erro', 'Data Inválida', 'O dia informado não existe neste mês.');
      }
    }
  };

  // ==========================================
  // AÇÕES DOS MODAIS
  // ==========================================
  const abrirModalParaData = (diaDate) => {
    if (!diaDate) return;
    const dataFormatadaStr = `${diaDate.getFullYear()}-${String(diaDate.getMonth() + 1).padStart(2, '0')}-${String(diaDate.getDate()).padStart(2, '0')}`;
    setDataSelecionada(dataFormatadaStr);
    setIdChecklistSelecionado('');
    setTipoAgendamento('DATA_ESPECIFICA');
    setIntervaloDias('');
    setModalVisivel(true);
  };

  // Previne que o clique no evento abra a tela de agendar para o dia
  const abrirDetalhesEvento = (e, checklist) => {
    e.stopPropagation(); 
    setDetalhesEvento(checklist);
  };

  const salvarAgendamento = async (e) => {
    e.preventDefault();
    if (!idChecklistSelecionado) return mostrarAlerta('erro', 'Atenção', 'Selecione o Checklist que deseja agendar.');
    
    try {
      const resOriginal = await fetchWithAuth(`/api/checklists/${idChecklistSelecionado}`);
      const dadosOriginal = await resOriginal.json();
      const checklistCompleto = dadosOriginal.data?.checklist || dadosOriginal.data || dadosOriginal;

      const usuarioString = localStorage.getItem('usuarioLogado') || '{}';
      const usuarioSalvo = JSON.parse(usuarioString);
      const isAdmin = usuarioSalvo.setores?.some(s => String(s).toLowerCase() === 'admin');
      const setorUsuarioHeader = isAdmin ? 'admin' : JSON.stringify(usuarioSalvo.setores_ids || []);

      const payloadAgendamento = {
        titulo: checklistCompleto.titulo,
        id_setor: checklistCompleto.id_setor,
        ativo: checklistCompleto.ativo,
        tipo_agendamento: tipoAgendamento,
        intervalo_dias: tipoAgendamento === 'INTERVALO_DIAS' ? Number(intervaloDias) : null,
        data_especifica: tipoAgendamento === 'DATA_ESPECIFICA' ? dataSelecionada : null,
        itens: checklistCompleto.itens 
      };

      const response = await fetchWithAuth(`/api/checklists/${idChecklistSelecionado}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-setor-usuario': setorUsuarioHeader },
        body: JSON.stringify(payloadAgendamento)
      });

      if (response.ok) {
        setModalVisivel(false);
        carregarDadosBase(); 
        mostrarAlerta('sucesso', 'Agendado!', `Checklist agendado com sucesso para ${tipoAgendamento === 'DATA_ESPECIFICA' ? 'este dia' : 'recorrente'}.`);
      } else {
        mostrarAlerta('erro', 'Erro', 'Falha ao agendar. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro ao agendar:', error);
      mostrarAlerta('erro', 'Sem Conexão', 'Erro de comunicação com o servidor.');
    }
  };

  return (
    <div className="calendario-container">
      <div className="calendario-card">
        
        <div className="calendario-header">
          <h2>Calendário de Manutenção</h2>
        </div>

        {/* BARRA DE PESQUISA DE DATA */}
        <form className="busca-data-form" onSubmit={handlePesquisarData}>
          <label>Buscar Data:</label>
          <div className="busca-inputs">
            <input 
              type="number" 
              placeholder="Dia (Opcional)" 
              min="1" 
              max="31" 
              value={buscaDia} 
              onChange={e => setBuscaDia(e.target.value)} 
              className="input-busca"
            />
            <select 
              value={buscaMes} 
              onChange={e => setBuscaMes(e.target.value)} 
              className="select-busca"
            >
              {mesesNome.map((m, index) => (
                <option key={index} value={index}>{m}</option>
              ))}
            </select>
            <input 
              type="number" 
              placeholder="Ano" 
              value={buscaAno} 
              onChange={e => setBuscaAno(e.target.value)} 
              required 
              className="input-busca"
            />
            <button type="submit" className="btn-buscar-data">🔍 Ir</button>
          </div>
        </form>

        <div className="calendario-nav">
          <button onClick={() => alterarMes(-1)}>◀ Anterior</button>
          <h3>{mesesNome[mes]} {ano}</h3>
          <button onClick={() => alterarMes(1)}>Próximo ▶</button>
        </div>

        <div className="calendario-grid">
          {/* Dias da semana */}
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => (
            <div key={dia} className="calendario-dia-semana">{dia}</div>
          ))}

          {/* Células dos dias do mês */}
          {diasDoCalendario.map((diaObj, index) => {
            if (!diaObj) return <div key={`vazio-${index}`} className="calendario-celula vazia"></div>;

            const hojes = getChecklistsDoDia(diaObj);
            const isHoje = new Date().toDateString() === diaObj.toDateString();

            return (
              <div 
                key={index} 
                className={`calendario-celula ${isHoje ? 'hoje' : ''}`}
                onClick={() => abrirModalParaData(diaObj)}
              >
                <span className="numero-dia">{diaObj.getDate()}</span>
                
                <div className="lista-eventos">
                  {hojes.map(c => (
                    <div 
                      key={c.id_checklist} 
                      className={`evento-chip ${c.tipo_agendamento}`}
                      onClick={(e) => abrirDetalhesEvento(e, c)}
                      title="Clique para ver detalhes"
                    >
                      {c.titulo} 
                      <span className="evento-setor">({getNomeSetor(c.id_setor)})</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* BOTÃO DE VOLTAR NO RODAPÉ */}
        <button 
          className="btn-cancelar" 
          onClick={() => navigate('/home')} 
          style={{ marginTop: '2rem', width: '100%', display: 'block', backgroundColor: '#e2e8f0', border: 'none', color: '#334155' }}
        >
          Voltar para Home
        </button>

      </div>

      {/* ========================================================= */}
      {/* MODAL DE DETALHES DO EVENTO CLICADO */}
      {/* ========================================================= */}
      {detalhesEvento && (
        <div className="modal-overlay" onClick={() => setDetalhesEvento(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ textAlign: 'left', maxWidth: '450px' }}>
            <h3 style={{ marginTop: 0, color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              Detalhes do Agendamento
            </h3>
            
            <div style={{ padding: '10px 0' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#334155' }}>
                <strong>Checklist:</strong> <br/>
                <span style={{ fontSize: '1.1rem', color: '#0284c7' }}>{detalhesEvento.titulo}</span>
              </p>
              
              <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#334155' }}>
                <strong>Setor Responsável:</strong> <br/>
                {getNomeSetor(detalhesEvento.id_setor)}
              </p>
              
              <p style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#334155' }}>
                <strong>Periodicidade:</strong> <br/>
                <span style={{ backgroundColor: detalhesEvento.tipo_agendamento === 'INTERVALO_DIAS' ? '#fef3c7' : '#e0f2fe', color: detalhesEvento.tipo_agendamento === 'INTERVALO_DIAS' ? '#b45309' : '#0369a1', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  {detalhesEvento.tipo_agendamento === 'INTERVALO_DIAS' 
                    ? `Recorrente (A cada ${detalhesEvento.intervalo_dias} dias)` 
                    : 'Data Única Específica'}
                </span>
              </p>
            </div>

            <button 
              className="btn-cancelar" 
              onClick={() => setDetalhesEvento(null)}
              style={{ width: '100%', marginTop: '15px' }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE AGENDAMENTO (AO CLICAR NO DIA) */}
      {/* ========================================================= */}
      {modalVisivel && (
        <div className="modal-overlay">
          <div className="modal-content modal-calendario">
            <h3 style={{ marginBottom: '15px', color: '#0f172a' }}>📅 Agendar para {dataSelecionada.split('-').reverse().join('/')}</h3>
            
            <form onSubmit={salvarAgendamento}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>1. Selecione um Checklist Existente:</label>
                <select 
                  required 
                  value={idChecklistSelecionado} 
                  onChange={e => setIdChecklistSelecionado(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Escolha --</option>
                  {checklists.map(c => (
                    <option key={c.id_checklist} value={c.id_checklist}>{c.titulo} (Setor: {getNomeSetor(c.id_setor)})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px' }}>2. Tipo de Agendamento:</label>
                <select 
                  value={tipoAgendamento} 
                  onChange={e => setTipoAgendamento(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="DATA_ESPECIFICA">Apenas neste dia específico ({dataSelecionada.split('-').reverse().join('/')})</option>
                  <option value="INTERVALO_DIAS">Recorrente (Repetir a cada X dias a partir desta data)</option>
                </select>
              </div>

              {tipoAgendamento === 'INTERVALO_DIAS' && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '5px', color: '#f59e0b' }}>Repetir a cada quantos dias?</label>
                  <input 
                    type="number" min="1" required 
                    value={intervaloDias} 
                    onChange={e => setIntervaloDias(e.target.value)}
                    placeholder="Ex: 7 para semanal, 30 para mensal..."
                    style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              )}

              <div className="botoes-modal">
                <button type="button" className="btn-cancelar" onClick={() => setModalVisivel(false)}>Cancelar</button>
                <button type="submit" className="btn-salvar">Salvar Agendamento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {alerta.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            {alerta.tipo === 'sucesso' ? '✅' : '⚠️'}
            <h3 className={alerta.tipo === 'erro' ? 'texto-erro' : 'texto-sucesso'}>{alerta.titulo}</h3>
            <p>{alerta.mensagem}</p>
            <button className="modal-button" onClick={() => setAlerta({ ...alerta, visivel: false })}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}