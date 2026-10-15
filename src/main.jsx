import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './styles/base.css';
import Layout from './components/Layout';
import Home from './pages/Home';
import Standings from './pages/Standings';
import Races from './pages/Races';
import Race from './pages/Race';
import Drivers from './pages/Drivers';
import Driver from './pages/Driver';
import TireLab from './pages/TireLab';
import Strategy from './pages/Strategy';
import Prediction from './pages/Prediction';
import Models from './pages/Models';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="standings" element={<Standings />} />
            <Route path="races" element={<Races />} />
            <Route path="race/:eventId" element={<Race />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="driver/:abbr" element={<Driver />} />
            <Route path="tire" element={<TireLab />} />
            <Route path="strategy" element={<Strategy />} />
            <Route path="prediction" element={<Prediction />} />
            <Route path="models" element={<Models />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
