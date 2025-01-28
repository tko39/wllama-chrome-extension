import React, { CSSProperties, JSX, useCallback, useRef, useState } from 'react'
import { Wllama } from '@wllama/wllama'
import { FaCheck, FaSpinner, FaTimes } from 'react-icons/fa'
import './style.css'

enum ProgressState {
  Empty = 'empty',
  LoadingModel = 'loading model',
  ModelLoaded = 'model loaded',
  AnalyzingChunk = 'analyzing chunk',
  Done = 'done',
  Error = 'error',
}

const InPageComponent = (): JSX.Element => {
  const [pageContent, setPageContent] = useState<string>('')
  const [question, setQuestion] = useState<string>('')
  const [answer, setAnswer] = useState<string>('')
  const [isFetched, setIsFetched] = useState<boolean>(false)
  const [progressState, setProgressState] = useState<string>(ProgressState.Empty)
  const wllamaRef = useRef(null)

  const CONFIG_PATHS = {
    'single-thread/wllama.wasm': chrome.runtime.getURL('wasm/single-thread/wllama.wasm'),
    'multi-thread/wllama.wasm': chrome.runtime.getURL('wasm/multi-thread/wllama.wasm'),
  }

  const initializeWllama = useCallback(async () => {
    if (wllamaRef.current) {
      console.log('Wllama and model already initialized. Skipping.')
      return
    }

    setProgressState(ProgressState.LoadingModel)

    try {
      const wllama = new Wllama(CONFIG_PATHS)
      await wllama.loadModelFromUrl(chrome.runtime.getURL('models/qwen2.5-0.5b-instruct-q4_k_m.gguf'), { n_ctx: 32768 })
      setProgressState(ProgressState.ModelLoaded)
      wllamaRef.current = wllama
    } catch (error) {
      console.error('Error initializing Wllama or loading model:', error)
      setProgressState(ProgressState.Error)
    }
  }, [])

  const fetchPageContent = () => {
    setPageContent(document.body.innerText)
    setIsFetched(true)
  }

  const textToWordArray = (text: string): string[] => {
    const cleanedText = text
      .toLowerCase()
      .replace(/[\t\r\n]/g, ' ')
      .replace(/ +/g, ' ')

    const words = cleanedText.split(' ')
    const filteredWords = words.filter((word) => word !== '')
    return filteredWords
  }

  const countWords = (text: string) => {
    return textToWordArray(text).length
  }

  function createPrompt(content: string, question: string) {
    const systemMessage = {
      role: 'system',
      content: `You are an expert at answering questions based on provided content. You will receive content and a question. Your response MUST be valid JSON in the following format:
  
  \`\`\`json
  {
    "is_answered": true/false,
    "answer": "string" or null
  }
  \`\`\`
  
  - \`is_answered\` MUST be \`true\` if and only if the provided content contains the answer to the question. Otherwise, it MUST be \`false\`.
  - If \`is_answered\` is \`true\`, \`answer\` MUST contain a concise and accurate answer extracted from the content. It should not be a restatement of the question.
  - If \`is_answered\` is \`false\`, \`answer\` MUST be \`null\` (not an empty string, not "null", literally the JSON null value).
  
  Do not include any explanations or other text outside the JSON object.`,
    }

    const userMessage = {
      role: 'user',
      content: 'Content:\n```\n' + content + '\n```\n\nQuestion:\n```\n' + question + '\n```',
    }

    return [systemMessage, userMessage]
  }

  const askQuestion = async () => {
    if (!pageContent) {
      console.error("No page content available. Click 'Fetch Page Content' first.")
      return
    }

    try {
      await initializeWllama()
      if (!wllamaRef.current) {
        console.error('Wllama not initialized. Please try again.')
        setAnswer('wllama not initialized')
        return
      }

      const wllama = wllamaRef.current

      const allWords = textToWordArray(pageContent)
      let fullAnswer = ''
      const relevantChunks: string[] = []

      const CHUNK_SIZE = 5000
      console.log(`Total ${Math.ceil(allWords.length / CHUNK_SIZE)} chunks to process.`)
      const tic = performance.now()
      for (let i = 0; i < allWords.length; i += CHUNK_SIZE) {
        const chunk = allWords.slice(i, i + CHUNK_SIZE).join(' ')
        let chunkAnswer = ''
        setProgressState(ProgressState.AnalyzingChunk + ` ${i / CHUNK_SIZE + 1} / ${Math.ceil(allWords.length / CHUNK_SIZE)}`)
        await wllama.createChatCompletion(createPrompt(chunk, question), {
          nPredict: 120,
          sampling: {
            temp: 0.1,
            top_k: 40,
            top_p: 0.9,
          },

          onNewToken: (token: any, piece: any, currentText: string) => {
            chunkAnswer = currentText
            setAnswer(fullAnswer + `\nchunk ${i / CHUNK_SIZE}: ${chunkAnswer}\n`)
          },
        })

        try {
          const chunkObject = JSON.parse(
            chunkAnswer
              .replace(/```json/g, '')
              .replace(/```/g, '')
              .trim(),
          )
          if (chunkObject.is_answered) {
            fullAnswer += `\nchunk ${i / CHUNK_SIZE}: ${chunkObject.answer}\n`
          }
        } catch (e: any) {
          fullAnswer += `\nchunk ${i / CHUNK_SIZE}: ${chunkAnswer}\n`
          console.log(e)
        }

        setAnswer(`${fullAnswer} (Total of ${((performance.now() - tic) / 1000).toFixed(2)} seconds)`)
      }

      setProgressState(ProgressState.Done)
    } catch (error) {
      console.error('Question processing error:', error)
      setAnswer('Failed to generate response.')
    }
  }
  const enabledAsk = question.trim().length > 0 && isFetched

  let progressText: string
  switch (progressState) {
    case ProgressState.Empty:
      progressText = ''
      break
    default:
      progressText = progressState
      break
  }

  return (
    <div className="inpage-container">
      <h1 className="inpage-title">Page Analyzer</h1>
      <button className="inpage-button" onClick={fetchPageContent}>
        Fetch Page Content
      </button>
      <div>Fetched: {isFetched ? <FaCheck style={{ color: 'green' }} /> : <FaTimes style={{ color: 'red' }} />}</div>
      <textarea className="inpage-textarea" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask a question..." />
      <button className={enabledAsk ? 'inpage-button inpage-buttonhover' : 'inpage-button inpage-buttondisabled'} onClick={askQuestion} disabled={!enabledAsk}>
        Ask
      </button>
      {progressText && (
        <div className="inpage-progress">
          {progressState !== ProgressState.Done && <FaSpinner className="spinner" />}
          <span className="inpage-progresstext">{progressText}</span>
        </div>
      )}
      {answer && (
        <div className="inpage-answer">
          <strong>Answer:</strong> {answer}
        </div>
      )}
    </div>
  )
}

export default InPageComponent
