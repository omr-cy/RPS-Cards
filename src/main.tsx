import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { DebugProvider } from './contexts/DebugContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DebugProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </DebugProvider>
  </StrictMode>,
);
