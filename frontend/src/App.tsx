import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import Landing from './pages/Landing';

function BlockchainExplorer() {
  return <div className="text-muted-foreground">Blockchain Explorer — coming soon</div>;
}

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
