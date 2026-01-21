import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ItemsProvider } from '@/context/items-context';
import { DashboardPage, BrowsePage, ItemDetailPage } from '@/pages';

function AppContent() {
  return (
    <div className="min-h-screen bg-background text-gray-100">
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/browse/:category" element={<BrowsePage />} />
        <Route path="/item/:id" element={<ItemDetailPage />} />
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
