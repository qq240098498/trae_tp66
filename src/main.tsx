import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import 'antd/dist/reset.css';
import './index.css';
import { useInitData } from './hooks/useInitData';

export const AppWithInit = () => {
  useInitData();
  return <App />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppWithInit />
  </StrictMode>,
);
