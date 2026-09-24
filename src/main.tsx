import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import './ui/theme.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { Gallery } from './ui/Gallery'
import { TooltipLayer } from './ui/common/Tooltip'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {new URLSearchParams(location.search).has('gallery') ? (
      <>
        <Gallery />
        <TooltipLayer />
      </>
    ) : (
      <App />
    )}
  </StrictMode>,
)
