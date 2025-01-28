import { Wllama } from '@wllama/wllama'

const CONFIG_PATHS = {
  'single-thread/wllama.wasm': chrome.runtime.getURL('wasm/single-thread/wllama.wasm'),
  'multi-thread/wllama.wasm': chrome.runtime.getURL('wasm/multi-thread/wllama.wasm'),
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PAGE_CONTENT') {
    chrome.tabs
      .query({ active: true })
      .then((tabs) => {
        if (tabs.length > 0 && tabs[0].id) {
          chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_PAGE_CONTENT' }, (response) => {
            sendResponse(response)
          })
        } else {
          sendResponse({ error: 'No active tab found' })
        }
      })
      .catch((error) => {
        sendResponse({ error: error.message })
      })

    return true // Keep the message channel open for async response
  }

  if (message.type === 'PROCESS_CONTENT') {
    const asyncHandler = async () => {
      try {
        const wllama = new Wllama(CONFIG_PATHS)
        await wllama.loadModelFromUrl(chrome.runtime.getURL('models/stories15M-q4_0.gguf'))

        let fullAnswer = ''
        await wllama.createCompletion(`Analyze the following content and answer the question: ${message.data.question}\n\n${message.data.pageContent}`, {
          nPredict: 150,
          sampling: {
            temp: 0.5,
            top_k: 40,
            top_p: 0.9,
          },
          onNewToken: (token, piece, currentText) => {
            fullAnswer = currentText
          },
        })

        sendResponse({ answer: fullAnswer })
      } catch (error) {
        console.error('Wllama processing error:', error)
        sendResponse({ error: error.message })
      }
    }

    asyncHandler()
    return true
  }
})

function isModifyHeadersAction(action: any): action is any {
  return action.type === 'modifyHeaders'
}

chrome.runtime.onInstalled.addListener(() => {
  const rules: any[] = [
    {
      id: 1,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [
          { header: 'Cross-Origin-Embedder-Policy', operation: 'set', value: 'require-corp' },
          { header: 'Cross-Origin-Opener-Policy', operation: 'set', value: 'same-origin' },
        ],
      } as any,
      condition: {
        resourceTypes: ['main_frame', 'sub_frame', 'script', 'xmlhttprequest'],
      } as any,
    },
    {
      id: 2,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        responseHeaders: [{ header: 'Cross-Origin-Resource-Policy', operation: 'set', value: 'cross-origin' }],
      } as any,
      condition: {
        resourceTypes: ['main_frame', 'sub_frame', 'script', 'xmlhttprequest', 'image', 'font', 'stylesheet'],
      } as any,
    },
  ]

  chrome.declarativeNetRequest
    .updateDynamicRules({
      removeRuleIds: rules.map((rule) => rule.id),
      addRules: rules,
    })
    .then(() => {
      console.log('Dynamic rules updated.')
    })
    .catch((error) => {
      console.error('Error updating dynamic rules:', error)
    })
})
