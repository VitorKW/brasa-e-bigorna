import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { TelaDeErro } from './components/TelaDeErro.tsx'
import './fontes.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TelaDeErro>
      <App />
    </TelaDeErro>
  </StrictMode>,
)
