import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; // 1. Importando o nosso interceptor JWT
import './CadastroChecklist.css';

export default function CadastroChecklist() {
  const [titulo, setTitulo] = useState('');
  const [setor, setSetor] = useState(''); 
  const [ativo, setAtivo] = useState(true);
  
  const [itens, setItens] = useState([
    { descricao: '', tipo: 'booleano', obrigatorio: true }
  ]);
  
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  const navigate = useNavigate();

  const mostrarAlerta = (tipo, titulo, mensagem) => {
    setAlerta({ visivel: true, tipo, titulo, mensagem });
  };

  const fecharAlerta = () => {
    setAlerta({ ...alerta, visivel: false });
    if (alerta.tipo === 'sucesso') navigate('/home');
  };

  const adicionarItem = () => {
    setItens([...itens, { descricao: '', tipo: 'booleano', obrigatorio: true }]);
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

  const handleCadastro = async (e) => {
    e.preventDefault();
    
    const payload = {
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

      // 2. Trocado 'fetch' por 'fetchWithAuth' e URL ajustada para caminho relativo
      const resposta = await fetchWithAuth('/api/checklists', {
        method: 'POST',
        headers: { 
          // Content-Type e Authorization já são colocados automaticamente pelo fetchWithAuth
          'x-setor-usuario': usuarioLogado?.setor || '' 
        },
        body: JSON.stringify(payload)
      });

      if (resposta.ok) {
        mostrarAlerta('sucesso', 'Checklist Criado!', 'O novo checklist foi salvo com sucesso.');
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
      <div className="cadastro-checklist-card">
        <h2>Criar Novo Checklist</h2>
        <p>Defina o título, o setor e adicione os itens de verificação.</p>
        
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
              <div key={index} className="item-row">
                <span className="item-ordem">{index + 1}</span>
                
                <div className="item-inputs">
                  <input
                    type="text"
                    value={item.descricao}
                    onChange={(e) => atualizarItem(index, 'descricao', e.target.value)}
                    placeholder="Descrição da tarefa/pergunta"
                    required
                    className="input-descricao"
                  />
                  
                  <select
                    value={item.tipo}
                    onChange={(e) => atualizarItem(index, 'tipo', e.target.value)}
                    className="select-tipo"
                  >
                    <option value="booleano">Sim / Não</option>
                    <option value="texto">Texto Livre</option>
                    <option value="numero">Número</option>
                  </select>

                  <label className="checkbox-obrigatorio">
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
                >
                  ✖
                </button>
              </div>
            ))}
            
            <button type="button" className="btn-adicionar-item" onClick={adicionarItem}>
              + Adicionar Novo Item
            </button>
          </div>

          <div className="botoes-acao">
            <button type="button" className="btn-voltar" onClick={() => navigate('/home')}>
              Voltar
            </button>
            <button type="submit" className="btn-salvar">
              Salvar Checklist
            </button>
          </div>
        </form>
      </div>

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