import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login/Login';
import Home from './pages/Home/Home';
import CadastroUsuario from './pages/CadastroUsuario/CadastroUsuario';
import CadastroChecklist from './pages/CadastroChecklist/CadastroChecklist';
import GerenciarChecklists from './pages/GerenciarChecklists/GerenciarChecklists';
import PreencherChecklist from './pages/PreencherChecklist/PreencherChecklist';
import Relatorios from './pages/Relatorios/Relatorios';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/cadastro-usuario" element={<CadastroUsuario />} />
        <Route path="/cadastro-checklist" element={<CadastroChecklist />} />
        <Route path="/gerenciar-checklists" element={<GerenciarChecklists />} />
        <Route path="/preencher-checklist" element={<PreencherChecklist />} />
        <Route path="/relatorios" element={<Relatorios />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;