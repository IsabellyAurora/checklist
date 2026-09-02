import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; 
import './CadastroChecklist.css';

export default function CadastroChecklist() {
  const [titulo, setTitulo] = useState('');
  const [setor, setSetor] = useState(''); 
  const [ativo, setAtivo] = useState(true);
  
  const [itens, setItens] = useState([
    { descricao: '', tipo: 'booleano', obrigatorio: true, imagem: null, preview: null }
  ]);
  
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const [imagemAmpliada, setImagemAmpliada] = useState(null);

  const navigate = useNavigate();

  const mostrarAlerta = (tipo, titulo, mensagem) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem });
  };

  const fecharAlerta = () => {
    setAlerta({ ...alerta, visivel: false });
    if (alerta.tipo === 'sucesso') navigate('/home');
  };

  const adicionarItem = () => {
    setItens([...itens, { descricao: '', tipo: 'booleano', obrigatorio: true, imagem: null, preview: null }]);
  };

  const removerItem = (indexParaRemover) => {
    if (itens.length === 1) {
      mostrarAlerta('erro', 'Atenção', 'O checklist precisa ter pelo menos um item.');
      return;
    }
    const novosItens = itens.filter((_, index) => index !== indexParaRemover);
    setItens(novosItens);
  };

  const atualizarItem = (index, campo, valor) => {
    const novosItens = [...itens];
    novosItens[index][campo] = valor;
    setItens(novosItens);
  };

  const handleImagemChange = (index, e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
      const novosItens = [...itens];
      novosItens[index].imagem = arquivo;
      novosItens[index].preview = URL.createObjectURL(arquivo);
      setItens(novosItens);
    }
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    
    // 1. Payload em JSON puro para criar o checklist e os itens básicos
    const payloadPrincipal = {
      titulo,
      setor,
      ativo,
      itens: itens.map((item, index) => ({
        ordem: index + 1,
        descricao: item.descricao,
        tipo: item.tipo,
        obrigatorio: item.obrigatorio
      }))
    };

    try {
      const usuarioStorage = localStorage.getItem('usuarioLogado');
      const usuarioLogado = usuarioStorage ? JSON.parse(usuarioStorage) : null;

      // Passo 1: Salva o checklist principal e obtém os ID's gerados pelo banco
      const resposta = await fetchWithAuth('/api/checklists', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-setor-usuario': usuarioLogado?.setor || '' 
        },
        body: JSON.stringify(payloadPrincipal)
      });

      if (resposta.ok) {
        const resultadoJson = await resposta.json();
        
        // Pega a lista de itens criados que retornou do backend (contendo os id_item gerados)
        // Ajuste o caminho abaixo (`resultadoJson.data.itens` ou `resultadoJson.itens`) conforme o padrão da API do seu colega
        const itensSalvos = resultadoJson.data?.checklist?.itens || resultadoJson.data?.itens || [];

        // Passo 2: Para cada item que possui uma imagem de referência, envia para a rota específica
        for (let index = 0; index < itens.length; index++) {
          const itemAtual = itens[index];
          
          if (itemAtual.imagem) {
            // Como os itens salvos mantêm a mesma ordem (`ordem` ou índice), vinculamos pelo index
            const itemSalvoCorrespondente = itensSalvos[index] || itensSalvos.find(i => i.ordem === index + 1);

            if (itemSalvoCorrespondente && itemSalvoCorrespondente.id_item) {
              const formDataImagem = new FormData();
              formDataImagem.append('imagem', itemAtual.imagem); // Campo exato exigido pela rota do backend

              await fetchWithAuth(`/api/checklists/itens/${itemSalvoCorrespondente.id_item}/referencia`, {
                method: 'POST',
                body: formDataImagem
                // O navegador define automaticamente o boundary do multipart/form-data
              });
            }
          }
        }

        mostrarAlerta('sucesso', 'Checklist Criado!', 'O novo checklist e suas imagens de referência foram salvos com sucesso.');
      } else {
        const erroData = await resposta.json();
        mostrarAlerta('erro', 'Erro ao salvar', erroData.error || 'Verifique os dados e tente novamente.');
      }
    } catch (erro) {
      console.error('Erro ao cadastrar checklist:', erro);
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao conectar com o servidor.');
    }
  };

  return (
    <div className="cadastro-checklist-container">
      <div className="cadastro-checklist-card" style={{ maxWidth: '800px' }}>
        <h2>Criar Novo Checklist</h2>
        <p>Defina o título, o setor, adicione os itens de verificação e imagens de referência.</p>
        
        <form onSubmit={handleCadastro} className="checklist-form-container">
          
          <div className="dados-principais">
            <div className="input-group">
              <label htmlFor="titulo">Título do Checklist</label>
              <input
                type="text"
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Inspeção da Máquina X"
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="setor">Setor Responsável</label>
              <select
                id="setor"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                required
              >
                <option value="" disabled>Selecione um setor...</option>
                <option value="ti">Tecnologia da Informação (TI)</option>
                <option value="manutencao">Manutenção</option>
                <option value="rh">Recursos Humanos (RH)</option>
                <option value="operacao">Operacional</option>
                <option value="limpeza">Limpeza</option>
              </select>
            </div>

            <div className="checkbox-group">
              <input
                type="checkbox"
                id="ativo"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
              />
              <label htmlFor="ativo">Checklist Ativo</label>
            </div>
          </div>

          <div className="itens-section">
            <h3>Itens de Verificação</h3>
            {itens.map((item, index) => (
              <div key={index} className="item-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '1rem', backgroundColor: '#f8fafc' }}>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span className="item-ordem" style={{ fontWeight: 'bold' }}>#{index + 1}</span>
                  
                  <div className="item-inputs" style={{ display: 'flex', gap: '0.8rem', flex: 1, flexWrap: 'wrap' }}>
                    <input
                      type="text"
                      value={item.descricao}
                      onChange={(e) => atualizarItem(index, 'descricao', e.target.value)}
                      placeholder="Descrição da tarefa/pergunta"
                      required
                      className="input-descricao"
                      style={{ flex: 2, minWidth: '200px', padding: '0.5rem' }}
                    />
                    
                    <select
                      value={item.tipo}
                      onChange={(e) => atualizarItem(index, 'tipo', e.target.value)}
                      className="select-tipo"
                      style={{ padding: '0.5rem' }}
                    >
                      <option value="booleano">Sim / Não</option>
                      <option value="texto">Texto Livre</option>
                      <option value="numero">Número</option>
                    </select>

                    <label className="checkbox-obrigatorio" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}>
                      <input
                        type="checkbox"
                        checked={item.obrigatorio}
                        onChange={(e) => atualizarItem(index, 'obrigatorio', e.target.checked)}
                      />
                      Obrigatório
                    </label>
                  </div>

                  <button 
                    type="button" 
                    className="btn-remover-item" 
                    onClick={() => removerItem(index)}
                    title="Remover Item"
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}
                  >
                    ✖
                  </button>
                </div>

                <div className="upload-item-container" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', paddingLeft: '1.8rem' }}>
                  <label htmlFor={`file-input-${index}`} style={{ cursor: 'pointer', backgroundColor: '#e2e8f0', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '500', color: '#334155' }}>
                    📷 {item.imagem ? 'Trocar Imagem' : 'Adicionar Imagem de Referência'}
                  </label>
                  <input
                    id={`file-input-${index}`}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImagemChange(index, e)}
                    style={{ display: 'none' }}
                  />

                  {item.preview && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <img 
                        src={item.preview} 
                        alt="Preview" 
                        title="Clique para ampliar"
                        onClick={() => setImagemAmpliada(item.preview)}
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer', transition: 'transform 0.2s' }} 
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                      />
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.imagem?.name}</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          const novosItens = [...itens];
                          novosItens[index].imagem = null;
                          novosItens[index].preview = null;
                          setItens(novosItens);
                        }}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Remover
                      </button>
                    </div>
                  )}
                </div>

              </div>
            ))}
            
            <button type="button" className="btn-adicionar-item" onClick={adicionarItem} style={{ marginTop: '0.5rem' }}>
              + Adicionar Novo Item
            </button>
          </div>

          <div className="botoes-acao" style={{ marginTop: '2rem' }}>
            <button type="button" className="btn-voltar" onClick={() => navigate('/home')}>
              Voltar
            </button>
            <button type="submit" className="btn-salvar">
              Salvar Checklist
            </button>
          </div>
        </form>
      </div>

      {imagemAmpliada && (
        <div 
          onClick={() => setImagemAmpliada(null)}
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center',
            alignItems: 'center', zIndex: 2000, cursor: 'pointer', padding: '2rem'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }} onClick={(e) => e.stopPropagation()}>
            <img 
              src={imagemAmpliada} 
              alt="Imagem Ampliada" 
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

      {alerta.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            {alerta.tipo === 'sucesso' ? '✅' : '⚠️'}
            <h3 className={alerta.tipo === 'erro' ? 'texto-erro' : 'texto-sucesso'}>
              {alerta.titulo}
            </h3>
            <p>{alerta.mensagem}</p>
            <button className="modal-button" onClick={fecharAlerta}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}