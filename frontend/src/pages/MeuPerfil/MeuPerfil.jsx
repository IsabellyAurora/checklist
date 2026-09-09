import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../../utils/api'; // 1. Importado o interceptor JWT

export default function MeuPerfil() {
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [usuario, setUsuario] = useState(null);
  const [alerta, setAlerta] = useState({ visivel: false, tipo: '', titulo: '', mensagem: '' });
  
  // Estado para salvar a lista de setores traduzidos
  const [nomesSetores, setNomesSetores] = useState([]);
  
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem('usuarioLogado');
    if (userData) setUsuario(JSON.parse(userData));
    else navigate('/');
  }, [navigate]);

  useEffect(() => {
    if (usuario) {
      carregarSetores();
    }
  }, [usuario]);

  // ==========================================
  // LÓGICA PARA BUSCAR E FORMATAR OS SETORES
  // ==========================================
  const construirNomeSetor = (setorAtual, listaCompleta) => {
    if (!setorAtual.id_setor_pai || String(setorAtual.id_setor_pai) === '0') {
      return setorAtual.nome; 
    }
    const setorPai = listaCompleta.find(s => String(s.id_setor) === String(setorAtual.id_setor_pai));
    
    if (setorPai && String(setorPai.id_setor) !== String(setorAtual.id_setor)) {
      const nomeDoPai = construirNomeSetor(setorPai, listaCompleta);
      return `${nomeDoPai} > ${setorAtual.nome}`;
    }
    return setorAtual.nome;
  };

  const carregarSetores = async () => {
    try {
      let arraySetoresId = [];
      if (Array.isArray(usuario?.setores)) {
        arraySetoresId = usuario.setores;
      } else if (usuario?.setores_ids) {
        arraySetoresId = usuario.setores_ids;
      } else if (usuario?.setor) {
        arraySetoresId = [usuario.setor]; 
      }

      const arrayNormalizado = arraySetoresId.map(val => String(val).toLowerCase());

      const res = await fetchWithAuth('/api/setores');
      if (res.ok) {
        const json = await res.json();
        const setoresBrutos = json.data || [];
        
        const setoresExplicitos = setoresBrutos.filter(s => 
          arrayNormalizado.includes(String(s.id_setor)) || 
          arrayNormalizado.includes(String(s.nome).toLowerCase())
        );

        let idsPermitidos = new Set(setoresExplicitos.map(s => Number(s.id_setor)));
        let adicionouNovo = true;
        
        while(adicionouNovo) {
          adicionouNovo = false;
          setoresBrutos.forEach(s => {
            if (s.id_setor_pai && idsPermitidos.has(Number(s.id_setor_pai)) && !idsPermitidos.has(Number(s.id_setor))) {
              idsPermitidos.add(Number(s.id_setor));
              adicionouNovo = true;
            }
          });
        }

        const setoresFinaisDoUsuario = setoresBrutos.filter(s => idsPermitidos.has(Number(s.id_setor)));
        const setoresTraduzidos = setoresFinaisDoUsuario.map(s => construirNomeSetor(s, setoresBrutos));
        
        setoresTraduzidos.sort((a, b) => a.localeCompare(b));
        setNomesSetores(setoresTraduzidos);
      }
    } catch (erro) {
      console.error("Erro ao carregar setores do perfil", erro);
    }
  };

  const mostrarAlerta = (tipo, titulo, mensagem) => setAlerta({ visivel: true, tipo, titulo, mensagem });
  const fecharAlerta = () => setAlerta({ ...alerta, visivel: false });

  const handleTrocaVoluntaria = async (e) => {
    e.preventDefault();
    
    if (novaSenha !== confirmarSenha) {
      mostrarAlerta('erro', 'Senhas não conferem', 'A nova senha e a confirmação precisam ser iguais.');
      return;
    }

    try {
      const resposta = await fetchWithAuth(`/api/usuarios/${usuario.id_usuario}/senha`, {
        method: 'PUT',
        body: JSON.stringify({ 
          senha_atual: senhaAtual, 
          nova_senha: novaSenha,
          confirmacao_senha: confirmarSenha
        })
      });

      if (resposta.ok) {
        mostrarAlerta('sucesso', 'Sucesso!', 'Sua senha foi alterada.');
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmarSenha(''); 
      } else {
        const erroData = await resposta.json();
        mostrarAlerta('erro', 'Erro ao alterar', erroData.error || 'Ocorreu um erro ao atualizar a senha.');
      }
    } catch (erro) {
      console.error('Erro de requisição:', erro);
      mostrarAlerta('erro', 'Sem conexão', 'Erro ao comunicar com o servidor.');
    }
  };

  if (!usuario) return null;

  return (
    <div className="gerenciar-container">
      <div className="gerenciar-card">
        <h2>Meu Perfil</h2>
        
        {/* EXIBINDO OS SETORES DE FORMA LIMPA COM JOIN(', ') */}
        <p>Usuário: <strong>{usuario.nome}</strong> | Setor: <strong>{nomesSetores.length > 0 ? nomesSetores.join(', ') : (usuario.setor || 'Buscando...')}</strong></p>

        <form onSubmit={handleTrocaVoluntaria} style={{ marginTop: '2rem' }}>
          <div className="input-group">
            <label>Senha Atual</label>
            <input
              type="password"
              className="input-busca"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label>Nova Senha</label>
            <input
              type="password"
              className="input-busca"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
            />
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label>Confirmar Nova Senha</label>
            <input
              type="password"
              className="input-busca"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button 
              type="button" 
              className="btn-voltar-home" 
              onClick={() => navigate('/home')}
              style={{ flex: 1, margin: 0 }}
            >
              Voltar
            </button>
            <button 
              type="submit" 
              className="btn-buscar" 
              style={{ flex: 1, margin: 0 }}
            >
              Atualizar Senha
            </button>
          </div>
        </form>
      </div>

      {alerta.visivel && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className={alerta.tipo === 'erro' ? 'texto-erro' : 'texto-sucesso'}>{alerta.titulo}</h3>
            <p>{alerta.mensagem}</p>
            <button className="modal-button" onClick={fecharAlerta}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}