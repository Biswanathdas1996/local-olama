import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { ChatPage } from './pages/ChatPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ModelsPage } from './pages/ModelsPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { SavedTemplatesPage } from './pages/SavedTemplatesPage';
import { TrainingPage } from './pages/TrainingPage';
import { ConnectPage } from './pages/ConnectPage';
import { LandingPage } from './pages/LandingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { MetabasePage } from './pages/MetabasePage';
import { DashboardViewPage } from './pages/DashboardViewPage';
import { AdminPage } from './pages/AdminPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          
          {/* Dashboard view without Layout (fullscreen) */}
          <Route path="/dashboard/:dashboardUrl" element={<DashboardViewPage />} />
          
          {/* Protected app routes with Layout */}
          <Route path="/*" element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/chat" element={
                    <ProtectedRoute resource="generate" action="write">
                      <ChatPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/documents" element={
                    <ProtectedRoute resource="documents" action="read">
                      <DocumentsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/models" element={
                    <ProtectedRoute resource="models" action="read">
                      <ModelsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/training" element={
                    <ProtectedRoute resource="training" action="read">
                      <TrainingPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/templates" element={
                    <ProtectedRoute resource="templates" action="read">
                      <TemplatesPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/saved-templates" element={
                    <ProtectedRoute resource="templates" action="read">
                      <SavedTemplatesPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/analytics" element={
                    <ProtectedRoute resource="analytics" action="read">
                      <AnalyticsPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/metabase" element={
                    <ProtectedRoute resource="metabase" action="read">
                      <MetabasePage />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin" element={
                    <ProtectedRoute adminOnly>
                      <AdminPage />
                    </ProtectedRoute>
                  } />
                  <Route path="/connect" element={<ConnectPage />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
