import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import BacktestPage from './components/BacktestPage';
import MarketAnalysisPage from './components/MarketAnalysisPage';
import Callback from './components/Callback';
import * as api from './services/kiteConnect';

const getInitialAuth = (): { token: string | null; userId: string | null } => {
  try {
    return {
      token: localStorage.getItem('jwtToken'),
      userId: localStorage.getItem('userId'),
    };
  } catch (e) {
    console.error("Could not access localStorage:", e);
    return { token: null, userId: null };
  }
};

const App: React.FC = () => {
  const [auth, setAuth] = useState(getInitialAuth());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'backtest' | 'market-analysis'>('dashboard');

  useEffect(() => {
    // Ensure dark theme is applied
    document.documentElement.classList.add('dark');
  }, []);

  const safeSetAuth = useCallback((token: string, userId: string) => {
    try {
        localStorage.setItem('jwtToken', token);
        localStorage.setItem('userId', userId);
        setAuth({ token, userId });
    } catch(e) {
        console.error("Could not set item in localStorage:", e);
        setError("Your browser is not allowing storage access, which is required to log in.");
    }
  }, []);

  const safeRemoveAuth = useCallback(() => {
      try {
          localStorage.removeItem('jwtToken');
          localStorage.removeItem('userId');
      } catch (e) {
          console.error("Could not remove item from localStorage:", e);
      }
      setAuth({ token: null, userId: null });
  }, []);

  const handleAuthSuccess = useCallback((token: string, userId: string) => {
    safeSetAuth(token, userId);
    window.history.replaceState({}, document.title, '/');
  }, [safeSetAuth]);

  const handleAuthError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    window.history.replaceState({}, document.title, '/');
  }, []);

  useEffect(() => {
    if (window.location.pathname !== '/callback') {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Continue with local logout even if API call fails
      console.error('Logout API call failed:', e);
    }
    safeRemoveAuth();
  };
  
  if (window.location.pathname === '/callback') {
    return <Callback />;
  }

  if (isLoading) {
      return <div className="flex items-center justify-center min-h-screen bg-slate-900 text-slate-200 text-xl">Loading...</div>;
  }
  
  if (error) {
      return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-xl text-loss">
              <p>{error}</p>
              <a href="/" className="mt-4 px-4 py-2 bg-kite-blue text-white rounded">
                  Go to Login
              </a>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-200">
      {auth.token && auth.userId ? (
        <>
          {/* Top Navigation Bar */}
          <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  currentPage === 'dashboard'
                    ? 'border-kite-blue text-slate-200'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentPage('backtest')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  currentPage === 'backtest'
                    ? 'border-kite-blue text-slate-200'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Backtest
              </button>
              <button
                onClick={() => setCurrentPage('market-analysis')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                  currentPage === 'market-analysis'
                    ? 'border-kite-blue text-slate-200'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Market Analysis
              </button>
            </div>
          </nav>
          {/* Page Content */}
          {currentPage === 'dashboard' && <Dashboard onLogout={handleLogout} />}
          {currentPage === 'backtest' && <BacktestPage />}
          {currentPage === 'market-analysis' && <MarketAnalysisPage />}
        </>
      ) : (
        <LoginScreen onAuthSuccess={handleAuthSuccess} />
      )}
    </div>
  );
};

export default App;