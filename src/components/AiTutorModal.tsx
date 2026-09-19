import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Sparkles, User, Lightbulb, Zap, Loader2, Cpu } from 'lucide-react';
import { Question, UserAnswerRecord, AiProvider } from '../types';

interface AiTutorModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  userAnswer?: UserAnswerRecord;
  subtestName?: string;
}

interface Message {
  role: 'tutor' | 'user';
  text: string;
  timestamp: string;
  aiEngine?: string;
}

export const AiTutorModal: React.FC<AiTutorModalProps> = ({
  isOpen,
  onClose,
  question,
  userAnswer,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<AiProvider>('gemini');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize initial greeting & analysis when question changes
  useEffect(() => {
    if (question && isOpen) {
      const initialGreeting: Message = {
        role: 'tutor',
        text: `Halo! Saya Tutor AI UTBK kamu. Saya siap membantu membedah **Soal ${question.subtestName} (${question.topic})** ini. Kamu bisa bertanya tentang konsep dasar, langkah pengerjaan, atau trik cepat menghemat waktu. Apa yang ingin kamu tanyakan?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([initialGreeting]);
    }
  }, [question, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen || !question) return null;

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputPrompt;
    if (!promptToSend.trim() || loading) return;

    const userMsg: Message = {
      role: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInputPrompt('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/ask-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionData: question,
          userAnswer: userAnswer?.selectedOption || userAnswer?.numericAnswer || userAnswer?.complexAnswers || 'Belum diisi',
          userPrompt: promptToSend,
          chatHistory: messages.map(m => ({ role: m.role, text: m.text })),
          aiEngine: selectedEngine,
        }),
      });

      const data = await res.json();
      const tutorMsg: Message = {
        role: 'tutor',
        text: data.reply || 'Maaf, saya tidak dapat memproses jawaban saat ini.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        aiEngine: data.aiEngine || selectedEngine,
      };

      setMessages(prev => [...prev, tutorMsg]);
    } catch (err) {
      console.warn('AI Tutor network unavailable, using local master explanation:', err);
      
      const correctOpt = question.correctAnswer || 'A';
      const expl = question.explanation;
      const steps = expl?.steps?.length ? expl.steps.map(s => `- ${s}`).join('\n') : '- Pahami kata kunci stimulus\n- Eliminasi opsi yang tidak logis\n- Tentukan jawaban sesuai konsep';
      
      const localTutorReply = `### 🧑‍🏫 Pembahasan Master Tutor (${question.subtestName})

**Kunci Jawaban Benar:** **Opsi ${correctOpt}**

---

#### 📌 Konsep Inti:
${expl?.concept || `Prinsip Pemahaman ${question.topic || question.subtestName}`}

#### 💡 Langkah Penyelesaian Sistematis:
${steps}

#### ⚡ Trik Cepat / Logika Cerdas:
${expl?.fastTrick || 'Fokus pada kata kunci pertanyaan dan jangan terdistraksi opsi pengecoh.'}

${expl?.summary ? `\n> **Catatan:** ${expl.summary}` : ''}`;

      const errorMsg: Message = {
        role: 'tutor',
        text: localTutorReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        aiEngine: 'fallback',
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'Tolong jelaskan konsep dasar dan kenapa kunci jawaban ini benar.',
    'Apakah ada trik cepat (cara the king) untuk soal ini?',
    'Apa kesalahan paling umum siswa pada tipe soal seperti ini?',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end p-0 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div
        id="ai-tutor-drawer"
        className="bg-slate-900 border-l sm:border border-slate-800 sm:rounded-2xl w-full max-w-lg h-full sm:h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-gradient-to-r from-indigo-950/50 via-slate-900 to-purple-950/40 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-white">Tutor AI UTBK</h3>
                <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  <span>Online</span>
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">
                Membahas: {question.subtestName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Question Mini Banner */}
        <div className="px-5 py-2 bg-slate-950 border-b border-slate-800 text-xs text-slate-300 flex items-center justify-between flex-wrap gap-2">
          <span className="font-semibold text-indigo-300">
            Topik: {question.topic} ({question.difficulty})
          </span>
          <span className="text-slate-500">
            Kunci: <strong className="text-emerald-400">{JSON.stringify(question.correctAnswer)}</strong>
          </span>
        </div>

        {/* AI Engine Switcher */}
        <div className="px-4 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-slate-400">Pilih Otak AI:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setSelectedEngine('gemini')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                selectedEngine === 'gemini'
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gemini 3.7
            </button>
            <button
              onClick={() => setSelectedEngine('deepseek_v3')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                selectedEngine === 'deepseek_v3'
                  ? 'bg-cyan-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              DeepSeek V3
            </button>
            <button
              onClick={() => setSelectedEngine('deepseek_r1')}
              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                selectedEngine === 'deepseek_r1'
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              DeepSeek R1
            </button>
          </div>
        </div>

        {/* Messages Chat Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-2.5 ${
                m.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
                }`}
              >
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-tl-none whitespace-pre-wrap'
                }`}
              >
                {m.text}
                <span
                  className={`block text-[10px] mt-1.5 ${
                    m.role === 'user' ? 'text-indigo-200 text-right' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-slate-400 text-xs py-2 px-3 bg-slate-800/40 rounded-xl w-fit border border-slate-700/50">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Tutor AI sedang menganalisis soal...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-950/60 border-t border-slate-800 flex items-center space-x-1.5 overflow-x-auto text-[11px]">
          <span className="text-slate-400 shrink-0 font-medium flex items-center space-x-1">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>Tanya cepat:</span>
          </span>
          {quickPrompts.map((q, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(q)}
              disabled={loading}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 whitespace-nowrap transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-slate-900">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder="Tulis pertanyaanmu ke Tutor AI..."
              value={inputPrompt}
              onChange={e => setInputPrompt(e.target.value)}
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !inputPrompt.trim()}
              className="p-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl shadow-md shadow-indigo-900/30 transition-all disabled:opacity-50 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
