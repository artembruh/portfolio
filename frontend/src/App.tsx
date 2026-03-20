import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';

function Landing() {
  return <div className="text-muted-foreground">Landing page — coming soon</div>;
}

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
