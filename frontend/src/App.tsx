import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Home } from './pages/Home';
import { About } from './pages/About';
import { Chat } from './pages/Chat';
import { Profile } from './pages/Profile';
import { HealthLog } from './pages/HealthLog';
import { MealPlan } from './pages/MealPlan';
import { Nav } from './components/layout/Nav';
import { Footer } from './components/layout/Footer';
import { PageLoader } from './components/ui/PageLoader';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ConditionalNav = () => {
  const location = useLocation();
  const hidePaths = ['/chat', '/meal-plan', '/health-log'];
  if (hidePaths.includes(location.pathname)) return null;
  return <Nav />;
};

const ConditionalFooter = () => {
  const location = useLocation();
  const hidePaths = ['/chat', '/meal-plan', '/health-log'];
  if (hidePaths.includes(location.pathname)) return null;
  return <Footer />;
};

function App() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AnimatePresence mode="wait">
        {loading && <PageLoader />}
      </AnimatePresence>
      
      {!loading && (
        <div className="flex flex-col min-h-screen">
          <ConditionalNav />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/health-log" element={<HealthLog />} />
              <Route path="/meal-plan" element={<MealPlan />} />
            </Routes>
          </main>
          <ConditionalFooter />
        </div>
      )}
    </Router>
  );
}

export default App;
