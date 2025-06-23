// seu-projeto-react/src/index.js
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // Importa seu CSS global, incluindo o gerado pelo Tailwind
import App from './App'; // Importa o componente principal App

// Cria um 'root' para o React e o renderiza no elemento com id 'root' no HTML
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App /> {/* Renderiza o componente App */}
  </React.StrictMode>
);
