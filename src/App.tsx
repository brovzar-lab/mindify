import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ItemsProvider } from '@/context/items-context';
import { DashboardPage, BrowsePage, ItemDetailPage } from '@/pages';
import { InboxPage } from '@/pages/inbox';
import { TestPage } from '@/pages/test';

function AppContent() {
  return (
    <div className="min-h-screen bg-background text-gray-100">
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inbox" element={<InboxPage />} />
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
