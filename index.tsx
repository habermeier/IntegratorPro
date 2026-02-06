import React from 'react';
import ReactDOM from 'react-dom/client';
import { Buffer } from 'buffer';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

// Polyfill Buffer for browser (required by @react-pdf/renderer)
window.Buffer = Buffer;
(window as any).process = { env: {} };
(window as any).global = window;

console.log('IntegratorPro: Starting index.tsx');

// GLOBAL ERROR HANDLER FOR MOBILE DEBUGGING
window.onerror = function (msg, url, lineNo, columnNo, error) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '0';
  errorDiv.style.left = '0';
  errorDiv.style.width = '100%';
  errorDiv.style.backgroundColor = 'red';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.zIndex = '9999';
  errorDiv.style.whiteSpace = 'pre-wrap';
  errorDiv.style.userSelect = 'text'; // Enable text selection
  errorDiv.style.webkitUserSelect = 'text';
  errorDiv.innerHTML = `<h3>CRITICAL ERROR</h3><p>${msg}</p><p>${url}:${lineNo}:${columnNo}</p><pre>${error?.stack}</pre>`;
  document.body.appendChild(errorDiv);
  return false;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('IntegratorPro: Root element missing!');
  throw new Error("Could not find root element to mount to");
}
console.log('IntegratorPro: Root element found', rootElement);

try {
  const root = ReactDOM.createRoot(rootElement);
  console.log('IntegratorPro: React root created');



  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
  console.log('IntegratorPro: Render called');
} catch (e) {
  console.error('IntegratorPro: Error creating root or rendering', e);
}