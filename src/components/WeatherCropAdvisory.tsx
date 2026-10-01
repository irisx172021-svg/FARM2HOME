import React, { useState } from 'react';
import {
  CloudSun,
  CloudRain,
  Sun,
  Wind,
  Droplets,
  AlertTriangle,
  Umbrella,
  Calendar,
  Sparkles,
  Flame,
} from 'lucide-react';
import { WeatherDay, Language } from '../types';
import { getTranslation } from '../lib/translations';

interface WeatherCropAdvisoryProps {
  forecast: WeatherDay[];
  onConsultAgronomist?: (topic: string) => void;
  language?: Language;
}

export const WeatherCropAdvisory: React.FC<WeatherCropAdvisoryProps> = ({
  forecast,
  language = 'en',
}) => {
  const [filterCategory, setFilterCategory] = useState<'all' | 'rain' | 'heat_wind' | 'humidity' | 'harvest'>('all');
  const t = getTranslation(language);

  const defaultForecast: WeatherDay[] = [
    {
      day: 'Today',
      date: 'Aug 3',
      tempMax: 31,
      tempMin: 22,
      condition: 'Partly Cloudy',
      humidity: 78,
      windKm: 14,
      rainfallMm: 2,
      rainProbability: 25,
      advisory: 'Optimal condition for evening irrigation and fresh leaf harvesting.',
    },
  ];

  const days = forecast.length > 0 ? forecast : defaultForecast;

  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('rain')) return <CloudRain className="w-5 h-5 text-sky-400 shrink-0" />;
    if (c.includes('cloud')) return <CloudSun className="w-5 h-5 text-amber-400 shrink-0" />;
    return <Sun className="w-5 h-5 text-amber-400 shrink-0" />;
  };

  // Weather pattern detection across the forecast
  const heavyRainDay = days.find((d) => d.rainfallMm >= 15 || (d.rainProbability || 0) >= 70);
  const lowRainDays = days.filter((d) => (d.rainfallMm || 0) <= 2 && (d.rainProbability || 0) <= 30);
  const highTempDay = days.find((d) => d.tempMax >= 32);
  const highHumidityDay = days.find((d) => d.humidity >= 80);
  const strongWindDay = days.find((d) => d.windKm >= 18);
  const dryWindowDay = days.find((d) => d.rainfallMm === 0 && d.condition.toLowerCase().includes('sun'));

  // Multi-lingual content definitions for the 6 weather patterns
  const localizedPatterns = {
    en: {
      heavyRain: {
        title: t.weather.heavyRainTitle,
        badge: heavyRainDay ? `Alert: ${heavyRainDay.rainfallMm}mm on ${heavyRainDay.day}` : 'Forecast Monitor',
        happening: heavyRainDay
          ? `Heavy precipitation (${heavyRainDay.rainfallMm}mm) expected on ${heavyRainDay.day} with high rain probability (${heavyRainDay.rainProbability}%).`
          : 'Rain is likely during the next 24 to 48 hours with increased cloud cover.',
        means: 'Soil will reach saturation quickly; standing water risks root asphyxiation, nutrient leaching, and fruit split.',
        todo: 'Check drainage channels and avoid unnecessary irrigation. Clear furrow ends before rains intensify.',
      },
      lowRain: {
        title: t.weather.lowRainfallTitle,
        badge: `${lowRainDays.length} Dry Days in Forecast`,
        happening: 'Dry weather with negligible rainfall expected over the upcoming 3 to 4 days.',
        means: 'Surface soil evaporation increases, depleting shallow root zones in young seedlings and vegetables.',
        todo: 'Apply organic mulch around plant bases to retain moisture; run scheduled drip cycles during cooler morning hours.',
      },
      highTemp: {
        title: t.weather.highTempTitle,
        badge: highTempDay ? `Peak ${highTempDay.tempMax}°C on ${highTempDay.day}` : '30°C–33°C Range',
        happening: highTempDay
          ? `Daytime temperatures rising up to ${highTempDay.tempMax}°C with intense mid-day solar radiation.`
          : 'Afternoon heat reaching 31°C–33°C under open skies.',
        means: 'Increased crop transpiration rate; danger of flower drop in tomatoes and tip burn in tender leafy greens.',
        todo: 'Provide light irrigation early morning; withhold foliar applications during peak noon heat to prevent leaf scorching.',
      },
      highHumidity: {
        title: t.weather.highHumidityTitle,
        badge: highHumidityDay ? `${highHumidityDay.humidity}% RH on ${highHumidityDay.day}` : 'Elevated Moisture',
        happening: 'Relative humidity staying elevated between 78% and 92% with damp morning dew and overcast skies.',
        means: 'Extended leaf wetness duration creates favorable conditions for fungal spore germination and mildew.',
        todo: 'Prune dense lower foliage to encourage canopy air circulation; inspect leaf undersides for early spots.',
      },
      strongWind: {
        title: t.weather.strongWindTitle,
        badge: strongWindDay ? `${strongWindDay.windKm} km/h Gusts` : '14–18 km/h Winds',
        happening: 'Brisk wind gusts reaching 18 to 22 km/h across open parcels, particularly during late afternoons.',
        means: 'Risk of physical lodging in tall crops (maize, pulses) and trellis detachment for vine vegetables.',
        todo: 'Reinforce bamboo stakes, inspect trellis tying strings, and postpone high-pressure spraying to prevent spray drift.',
      },
      dryPeriods: {
        title: t.weather.suitableDryTitle,
        badge: dryWindowDay ? `Clear window from ${dryWindowDay.day}` : 'Favorable Operations',
        happening: 'Consecutive sunny days forecasted with warm sunshine and zero rain probability.',
        means: 'Dry soil surface allows tractors/implements without soil compaction, and harvested produce dries quickly.',
        todo: 'Ideal window to harvest mature crops, turn compost piles, and sun-cure harvested pulses or turmeric.',
      },
    },
    te: {
      heavyRain: {
        title: t.weather.heavyRainTitle,
        badge: heavyRainDay ? `హెచ్చరిక: ${heavyRainDay.rainfallMm} మి.మీ (${heavyRainDay.day})` : 'వర్ష పర్యవేక్షణ',
        happening: heavyRainDay
          ? `${heavyRainDay.day} నాడు అధిక వర్షపాతం (${heavyRainDay.rainfallMm} మి.మీ) నమోదయ్యే అవకాశం ఉంది.`
          : 'రాబోయే 24 నుండి 48 గంటల్లో విస్తారంగా వర్షాలు కురిసే అవకాశం ఉంది.',
        means: 'నేలలో నీరు నిలిచి వేరుకు గాలి అందక వేరుకుళ్లు తెగులు వచ్చే ప్రమాదం ఉంది; పోషకాలు కొట్టుకుపోతాయి.',
        todo: 'పొలంలో మురుగునీరు సాఫీగా పోయేలా కాలువలను సరిచేయండి. అనవసరపు నీటి తడులు ఇవ్వకండి.',
      },
      lowRain: {
        title: t.weather.lowRainfallTitle,
        badge: `${lowRainDays.length} పొడి రోజులు`,
        happening: 'రాబోయే 3-4 రోజులు పొడి వాతావరణం ఉండి వర్షం పడే సూచనలు తక్కువగా ఉన్నాయి.',
        means: 'నేలలోని తేమ వేగంగా ఆవిరై కూరగాయల లేత మొక్కల వేర్లు ఎండిపోయే ప్రమాదం ఉంది.',
        todo: 'మొక్కల మొదళ్ల వద్ద ఆకులు లేదా గడ్డితో మల్చింగ్ చేయండి; ఉదయం పూట బిందు సేద్యం ద్వారా తడి అందించండి.',
      },
      highTemp: {
        title: t.weather.highTempTitle,
        badge: highTempDay ? `గరిష్టం ${highTempDay.tempMax}°C (${highTempDay.day})` : '30°C–33°C వేడి',
        happening: highTempDay
          ? `పగటి ఉష్ణోగ్రతలు ${highTempDay.tempMax}°C కి చేరి ఎండ తీవ్రత అధికంగా ఉంటుంది.`
          : 'మధ్యాహ్న సమయాల్లో ఎండ తీవ్రత 31°C నుండి 33°C వరకు ఉంటుంది.',
        means: 'టమాటాల్లో పూత రాలడం, ఆకుకూరల ఆకులు మాడిపోవడం వంటి సమస్యలు తలెత్తుతాయి.',
        todo: 'ఉదయం వేళల్లోనే తేలికపాటి తడులు ఇవ్వండి; మధ్యాహ్నం ఎండలో ఎలాంటి మందులు పిచికారీ చేయవద్దు.',
      },
      highHumidity: {
        title: t.weather.highHumidityTitle,
        badge: highHumidityDay ? `${highHumidityDay.humidity}% గాలిలో తేమ` : 'అధిక తేమ',
        happening: 'వాతావరణంలో తేమ 78% నుండి 92% వరకు అధికంగా కొనసాగుతోంది.',
        means: 'ఆకులపై తేమ ఎక్కువ సేపు ఉండడం వల్ల బూడిద తెగులు, ఆకుమచ్చ వంటి శిలీంధ్ర వ్యాధులు వ్యాపిస్తాయి.',
        todo: 'కింది ఆకులను కత్తిరించి గాలి ఆడేలా చూడండి; సేంద్రీయ ట్రైకోడెర్మా లేదా వేప కషాయం వాడండి.',
      },
      strongWind: {
        title: t.weather.strongWindTitle,
        badge: strongWindDay ? `${strongWindDay.windKm} కి.మీ/గం ఈదురుగాలులు` : 'ఈదురుగాలులు',
        happening: 'సాయంత్రం వేళల్లో గంటకు 18 నుండి 22 కి.మీ వేగంతో బలమైన గాలులు వీచే అవకాశం ఉంది.',
        means: 'ఎత్తైన పైర్లు మరియు తీగజాతి పందిళ్ళు పడిపోయే ప్రమాదం ఉంది.',
        todo: 'వెదురు కర్రలతో మొక్కలకు ఊతం ఇవ్వండి; పందిరి తాళ్లను బిగించండి, పిచికారీ పనులను వాయిదా వేయండి.',
      },
      dryPeriods: {
        title: t.weather.suitableDryTitle,
        badge: dryWindowDay ? `${dryWindowDay.day} నుండి మంచి ఎండ` : 'అనుకూల సమయం',
        happening: 'రాబోయే రోజుల్లో వర్షం లేకుండా మంచి ఎండతో కూడిన పొడి వాతావరణం ఉంటుంది.',
        means: 'నేల ఆరి యంత్రాలతో దుక్కులు చేయడానికి, కోత కోసిన పంటను ఎండబెట్టడానికి అనుకూలం.',
        todo: 'పండిన పంటలను కోయడానికి, సేంద్రీయ ఎరువులు కలపడానికి, పప్పుధాన్యాలను ఎండబెట్టడానికి ఇది సరైన సమయం.',
      },
    },
    hi: {
      heavyRain: {
        title: t.weather.heavyRainTitle,
        badge: heavyRainDay ? `अलर्ट: ${heavyRainDay.rainfallMm}mm (${heavyRainDay.day})` : 'वर्षा निगरानी',
        happening: heavyRainDay
          ? `${heavyRainDay.day} को भारी बारिश (${heavyRainDay.rainfallMm}mm) की संभावना है।`
          : 'अगले 24 से 48 घंटों में घने बादलों के साथ तेज वर्षा की संभावना है।',
        means: 'खेत में पानी भरने से जड़ों में सड़न और पोषक तत्वों का बहाव हो सकता है।',
        todo: 'खेत की जल निकासी नालियों को तुरंत साफ करें और अतिरिक्त सिंचाई बंद रखें।',
      },
      lowRain: {
        title: t.weather.lowRainfallTitle,
        badge: `${lowRainDays.length} शुष्क दिन`,
        happening: 'आगामी 3 से 4 दिनों में शुष्क मौसम और नगण्य बारिश का अनुमान है।',
        means: 'मिट्टी से नमी तेजी से उड़ेगी, जिससे युवा पौधों और सब्जियों की जड़ों पर तनाव बढ़ेगा।',
        todo: 'पौधों के आधार पर जैविक पलवार (मल्चिंग) करें और सुबह के समय ड्रिप सिंचाई चलाएं।',
      },
      highTemp: {
        title: t.weather.highTempTitle,
        badge: highTempDay ? `उच्चतम ${highTempDay.tempMax}°C (${highTempDay.day})` : 'गर्मी का दौर',
        happening: highTempDay
          ? `दोपहर का तापमान ${highTempDay.tempMax}°C तक चढ़ने का अनुमान है।`
          : 'खुले आसमान में दोपहर का तापमान 31°C से 33°C तक रहेगा।',
        means: 'टमाटर में फूल गिरने और हरी पत्तेदार सब्जियों की पत्तियां झुलसने का खतरा है।',
        todo: 'सुबह हल्की सिंचाई करें; दोपहर की तेज धूप में कोई भी छिड़काव न करें।',
      },
      highHumidity: {
        title: t.weather.highHumidityTitle,
        badge: highHumidityDay ? `${highHumidityDay.humidity}% आर्द्रता` : 'अधिक नमी',
        happening: 'हवा में सापेक्षिक आर्द्रता 78% से 92% के बीच लगातार बनी हुई है।',
        means: 'पत्तियों पर नमी देर तक रहने से फफूंद जनित रोगों और धब्बों का खतरा बढ़ जाता है।',
        todo: 'निचली सघन पत्तियों की छंटाई करें ताकि हवा का आवागमन बना रहे; नीम तेल या जैव-कवकनाशी का प्रयोग करें।',
      },
      strongWind: {
        title: t.weather.strongWindTitle,
        badge: strongWindDay ? `${strongWindDay.windKm} km/h तेज हवाएं` : 'हवा अलर्ट',
        happening: 'शाम के समय खुले खेतों में 18 से 22 किमी/घंटा की रफ्तार से तेज हवाएं चल सकती हैं।',
        means: 'लंबी फसलों के गिरने और लता वाली सब्जियों के मचान टूटने का जोखिम है।',
        todo: 'पौधों को बांस की खपच्चियों से सहारा दें और तेज हवा में कीटनाशक छिड़काव स्थगित रखें।',
      },
      dryPeriods: {
        title: t.weather.suitableDryTitle,
        badge: dryWindowDay ? `${dryWindowDay.day} से साफ धूप` : 'उत्तम अवसर',
        happening: 'लगातार साफ खिली धूप और शून्य वर्षा की अनुकूल संभावना है।',
        means: 'खेत की सतह सूखी रहेगी, जिससे जुताई और फसल कटाई में आसानी होगी।',
        todo: 'पकी फसलों की कटाई करें, खाद के ढेर पलटें और कटी दालों या हल्दी को धूप में सुखाएं।',
      },
    },
    ta: {
      heavyRain: {
        title: t.weather.heavyRainTitle,
        badge: heavyRainDay ? `எச்சரிக்கை: ${heavyRainDay.rainfallMm}மிமீ (${heavyRainDay.day})` : 'மழை கண்காணிப்பு',
        happening: heavyRainDay
          ? `${heavyRainDay.day} அன்று கனமழை (${heavyRainDay.rainfallMm}மிமீ) பெய்ய வாய்ப்புள்ளது.`
          : 'அடுத்த 24 முதல் 48 மணி நேரத்தில் மழை பெய்ய வாய்ப்புள்ளது.',
        means: 'வயலில் நீர் தேங்கி வேரழுகல் நோய் தாக்க வாய்ப்புள்ளது; சத்துக்கள் அடித்துச் செல்லப்படலாம்.',
        todo: 'வடிகால் வாய்க்கால்களை தூர்வாரி தயார் நிலையில் வையுங்கள்; பாசனத்தை நிறுத்துங்கள்.',
      },
      lowRain: {
        title: t.weather.lowRainfallTitle,
        badge: `${lowRainDays.length} உலர் நாட்கள்`,
        happening: 'அடுத்த 3 முதல் 4 நாட்களுக்கு வறண்ட வானிலை நிலவக்கூடும்.',
        means: 'மண்ணில் ஈரப்பதம் குறைந்து காய்கறிப் பயிர்கள் வாடக்கூடும்.',
        todo: 'பயிர்களின் அடிப்பகுதியில் இயற்கை மூடாக்கு இடுங்கள்; காலை வேளையில் சொட்டு நீர் பாசனம் செய்யுங்கள்.',
      },
      highTemp: {
        title: t.weather.highTempTitle,
        badge: highTempDay ? `உச்சம் ${highTempDay.tempMax}°C (${highTempDay.day})` : 'வெப்ப அலை',
        happening: highTempDay
          ? `பகல் வெப்பநிலை ${highTempDay.tempMax}°C வரை உயர்ந்து வெயில் அதிகமாக இருக்கும்.`
          : 'மதிய வேளையில் வெயில் 31°C முதல் 33°C வரை இருக்கும்.',
        means: 'தக்காளி பூக்கள் உதிர்தல் மற்றும் கீரைகள் கருகும் அபாயம் உள்ளது.',
        todo: 'காலை வேளையில் மிதமான பாசனம் செய்யுங்கள்; உச்சி வெயிலில் தெளிப்பு மருந்துகளைத் தவிர்க்கவும்.',
      },
      highHumidity: {
        title: t.weather.highHumidityTitle,
        badge: highHumidityDay ? `${highHumidityDay.humidity}% ஈரப்பதம்` : 'அதிக ஈரப்பதம்',
        happening: 'காற்றில் ஈரப்பதம் 78% முதல் 92% வரை அதிகமாக உள்ளது.',
        means: 'இலைகளில் ஈரப்பதம் தங்குவதால் பூஞ்சை நோய் பரவ வாய்ப்புள்ளது.',
        todo: 'காற்றோட்டம் கிடைக்க கீழ் இலைகளை கவாத்து செய்யுங்கள்; இயற்கை பூஞ்சாணக் கொல்லிகளைப் பயன்படுத்துங்கள்.',
      },
      strongWind: {
        title: t.weather.strongWindTitle,
        badge: strongWindDay ? `${strongWindDay.windKm} கி.மீ/மணி பலத்த காற்று` : 'காற்று எச்சரிக்கை',
        happening: 'மாலை நேரங்களில் மணிக்கு 18 முதல் 22 கி.மீ வேகத்தில் பலத்த காற்று வீசக்கூடும்.',
        means: 'உயரமான பயிர்கள் சாய்ந்து விழவும், பந்தல் பயிர்கள் சேதமடையவும் வாய்ப்புள்ளது.',
        todo: 'பயிர்களுக்கு முட்டுக் கொடுத்து பாதுகாக்கவும்; பந்தல் கயிறுகளை சரிபார்க்கவும்.',
      },
      dryPeriods: {
        title: t.weather.suitableDryTitle,
        badge: dryWindowDay ? `${dryWindowDay.day} முதல் நல்ல வெயில்` : 'சாதகமான நேரம்',
        happening: 'மழை வாய்ப்பின்றி நல்ல வெயிலுடன் கூடிய உலர் வானிலை நிலவும்.',
        means: 'மண் உலர்ந்து உழவு மற்றும் அறுவடை வேலைகளுக்கு ஏற்றதாக இருக்கும்.',
        todo: 'பயிர்களை அறுவடை செய்யவும், இயற்கை உரம் தயாரிக்கவும், விளைபொருட்களை உலர்த்தவும் இதுவே சிறந்த நேரம்.',
      },
    },
  };

  const currentLangPatterns = localizedPatterns[language] || localizedPatterns.en;

  const advisoryCards = [
    {
      id: 'heavy_rain',
      category: 'rain',
      icon: <CloudRain className="w-4 h-4 text-sky-400" />,
      title: currentLangPatterns.heavyRain.title,
      badge: currentLangPatterns.heavyRain.badge,
      badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      happening: currentLangPatterns.heavyRain.happening,
      means: currentLangPatterns.heavyRain.means,
      todo: currentLangPatterns.heavyRain.todo,
    },
    {
      id: 'low_rainfall',
      category: 'rain',
      icon: <Droplets className="w-4 h-4 text-emerald-400" />,
      title: currentLangPatterns.lowRain.title,
      badge: currentLangPatterns.lowRain.badge,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      happening: currentLangPatterns.lowRain.happening,
      means: currentLangPatterns.lowRain.means,
      todo: currentLangPatterns.lowRain.todo,
    },
    {
      id: 'high_temp',
      category: 'heat_wind',
      icon: <Flame className="w-4 h-4 text-amber-400" />,
      title: currentLangPatterns.highTemp.title,
      badge: currentLangPatterns.highTemp.badge,
      badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      happening: currentLangPatterns.highTemp.happening,
      means: currentLangPatterns.highTemp.means,
      todo: currentLangPatterns.highTemp.todo,
    },
    {
      id: 'high_humidity',
      category: 'humidity',
      icon: <Droplets className="w-4 h-4 text-cyan-400" />,
      title: currentLangPatterns.highHumidity.title,
      badge: currentLangPatterns.highHumidity.badge,
      badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
      happening: currentLangPatterns.highHumidity.happening,
      means: currentLangPatterns.highHumidity.means,
      todo: currentLangPatterns.highHumidity.todo,
    },
    {
      id: 'strong_wind',
      category: 'heat_wind',
      icon: <Wind className="w-4 h-4 text-zinc-300" />,
      title: currentLangPatterns.strongWind.title,
      badge: currentLangPatterns.strongWind.badge,
      badgeColor: 'bg-zinc-500/10 text-zinc-300 border-zinc-500/20',
      happening: currentLangPatterns.strongWind.happening,
      means: currentLangPatterns.strongWind.means,
      todo: currentLangPatterns.strongWind.todo,
    },
    {
      id: 'dry_periods',
      category: 'harvest',
      icon: <Sun className="w-4 h-4 text-amber-300" />,
      title: currentLangPatterns.dryPeriods.title,
      badge: currentLangPatterns.dryPeriods.badge,
      badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      happening: currentLangPatterns.dryPeriods.happening,
      means: currentLangPatterns.dryPeriods.means,
      todo: currentLangPatterns.dryPeriods.todo,
    },
  ];

  const filteredCards = filterCategory === 'all'
    ? advisoryCards
    : advisoryCards.filter((c) => c.category === filterCategory);

  return (
    <div className="space-y-6">
      {/* Title & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <span>{t.weather.title}</span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ACTION-ORIENTED GUIDANCE
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            {t.weather.subtitle}
          </p>
        </div>

        {heavyRainDay && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{currentLangPatterns.heavyRain.badge}</span>
          </div>
        )}
      </div>

      {/* 1. 7-Day Forecast Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            {t.weather.daysForecast}
          </span>
          <span className="text-[11px] text-zinc-500">Live Microclimate Telemetry</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {days.map((d, idx) => {
            const isToday = idx === 0;
            const rainProb = d.rainProbability !== undefined ? d.rainProbability : d.rainfallMm > 10 ? 80 : d.rainfallMm > 0 ? 40 : 10;

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                  isToday
                    ? 'bg-[#121418] border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500/20'
                    : 'bg-[#121418]/80 border-white/[0.08] hover:border-emerald-500/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1 pb-1 border-b border-white/[0.06]">
                    <span className="font-bold text-white text-xs">{d.day}</span>
                    <span className="text-[10px] text-zinc-400">{d.date}</span>
                  </div>

                  <div className="flex items-center gap-2 my-2">
                    {getWeatherIcon(d.condition)}
                    <div>
                      <span className="text-base font-black font-mono text-white">{d.tempMax}°</span>
                      <span className="text-zinc-500 font-mono text-xs ml-1 font-medium">{d.tempMin}°</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-zinc-300">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Umbrella className="w-3 h-3 text-sky-400" /> {t.weather.rainProbability}:
                      </span>
                      <span className="font-mono font-bold text-sky-300">{rainProb}%</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-sky-400" /> {t.weather.humidity}:
                      </span>
                      <span className="font-mono text-zinc-200">{d.humidity}%</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500 flex items-center gap-1">
                        <Wind className="w-3 h-3 text-zinc-500" /> {t.weather.wind}:
                      </span>
                      <span className="font-mono text-zinc-400">{d.windKm} km/h</span>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-white/[0.06] text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">
                  {d.advisory}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Structured Action Translations: WHAT'S HAPPENING -> WHAT IT MEANS -> WHAT TO DO */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>{t.weather.title}</span>
            </h3>
            <p className="text-xs text-zinc-400">
              {t.weather.subtitle}
            </p>
          </div>

          {/* Category filter pills */}
          <div className="flex items-center gap-1 p-1 bg-[#121418] border border-white/[0.08] rounded-xl text-xs font-semibold text-zinc-400 self-start sm:self-auto">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterCategory === 'all'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                  : 'hover:text-white'
              }`}
            >
              {t.weather.filterAll}
            </button>
            <button
              onClick={() => setFilterCategory('rain')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterCategory === 'rain'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                  : 'hover:text-white'
              }`}
            >
              {t.weather.filterRain}
            </button>
            <button
              onClick={() => setFilterCategory('heat_wind')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterCategory === 'heat_wind'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                  : 'hover:text-white'
              }`}
            >
              {t.weather.filterHeatWind}
            </button>
            <button
              onClick={() => setFilterCategory('humidity')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterCategory === 'humidity'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                  : 'hover:text-white'
              }`}
            >
              {t.weather.filterHumidity}
            </button>
            <button
              onClick={() => setFilterCategory('harvest')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterCategory === 'harvest'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                  : 'hover:text-white'
              }`}
            >
              {t.weather.filterHarvest}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCards.map((card) => (
            <div
              key={card.id}
              className="bg-[#121418] border border-white/[0.08] rounded-2xl p-4 shadow-xl flex flex-col justify-between space-y-3 hover:border-emerald-500/30 transition-all"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                      {card.icon}
                    </div>
                    <span className="text-xs font-bold text-white tracking-tight">{card.title}</span>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${card.badgeColor}`}>
                    {card.badge}
                  </span>
                </div>

                {/* WHAT'S HAPPENING */}
                <div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                    {t.weather.whatsHappening}
                  </span>
                  <p className="text-xs text-zinc-200 mt-0.5 leading-relaxed font-medium">
                    {card.happening}
                  </p>
                </div>

                {/* WHAT IT MEANS */}
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                    {t.weather.whatItMeans}
                  </span>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                    {card.means}
                  </p>
                </div>

                {/* WHAT TO DO */}
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                    {t.weather.whatToDo}
                  </span>
                  <p className="text-xs text-emerald-200 mt-0.5 leading-relaxed font-semibold">
                    {card.todo}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
