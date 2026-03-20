import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Landing from './pages/Landing';
import BlockchainExplorer from './pages/BlockchainExplorer';

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/blockchain" element={<BlockchainExplorer />} />
      </Route>
    </Routes>
  );
}

export default App;
