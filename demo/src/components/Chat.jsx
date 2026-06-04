import { useState } from 'react';
import { chatService } from '../services/chat.service';

export function Chat() {
  const [leadId, setLeadId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState('init');

  const handleInit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await chatService.initLead({ full_name: fullName, email });
      setLeadId(res.lead_id);
      setStep('chat');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await chatService.query({ lead_id: leadId, query });
      setResponse(res);
      setQuery('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const Sources = ({ sources }) => (
    <div className="sources">
      <h4>Nguồn tham khảo:</h4>
      {sources.map((s, i) => (
        <div key={i} className="source-item">
          <span className="source-category">{s.category}</span>
          <span className="source-score">{(s.score * 100).toFixed(0)}%</span>
          <p>{s.content.slice(0, 200)}...</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="chat-container">
      <h1>VinUni Chat Demo</h1>

      {step === 'init' && (
        <form onSubmit={handleInit} className="init-form">
          <h2>Khởi tạo Lead</h2>
          <input
            type="text"
            placeholder="Họ tên"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Đang xử lý...' : 'Bắt đầu chat'}
          </button>
        </form>
      )}

      {step === 'chat' && (
        <div className="chat-form">
          <div className="lead-info">
            Lead ID: <strong>{leadId}</strong>
          </div>
          <form onSubmit={handleQuery}>
            <input
              type="text"
              placeholder="Nhập câu hỏi..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Đang trả lời...' : 'Gửi'}
            </button>
          </form>
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {response && (
        <div className="response">
          <h3>Câu trả lời:</h3>
          <p className="answer">{response.answer}</p>
          <div className="meta">
            <span>Confidence: {(response.confidence * 100).toFixed(0)}%</span>
            <span>Mode: {response.retrieval_mode}</span>
          </div>
          {response.sources.length > 0 && <Sources sources={response.sources} />}
          {response.follow_up_suggestions.length > 0 && (
            <div className="suggestions">
              <h4>Gợi ý tiếp theo:</h4>
              <ul>
                {response.follow_up_suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
