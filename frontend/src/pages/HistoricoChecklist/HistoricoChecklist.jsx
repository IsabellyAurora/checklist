import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api';
import './HistoricoChecklist.css';

export default function HistoricoChecklist() {
  const { id } = useParams();
  const [versoes, setVersoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [detalheVersao, setDetalheVersao] = useState(null);
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  
  // Estado para armazenar a lista de setores e construir a hierarquia
  const [setoresDisponiveis, setSetoresDisponiveis] = useState([]);

  // Estado para controlar a ampliação da imagem de referência
  const [imagemAmpliada, setImagemAmpliada] = useState(null);
  
  const navigate = useNavigate();

  const mostrarAlerta = (tipo, titulo, mensagem) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem });
  };

  const fecharAlerta = () => {
    setAlerta({ ...alerta, visivel: false });
    navigate('/gerenciar-checklists');
  };

  useEffect(() => {
    const usuarioSalvo = JSON.parse(localStorage.getItem('usuarioLogado') || '{}');
    
    // NOVA REGRA: Verifica se "admin" está dentro do array de setores
    const isAdmin = usuarioSalvo.setores?.some(s => s.toLowerCase() === 'admin');

    if (!isAdmin) {
      mostrarAlerta('erro', 'Acesso Negado', 'Apenas administradores podem visualizar o histórico de versões.');
      return;
    }

    carregarSetores();
    carregarHistoricoVersoes();
  }, [id]);

  // ==========================================
  // LÓGICA DE SETORES (PAI > FILHO)
  // ==========================================
  const construirNomeSetor = (setorAtual, todosSetores) => {
    if (!setorAtual.id_setor_pai) return setorAtual.nome; 
    const setorPai = todosSetores.find(s => s.id_setor === setorAtual.id_setor_pai);
    if (setorPai) {
      const nomeDoPai = construirNomeSetor(setorPai, todosSetores);
      return `${nomeDoPai} > ${setorAtual.nome}`;
    }
    return setorAtual.nome;
  };

  const carregarSetores = async () => {
    try {
      const res = await fetchWithAuth('/api/setores');
      if (res.ok) {
        const json = await res.json();
        const setoresBrutos = json.data || [];
        const formatados = setoresBrutos.map(s => ({ ...s, nomeExibicao: construirNomeSetor(s, setoresBrutos) }));
        setSetoresDisponiveis(formatados);
      }
    } catch (erro) {
      console.error("Erro ao carregar setores", erro);
    }
  };

  const getNomeSetor = (identificador) => {
    if (!identificador) return '-';
    // Procura pelo ID ou pelo nome antigo (caso o banco tenha registros velhos como string)
    const setor = setoresDisponiveis.find(s => s.id_setor === identificador || s.nome === identificador);
    return setor ? setor.nomeExibicao : identificador;
  };

  // ==========================================
  // CARREGAR HISTÓRICO DE VERSÕES
  // ==========================================
  const carregarHistoricoVersoes = async () => {
    setCarregando(true);
    try {
      const resposta = await fetchWithAuth(`/api/checklists/${id}/versoes`, {
        method: 'GET',
        headers: {
          'x-setor-usuario': 'admin' // Mantido por segurança para o backend
        }
      });

      if (resposta.ok) {
        const json = await resposta.json();
        setVersoes(json.data || json || []);
      } else {
        const erroMsg = await resposta.json().catch(() => ({}));
        mostrarAlerta('erro', 'Erro', erroMsg.message || 'Não foi possível carregar o histórico deste checklist.');
      }
    } catch (erro) {
      console.error('Erro ao carregar histórico de versões:', erro);
      mostrarAlerta('erro', 'Erro de Conexão', 'Não foi possível conectar ao servidor.');
    } finally {
      setCarregando(false);
    }
  };

  const formatarData = (dataIso) => {
    if (!dataIso) return '-';
    return new Date(dataIso).toLocaleString('pt-BR');
  };

  return (
    <div className="historico-container">
      <div className="historico-card">
        <h2>Histórico de Versões do Checklist</h2>
        <p>Acompanhe a linha do tempo e as alterações do ID original: <strong>#{id}</strong></p>

        {carregando ? (
          <p style={{ textAlign: 'center', padding: '2rem' }}>Carregando histórico...</p>
        ) : (
          <div className="historico-tabela-container">
            <table className="historico-tabela">
              <thead>
                <tr>
                  <th>Versão / ID</th>
                  <th>Título</th>
                  <th>Setor</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {versoes.length > 0 ? (
                  versoes.map((v, index) => (
                    <tr key={v.id_checklist || index}>
                      <td>
                        <strong>#{v.id_checklist}</strong> 
                        {index === 0 && <span className="badge-atual">Versão Atual</span>}
                      </td>
                      <td>{v.titulo}</td>
                      
                      {/* Puxando o nome do setor usando a função inteligente */}
                      <td>{getNomeSetor(v.id_setor || v.setor)}</td>
                      
                      <td>
                        <span className={`badge-status ${v.ativo ? 'ativo' : 'inativo'}`}>
                          {v.ativo ? 'VIGENTE' : 'OBSOLETO'}
                        </span>
                      </td>
                      <td>{formatarData(v.data_criacao)}</td>
                      <td>
                        <button 
                          className="btn-ver-perguntas"
                          onClick={() => setDetalheVersao(v)}
                        >
                          Ver Itens
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>Nenhum histórico encontrado para este ID.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ======================================================= */}
        {/* MODAL DE VISUALIZAÇÃO DE ITENS                          */}
        {/* ======================================================= */}
        {detalheVersao && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '600px', width: '90%', textAlign: 'left', maxHeight: '80vh', overflowY: 'auto' }}>
              <div className="historico-modal-header">
                <h3>Itens da Versão #{detalheVersao.id_checklist}</h3>
                <button onClick={() => setDetalheVersao(null)} className="btn-fechar-modal">✕</button>
              </div>
              
              <div style={{ fontSize: '0.9rem', color: '#334155', marginBottom: '15px' }}>
                <p style={{ margin: '4px 0' }}><strong>Título:</strong> {detalheVersao.titulo}</p>
                <p style={{ margin: '4px 0' }}><strong>Setor:</strong> {getNomeSetor(detalheVersao.id_setor || detalheVersao.setor)}</p>
                <p style={{ margin: '4px 0' }}><strong>Criado em:</strong> {formatarData(detalheVersao.data_criacao)}</p>
              </div>
              
              <h4 style={{ marginTop: '15px', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>Perguntas (Status na época):</h4>
              
              <ul className="historico-lista-itens" style={{ paddingLeft: '0', listStyleType: 'none' }}>
                {detalheVersao.itens && detalheVersao.itens.length > 0 ? (
                  detalheVersao.itens.map((item, idx) => {
                    const refUrl = item.imagem_url || item.imagem_referencia;

                    return (
                      <li key={item.id_item || idx} style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        
                        {/* FONTE REDUZIDA E PADRONIZADA (0.9rem) */}
                        <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                          <strong>{item.ordem}.</strong> {item.descricao} 
                          <em style={{ color: '#64748b', fontSize: '0.85rem', marginLeft: '6px' }}>
                            ({item.tipo}) {item.obrigatorio ? ' - *Obrigatório' : ''}
                          </em>
                        </div>
                        
                        {/* IMAGEM APARECENDO INTEIRA (contain) COM TAMANHO MAIOR */}
                        {refUrl && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 'bold' }}>📷 Foto de referência:</span>
                            <img 
                              src={refUrl} 
                              alt="Referência" 
                              onClick={() => setImagemAmpliada(refUrl)}
                              style={{ 
                                width: '120px', 
                                height: 'auto', 
                                maxHeight: '120px', 
                                objectFit: 'contain', // A mágica acontece aqui (não corta a imagem)
                                borderRadius: '6px', 
                                cursor: 'pointer', 
                                border: '1px solid #cbd5e1',
                                backgroundColor: '#ffffff', // Fundo branco caso a imagem seja png transparente
                                padding: '2px'
                              }}
                              title="Clique para ampliar"
                            />
                          </div>
                        )}
                      </li>
                    );
                  })
                ) : (
                  <p style={{ fontSize: '0.9rem', color: '#64748b' }}>Nenhum item registrado nesta versão.</p>
                )}
              </ul>

              <button className="modal-button" onClick={() => setDetalheVersao(null)} style={{ marginTop: '20px', width: '100%' }}>Fechar</button>
            </div>
          </div>
        )}

        {/* Alerta de Acesso Negado / Sucesso / Erro */}
        {alerta.visivel && (
          <div className="modal-overlay">
            <div className="modal-content">
              {alerta.tipo === 'erro' ? '⚠️' : '✅'}
              <h3 className={alerta.tipo === 'erro' ? 'texto-erro' : 'texto-sucesso'}>{alerta.titulo}</h3>
              <p>{alerta.mensagem}</p>
              <button className="modal-button" onClick={fecharAlerta}>OK</button>
            </div>
          </div>
        )}

        <button className="btn-voltar-historico" onClick={() => navigate('/gerenciar-checklists')} style={{ marginTop: '20px' }}>
          Voltar para Gerenciamento
        </button>
      </div>

      {/* Modal para Ampliar Imagens */}
      {imagemAmpliada && (
        <div 
          onClick={() => setImagemAmpliada(null)}
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