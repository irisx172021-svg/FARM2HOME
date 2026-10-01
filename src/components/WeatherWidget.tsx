import React, { useEffect, useState } from 'react';
import { CloudSun, CloudRain, Sun, Wind, Droplets, X, Sprout } from 'lucide-react';
import { WeatherDay, Language } from '../types';
import { api } from '../lib/api';
import { getTranslation } from '../lib/translations';

interface WeatherWidgetProps {
  onClose: () => void;
  language?: Language;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ onClose, language = 'en' }) => {
  const [forecast, setForecast] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(true);
  const t = getTranslation(language);

  useEffect(() => {
    api
      .getWeather()
      .then((res) => {
        setForecast(res.forecast);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load weather:', err);
        setLoading(false);
      });
  }, []);

  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('rain')) return <CloudRain className="w-5 h-5 text-sky-500 shrink-0" />;
    if (c.includes('cloud')) return <CloudSun className="w-5 h-5 text-amber-500 shrink-0" />;
    return <Sun className="w-5 h-5 text-amber-500 shrink-0" />;
  };

  return (
    <div className="bg-[#0f1115]/95 border-b border-white/[0.08] backdrop-blur-md py-4 px-4 transition-all shadow-xl text-white">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-300 flex items-center justify-center border border-amber-500/30">
              <CloudSun className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{t.weather.title}</span>
                <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Telangana & AP Farm Belt
                </span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                {t.weather.liveFieldCondition}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
            title={t.common.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Forecast Days Grid */}
        {loading ? (
          <div className="py-6 text-center text-xs text-zinc-500">
            {t.weather.gatheringTelemetry}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {forecast.map((day, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                  idx === 0
                    ? 'bg-[#121418] border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30'
                    : 'bg-[#121418] border-white/[0.08] hover:border-emerald-500/40 shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1 pb-1 border-b border-white/[0.06]">
                    <span className="font-bold text-white">{day.day}</span>
                    <span className="text-[10px] font-semibold text-zinc-500">{day.date}</span>
                  </div>

                  <div className="flex items-center gap-2 my-2">
                    {getWeatherIcon(day.condition)}
                    <div>
                      <span className="text-sm font-black font-mono text-white">{day.tempMax}°</span>
                      <span className="text-zinc-500 font-mono text-[11px] ml-1 font-medium">{day.tempMin}°</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[10px] text-zinc-400 mb-2">
                    <span className="flex items-center gap-1 font-medium">
                      <Droplets className="w-3 h-3 text-sky-400" />
                      {day.humidity}% {t.weather.humidity}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Wind className="w-3 h-3 text-zinc-500" />
                      {day.windKm} km/h
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.06]">
                  <div className="flex items-start gap-1">
                    <Sprout className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-zinc-300 line-clamp-2 leading-snug">
                      {day.advisory}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
