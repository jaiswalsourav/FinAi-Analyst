import { useEffect, useRef, useState } from 'react';
import AnalysisResult from './AnalysisResult';
import StockSearch from '../dashboard/components/StockSearch';
import FinancialQuestionForm from '../dashboard/components/FinancialQuestionForm';

const SUGGESTIONS = [
  'Analyse the last 4 quarters of TCS',
  'Compare Infosys and Wipro',
  'Key risks of investing in Reliance',
  'What is a P/E ratio?',
];

function AnswerActions({ message, feedback, onFeedback, onRegenerate, copied, onCopy }) {
  if (message.error) {
    return (
      <div className="answer-actions">
        <button type="button" className="action-btn retry" onClick={() => onRegenerate(message.id)}>↻ Retry</button>
      </div>
    );
  }
  return (
    <div className="answer-actions">
      <button type="button" className="action-btn" onClick={() => onCopy(message)}>{copied === message.id ? 'Copied ✓' : 'Copy'}</button>
      <button type="button" className="action-btn" onClick={() => onRegenerate(message.id)}>↻ Regenerate</button>
      <button type="button" className={`action-btn${feedback === 'up' ? ' on' : ''}`} aria-label="Good answer" onClick={() => onFeedback(message.id, 'up')}>👍</button>
      <button type="button" className={`action-btn${feedback === 'down' ? ' on' : ''}`} aria-label="Poor answer" onClick={() => onFeedback(message.id, 'down')}>👎</button>
    </div>
  );
}

export default function AnalysisPage({
  question, setQuestion, symbol, setSymbol, messages, token,
  onSubmit, onClear, onBack, onAsk, onRegenerate, onEdit,
}) {
  const endRef = useRef(null);
  const [feedback, setFeedback] = useState({});
  const [copied, setCopied] = useState('');
  const busy = messages.some((message) => message.role === 'ai' && message.text === 'Thinking...');
  const lastAi = [...messages].reverse().find((message) => message.role === 'ai');

  // Keep the newest message in view
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const copyAnswer = async (message) => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(message.id);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      setCopied('');
    }
  };

  const toggleFeedback = (id, value) => setFeedback((current) => ({ ...current, [id]: current[id] === value ? null : value }));

  return (
    <div className="dashboard-card">
      <div className="dashboard-header">
        <div>
          <h2 style={{ margin: 0 }}>AI Analysis</h2>
          <p className="subtitle" style={{ margin: '4px 0 0' }}>
            Ask anything about a stock or the markets for a deeper analysis.
          </p>
        </div>
        <div className="header-actions">
          {messages.length > 0 && <button type="button" className="small-btn" onClick={onClear}>New chat</button>}
          <button type="button" className="small-btn" onClick={onBack}>Back to dashboard</button>
        </div>
      </div>

      <StockSearch
        token={token}
        activeSymbol={symbol}
        eyebrow="Deep analysis"
        title="Pick a company to analyse"
        onSelect={(selected) => setSymbol(selected)}
        onFallback={(text) => {
          const key = text.toUpperCase().replace(/\s+/g, '');
          setSymbol(key.includes(':') ? key : `NSE:${key}`);
        }}
      />

      <div className="chat-thread">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="empty-state">Your analysis will appear here as a conversation. Try one of these:</p>
            <div className="chip-row" style={{ justifyContent: 'center' }}>
              {SUGGESTIONS.map((text) => (
                <button key={text} type="button" className="chip" onClick={() => onAsk(text, symbol)}>{text}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          message.role === 'user' ? (
            <div className="chat-row user" key={message.id}>
              <div className="chat-bubble-wrap">
                <div className="chat-bubble">
                  {message.symbol && <span className="symbol-pill">{message.symbol}</span>}
                  <p>{message.text}</p>
                </div>
                {!busy && (
                  <button type="button" className="action-btn edit-btn" onClick={() => onEdit(message.text, message.symbol)}>✎ Edit</button>
                )}
              </div>
            </div>
          ) : (
            <div className="chat-row ai" key={message.id}>
              <div className="chat-avatar" aria-hidden="true">AI</div>
              <div className="chat-answer-wrap">
                <div className={`chat-answer${message.error ? ' is-error' : ''}`}><AnalysisResult answer={message.text} /></div>
                {message.text !== 'Thinking...' && (
                  <AnswerActions
                    message={message}
                    feedback={feedback[message.id]}
                    onFeedback={toggleFeedback}
                    onRegenerate={onRegenerate}
                    copied={copied}
                    onCopy={copyAnswer}
                  />
                )}
                {message.id === lastAi?.id && !busy && message.followUps?.length > 0 && (
                  <div className="followups">
                    <span className="chip-label">Ask next:</span>
                    {message.followUps.map((text) => (
                      <button key={text} type="button" className="chip" onClick={() => onAsk(text, message.symbol || symbol)}>{text}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        ))}
        <div ref={endRef} />
      </div>

      <FinancialQuestionForm
        question={question}
        setQuestion={setQuestion}
        symbol={symbol}
        setSymbol={setSymbol}
        onSubmit={onSubmit}
        busy={busy}
      />
    </div>
  );
}
