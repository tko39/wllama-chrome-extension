import React, { useState, useEffect } from 'react'

function Popup(): React.ReactElement {
  const [isEnabled, setIsEnabled] = useState<boolean | null>(null)
  const [currentTabUrl, setCurrentTabUrl] = useState('')

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        setCurrentTabUrl(tabs[0].url || '')
        chrome.storage.sync.get([tabs[0].url || ''], (result) => {
          setIsEnabled(result[tabs[0].url || ''] || false)
        })
      }
    })
  }, [])

  useEffect(() => {
    if (isEnabled === null) return
    chrome.storage.sync.set({ [currentTabUrl]: isEnabled })
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id || 0, { type: 'ENABLE_ON_PAGE', isEnabled: isEnabled })
      }
    })
  }, [isEnabled, currentTabUrl])

  const handleToggle = () => {
    setIsEnabled(!isEnabled)
  }

  return (
    <div style={{ padding: '10px', width: '200px' }}>
      <label className="switch">
        <input type="checkbox" checked={isEnabled ?? false} onChange={handleToggle} />
        <span className="slider round"></span>
      </label>
      <p>Extension is {isEnabled ? 'enabled' : 'disabled'} on this page.</p>
      <style>{`
        .switch {
          position: relative;
          display: inline-block;
          width: 60px;
          height: 34px;
        }

        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          -webkit-transition: 0.4s;
          transition: 0.4s;
          border-radius: 34px;
        }

        .slider:before {
          position: absolute;
          content: '';
          height: 26px;
          width: 26px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          -webkit-transition: 0.4s;
          transition: 0.4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: #2196f3;
        }

        input:focus + .slider {
          box-shadow: 0 0 1px #2196f3;
        }

        input:checked + .slider:before {
          -webkit-transform: translateX(26px);
          -ms-transform: translateX(26px);
          transform: translateX(26px);
        }
      `}</style>
    </div>
  )
}

export default Popup
