import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ChatPage } from './pages/ChatPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ModelsPage } from './pages/ModelsPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { SavedTemplatesPage } from './pages/SavedTemplatesPage';
import { TrainingPage } from './pages/TrainingPage';
import { ConnectPage } from './pages/ConnectPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/models" element={<ModelsPage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/saved-templates" element={<SavedTemplatesPage />} />
          <Route path="/connect" element={<ConnectPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
