import React, { useState } from 'react';
import { Bot, Send, X, Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { Profile, Language, Role } from '../types';
import { api } from '../lib/api';
import { translations } from '../lib/translations';

interface AiAssistantWidgetProps {
  onClose: () => void;
  language: Language;
  currentProfile: Profile;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export const AiAssistantWidget: React.FC<AiAssistantWidgetProps> = ({
  onClose,
  language,
  currentProfile,
}) => {
  const t = translations[language];
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text:
        language === 'te'
          ? 'నమస్కారం! నేను ఫార్మ్2హోమ్ AI వ్యవసాయ నిపుణుడిని. పంటల సంరక్షణ, సహజ ఎరువుల యాజమాన్యం, ధరల విశ్లేషణ గురించి నన్ను ఏదైనా అడగండి.'
          : language === 'hi'
          ? 'नमस्ते! मैं फार्म2होम एआई कृषि विशेषज्ञ हूँ। फसल सुरक्षा, जैविक खाद, मौसम या मंडी भाव के बारे में कोई भी प्रश्न पूछें।'
          : language === 'ta'
          ? 'வணக்கம்! நான் ஃபார்ம்2ஹோம் AI விவசாய ஆலோசகர். பயிர் பாதுகாப்பு மற்றும் சந்தை நிலவரம் குறித்த கேள்விகளைக் கேட்கலாம்.'
          : 'Hello! I am your Farm2Home AI Specialist. Ask me about crop care, organic pest protection, soil nutrients (NPK), harvest timing, or consumer produce storage tips.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const quickPrompts: Record<Role, string[]> = {
    farmer: [
      'How to control leaf curl virus in organic tomatoes?',
      'Best organic NPK compost recipe for monsoon greens',
      'Recommended harvesting time for Banganapalli mangoes',
      'How should I price fresh farm A2 milk this season?',
    ],
    customer: [
      'How should I store raw leafy greens to stay fresh 7+ days?',
      'What are the health benefits of unpolished Toor Dal?',
      'How to identify naturally tree-ripened mangoes?',
      'Best seasonal vegetables to cook this month for gut health',
    ],
    delivery: [
      'Best practices for transporting temperature-sensitive A2 milk',
      'How to avoid crushing tender tomatoes during transit',
      'Perishable storage packing during peak monsoon rains',
      'Customer OTP verification etiquette on arrival',
    ],
  };

  const handleSend = async (promptToSend?: string) => {
    const query = promptToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.askAiAssistant(query, language, currentProfile.role);
      const botMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'err_' + Date.now(),
        sender: 'assistant',
        text: `Unable to get answer: ${err.message || 'Please check your connection and GEMINI_API_KEY.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col h-[520px] transition-all">
      {/* Header */}
      <div className="bg-emerald-700 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-800 flex items-center justify-center text-emerald-200">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-semibold text-sm leading-tight flex items-center gap-1.5">
              {t.aiAssistant}
              <span className="text-[10px] bg-emerald-600/80 px-1.5 py-0.5 rounded text-emerald-100 font-normal">
                Gemini
              </span>
            </h4>
            <p className="text-[11px] text-emerald-200">
              Role: {currentProfile.role.toUpperCase()} • Mode: {language.toUpperCase()}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-emerald-200 hover:text-white p-1 rounded-md transition-colors"
          title="Close AI Assistant"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-stone-50 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl p-2.5 ${
                m.sender === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none'
                  : 'bg-white border border-stone-200 text-stone-800 rounded-bl-none shadow-xs whitespace-pre-line'
              }`}
            >
              {m.text}
            </div>
            <span className="text-[10px] text-stone-400 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-stone-500 bg-white border border-stone-200 rounded-lg p-2.5 max-w-[80%]">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span className="text-xs">{t.thinking}</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="p-2 bg-stone-100 border-t border-stone-200 flex gap-1.5 overflow-x-auto text-[11px]">
        {quickPrompts[currentProfile.role].map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            disabled={loading}
            className="whitespace-nowrap px-2.5 py-1 bg-white border border-stone-200 text-stone-700 rounded-full hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-800 transition-colors shrink-0"
          >
            <Sparkles className="w-3 h-3 inline mr-1 text-emerald-600" />
            {p}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <div className="p-3 bg-white border-t border-stone-200 flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
          placeholder={t.askAiPlaceholder}
          disabled={loading}
          className="flex-1 text-xs px-3 py-2 border border-stone-300 rounded-xl focus:outline-emerald-600 bg-stone-50 focus:bg-white"
        />
        <button
          onClick={() => handleSend()}
          disabled={loading || !input.trim()}
          className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors shrink-0"
          title={t.send}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
