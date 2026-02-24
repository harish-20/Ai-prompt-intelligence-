import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Groq from 'groq-sdk';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const EXTRACT_SYSTEM = `You are a precise extraction assistant. Extract structured options from the user's prompt. Return ONLY valid JSON, no markdown or explanation.

Extract these fields (use null for missing/ambiguous values):
- duration: number (seconds) or string like "30 seconds", "1 minute"
- language: string (e.g., "English", "Spanish")
- platform: string (e.g., "YouTube", "TikTok", "Instagram")
- size: one of "Landscape" | "Vertical" | "Square"
- category: string (e.g., "Kids", "Education", "Entertainment")

Example output: {"duration":"30 seconds","language":"English","platform":"YouTube","size":"Vertical","category":"Kids/Education"}`;

const ENHANCE_SYSTEM = `You are an expert prompt engineer for AI video generation. Given the user's original prompt and extracted options, produce a refined, structured, production-ready prompt suitable for AI video generation.

Requirements:
- Keep the core intent and creative direction
- Add clarity, structure, and professional framing
- Incorporate the provided options (duration, language, platform, size, category) naturally
- Make it detailed enough for high-quality video generation
- Output ONLY the enhanced prompt text, no meta-commentary or labels`;

const SCRIPT_SYSTEM = `You are an expert cinematic video scriptwriter. Generate a scene-by-scene video script based on the user's prompt.

For each scene, include:
1. SCENE [number]: Brief visual description (what we see on screen)
2. NARRATION: The spoken/voiceover text
3. MOOD: The emotional tone and atmosphere
4. VISUAL CUES: Key visual elements, transitions, or effects

Maintain a cinematic storytelling tone. Structure the script clearly with scene breaks. Output the full script as formatted text.`;

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'API is running' });
});

app.post('/api/extract', async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
  }
  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: EXTRACT_SYSTEM },
        { role: 'user', content: `Extract options from this prompt:\n\n${prompt.trim()}` },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content?.trim() || '{}';
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }

    res.json({
      duration: parsed.duration ?? '',
      language: parsed.language ?? '',
      platform: parsed.platform ?? '',
      size: parsed.size ?? '',
      category: parsed.category ?? '',
    });
  } catch (err) {
    console.error('Extract error:', err);
    res.status(500).json({ error: err.message || 'Failed to extract options' });
  }
});

app.post('/api/enhance', async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
  }
  try {
    const { prompt, options } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const opts = options || {};
    const context = [
      `Original prompt: ${prompt.trim()}`,
      opts.duration && `Duration: ${opts.duration}`,
      opts.language && `Language: ${opts.language}`,
      opts.platform && `Platform: ${opts.platform}`,
      opts.size && `Format/Size: ${opts.size}`,
      opts.category && `Category: ${opts.category}`,
    ]
      .filter(Boolean)
      .join('\n');

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: ENHANCE_SYSTEM },
        { role: 'user', content: context },
      ],
      temperature: 0.5,
    });

    const enhanced = completion.choices[0]?.message?.content?.trim() || prompt;
    res.json({ enhancedPrompt: enhanced });
  } catch (err) {
    console.error('Enhance error:', err);
    res.status(500).json({ error: err.message || 'Failed to enhance prompt' });
  }
});

app.post('/api/generate-script', async (req, res) => {
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured' });
  }
  try {
    const { prompt } = req.body || {};
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SCRIPT_SYSTEM },
        {
          role: 'user',
          content: `Generate a cinematic video script for:\n\n${prompt.trim()}`,
        },
      ],
      temperature: 0.6,
    });

    const script = completion.choices[0]?.message?.content?.trim() || 'No script generated.';
    res.json({ script });
  } catch (err) {
    console.error('Generate script error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate video script' });
  }
});

// 404 for unknown routes (must be before listen)
app.use((req, res) => {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend API running at http://localhost:${PORT}`);
});
