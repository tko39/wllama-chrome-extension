import React from 'react'
import ReactDOM from 'react-dom/client'
import InPageComponent from './InPageComponent'
;(() => {
  const container = document.createElement('div')
  document.body.appendChild(container)

  const root = ReactDOM.createRoot(container)

  function setExtensionState(isEnabled: boolean) {
    if (isEnabled) {
      root.render(<InPageComponent />)
    } else {
      root.render(null) // Render nothing when disabled
    }
  }

  // Listen for messages from the popup (for toggling)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'ENABLE_ON_PAGE') {
      if (request.isEnabled !== undefined) {
        setExtensionState(request.isEnabled) // Re-check state after toggle
      }
    }
  })

  // Initial state (assuming disabled by default)
  setExtensionState(false)
})()
