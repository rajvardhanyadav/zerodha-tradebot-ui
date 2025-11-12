import React, { useState, useEffect } from 'react';

const Callback: React.FC = () => {
    const [requestToken, setRequestToken] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        setRequestToken(params.get('request_token'));
        setStatus(params.get('status'));
        setMessage(params.get('message'));
    }, []);

    const copyToClipboard = () => {
        if (requestToken) {
            navigator.clipboard.writeText(requestToken).then(() => {
                setCopySuccess('Copied!');
                setTimeout(() => setCopySuccess(''), 2000);
            }, () => {
                setCopySuccess('Failed to copy.');
            });
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
            <div className="w-full max-w-lg p-8 space-y-6 bg-white dark:bg-slate-800 rounded-lg shadow-md text-center border border-slate-200 dark:border-slate-700">
                <h1 className="text-2xl font-bold">Authentication Callback</h1>
                {status === 'success' && requestToken ? (
                    <div>
                        <p className="text-slate-500 dark:text-slate-400 mb-4">
                            Authorization successful. Copy the request token below and paste it on the login screen.
                        </p>
                        <div className="p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md break-all text-left font-mono my-4 text-sm">
                            {requestToken}
                        </div>
                        <button
                            onClick={copyToClipboard}
                            className="w-full relative py-2 mb-4 text-white bg-kite-blue rounded-md hover:bg-blue-700"
                        >
                            {copySuccess ? copySuccess : 'Copy Token'}
                        </button>
                        <a href="/" className="text-kite-blue hover:underline">
                            Go back to Login Page
                        </a>
                    </div>
                ) : (
                    <div>
                        <p className="text-loss mb-4">
                            Authentication Failed
                        </p>
                        {message && <p className="text-slate-500 dark:text-slate-400 mb-4 bg-slate-100 dark:bg-slate-900 p-2 rounded">Reason: {message}</p>}
                        <a href="/" className="text-kite-blue hover:underline">
                           Go back and try again
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Callback;