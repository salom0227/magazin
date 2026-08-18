import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installInAppBrowserScrollFix } from './lib/inAppBrowserScrollFix';

// Only kicks in inside Telegram/Instagram/etc. in-app browsers where native
// touch-scroll can silently freeze; does nothing in normal Chrome/Safari.
installInAppBrowserScrollFix();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
