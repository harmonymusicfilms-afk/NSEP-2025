import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Import client first to ensure it's initialized before any database queries
import client from './lib/insforgeClient';

import { AuthProvider } from './contexts/AuthContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
