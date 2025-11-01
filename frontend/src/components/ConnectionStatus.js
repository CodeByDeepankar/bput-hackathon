"use client";

import { useState, useEffect } from "react";
import apiClient from "@/lib/api";

const ConnectionStatus = () => {
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState(null);

  useEffect(() => {
    // moved to outer scope
  }, []);

  // Extracted so UI can trigger a retry
  const checkConnection = async () => {
    try {
      setStatus('checking');
      setError(null);
      await apiClient.healthCheck();
      setStatus('connected');
    } catch (err) {
      setStatus('disconnected');
      setError(err?.message || String(err));
    }
  };

  // start polling
  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  if (status === 'connected') {
    return null; // Don't show anything when connected
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 p-4 text-center text-white ${
      status === 'checking' ? 'bg-yellow-500' : 'bg-red-500'
    }`}>
      <div className="max-w-4xl mx-auto">
        {status === 'checking' && (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Checking connection...</span>
          </div>
        )}
        
        {status === 'disconnected' && (
          <div>
            <div className="font-semibold mb-1">❌ API Connection Failed</div>
            <div className="text-sm opacity-90">
              {error || 'Unable to reach the application API'}
            </div>
            <div className="mt-3">
              <button
                onClick={checkConnection}
                className="bg-white text-gray-800 px-3 py-1 rounded-md text-sm"
              >
                Retry
              </button>
            </div>
            <div className="text-xs mt-2 opacity-75">
              Tried: <span className="font-mono">{apiClient?.baseURL || 'unknown'}</span>
              <br />
              Ensure the backend or Next.js dev server is running (default http://localhost:3000) and exposes its /api routes.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus;
