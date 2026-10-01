import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  X,
  Sparkles,
  Loader2,
  RefreshCw,
  User,
  Sprout,
  AlertTriangle,
  HelpCircle,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
} from 'lucide-react';
import { Profile, Language, Role, AssistantResponse } from '../types';
import { api } from '../lib/api';
import { getTranslation } from '../lib/translations';
import { MarkdownRenderer } from './MarkdownRenderer';

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
  metadata?: {
    category?: string;
    confidence?: 'high' | 'medium' | 'low';
    needs_more_information?: boolean;
    follow_up_questions?: string[];
    warnings?: string[];
  };
  attachedImagePreview?: string;
}

export const AiAssistantWidget: React.FC<AiAssistantWidgetProps> = ({
  onClose,
  language,
  currentProfile,
}) => {
  const t = getTranslation(language);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: t.ai.welcomeMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      metadata: {
        category: 'general_guidance',
        confidence: 'high',
      },
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    file: File;
    previewUrl: string;
    base64: string;
    mimeType: string;
  } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPromptsByLang: Record<Language, Record<Role, string[]>> = {
    te: {
      farmer: [
        'టమాటోలో ఆకుముడుత తెగులు నివారణ ఎలా?',
        'ఈ సీజన్‌లో జీవామృతం ఎలా తయారుచేయాలి?',
        'ప్రస్తుత వాతావరణానికి అనువైన పంటలేవి?',
        'నేల సారాన్ని సహజంగా ఎలా పెంచాలి?',
      ],
      customer: [
        'ఆకుకూరలు 7 రోజులు తాజాగా ఉండాలంటే ఎలా నిల్వ చేయాలి?',
        'పాలిష్ చేయని కందిపప్పు ఆరోగ్య ప్రయోజనాలు ఏమిటి?',
        'సహజంగా పండిన సేంద్రీయ మామిడి పండ్లను గుర్తించడం ఎలా?',
        'ఈ వారం ఆరోగ్యకరమైన భోజనం కోసం ఏ తాజా కూరగాయలు కొనాలి?',
      ],
      delivery: [
        'పాల ఉత్పత్తుల సురక్షిత రవాణా పద్ధతులు ఏమిటి?',
        'రవాణాలో టమాటోలు పాడవకుండా ఎలా జాగ్రత్తపడాలి?',
        'వర్షంలో తడవకుండా డెలివరీ బ్యాగ్ భద్రత',
        'డెలివరీ చేరిన తర్వాత OTP ధృవీకరణ మార్గదర్శకాలు',
      ],
    },
    hi: {
      farmer: [
        'टमाटर में पत्ती मरोड़ रोग का जैविक उपचार क्या है?',
        'फसलों के लिए जीवामृत बनाने की सही विधि',
        'वर्तमान मौसम के अनुसार कौन सी फसल लगाएं?',
        'मिट्टी की प्राकृतिक उर्वरता कैसे सुधारें?',
      ],
      customer: [
        'हरी पत्तेदार सब्जियों को 7 दिनों तक ताजा कैसे रखें?',
        'बिना पॉलिश वाली अरहर दाल के क्या फायदे हैं?',
        'प्राकृतिक रूप से पके जैविक फल की पहचान कैसे करें?',
        'इस सप्ताह स्वास्थ्य के लिए कौन सी मौसमी सब्जियां लें?',
      ],
      delivery: [
        'तापमान संवेदनशील दूध व उत्पादों का सुरक्षित परिवहन',
        'परिवहन के दौरान टमाटर जैसी नाजुक फसलों की सुरक्षा',
        'बारिश के मौसम में फसलों की सुरक्षित डिलीवरी',
        'ग्राहक डिलीवरी पर 6-अंकीय OTP सत्यापन',
      ],
    },
    ta: {
      farmer: [
        'தக்காளியில் இலை சுருட்டை நோயைக் கட்டுப்படுத்துவது எப்படி?',
        'பயிர்களுக்கான ஜீவாமிர்தம் தயாரிக்கும் முறை',
        'தற்போதைய காலநிலைக்கு ஏற்ற பயிர்கள் எவை?',
        'மண் வளத்தை இயற்கையாக அதிகரிப்பது எப்படி?',
      ],
      customer: [
        'கீரைகளை 7 நாட்களுக்கு மேலாக புத்துணர்ச்சியுடன் சேமிப்பது எப்படி?',
        'தீட்டப்படாத துவரம் பருப்பின் நன்மைகள் என்ன?',
        'இயற்கையாக பழுத்த ஆர்கானிக் மாம்பழங்களை அறிவது எப்படி?',
        'இந்த வாரம் ஆரோக்கியமான சமையலுக்கு ஏற்ற காய்கறிகள் எவை?',
      ],
      delivery: [
        'பால் பொருட்களை பாதுகாப்பாக கொண்டு செல்வது எப்படி?',
        'போக்குவரத்தின் போது தக்காளி சேதமடையாமல் தடுப்பது எப்படி?',
        'மழைக்காலத்தில் விளைபொருட்களை பாதுகாக்கும் வழிகள்',
        'வாடிக்கையாளர் OTP சரிபார்ப்பு முறை',
      ],
    },
    en: {
      farmer: [
        'How to control leaf curl virus in organic tomatoes?',
        'Best organic NPK compost recipe for crops',
        'What should I grow this season based on current weather?',
        'How to test and correct soil pH naturally?',
      ],
      customer: [
        'How should I store raw leafy greens to stay fresh 7+ days?',
        'What are the health benefits of unpolished Toor Dal?',
        'How to identify naturally tree-ripened organic mangoes?',
        'Best seasonal farm vegetables to cook this week for nutrition',
      ],
      delivery: [
        'Best practices for transporting temperature-sensitive A2 milk',
        'How to avoid crushing tender tomatoes during transit',
        'Perishable storage packing during peak rains',
        'Customer OTP verification etiquette on arrival',
      ],
    },
  };

  const currentRolePrompts =
    (quickPromptsByLang[language] && quickPromptsByLang[language][currentProfile.role]) ||
    quickPromptsByLang.en[currentProfile.role];

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 4MB)
    if (file.size > 4 * 1024 * 1024) {
      alert('Please upload an image smaller than 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      setSelectedImage({
        file,
        previewUrl: URL.createObjectURL(file),
        base64: base64String,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedImage = () => {
    if (selectedImage?.previewUrl) {
      URL.revokeObjectURL(selectedImage.previewUrl);
    }
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async (promptToSend?: string) => {
    const query = promptToSend || input;
    if ((!query.trim() && !selectedImage) || loading) return;

    const currentImage = selectedImage;
    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: query.trim() || 'Attached leaf/crop photo for agronomic assessment.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedImagePreview: currentImage ? currentImage.previewUrl : undefined,
    };

    // Construct conversation history for multi-turn context (last 8 messages)
    const historyPayload = messages.slice(-8).map((m) => ({
      role: m.sender,
      content: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSelectedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setLoading(true);

    try {
      const res: AssistantResponse = await api.askAiAssistant(
        query.trim() || 'Please examine this crop image for symptoms, disease indicators, or pests.',
        language,
        currentProfile.role,
        {
          userId: currentProfile.id,
          history: historyPayload,
          image: currentImage
            ? {
                inlineData: {
                  mimeType: currentImage.mimeType,
                  data: currentImage.base64,
                },
              }
            : undefined,
        }
      );

      const botMsg: ChatMessage = {
        id: 'bot_' + Date.now(),
        sender: 'assistant',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metadata: {
          category: res.category,
          confidence: res.confidence,
          needs_more_information: res.needs_more_information,
          follow_up_questions: res.follow_up_questions,
          warnings: res.warnings,
        },
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: 'err_' + Date.now(),
        sender: 'assistant',
        text: 'Farm2Home AI Agronomist is temporarily busy. Please try again in a moment.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetConversation = () => {
    setMessages([
      {
        id: 'welcome_' + Date.now(),
        sender: 'assistant',
        text: t.ai.welcomeMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[95vw] sm:w-[460px] bg-[#0f1115] rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden flex flex-col h-[640px] max-h-[88vh] transition-all text-white backdrop-blur-md">
      {/* Header */}
      <div className="p-3 bg-[#121418] border-b border-white/[0.08] text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-xs">
            <Sprout className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold flex items-center gap-1.5">
              <span>{t.ai.title}</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                {currentProfile.role === 'farmer' ? t.auth.farmerRole : currentProfile.role === 'customer' ? t.auth.customerRole : t.auth.deliveryRole}
              </span>
            </h3>
            <p className="text-[10px] text-zinc-400">
              {t.ai.subtitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleResetConversation}
            className="p-1.5 text-zinc-400 hover:text-emerald-400 hover:bg-white/[0.06] rounded-lg transition-colors"
            title={t.ai.clearChat}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
            title={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-[#09090b]/90 text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'assistant' && (
              <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
              </div>
            )}

            <div
              className={`max-w-[85%] p-3 rounded-2xl shadow-md leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-emerald-500 text-zinc-950 font-medium rounded-tr-xs'
                  : 'bg-[#121418] text-zinc-100 border border-white/[0.08] rounded-tl-xs'
              }`}
            >
              {/* Attached Image preview if any */}
              {m.attachedImagePreview && (
                <div className="mb-2 rounded-lg overflow-hidden border border-black/20 max-h-36">
                  <img
                    src={m.attachedImagePreview}
                    alt="Uploaded Crop Leaf"
                    className="w-full h-auto object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}

              {/* Message text */}
              {m.sender === 'assistant' ? (
                <MarkdownRenderer content={m.text} />
              ) : (
                <div className="whitespace-pre-line text-xs break-words">{m.text}</div>
              )}

              {/* Metadata Badges & Follow-ups for Assistant Responses */}
              {m.sender === 'assistant' && m.metadata && (
                <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-2 text-[11px]">
                  {/* Category & Confidence Badge */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {m.metadata.category && (
                      <span className="px-1.5 py-0.5 rounded-md bg-white/[0.05] text-zinc-400 border border-white/[0.08] text-[10px]">
                        {m.metadata.category.replace('_', ' ')}
                      </span>
                    )}
                    {m.metadata.confidence && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] flex items-center gap-1 border ${
                          m.metadata.confidence === 'high'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : m.metadata.confidence === 'medium'
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-400 border-white/[0.08]'
                        }`}
                      >
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>
                          {m.metadata.confidence === 'high'
                            ? t.ai.confidenceHigh
                            : m.metadata.confidence === 'medium'
                            ? t.ai.confidenceMedium
                            : t.ai.confidenceLow}
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Safety Warnings if present */}
                  {m.metadata.warnings && m.metadata.warnings.length > 0 && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1">
                      <p className="text-[10px] font-bold text-amber-400">{t.ai.advisoryWarningsTitle}</p>
                      {m.metadata.warnings.map((w, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 text-[10px]">
                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Follow-up Prompts to refine diagnosis */}
                  {m.metadata.follow_up_questions && m.metadata.follow_up_questions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3 text-emerald-400" />
                        <span>{t.ai.followUpQuestionsTitle}</span>
                      </p>
                      <div className="flex flex-col gap-1">
                        {m.metadata.follow_up_questions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSend(q)}
                            className="text-left text-[11px] p-1.5 rounded-md bg-[#16191f] hover:bg-emerald-500/10 hover:text-emerald-300 border border-white/[0.06] text-zinc-300 transition-colors"
                          >
                            • {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <span
                className={`text-[9px] mt-1.5 block font-medium ${
                  m.sender === 'user' ? 'text-zinc-800 text-right' : 'text-zinc-500'
                }`}
              >
                {m.timestamp}
              </span>
            </div>

            {m.sender === 'user' && (
              <div className="w-6 h-6 rounded-lg bg-zinc-800 border border-white/[0.1] text-zinc-300 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 items-center text-xs text-zinc-300 bg-[#121418] p-3 rounded-xl border border-white/[0.08] max-w-[85%] shadow-md">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <div className="space-y-0.5">
              <p className="font-medium text-emerald-300">{t.ai.thinking}</p>
              <p className="text-[10px] text-zinc-400">
                {t.ai.subtitle}
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-2 bg-[#0f1115] border-t border-white/[0.06] flex gap-1.5 overflow-x-auto scrollbar-none">
        {currentRolePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(p)}
            className="px-2.5 py-1 rounded-lg bg-[#121418] hover:bg-emerald-500/10 hover:text-emerald-300 hover:border-emerald-500/30 text-[11px] text-zinc-300 font-medium whitespace-nowrap transition-colors border border-white/[0.08]"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Pending Image Attachment Preview */}
      {selectedImage && (
        <div className="px-3 py-1.5 bg-[#121418] border-t border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={selectedImage.previewUrl}
              alt="Preview"
              className="w-8 h-8 rounded object-cover border border-emerald-500/40"
              referrerPolicy="no-referrer"
            />
            <span className="text-[11px] text-zinc-300 truncate max-w-[200px]">
              {selectedImage.file.name}
            </span>
          </div>
          <button
            onClick={removeSelectedImage}
            className="p-1 text-zinc-400 hover:text-red-400"
            title={t.ai.removeImage}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input Box */}
      <div className="p-2.5 bg-[#121418] border-t border-white/[0.08] flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImagePick}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 bg-[#1a1d24] hover:bg-white/[0.08] text-zinc-300 hover:text-emerald-400 rounded-xl transition-colors border border-white/[0.08]"
          title={t.ai.uploadImage}
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t.ai.askInputPlaceholder}
          className="flex-1 text-xs p-2.5 bg-[#09090b] border border-white/[0.1] text-white rounded-xl focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button
          onClick={() => handleSend()}
          disabled={(!input.trim() && !selectedImage) || loading}
          className="p-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold rounded-xl transition-all shadow-md"
          title={t.ai.askButton}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
