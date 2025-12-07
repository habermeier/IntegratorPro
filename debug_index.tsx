import React from 'react';
import ReactDOM from 'react-dom/client';

console.log('IntegratorPro Debug: Starting debug_index.tsx');

const rootElement = document.getElementById('root');
if (!rootElement) {
    console.error('IntegratorPro Debug: Root not found');
} else {
    console.log('IntegratorPro Debug: Root found');
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <div style={{ color: 'white', fontSize: '24px', padding: '20px' }}>
            <h1>DEBUG MODE</h1>
            <p>React is working.</p>
        </div>
    );
    console.log('IntegratorPro Debug: Rendered simple div');
}
