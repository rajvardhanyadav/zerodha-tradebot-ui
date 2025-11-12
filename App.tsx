import React, { useState, useEffect, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import Callback from './components/Callback';
import * as api from './services/kiteConnect';

const getInitialToken = (): string | null => {
  try {
    return localStorage.getItem('jwtToken');
  } catch (e) {
    console.error("Could not access localStorage:", e);
    return null;
  }
};

const App: React.FC = () => {
  const [jwtToken, setJwtToken] = useState<string | null>(getInitialToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Ensure dark theme is applied
    document.documentElement.classList.add('dark');
  }, []);

  const safeSetToken = useCallback((token: string) => {
    try {
        localStorage.setItem('jwtToken', token);
        setJwtToken(token);
    } catch(e) {
        console.error("Could not set item in localStorage:", e);
        setError("Your browser is not allowing storage access, which is required to log in.");
    }
  }, []);

  const safeRemoveToken = useCallback(() => {
      try {
          localStorage.removeItem('jwtToken');
      } catch (e) {
          console.error("Could not remove item from localStorage:", e);
      }
      setJwtToken(null);
  }, []);

  const handleAuthSuccess = useCallback((token: string) => {
    safeSetToken(token);
    window.history.replaceState({}, document.title, '/');
  }, [safeSetToken]);

  const handleAuthError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    window.history.replaceState({}, document.title, '/');
  }, []);

  useEffect(() => {
    if (window.location.pathname !== '/callback') {
      setIsLoading(false);
    }
  }, []);

  const handleLogout = () => {
    safeRemoveToken();
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
      {jwtToken ? <Dashboard onLogout={handleLogout} /> : <LoginScreen onAuthSuccess={handleAuthSuccess} />}
    </div>
  );
};

export default App;