import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import NewsletterPage from './NewsletterPage.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NewsletterPage />
  </StrictMode>,
)
