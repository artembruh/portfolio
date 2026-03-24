import { Routes, Route } from 'react-router-dom';
import PipBoyShell from './components/shell/PipBoyShell';
import About from './pages/About';
import Projects from './pages/Projects';
import Workbench from './pages/Workbench';

function App() {
  return (
    <Routes>
      <Route element={<PipBoyShell />}>
        <Route path="/" element={<About />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/workbench" element={<Workbench />} />
      </Route>
    </Routes>
  );
}

export default App;
