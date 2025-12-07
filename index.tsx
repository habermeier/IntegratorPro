import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

console.log('IntegratorPro: Starting index.tsx');
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
      <App />
    </React.StrictMode>
  );
  console.log('IntegratorPro: Render called');
} catch (e) {
  console.error('IntegratorPro: Error creating root or rendering', e);
}