import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Expenses } from './pages/Expenses';
import { AddExpense } from './pages/AddExpense';
import { PendingActions } from './pages/PendingActions';
import { History } from './pages/History';
import { Balances } from './pages/Balances';

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/add" element={<AddExpense />} />
            <Route path="/pending" element={<PendingActions />} />
            <Route path="/history" element={<History />} />
            <Route path="/balances" element={<Balances />} />
          </Routes>
        </Layout>
      </AppProvider>
    </BrowserRouter>
  );
}

export default App;
