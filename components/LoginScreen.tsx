import React, { useState } from 'react';
import * as api from '../services/kiteConnect';

interface LoginScreenProps {
    onAuthSuccess: (token: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthSuccess }) => {
  const [isUrlLoading, setIsUrlLoading] = useState(false);
  const [isTokenLoading, setIsTokenLoading] = useState(false);
  const [error, setError] = useState('');
  const [requestToken, setRequestToken] = useState('');
  const [loginInitiated, setLoginInitiated] = useState(false);

  const handleLoginClick = async () => {
    setIsUrlLoading(true);
    setError('');
    try {
      const loginUrl = await api.getLoginUrl();
      window.open(loginUrl, '_blank', 'noopener,noreferrer');
      setLoginInitiated(true);
    } catch (err) {
      setError('Could not get login URL from the server. Please try again later.');
    } finally {
        setIsUrlLoading(false);
    }
  };

  const handleTokenSubmit = async () => {
    if (!requestToken.trim()) {
        setError('Please enter a request token.');
        return;
    }
    setIsTokenLoading(true);
    setError('');
    try {
        const response = await api.exchangeToken(requestToken.trim());
        onAuthSuccess(response.jwtToken);
        // On success, the component will unmount, so no need to reset loading state
    } catch (err) {
        setError('Invalid request token or server error. Please try again.');
        setIsTokenLoading(false);
    }
  };
  
  const isLoading = isUrlLoading || isTokenLoading;

  return (
    <div className="flex items-center justify-center min-h-screen bg-kite-grey">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
        <img src="https://kite.zerodha.com/static/images/kite-logo.svg" alt="Kite Logo" className="w-24 h-auto mx-auto mb-4" />
        
        <h2 className="text-2xl font-bold text-gray-800">Login to TradeBot</h2>
        
        {error && <p className="text-sm text-red-600 my-2">{error}</p>}
        
        <div className="space-y-4">
            {!loginInitiated && (
              <>
                <div>
                    <p className="text-sm text-gray-600 mb-2">
                      Click below to authorize in a new tab.
                    </p>
                    <button
                      onClick={handleLoginClick}
                      disabled={isLoading}
                      className="w-full py-2 text-white bg-kite-blue rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-kite-blue disabled:bg-gray-400"
                    >
                      {isUrlLoading ? 'Preparing...' : 'Login with Kite'}
                    </button>
                </div>
                
                <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="flex-shrink mx-4 text-gray-500 text-sm">OR</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                </div>
              </>
            )}

            <div className="text-left">
                <label htmlFor="request-token" className="text-sm text-gray-600">
                  {loginInitiated ? 'Paste token from new tab below' : 'Enter Request Token Manually'}
                </label>
                <input
                    id="request-token"
                    type="text"
                    value={requestToken}
                    onChange={(e) => setRequestToken(e.target.value)}
                    placeholder="Paste token from callback URL"
                    className="w-full px-3 py-2 mt-1 text-gray-700 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-kite-blue"
                    disabled={isLoading}
                    autoFocus={loginInitiated}
                />
            </div>
            <button
                onClick={handleTokenSubmit}
                disabled={isLoading || !requestToken}
                className="w-full py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
            >
                {isTokenLoading ? 'Authenticating...' : 'Continue with Token'}
            </button>
        </div>

        <p className="text-xs text-gray-500 mt-4">
          {loginInitiated
            ? "A new tab has opened. Complete the login, then copy the request_token and paste it above."
            : "After logging in with Kite, you will be redirected. Copy the `request_token` from that page's URL and paste it above."}
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;