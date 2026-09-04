import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import CadastroUsuario from './pages/CadastroUsuario/CadastroUsuario';
import CadastroChecklist from './pages/CadastroChecklist/CadastroChecklist';
import GerenciarChecklists from './pages/GerenciarChecklists/GerenciarChecklists';
import PreencherChecklist from './pages/PreencherChecklist/PreencherChecklist';
import Relatorios from './pages/Relatorios/Relatorios';
import NovaSenha from './pages/NovaSenha/NovaSenha';
import MeuPerfil from './pages/MeuPerfil/MeuPerfil';
import GerenciarUsuarios from './pages/GerenciarUsuarios/GerenciarUsuarios';
import Header from './components/Header';
import HistoricoChecklist from './pages/HistoricoChecklist/HistoricoChecklist';
import './App.css';
import { DeviceProvider } from './contexts/DeviceContext';

function App() {
  return (
    <BrowserRouter>
      <DeviceProvider>
        {/* O Header fica aqui por fora das Routes, logo ele nunca desmonta */}
        <Header />
        
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/cadastro-usuario" element={<CadastroUsuario />} />
          <Route path="/cadastro-checklist" element={<CadastroChecklist />} />
          <Route path="/gerenciar-checklists" element={<GerenciarChecklists />} />
          <Route path="/preencher-checklist" element={<PreencherChecklist />} />
          <Route path="/relatorios" element={<Relatorios />} />
          <Route path="/nova-senha" element={<NovaSenha />} />
          <Route path="/meu-perfil" element={<MeuPerfil />} />
          <Route path="/gerenciar-usuarios" element={<GerenciarUsuarios />} />
          <Route path="/checklists/historico/:id" element={<HistoricoChecklist />} />
        </Routes>
      </DeviceProvider>
    </BrowserRouter>
  );
}

export default App;