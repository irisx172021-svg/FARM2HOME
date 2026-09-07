import React, { useEffect, useState } from 'react';
import { CloudSun, CloudRain, Sun, Wind, Droplets, X, AlertCircle } from 'lucide-react';
import { WeatherDay } from '../types';
import { api } from '../lib/api';

interface WeatherWidgetProps {
  onClose: () => void;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ onClose }) => {
  const [forecast, setForecast] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (c.includes('rain')) return <CloudRain className="w-5 h-5 text-sky-500" />;
    if (c.includes('cloud')) return <CloudSun className="w-5 h-5 text-amber-500" />;
    return <Sun className="w-5 h-5 text-amber-500" />;
  };

  return (
    <div className="bg-amber-50/70 border-b border-amber-200 py-3 px-4 transition-all">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-amber-100 text-amber-700">
              <CloudSun className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-semibold text-stone-900">
              7-Day Agricultural Weather & Harvest Advisory (Hyderabad / Medak Region)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-md transition-colors"
            title="Close Weather Advisory"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-4 text-center text-xs text-stone-500">Loading forecast data...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {forecast.map((day, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                  idx === 0
                    ? 'bg-white border-amber-300 shadow-xs ring-1 ring-amber-300/50'
                    : 'bg-white/90 border-stone-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-stone-800">{day.day}</span>
                    <span className="text-[11px] text-stone-400">{day.date}</span>
                  </div>
                  <div className="flex items-center gap-1.5 my-1.5">
                    {getWeatherIcon(day.condition)}
                    <div>
                      <span className="font-semibold text-stone-800">{day.tempMax}°</span>
                      <span className="text-stone-400 text-[11px] ml-1">{day.tempMin}°</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-stone-500 mb-1.5">
                    <span className="flex items-center gap-0.5">
                      <Droplets className="w-3 h-3 text-sky-400" />
                      {day.humidity}%
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Wind className="w-3 h-3 text-stone-400" />
                      {day.windKm}k/h
                    </span>
                  </div>
                </div>

                <div className="pt-1.5 border-t border-stone-100 flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-stone-600 line-clamp-2 leading-tight">
                    {day.advisory}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
