import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ItemsProvider } from '@/context/items-context';
import { DashboardPage, BrowsePage, ItemDetailPage } from '@/pages';
import { InboxPage } from '@/pages/inbox';
import { InboxPageEnhanced } from '@/pages/inbox-enhanced';
import { ProjectsPage } from '@/pages/projects';
import { ActionListPage } from '@/pages/action-list';
import { TestPage } from '@/pages/test';

function AppContent() {
  return (
    <div className="min-h-screen bg-background text-gray-100">
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/actions" element={<ActionListPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/inbox/enhanced" element={<InboxPageEnhanced />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/browse/:category" element={<BrowsePage />} />
        <Route path="/item/:id" element={<ItemDetailPage />} />
        <Route path="/test" element={<TestPage />} />
      </Routes>
    </div>
  );
}

export function App() {
  return (
    <ItemsProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ItemsProvider>
  );
}

export default App;
