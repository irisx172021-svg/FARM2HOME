import React, { useState, useMemo } from 'react';
import {
  Sprout,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  Info,
  Layers,
  Sparkles,
  Columns,
  ListChecks,
  ChevronRight,
} from 'lucide-react';
import { CropPlannerInputs, WeatherDay, Language } from '../types';
import { generateCropSuggestions } from '../services/cropPlanner';
import { getTranslation } from '../lib/translations';

interface CropPlannerSectionProps {
  weatherForecast: WeatherDay[];
  farmerLocation?: string;
  language?: Language;
}

export const CropPlannerSection: React.FC<CropPlannerSectionProps> = ({
  weatherForecast,
  farmerLocation,
  language = 'en',
}) => {
  const t = getTranslation(language);

  const [inputs, setInputs] = useState<CropPlannerInputs>({
    landArea: 3,
    areaUnit: 'acres',
    soilType: 'Red Sandy Loam',
    location: farmerLocation || 'Telangana - Warangal',
    waterAvailability: 'Drip Irrigation',
    currentSeason: 'Kharif / Monsoon',
    previousCrop: 'Cotton',
    farmingGoal: 'Maximize Profit',
    organicPreference: 'Certified 100% Organic',
  });

  // Track selected crops for Comparison (up to 3)
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  // Track selected crop for Action Plan checklist
  const [selectedCropForActionPlan, setSelectedCropForActionPlan] = useState<string | null>(null);

  // Generate suggestions reactively as inputs change
  const plannerResult = useMemo(() => {
    return generateCropSuggestions(inputs, weatherForecast);
  }, [inputs, weatherForecast]);

  // Keep comparison & action plan sync with suggestions
  useMemo(() => {
    if (plannerResult.status === 'ready' && plannerResult.suggestions.length > 0) {
      if (selectedForComparison.length === 0) {
        setSelectedForComparison(plannerResult.suggestions.slice(0, 3).map((c) => c.cropName));
      }
      if (!selectedCropForActionPlan || !plannerResult.suggestions.some((s) => s.cropName === selectedCropForActionPlan)) {
        setSelectedCropForActionPlan(plannerResult.suggestions[0].cropName);
      }
    }
  }, [plannerResult]);

  const handleInputChange = (field: keyof CropPlannerInputs, value: any) => {
    setInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleCropComparison = (cropName: string) => {
    setSelectedForComparison((prev) => {
      if (prev.includes(cropName)) {
        if (prev.length <= 1) return prev;
        return prev.filter((name) => name !== cropName);
      } else {
        if (prev.length >= 3) {
          return [prev[0], prev[1], cropName];
        }
        return [...prev, cropName];
      }
    });
  };

  const comparisonCrops = useMemo(() => {
    if (plannerResult.status !== 'ready') return [];
    return plannerResult.suggestions.filter((c) => selectedForComparison.includes(c.cropName));
  }, [plannerResult, selectedForComparison]);

  const activeActionPlanCrop = useMemo(() => {
    if (plannerResult.status !== 'ready') return null;
    return plannerResult.suggestions.find((c) => c.cropName === selectedCropForActionPlan) || plannerResult.suggestions[0];
  }, [plannerResult, selectedCropForActionPlan]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-white tracking-tight">{t.cropPlanner.title}</h2>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            SOIL & ROTATION ENGINE
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-0.5">
          {t.cropPlanner.subtitle}
        </p>
      </div>

      {/* Input Form Panel */}
      <div className="bg-[#121418] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            {t.farmer.workspace}
          </span>
          <span className="text-[11px] text-zinc-400">
            <span className="text-emerald-400">*</span> {t.common.required}
          </span>
        </div>

        {/* Required Inputs Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Land Area */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              {t.cropPlanner.landAreaLabel} <span className="text-emerald-400">*</span>
            </label>
            <div className="flex gap-1.5">
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={inputs.landArea}
                onChange={(e) =>
                  handleInputChange(
                    'landArea',
                    e.target.value === '' ? '' : parseFloat(e.target.value) || ''
                  )
                }
                placeholder="e.g. 3"
                className="w-full p-2 bg-[#09090b] border border-white/[0.1] rounded-xl text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
              <select
                value={inputs.areaUnit}
                onChange={(e) => handleInputChange('areaUnit', e.target.value as 'acres' | 'hectares')}
                className="p-2 bg-[#09090b] border border-white/[0.1] rounded-xl text-zinc-200 focus:outline-none focus:border-emerald-500/50"
              >
                <option value="acres">{t.units.acres}</option>
                <option value="hectares">{t.units.hectares}</option>
              </select>
            </div>
          </div>

          {/* Soil Type */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              {t.cropPlanner.soilTypeLabel} <span className="text-emerald-400">*</span>
            </label>
            <select
              value={inputs.soilType}
              onChange={(e) => handleInputChange('soilType', e.target.value)}
              className="w-full p-2 bg-[#09090b] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">-- {t.cropPlanner.soilTypeLabel} --</option>
              <option value="Red Sandy Loam">Red Sandy Loam (ఎర్ర ఇసుక నేల / लाल बलुई दोमट)</option>
              <option value="Black Cotton Soil">Black Cotton Soil (నల్ల రేగడి నేల / काली कपास मिट्टी)</option>
              <option value="Clay Loam">Clay Loam (బంకమట్టి నేల / चिकनी दोमट)</option>
              <option value="Alluvial Soil">Alluvial Soil (ఒండ్రు నేల / जलोढ़ दोमट)</option>
              <option value="Laterite Soil">Laterite Soil (లేటరైట్ నేల / लेटराइट मिट्टी)</option>
              <option value="Silt Loam">Silt Loam (సిల్ట్ లోమ్ / गाद दोमट)</option>
            </select>
          </div>

          {/* Location / Region */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">
              {t.cropPlanner.locationLabel} <span className="text-emerald-400">*</span>
            </label>
            <select
              value={inputs.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full p-2 bg-[#09090b] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">-- {t.cropPlanner.locationLabel} --</option>
              <option value="Telangana - Warangal">Telangana (Warangal / Central)</option>
              <option value="Telangana - Rangareddy">Telangana (Rangareddy / Semi-Arid)</option>
              <option value="Andhra Pradesh - Guntur">Andhra Pradesh (Guntur / Krishna)</option>
              <option value="Andhra Pradesh - Chittoor">Andhra Pradesh (Chittoor / Rayalaseema)</option>
              <option value="Karnataka - Mysore">Karnataka (Mysore / Southern Dry)</option>
              <option value="Maharashtra - Vidarbha">Maharashtra (Vidarbha / Black Soil)</option>
              <option value="Tamil Nadu - Coimbatore">Tamil Nadu (Western Zone)</option>
            </select>
          </div>

          {/* Water Availability / Irrigation Type */}
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">{t.cropPlanner.waterAvailabilityLabel}</label>
            <select
              value={inputs.waterAvailability || ''}
              onChange={(e) => handleInputChange('waterAvailability', e.target.value)}
              className="w-full p-2 bg-[#09090b] border border-white/[0.1] rounded-xl text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="Drip Irrigation">Drip Irrigation (బిందు సేద్యం / ड्रिप सिंचाई)</option>
              <option value="Sprinklers">Micro Sprinklers (స్ప్రింక్లర్లు / फव्वारा)</option>
              <option value="Canal Water">Canal / Basin Water (కాలువ నీరు / नहर सिंचाई)</option>
              <option value="Rainfed / Borewell">Rainfed / Deep Borewell (వర్షాధారం / बोरवेल)</option>
            </select>
          </div>
        </div>

        {/* Optional Secondary Agronomic Factors */}
        <div className="pt-2 border-t border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* Current Season */}
          <div>
            <label className="block text-zinc-400 mb-1">{t.cropPlanner.seasonLabel}</label>
            <select
              value={inputs.currentSeason || ''}
              onChange={(e) => handleInputChange('currentSeason', e.target.value)}
              className="w-full p-2 bg-[#09090b] border border-white/[0.08] rounded-xl text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="Kharif / Monsoon">Kharif / Monsoon (ఖరీఫ్ / खरीफ: June–Oct)</option>
              <option value="Rabi / Winter">Rabi / Winter (రబీ / रबी: Nov–Feb)</option>
              <option value="Zaid / Summer">Zaid / Summer (జైద్ / जायद: March–May)</option>
            </select>
          </div>

          {/* Previous Crop */}
          <div>
            <label className="block text-zinc-400 mb-1">{t.cropPlanner.previousCropLabel}</label>
            <select
              value={inputs.previousCrop || ''}
              onChange={(e) => handleInputChange('previousCrop', e.target.value)}
              className="w-full p-2 bg-[#09090b] border border-white/[0.08] rounded-xl text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="Cotton">Cotton (పత్తి / कपास)</option>
              <option value="Paddy / Rice">Paddy / Rice (వరి / धान)</option>
              <option value="Pulses / Legumes">Pulses / Legumes (పప్పుధాన్యాలు / दलहन)</option>
              <option value="Chili / Vegetables">Chili / Vegetables (మిరప, కూరగాయలు / मिर्च, सब्जियां)</option>
              <option value="Fallow / None">Fallow / Rested Soil (బీడు భూమి / परती)</option>
            </select>
          </div>

          {/* Farming Goal */}
          <div>
            <label className="block text-zinc-400 mb-1">{t.cropPlanner.farmingGoalLabel}</label>
            <select
              value={inputs.farmingGoal || ''}
              onChange={(e) => handleInputChange('farmingGoal', e.target.value)}
              className="w-full p-2 bg-[#09090b] border border-white/[0.08] rounded-xl text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="Maximize Profit">Maximize Profit & Market Demand</option>
              <option value="Soil Regeneration & Nitrogen Fixation">Soil Regeneration & Nitrogen Fixation</option>
              <option value="Low Water / Drought Resilient">Low Water / Drought Resilient</option>
              <option value="Quick Cashflow">Quick Cashflow (Short Cycle)</option>
            </select>
          </div>

          {/* Organic Preference */}
          <div>
            <label className="block text-zinc-400 mb-1">{t.cropPlanner.organicPreferenceLabel}</label>
            <select
              value={inputs.organicPreference || ''}
              onChange={(e) => handleInputChange('organicPreference', e.target.value)}
              className="w-full p-2 bg-[#09090b] border border-white/[0.08] rounded-xl text-zinc-200 focus:outline-none focus:border-emerald-500/50"
            >
              <option value="Certified 100% Organic">Certified 100% Organic</option>
              <option value="Natural Farming / ZBNF">Natural Farming (ZBNF / Jeevamrutha)</option>
              <option value="Integrated Pest Management">Integrated Pest Management (IPM)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Missing Required Inputs Notice */}
      {plannerResult.status === 'missing_required_inputs' && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-400">
            <AlertCircle className="w-4 h-4" />
            <span>{t.cropPlanner.missingInputsPrompt}</span>
          </div>
          <p className="text-zinc-300">
            {t.cropPlanner.pleaseProvideRequired}
          </p>
          <ul className="list-disc pl-5 space-y-0.5 text-amber-200">
            {plannerResult.missingFields.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions Display */}
      {plannerResult.status === 'ready' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>{t.cropPlanner.suitableCropsHeader} ({plannerResult.suggestions.length})</span>
              </h3>
              <p className="text-xs text-zinc-400">
                {t.cropPlanner.subtitle}
              </p>
            </div>
            <div className="text-[11px] text-zinc-500 italic">
              {inputs.landArea} {inputs.areaUnit} • {inputs.soilType}
            </div>
          </div>

          {/* Cards for each suggested crop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plannerResult.suggestions.map((crop, idx) => (
              <div
                key={idx}
                className="bg-[#121418] border border-white/[0.08] hover:border-emerald-500/30 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4 transition-all"
              >
                <div className="space-y-3">
                  {/* Crop Header */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-white/[0.06]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-emerald-500/15 text-emerald-400 font-bold text-xs flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-white tracking-tight">{crop.cropName}</h4>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-400">
                        <span>
                          {t.cropPlanner.careLevel}: <strong className="text-emerald-400">{crop.expectedCareLevel}</strong>
                        </span>
                        <span>•</span>
                        <button
                          onClick={() => setSelectedCropForActionPlan(crop.cropName)}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-0.5"
                        >
                          <span>{t.cropPlanner.actionPlanTitle}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
                      {crop.growingDuration}
                    </span>
                  </div>

                  {/* Why this crop? Breakdown */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      {t.cropPlanner.whyThisCrop}
                    </span>
                    <div className="p-3 rounded-xl bg-[#09090b]/80 border border-white/[0.04] space-y-1.5 text-xs">
                      {crop.soilSuitabilityDetail && (
                        <div className="flex items-start gap-1.5 text-zinc-300">
                          <span className="text-emerald-400 font-bold shrink-0">•</span>
                          <span><strong>{t.cropPlanner.soilSuitability}:</strong> {crop.soilSuitabilityDetail}</span>
                        </div>
                      )}
                      {crop.areaSuitabilityDetail && (
                        <div className="flex items-start gap-1.5 text-zinc-300">
                          <span className="text-emerald-400 font-bold shrink-0">•</span>
                          <span><strong>{t.cropPlanner.landAreaSuitability}:</strong> {crop.areaSuitabilityDetail}</span>
                        </div>
                      )}
                      {crop.seasonWeatherDetail && (
                        <div className="flex items-start gap-1.5 text-zinc-300">
                          <span className="text-emerald-400 font-bold shrink-0">•</span>
                          <span><strong>{t.cropPlanner.seasonWeatherSuitability}:</strong> {crop.seasonWeatherDetail}</span>
                        </div>
                      )}
                      <div className="flex items-start gap-1.5 text-zinc-300">
                        <span className="text-emerald-400 font-bold shrink-0">•</span>
                        <span><strong>{t.cropPlanner.waterRequirement}:</strong> {crop.waterRequirement}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-zinc-300">
                        <span className="text-emerald-400 font-bold shrink-0">•</span>
                        <span><strong>{t.cropPlanner.growingPeriod}:</strong> {crop.growingDuration}</span>
                      </div>
                    </div>
                  </div>

                  {/* Basic Care Requirements */}
                  {crop.basicCareRequirements && (
                    <div className="text-[11px] bg-[#09090b]/40 p-2.5 rounded-xl border border-white/[0.04]">
                      <span className="text-zinc-500 block text-[10px] uppercase font-bold">
                        {t.cropPlanner.basicCareRequirements}
                      </span>
                      <p className="text-zinc-300 mt-0.5 leading-snug">{crop.basicCareRequirements}</p>
                    </div>
                  )}

                  {/* Important Risks or Limitations */}
                  <div className="text-[11px]">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-amber-400" />
                      {t.cropPlanner.mainRisks}
                    </span>
                    <p className="text-zinc-400 mt-0.5 leading-relaxed">{crop.importantRisks}</p>
                  </div>

                  {/* Quick Next Steps */}
                  <div className="text-[11px] pt-2 border-t border-white/[0.06]">
                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-1">
                      {t.cropPlanner.actionPlanTitle}
                    </span>
                    <ul className="space-y-1 text-zinc-400">
                      {crop.suggestedNextSteps.map((step, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Disclaimer & Compare Toggle */}
                <div className="pt-2 border-t border-white/[0.04] flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-zinc-500 italic">
                    {t.cropPlanner.disclaimer}
                  </span>
                  <button
                    onClick={() => toggleCropComparison(crop.cropName)}
                    className={`px-2.5 py-1 rounded-lg font-semibold shrink-0 transition-all ${
                      selectedForComparison.includes(crop.cropName)
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-white/[0.04] text-zinc-400 hover:text-white border border-white/[0.08]'
                    }`}
                  >
                    {selectedForComparison.includes(crop.cropName) ? '✓ ' + t.cropPlanner.cropComparisonTitle.split(' ')[0] : '+ ' + t.cropPlanner.cropComparisonTitle.split(' ')[0]}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* CROP COMPARISON MODULE */}
          <div className="bg-[#121418] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                  <Columns className="w-4 h-4 text-emerald-400" />
                  <span>{t.cropPlanner.cropComparisonTitle}</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {t.cropPlanner.cropComparisonSubtitle}
                </p>
              </div>

              {/* Selector pills for which crops to compare */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-zinc-500">{t.cropPlanner.selectUpTo3}</span>
                {plannerResult.suggestions.map((c) => {
                  const isChecked = selectedForComparison.includes(c.cropName);
                  return (
                    <button
                      key={c.cropName}
                      onClick={() => toggleCropComparison(c.cropName)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isChecked
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-[#09090b] text-zinc-400 hover:text-zinc-200 border border-white/[0.06]'
                      }`}
                    >
                      {isChecked ? '✓ ' : ''}{c.cropName.split(' ')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Simple, Non-Cluttered Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-[#09090b]/60">
                    <th className="p-3 font-bold text-zinc-400 uppercase tracking-wider w-1/4">
                      {t.cropPlanner.comparisonTableFactor}
                    </th>
                    {comparisonCrops.map((c, i) => (
                      <th key={i} className="p-3 font-bold text-white tracking-tight">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded bg-emerald-500/20 text-emerald-400 text-[10px] flex items-center justify-center font-mono">
                            {String.fromCharCode(65 + i)}
                          </span>
                          <span>{c.cropName}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {/* Factor 1: Soil suitability */}
                  <tr>
                    <td className="p-3 font-semibold text-zinc-400 bg-white/[0.01]">
                      {t.cropPlanner.soilSuitability}
                    </td>
                    {comparisonCrops.map((c, i) => (
                      <td key={i} className="p-3 text-zinc-200">
                        <span className="font-medium text-emerald-300 block">{c.suitableSoil}</span>
                        <span className="text-[11px] text-zinc-400 mt-0.5 block">{c.soilSuitabilityDetail}</span>
                      </td>
                    ))}
                  </tr>

                  {/* Factor 2: Water need */}
                  <tr>
                    <td className="p-3 font-semibold text-zinc-400 bg-white/[0.01]">
                      {t.cropPlanner.waterRequirement}
                    </td>
                    {comparisonCrops.map((c, i) => (
                      <td key={i} className="p-3 text-zinc-200 font-mono">
                        <span className="font-semibold text-sky-300">{c.waterRequirement}</span>
                      </td>
                    ))}
                  </tr>

                  {/* Factor 3: Growing period */}
                  <tr>
                    <td className="p-3 font-semibold text-zinc-400 bg-white/[0.01]">
                      {t.cropPlanner.growingPeriod}
                    </td>
                    {comparisonCrops.map((c, i) => (
                      <td key={i} className="p-3 text-zinc-200 font-mono">
                        {c.growingDuration}
                      </td>
                    ))}
                  </tr>

                  {/* Factor 4: Weather suitability */}
                  <tr>
                    <td className="p-3 font-semibold text-zinc-400 bg-white/[0.01]">
                      {t.cropPlanner.seasonWeatherSuitability}
                    </td>
                    {comparisonCrops.map((c, i) => (
                      <td key={i} className="p-3 text-zinc-300 text-[11px] leading-relaxed">
                        {c.weatherSuitability}
                      </td>
                    ))}
                  </tr>

                  {/* Factor 5: Main risks */}
                  <tr>
                    <td className="p-3 font-semibold text-zinc-400 bg-white/[0.01]">
                      {t.cropPlanner.mainRisks}
                    </td>
                    {comparisonCrops.map((c, i) => (
                      <td key={i} className="p-3 text-amber-300/90 text-[11px] leading-relaxed">
                        {c.importantRisks}
                      </td>
                    ))}
                  </tr>

                  {/* Factor 6: Care level */}
                  <tr>
                    <td className="p-3 font-semibold text-zinc-400 bg-white/[0.01]">
                      {t.cropPlanner.careLevel}
                    </td>
                    {comparisonCrops.map((c, i) => (
                      <td key={i} className="p-3 text-zinc-200 font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            c.expectedCareLevel === 'High'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {c.expectedCareLevel} {t.cropPlanner.careLevel}
                        </span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* CROP ACTION PLAN CHECKLIST */}
          {activeActionPlanCrop && (
            <div className="bg-[#121418] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-emerald-400" />
                    <span>{t.cropPlanner.actionPlanTitle} — {activeActionPlanCrop.cropName}</span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {t.cropPlanner.actionPlanSubtitle}
                  </p>
                </div>

                {/* Switcher for action plan crop */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-zinc-500">{t.cropPlanner.actionPlanTitle}:</span>
                  {plannerResult.suggestions.map((c) => (
                    <button
                      key={c.cropName}
                      onClick={() => setSelectedCropForActionPlan(c.cropName)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        activeActionPlanCrop.cropName === c.cropName
                          ? 'bg-emerald-500 text-zinc-950 font-bold'
                          : 'bg-[#09090b] text-zinc-300 hover:text-white border border-white/[0.06]'
                      }`}
                    >
                      {c.cropName.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5-Step Actionable Checklist */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
                {/* Step 1: Prepare */}
                <div className="p-3.5 bg-[#09090b]/80 border border-white/[0.06] rounded-xl flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center font-mono">
                        1
                      </span>
                      <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                        {t.cropPlanner.prepareStep}
                      </span>
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      {activeActionPlanCrop.actionPlan.prepare}
                    </p>
                  </div>
                </div>

                {/* Step 2: Plant */}
                <div className="p-3.5 bg-[#09090b]/80 border border-white/[0.06] rounded-xl flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center font-mono">
                        2
                      </span>
                      <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                        {t.cropPlanner.plantStep}
                      </span>
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      {activeActionPlanCrop.actionPlan.plant}
                    </p>
                  </div>
                </div>

                {/* Step 3: Monitor */}
                <div className="p-3.5 bg-[#09090b]/80 border border-white/[0.06] rounded-xl flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center font-mono">
                        3
                      </span>
                      <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                        {t.cropPlanner.monitorStep}
                      </span>
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      {activeActionPlanCrop.actionPlan.monitor}
                    </p>
                  </div>
                </div>

                {/* Step 4: Respond to weather */}
                <div className="p-3.5 bg-[#09090b]/80 border border-white/[0.06] rounded-xl flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold text-[11px] flex items-center justify-center font-mono">
                        4
                      </span>
                      <span className="font-bold text-amber-300 uppercase tracking-wider text-[11px]">
                        {t.cropPlanner.weatherResponseStep}
                      </span>
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      {activeActionPlanCrop.actionPlan.respondToWeather}
                    </p>
                  </div>
                </div>

                {/* Step 5: Harvest */}
                <div className="p-3.5 bg-[#09090b]/80 border border-white/[0.06] rounded-xl flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px] flex items-center justify-center font-mono">
                        5
                      </span>
                      <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                        {t.cropPlanner.harvestStep}
                      </span>
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      {activeActionPlanCrop.actionPlan.harvest}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mandatory Guardrail Disclaimer */}
          <div className="p-3.5 bg-[#121418] border border-white/[0.06] rounded-xl flex items-start gap-2.5 text-xs text-zinc-400">
            <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong className="text-zinc-200">Notice:</strong> {t.cropPlanner.disclaimer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
