import React, { useState } from 'react';
import {
  Sprout,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  HelpCircle,
  MessageSquare,
  CloudSun,
  Send,
} from 'lucide-react';
import { Profile, Language, AssistantResponse } from '../types';
import { api } from '../lib/api';
import { getTranslation } from '../lib/translations';
import { MarkdownRenderer } from './MarkdownRenderer';

interface FarmerAiAdvisoryCardProps {
  currentProfile: Profile;
  language: Language;
  onOpenFullChat?: () => void;
}

export const FarmerAiAdvisoryCard: React.FC<FarmerAiAdvisoryCardProps> = ({
  currentProfile,
  language,
  onOpenFullChat,
}) => {
  const t = getTranslation(language);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const initialAnswers: Record<Language, AssistantResponse> = {
    en: {
      answer:
        '**Prioritize Soil Aeration & Trellising:** Given upcoming heavy precipitation on Wednesday, inspect drainage channels immediately to prevent root asphyxiation in organic crops. Hold foliar bio-fertilizer sprays until leaves dry.',
      category: 'crop_protection',
      confidence: 'high',
      warnings: [
        'Avoid foliar sprays during high relative humidity (>80%) to prevent chemical wash-off and leaf burn.',
        'Check for standing water in low furrow spots after heavy rain.',
      ],
      follow_up_questions: [
        'How to prepare Jeevamrutha for soil drenching after the rain?',
        'Natural leaf curl virus management in tomatoes',
      ],
    },
    te: {
      answer:
        '**నేల ఆరబెట్టడం & మురుగునీటి నివారణకు ప్రాధాన్యత ఇవ్వండి:** బుధవారం భారీ వర్ష సూచన ఉన్నందున, పంటల్లో వేరుకుళ్లు రాకుండా మురుగు కాలువలను వెంటనే శుభ్రం చేయండి. వర్షం తగ్గే వరకు పిచికారీ పనులను వాయిదా వేయండి.',
      category: 'crop_protection',
      confidence: 'high',
      warnings: [
        'గాలిలో తేమ 80% కంటే ఎక్కువ ఉన్నప్పుడు ఎలాంటి పిచికారీలు చేయవద్దు.',
        'వర్షం తర్వాత మడుల్లో నీరు నిల్వ ఉండకుండా చూసుకోండి.',
      ],
      follow_up_questions: [
        'వర్షం తర్వాత భూమికి జీవామృతం ఎలా అందించాలి?',
        'టమాటాలో ఆకుముడుత తెగులు సహజ నివారణ ఎలా?',
      ],
    },
    hi: {
      answer:
        '**मिट्टी की जल निकासी व मचान सहारा प्राथमिकता:** बुधवार को भारी बारिश के पूर्वानुमान को देखते हुए, जड़ों को सड़न से बचाने के लिए खेत की जल निकासी नालियों को तुरंत साफ करें। पत्तियों के सूखने तक किसी भी प्रकार का छिड़काव रोकें।',
      category: 'crop_protection',
      confidence: 'high',
      warnings: [
        'अत्यधिक आर्द्रता (>80%) के दौरान पर्णीय छिड़काव से बचें।',
        'बारिश के बाद खेत के निचले हिस्सों में पानी जमा न होने दें।',
      ],
      follow_up_questions: [
        'बारिश के बाद खेत में जीवामृत का प्रयोग कैसे करें?',
        'टमाटर में लीफ कर्ल वायरस की प्राकृतिक रोकथाम कैसे करें?',
      ],
    },
    ta: {
      answer:
        '**வடிகால் மேலாண்மை மற்றும் பந்தல் பாதுகாப்பு:** புதன்கிழமை கனமழை வாய்ப்புள்ளதால், பயிர்களில் வேரழுகல் ஏற்படாமல் தடுக்க வடிகால் வாய்க்கால்களை உடனடியாக தூர்வாருங்கள். மழை முடியும் வரை தெளிப்பு மருந்துகளைத் தவிர்க்கவும்.',
      category: 'crop_protection',
      confidence: 'high',
      warnings: [
        'அதிக ஈரப்பதம் இருக்கும் போது தெளிப்பு மருந்துகளைத் தவிர்க்கவும்.',
        'வயலில் மழைநீர் தேங்காமல் உடனடியாக வடியச் செய்யுங்கள்.',
      ],
      follow_up_questions: [
        'மழைக்குப் பின் மண்ணிற்கு ஜீவாமிர்தம் இடுவது எப்படி?',
        'தக்காளியில் இலை சுருட்டல் நோயை இயற்கை முறையில் தடுப்பது எப்படி?',
      ],
    },
  };

  const [response, setResponse] = useState<AssistantResponse | null>(
    initialAnswers[language] || initialAnswers.en
  );

  const quickQuestionsMap: Record<Language, string[]> = {
    en: [
      'How should I manage tomato crops with Wednesday heavy rain?',
      'Best organic bio-fertilizer recipe for monsoon pulses',
      'How to prevent leaf curl in organic tomatoes naturally?',
      'What should I plant next based on current weather?',
    ],
    te: [
      'బుధవారం భారీ వర్షంలో టమాటా పంటను ఎలా కాపాడుకోవాలి?',
      'వర్షాకాలంలో పప్పుధాన్యాలకు జీవామృతం తయారీ విధానం',
      'టమాటాలో ఆకుముడుత తెగులును సహజంగా ఎలా నివారించాలి?',
      'ప్రస్తుత వాతావరణానికి తదుపరి ఏ పంట వేయడం మంచిది?',
    ],
    hi: [
      'बुधवार की भारी बारिश में टमाटर की फसल का प्रबंधन कैसे करें?',
      'वर्षा ऋतु में दलहन के लिए सर्वश्रेष्ठ जैविक खाद (जीवामृत) विधि',
      'टमाटर में लीफ कर्ल वायरस की प्राकृतिक रोकथाम कैसे करें?',
      'वर्तमान मौसम के आधार पर अगली कौन सी फसल लगाएं?',
    ],
    ta: [
      'புதன்கிழமை கனமழையின் போது தக்காளி பயிரை எவ்வாறு பாதுகாப்பது?',
      'பருவமழை பயிர்களுக்கான சிறந்த இயற்கை உரம் தயாரிக்கும் முறை',
      'தக்காளியில் இலை சுருட்டல் நோயை இயற்கை முறையில் கட்டுப்படுத்துவது எப்படி?',
      'தற்போதைய வானிலைக்கு அடுத்ததாக என்ன பயிரிடலாம்?',
    ],
  };

  const quickQuestions = quickQuestionsMap[language] || quickQuestionsMap.en;

  const handleAsk = async (textToAsk?: string) => {
    const q = textToAsk || query;
    if (!q.trim() || loading) return;

    setLoading(true);
    try {
      const res = await api.askAiAssistant(q, language, 'farmer', {
        userId: currentProfile.id,
      });
      setResponse(res);
      setQuery('');
    } catch (err) {
      console.error('Agronomist consultation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#121418] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <Sprout className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{t.ai.title}</span>
              <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                {t.ai.liveFieldAdvisor}
              </span>
            </h3>
            <p className="text-[11px] text-zinc-400">
              {t.ai.subtitle}
            </p>
          </div>
        </div>

        {onOpenFullChat && (
          <button
            onClick={onOpenFullChat}
            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 self-start sm:self-auto hover:underline"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{t.ai.openInteractiveChat}</span>
          </button>
        )}
      </div>

      {/* Structured Farmer Presentation */}
      {response && (
        <div className="space-y-3.5">
          {/* 1. Recommendation Body */}
          <div className="p-4 rounded-xl bg-[#09090b]/80 border border-white/[0.06] space-y-2">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
              {t.ai.liveFieldAdvisor}
            </span>
            <MarkdownRenderer content={response.answer} />
          </div>

          {/* 2. Structured Context Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#09090b]/50 border border-white/[0.04] space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <HelpCircle className="w-3 h-3 text-emerald-400" />
                {t.cropPlanner.soilSuitability}
              </span>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                {language === 'te'
                  ? 'నేలలో అధికంగా నీరు నిలవడం వల్ల వేరుకు ప్రాణవాయువు అందక కుళ్లిపోయే ప్రమాదం ఉంటుంది.'
                  : language === 'hi'
                  ? 'अत्यधिक जलभराव से जड़ों में ऑक्सीजन की कमी होती है और फफूंद रोग बढ़ते हैं।'
                  : language === 'ta'
                  ? 'வயலில் அதிக நீர் தேங்குவதால் வேர்களுக்கு காற்று கிடைக்காமல் அழுகக்கூடும்.'
                  : 'Excessive water pooling starves feeder roots of oxygen, stalling nutrient absorption.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#09090b]/50 border border-white/[0.04] space-y-1">
              <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
                <CloudSun className="w-3 h-3 text-sky-400" />
                {t.weather.title}
              </span>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                {language === 'te'
                  ? 'రాబోయే వర్షపాతం మరియు గాలిలోని తేమ శాతం 80% దాటడాన్ని పరిగణనలోకి తీసుకుంది.'
                  : language === 'hi'
                  ? 'आगामी वर्षा और हवा में 80% से अधिक आर्द्रता को ध्यान में रखा गया है।'
                  : language === 'ta'
                  ? 'எதிர்பார்க்கப்படும் மழை மற்றும் 80% க்கும் அதிகமான ஈரப்பதத்தை அடிப்படையாகக் கொண்டது.'
                  : 'Correlated with upcoming heavy precipitation and relative humidity reaching >80%.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[#09090b]/50 border border-white/[0.04] space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {t.weather.whatToDo}
              </span>
              <p className="text-[11px] text-zinc-300 leading-relaxed">
                {language === 'te'
                  ? 'వర్షం ప్రారంభం కావడానికి ముందే పొలంలో మూసుకుపోయిన కాలువలను సరిచేయండి.'
                  : language === 'hi'
                  ? 'बारिश शुरू होने से पहले खेत की जल निकासी नालियों को खोलें और साफ करें।'
                  : language === 'ta'
                  ? 'மழை தொடங்குவதற்கு முன் அடைபட்ட வடிகால் வாய்க்கால்களை சுத்தம் செய்யவும்.'
                  : 'Inspect parcel boundaries this afternoon to clear blocked outlet drains.'}
              </p>
            </div>
          </div>

          {/* 3. Safety Warnings if present */}
          {response.warnings && response.warnings.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                {t.ai.advisoryWarningsTitle}
              </span>
              <ul className="text-xs space-y-0.5 pl-5 list-disc text-amber-200/90">
                {response.warnings.map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 4. Quick Follow-Up Questions */}
          {response.follow_up_questions && response.follow_up_questions.length > 0 && (
            <div className="pt-2 border-t border-white/[0.06] space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                {t.ai.followUpQuestionsTitle}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {response.follow_up_questions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAsk(q)}
                    disabled={loading}
                    className="text-left text-[11px] px-2.5 py-1 rounded-lg bg-[#09090b] hover:bg-emerald-500/10 hover:text-emerald-300 border border-white/[0.06] text-zinc-300 transition-colors"
                  >
                    • {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input Box for Asking Any Agronomy Question */}
      <div className="pt-2 border-t border-white/[0.06] space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
            placeholder={t.ai.askInputPlaceholder}
            className="flex-1 text-xs p-2.5 bg-[#09090b] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
          />
          <button
            onClick={() => handleAsk()}
            disabled={!query.trim() || loading}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{t.ai.askButton}</span>
          </button>
        </div>

        {/* Quick Prompts Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
          <span className="text-[10px] text-zinc-500 font-semibold shrink-0">{t.ai.followUpQuestionsTitle}:</span>
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(q)}
              disabled={loading}
              className="text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded bg-[#09090b] hover:bg-white/[0.06] border border-white/[0.06] shrink-0 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
