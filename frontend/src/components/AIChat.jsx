import { useEffect, useRef, useState } from 'react'
import { checkHealth, sendChat as sendChatRequest } from '../services/api'

const SUGGESTED_QUESTIONS = [
  'How do I cut my bill by 30%?',
  'Which appliance should I replace first?',
  'What is my biggest source of CO2?',
]

function renderInlineContent(text) {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
      }

      return part
    })
}

function buildMessageBlocks(text) {
  const blocks = []
  const lines = text.split('\n')
  let paragraphLines = []
  let listItems = []

  function flushParagraph() {
    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', lines: paragraphLines })
      paragraphLines = []
    }
  }

  function flushList() {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', items: listItems })
      listItems = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const bulletMatch = line.match(/^([-*]|\d+\.)\s+(.*)$/)

    if (bulletMatch) {
      flushParagraph()
      listItems.push(bulletMatch[2])
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  flushParagraph()
  flushList()

  return blocks
}

function FormattedMessage({ text, role }) {
  if (role === 'user') {
    return <span className="chat-message-plain">{text}</span>
  }

  const blocks = buildMessageBlocks(text)

  return (
    <div className="chat-message-body">
      {blocks.map((block, blockIndex) => {
        if (block.type === 'list') {
          return (
            <ul className="chat-message-list" key={`list-${blockIndex}`}>
              {block.items.map((item, itemIndex) => (
                <li key={`item-${blockIndex}-${itemIndex}`}>{renderInlineContent(item)}</li>
              ))}
            </ul>
          )
        }

        return (
          <div className="chat-message-block" key={`paragraph-${blockIndex}`}>
            {block.lines.map((line, lineIndex) => (
              <p className="chat-message-paragraph" key={`line-${blockIndex}-${lineIndex}`}>
                {renderInlineContent(line)}
              </p>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function AIChat({ currentUser, rooms, totalMonthlyCost, totalCO2, topVampires, ratePerUnit }) {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'Hi! I have analyzed your home energy profile. Ask me anything about reducing your bill.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [backendAlive, setBackendAlive] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    checkHealth()
      .then(() => setBackendAlive(true))
      .catch(() => setBackendAlive(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(presetMessage) {
    const userMessage = typeof presetMessage === 'string' ? presetMessage : input.trim()

    if (!userMessage || loading) {
      return
    }

    setInput('')
    setMessages((currentMessages) => [...currentMessages, { role: 'user', text: userMessage }])
    setLoading(true)

    try {
      const history = messages
        .slice(1)
        .map((message) => ({
          role: message.role === 'ai' ? 'assistant' : 'user',
          content: message.text,
        }))

      const data = await sendChatRequest({
        message: userMessage,
        history,
        currentUser: currentUser
          ? {
              id: currentUser._id,
              name: currentUser.name,
              email: currentUser.email,
            }
          : null,
        inventory: rooms,
        totalMonthlyCost,
        totalCO2,
        topVampires,
        ratePerUnit,
      })

      setMessages((currentMessages) => [
        ...currentMessages,
        { role: 'ai', text: data.reply ?? 'No reply received from the AI advisor.' },
      ])
      setBackendAlive(true)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : ''
      const isNetworkError = /network|fetch|load/i.test(errorMessage)
      const replyText = isNetworkError
        ? 'Sorry, the AI advisor is offline. Check your energy vampires in the Rankings tab.'
        : errorMessage.includes('ratePerUnit')
          ? 'Please enter a valid electricity rate above 0 before using the AI advisor.'
          : `Sorry, ${errorMessage || 'the AI advisor is temporarily unavailable.'}`

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          role: 'ai',
          text: replyText,
        },
      ])
      setBackendAlive(isNetworkError ? false : true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-stack">
      <div className="section-head">
        <div>
          <p className="panel-heading">Context-aware assistant</p>
          <h2 className="section-title">AI Advisor</h2>
        </div>
        <p className="section-copy">
          This is the bonus layer. If the backend is offline, the rest of the product still works,
          but when it is online the advisor can explain the numbers in plain language.
        </p>
      </div>

      <section className="chat-panel chat-stack">
        <div className={`chat-status ${backendAlive === false ? 'chat-status-offline' : ''}`}>
          <span
            className={`status-dot ${
              backendAlive === true ? 'status-dot-good' : backendAlive === false ? 'status-dot-danger' : ''
            }`}
          />
          <span>
            {backendAlive === null && 'Connecting to AI Advisor...'}
            {backendAlive === true && 'AI Advisor Online'}
            {backendAlive === false && 'AI Advisor Offline. Tabs 1-4 still work.'}
          </span>
        </div>

        {messages.length === 1 ? (
          <div className="chip-row">
            {SUGGESTED_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                className="chip"
                onClick={() => sendMessage(question)}
                disabled={loading}
              >
                {question}
              </button>
            ))}
          </div>
        ) : null}

        <div className="chat-window">
          {messages.map((message, index) => (
            <div
              className={`chat-row ${message.role === 'user' ? 'chat-row-user' : 'chat-row-ai'}`}
              key={`${message.role}-${index}`}
            >
              <div
                className={`chat-message ${
                  message.role === 'user' ? 'chat-message-user' : 'chat-message-ai'
                }`}
              >
                <FormattedMessage role={message.role} text={message.text} />
              </div>
            </div>
          ))}

          {loading ? (
            <div className="chat-row chat-row-ai">
              <div className="chat-message chat-message-ai">
                <span className="loading-dots" aria-label="Loading response">
                  <span className="loading-dot" />
                  <span className="loading-dot" />
                  <span className="loading-dot" />
                </span>
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} />
        </div>

        <div className="chat-input-row">
          <input
            className="input"
            type="text"
            placeholder="Ask about your energy usage..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                sendMessage()
              }
            }}
          />
          <button
            type="button"
            className="button button-primary"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            Send
          </button>
        </div>
      </section>
    </div>
  )
}

export default AIChat
