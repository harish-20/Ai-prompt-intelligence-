import { useState } from 'react';
import axios from 'axios';

const SIZE_OPTIONS = ['', 'Landscape', 'Vertical', 'Square'];

// In dev: Vite proxies /api to backend. In prod: use VITE_API_URL env var.
const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE || undefined,
  headers: { 'Content-Type': 'application/json' },
});

async function apiCall(endpoint, body) {
  const { data } = await api.post(`/api${endpoint}`, body);
  return data;
}

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState({
    duration: '',
    language: '',
    platform: '',
    size: '',
    category: '',
  });
  const [script, setScript] = useState('');
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const clearError = () => setError('');

  const handleExtract = async () => {
    setError('');
    setLoading('extract');
    try {
      const data = await apiCall('/extract', { prompt });
      setOptions({
        duration: data.duration ?? '',
        language: data.language ?? '',
        platform: data.platform ?? '',
        size: data.size ?? '',
        category: data.category ?? '',
      });
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleEnhance = async () => {
    setError('');
    setLoading('enhance');
    try {
      const data = await apiCall('/enhance', { prompt, options });
      setPrompt(data.enhancedPrompt ?? prompt);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleGenerateScript = async () => {
    setError('');
    setLoading('script');
    setScript('');
    try {
      const data = await apiCall('/generate-script', { prompt });
      setScript(data.script ?? '');
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(null);
    }
  };

  const updateOption = (key, value) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="app">
      <header className="header">
        <h1>AI Prompt Intelligence</h1>
        <span className="header-badge">Prompt Processing</span>
      </header>

      <section className="prompt-section">
        <label className="section-label" htmlFor="prompt-box">
          Prompt Box
        </label>
        <textarea
          id="prompt-box"
          className="prompt-box"
          placeholder="e.g., Create a 30 second kids educational video about cleanliness for YouTube in English, vertical format."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onFocus={clearError}
        />
      </section>

      <section className="options-grid">
        <div className="option-field">
          <label htmlFor="duration">Duration</label>
          <input
            id="duration"
            type="text"
            placeholder="e.g., 30 seconds"
            value={options.duration}
            onChange={(e) => updateOption('duration', e.target.value)}
          />
        </div>
        <div className="option-field">
          <label htmlFor="language">Language</label>
          <input
            id="language"
            type="text"
            placeholder="e.g., English"
            value={options.language}
            onChange={(e) => updateOption('language', e.target.value)}
          />
        </div>
        <div className="option-field">
          <label htmlFor="platform">Platform</label>
          <input
            id="platform"
            type="text"
            placeholder="e.g., YouTube"
            value={options.platform}
            onChange={(e) => updateOption('platform', e.target.value)}
          />
        </div>
        <div className="option-field">
          <label htmlFor="size">Size</label>
          <select
            id="size"
            value={options.size}
            onChange={(e) => updateOption('size', e.target.value)}
          >
            {SIZE_OPTIONS.map((opt) => (
              <option key={opt || 'empty'} value={opt}>
                {opt || '— Select —'}
              </option>
            ))}
          </select>
        </div>
        <div className="option-field">
          <label htmlFor="category">Category</label>
          <input
            id="category"
            type="text"
            placeholder="e.g., Kids/Education"
            value={options.category}
            onChange={(e) => updateOption('category', e.target.value)}
          />
        </div>
      </section>

      <div className="actions">
        <button
          className="btn"
          onClick={handleExtract}
          disabled={!prompt.trim() || loading}
        >
          {loading === 'extract' ? (
            <span className="loading">
              <span className="spinner" /> Extracting…
            </span>
          ) : (
            'Extract Options'
          )}
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleEnhance}
          disabled={!prompt.trim() || loading}
        >
          {loading === 'enhance' ? (
            <span className="loading">
              <span className="spinner" /> Enhancing…
            </span>
          ) : (
            'Enhance Prompt'
          )}
        </button>
        <button
          className="btn"
          onClick={handleGenerateScript}
          disabled={!prompt.trim() || loading}
        >
          {loading === 'script' ? (
            <span className="loading">
              <span className="spinner" /> Generating…
            </span>
          ) : (
            'Generate Video Script'
          )}
        </button>
      </div>

      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <div className="flow-hint">
        <strong>Workflow:</strong> Enter your prompt → Extract Options (fills fields from prompt) → Edit fields if needed → Enhance Prompt (refills Prompt Box) → Edit prompt if desired → Generate Video Script
      </div>

      {script && (
        <section className="script-output">
          <h3>Generated Cinematic Video Script</h3>
          <pre className="script-content">{script}</pre>
        </section>
      )}
    </div>
  );
}
