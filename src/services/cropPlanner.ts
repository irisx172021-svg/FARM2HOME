import { CropPlannerInputs, CropSuggestion, CropActionPlan, WeatherDay } from '../types';

interface CropProfile {
  id: string;
  name: string;
  category: 'pulses' | 'grains' | 'vegetables' | 'spices' | 'oilseeds';
  suitableSoils: string[];
  durationDays: string;
  waterNeed: 'Low' | 'Moderate' | 'High';
  idealSeasons: string[];
  careLevel: 'Low' | 'Moderate' | 'High';
  basicCareRequirements: string;
  rotationSynergies: Record<string, string>; // previousCrop -> why it helps
  goals: string[]; // matches goals
  organicFriendly: boolean;
  baseRisks: string;
  nextSteps: string[];
  actionPlan: CropActionPlan;
  weatherNotes: (forecast: WeatherDay[]) => string;
}

export const AGRONOMIC_CROPS: CropProfile[] = [
  {
    id: 'toor_dal',
    name: 'Unpolished Toor Dal (Pigeon Pea / Arhar)',
    category: 'pulses',
    suitableSoils: ['Red Sandy Loam', 'Clay Loam', 'Alluvial Soil', 'Black Cotton Soil'],
    durationDays: '130–150 days (semi-arid cycle)',
    waterNeed: 'Low',
    idealSeasons: ['Kharif / Monsoon', 'Rabi / Winter'],
    careLevel: 'Low',
    basicCareRequirements: 'Minimal maintenance; deep taproot system thrives with 1–2 protective irrigations, minimal weeding after 45 days, and broad-bed drainage.',
    rotationSynergies: {
      'Cotton': 'Fixes 40–50 kg/ha atmospheric nitrogen into exhausted cotton soil, breaking bollworm and root knot cycles.',
      'Paddy / Rice': 'Restores aerobic soil structure after puddled paddy soil and taps deep subsoil moisture.',
      'Chili / Vegetables': 'Breaks intensive solanaceous wilt cycle and replenishes biological active carbon.',
      'Fallow / None': 'Deep taproot loosens hardpan soil and prevents topsoil erosion during monsoon rains.',
      'Pulses / Legumes': 'Provides deep taproot aeration; rotate with cereal in next season for balanced nutrients.',
    },
    goals: ['Soil Regeneration & Nitrogen Fixation', 'Low Water / Drought Resilient', 'Maximize Profit'],
    organicFriendly: true,
    baseRisks: 'Susceptible to pod borer (Helicoverpa) during flower drop; ensure good drainage during flash rainfall.',
    nextSteps: [
      'Inoculate seeds with Rhizobium culture and Trichoderma viride bio-fungicide before sowing.',
      'Form broad beds with 90cm inter-row spacing to drain excess monsoon downpours.',
      'Consult nearby Krishi Vigyan Kendra (KVK) for certified wilt-resistant seed varieties (e.g., PRG-176 or BDN-711).',
    ],
    actionPlan: {
      prepare: 'Deep summer ploughing followed by 2 cross-harrowings; apply 5 tonnes/acre well-decomposed FYM or compost along with broad bed and furrow layout.',
      plant: 'Treat seeds with Rhizobium + PSB bio-fertilizers; dibble seeds at 90 cm × 20 cm spacing into moist seedbed at 4–5 cm depth.',
      monitor: 'Check root nodules at 30 days for pink active nitrogen-fixing zones; install yellow sticky traps and monitor for flower-drop caterpillar pressure.',
      respondToWeather: 'If heavy downpours are forecast, open furrow ends immediately to avoid standing water. In prolonged dry spells, schedule one protective drip cycle at pod formation.',
      harvest: 'Harvest when 80–85% of pods turn golden-brown; dry harvested plants on threshing yard for 3–4 days before threshing and safe solar drying down to 9% grain moisture.',
    },
    weatherNotes: (forecast) => {
      const hasHeavyRain = forecast.some((d) => d.rainfallMm >= 25);
      if (hasHeavyRain) {
        return 'Deep taproots handle variable rainfall well. Because upcoming forecast shows peak rain mid-week, sow on raised ridges.';
      }
      return 'Current moderate temperatures and initial soil moisture provide optimal conditions for vigorous root establishment.';
    },
  },
  {
    id: 'organic_tomato',
    name: 'Vine-Ripened Organic Tomatoes',
    category: 'vegetables',
    suitableSoils: ['Red Sandy Loam', 'Clay Loam', 'Alluvial Soil'],
    durationDays: '75–90 days (continuous harvesting for 6–8 weeks)',
    waterNeed: 'Moderate',
    idealSeasons: ['Rabi / Winter', 'Kharif / Monsoon', 'Zaid / Summer'],
    careLevel: 'High',
    basicCareRequirements: 'High-attention crop; requires bamboo trellising or string support, weekly side-shoot pruning, regulated drip fertigation, and proactive bio-pest vigilance.',
    rotationSynergies: {
      'Pulses / Legumes': 'Thrives immensely on residual nitrogen fixed by preceding legumes, producing firmer fruit set.',
      'Paddy / Rice': 'Breaks nematode cycle when beds are solarized after flooded rice paddies.',
      'Cotton': 'Suitable with proper soil aeration; add vermicompost to re-enrich topsoil microbes.',
      'Fallow / None': 'Fresh virgin plot allows vigorous tomato canopy growth without soil-borne fungal buildup.',
      'Chili / Vegetables': 'Avoid continuous tomato after chili; practice strict intercropping with marigold.',
    },
    goals: ['Maximize Profit', 'Quick Cashflow'],
    organicFriendly: true,
    baseRisks: 'Prone to early blight and fruit rot under prolonged leaf wetness; requires regular staking and aeration.',
    nextSteps: [
      'Transplant 25-day-old vigorous nursery seedlings in raised beds with silver-black mulch.',
      'Set up trellising/bamboo stakes early to keep foliage off wet soil and minimize soil splash.',
      'Schedule preventative spray of fermented buttermilk (sour curd) + neem oil against leaf curl.',
    ],
    actionPlan: {
      prepare: 'Form raised beds 15 cm high and 90 cm wide; incorporate 8 tonnes/acre vermicompost and neem cake; lay drip lines and reflective mulch film.',
      plant: 'Transplant disease-free seedlings at 60 cm × 45 cm zigzag spacing during cool late afternoon hours; apply light starter drench of Jeevamrutha.',
      monitor: 'Inspect underside of leaves twice weekly for whiteflies and spider mites; prune lower 15 cm foliage to eliminate ground fungal splash.',
      respondToWeather: 'When high humidity (>80%) or rains are forecast, stop overhead watering, prune dense canopy for air movement, and apply bio-fungicide (Trichoderma drench).',
      harvest: 'Pick at breaker/pink stage for distant transport or full red-ripe for immediate local Farm2Home direct orders; handle in ventilated crates.',
    },
    weatherNotes: (forecast) => {
      const avgHum = forecast.reduce((a, b) => a + b.humidity, 0) / forecast.length;
      if (avgHum > 80) {
        return 'High upcoming humidity (>80%) creates fungal spore pressure. Maintain open canopy pruning and ensure raised beds.';
      }
      return 'Favorable temperature range (22°C–31°C) in current 7-day forecast supports active flowering and pollination.';
    },
  },
  {
    id: 'fresh_palak',
    name: 'Farm Fresh Palak (Spinach)',
    category: 'vegetables',
    suitableSoils: ['Alluvial Soil', 'Clay Loam', 'Red Sandy Loam', 'Silt Loam'],
    durationDays: '30–45 days (fast multiple cuttings)',
    waterNeed: 'Moderate',
    idealSeasons: ['Rabi / Winter', 'Kharif / Monsoon', 'Zaid / Summer'],
    careLevel: 'Low',
    basicCareRequirements: 'Quick and straightforward; requires shallow bed preparation, uniform light irrigation, and timely early-morning cutting for crisp leaves.',
    rotationSynergies: {
      'Pulses / Legumes': 'Consumes residual organic nutrients efficiently, resulting in lush dark-green leaves.',
      'Cotton': 'Quick cover crop that restores surface carbon and prevents soil compaction.',
      'Paddy / Rice': 'Fast short-duration filler crop that provides quick liquidity between major grain seasons.',
      'Fallow / None': 'Rapid germination suppresses weeds and stabilizes fertile topsoil.',
      'Chili / Vegetables': 'Excellent non-host rotation crop that clears solanaceous soil pathogens.',
    },
    goals: ['Quick Cashflow', 'Maximize Profit', 'Certified 100% Organic'],
    organicFriendly: true,
    baseRisks: 'Damping off of tender seedlings during continuous heavy downpours; leaf miner in dry heat.',
    nextSteps: [
      'Broadcast treated seed on raised cambered beds enriched with decomposed farmyard manure (FYM).',
      'Provide light, frequent drip or micro-sprinkler irrigation rather than heavy flooding.',
      'Harvest first cutting at 28–30 days early morning to retain turgidity and peak market freshness.',
    ],
    actionPlan: {
      prepare: 'Till soil to fine crumbly tilth; mix 4 tonnes/acre well-rotted cow dung manure; construct level raised beds with shallow drainage furrows.',
      plant: 'Soak seeds in water for 12 hours before sowing; line-sow at 20 cm row spacing at 1.5 cm depth and cover with light leaf compost.',
      monitor: 'Keep beds weed-free during first 15 days; monitor for aphid colonies and damping-off patches in wet spots.',
      respondToWeather: 'In hot spells, provide light sprinkling at noon to cool the micro-canopy; in continuous rains, ensure drainage furrows flow freely.',
      harvest: 'Cut mature outer leaves 2 cm above soil crown at 30 days early morning; allow inner crown leaves to regenerate for 2–3 subsequent flushes.',
    },
    weatherNotes: (forecast) => {
      return 'Rapid 35-day turnaround fits perfectly with the current weather window, allowing harvest before intense seasonal shifts.';
    },
  },
  {
    id: 'desi_groundnut',
    name: 'Desi Groundnut (Peanut / Pods)',
    category: 'oilseeds',
    suitableSoils: ['Red Sandy Loam', 'Sandy Loam', 'Alluvial Soil'],
    durationDays: '100–115 days',
    waterNeed: 'Low',
    idealSeasons: ['Kharif / Monsoon', 'Rabi / Winter'],
    careLevel: 'Moderate',
    basicCareRequirements: 'Moderate oversight; keep top 8 cm soil loose for easy peg penetration; apply gypsum at flowering; avoid irrigation near maturity.',
    rotationSynergies: {
      'Cotton': 'Superb rotational break crop that replenishes organic matter and soil nitrogen.',
      'Paddy / Rice': 'Utilizes residual soil moisture in rice fallows with minimal supplemental irrigation.',
      'Chili / Vegetables': 'Breaks pest continuum and improves friability of light red soils.',
      'Fallow / None': 'Forms dense ground canopy that cools soil and retains ground moisture.',
      'Pulses / Legumes': 'Alternate with cereal in next round to preserve micronutrient balance.',
    },
    goals: ['Soil Regeneration & Nitrogen Fixation', 'Low Water / Drought Resilient', 'Maximize Profit'],
    organicFriendly: true,
    baseRisks: 'Tikka leaf spot during damp humid weeks; pod damage if harvesting is delayed past maturity.',
    nextSteps: [
      'Incorporate 250 kg/ha gypsum during flowering to boost calcium availability for bold pod development.',
      'Maintain loose, friable soil in top 8 cm so emerging pegs easily penetrate into the earth.',
      'Check seed germination percentage before full field sowing.',
    ],
    actionPlan: {
      prepare: 'Plough twice to create loose, friable seedbed; incorporate compost and bio-fertilizers; avoid heavy clay crusts.',
      plant: 'Treat bold shelled seeds with Trichoderma (10g/kg); sow at 30 cm × 10 cm spacing at 5 cm depth into moist soil.',
      monitor: 'Do not disturb soil once pegging begins (at 40–45 days); watch for leaf-spot symptoms on lower foliage.',
      respondToWeather: 'Take advantage of forecasted moderate rainfall for peg penetration; avoid supplemental irrigation during final 15 days before harvest.',
      harvest: 'Pull out representative test plants to check internal pod shell color (dark brown inner lining indicates maturity); harvest in dry weather.',
    },
    weatherNotes: (forecast) => {
      return 'Moderate rainfall in current forecast aids peg penetration; dry spells later promote oil concentration.';
    },
  },
  {
    id: 'sona_masoori',
    name: 'Aromatic Sona Masoori Rice (Direct Seeded / System of Rice Intensification)',
    category: 'grains',
    suitableSoils: ['Clay Loam', 'Black Cotton Soil', 'Alluvial Soil'],
    durationDays: '135–145 days',
    waterNeed: 'High',
    idealSeasons: ['Kharif / Monsoon'],
    careLevel: 'Moderate',
    basicCareRequirements: 'Regular water and weed management; adopt Alternate Wetting and Drying (AWD) to optimize water; maintain bund integrity and balanced nutrients.',
    rotationSynergies: {
      'Pulses / Legumes': 'Exceptional response to nitrogen left behind by previous pulse crop, saving synthetic inputs.',
      'Cotton': 'Transforms water management; requires proper puddling and field levelling.',
      'Fallow / None': 'Ideal for monsoon basin irrigation where abundant canal/borewell water is available.',
      'Chili / Vegetables': 'Flushes accumulated soluble salts from soil through seasonal basin flooding.',
      'Paddy / Rice': 'Rotate with green manure (Dhaincha/Sunn hemp) between cycles to prevent iron chlorosis.',
    },
    goals: ['Maximize Profit', 'Fast Cashflow'],
    organicFriendly: true,
    baseRisks: 'Blast disease in misty cool weather; stem borer during vegetative tiller stage.',
    nextSteps: [
      'Adopt Alternate Wetting and Drying (AWD) or SRI methodology to slash water consumption by 30%.',
      'Incorporate green manure crop 10 days before main field preparation.',
      'Install pheromone traps (8 per acre) for organic monitoring of yellow stem borer moths.',
    ],
    actionPlan: {
      prepare: 'Puddle field thoroughly after incorporating green manure; level carefully using a laser or wooden plank to ensure even water depth.',
      plant: 'Transplant single 12-day-old young seedlings in a square 25 cm × 25 cm grid (SRI method) or direct-seed using a drum seeder into moist soil.',
      monitor: 'Use a rotary cono-weeder at 10, 20, and 30 days to aerate roots and incorporate weeds into mud; inspect leaves for leaf folder webs.',
      respondToWeather: 'Capitalize on upcoming monsoon rains to store water on bunded parcels; withhold tube-well pumping when rain exceeds 20mm.',
      harvest: 'Drain water 10 days before harvest; cut stalks when 90% of panicles turn golden yellow; thresh and sun-dry grain to 12% moisture.',
    },
    weatherNotes: (forecast) => {
      const totalRain = forecast.reduce((a, b) => a + b.rainfallMm, 0);
      return `Expected ${totalRain}mm precipitation over next 7 days supports water catchment in clay soils.`;
    },
  },
  {
    id: 'organic_chickpea',
    name: 'Desi Bengal Gram / Chickpea (Chana)',
    category: 'pulses',
    suitableSoils: ['Black Cotton Soil', 'Clay Loam', 'Alluvial Soil'],
    durationDays: '90–105 days',
    waterNeed: 'Low',
    idealSeasons: ['Rabi / Winter'],
    careLevel: 'Low',
    basicCareRequirements: 'Low-input hardy pulse; thrives on residual deep moisture; single terminal nipping at 30 days; avoid water accumulation.',
    rotationSynergies: {
      'Cotton': 'The gold standard rotation for black cotton soil; leverages deep stored subsoil moisture.',
      'Paddy / Rice': 'Excellent post-kharif rice-fallow pulse requiring zero to one supplemental irrigation.',
      'Fallow / None': 'Deep roots extract leftover moisture and fix abundant symbiotic nitrogen for next season.',
      'Chili / Vegetables': 'Removes excess salinity and loosens dense clay textures naturally.',
      'Pulses / Legumes': 'Follow with a cereal crop to avoid root-rot accumulation.',
    },
    goals: ['Low Water / Drought Resilient', 'Soil Regeneration & Nitrogen Fixation', 'Maximize Profit'],
    organicFriendly: true,
    baseRisks: 'Fusarium wilt in hot soils; helicoverpa caterpillar on green pods; avoid waterlogging.',
    nextSteps: [
      'Treat seeds with Trichoderma harzianum (10g/kg seed) to prevent seedling wilt.',
      'Sow with seed drill at 30cm row spacing into residual moisture after kharif crop harvest.',
      'Nip terminal shoots at 30 days to encourage profuse lateral branching and higher pod numbers.',
    ],
    actionPlan: {
      prepare: 'Light surface tilling following kharif harvest to conserve subsoil residual moisture; level gently to prevent any water ponding.',
      plant: 'Seed-drill treated seeds at 30 cm row spacing at 8 cm depth to tap moist subsoil zone before soil surface dries out.',
      monitor: 'Nip top 2 cm apical shoot at 30–35 days to multiply branching; install 4 pheromone traps/acre to scout for Helicoverpa moths.',
      respondToWeather: 'Cool winter nights forecasted are ideal; if unexpected heavy showers occur, ensure surface drains are clear to prevent collar rot.',
      harvest: 'Harvest when leaves dry up, turn straw yellow, and rattle inside pods; thresh on clean canvas sheets and store with neem leaves.',
    },
    weatherNotes: (forecast) => {
      return 'Thrives best in cool, dry post-rain regimes; requires well-drained soil during germination.';
    },
  },
  {
    id: 'organic_turmeric',
    name: 'Salem / Nizamabad High-Curcumin Turmeric',
    category: 'spices',
    suitableSoils: ['Red Sandy Loam', 'Clay Loam', 'Alluvial Soil'],
    durationDays: '210–240 days (high value cash crop)',
    waterNeed: 'Moderate',
    idealSeasons: ['Kharif / Monsoon'],
    careLevel: 'High',
    basicCareRequirements: 'High-value long-duration crop; requires thick organic mulch, raised bed drainage, regular earthing-up at 60 & 90 days, and organic nutrition.',
    rotationSynergies: {
      'Pulses / Legumes': 'Rhizomes absorb organic nitrogen smoothly without excessive vegetative leafy surge.',
      'Cotton': 'Deep bed preparation clears root zones; apply plenty of compost and neem cake.',
      'Fallow / None': 'Virgin soil with high organic matter produces bold fingers and high curcumin percentage.',
      'Paddy / Rice': 'Requires raised ridge-and-furrow planting to guarantee zero water stagnation.',
      'Chili / Vegetables': 'Avoid immediately after ginger or chili to prevent Pythium rhizome rot.',
    },
    goals: ['Maximize Profit', 'Certified 100% Organic'],
    organicFriendly: true,
    baseRisks: 'Rhizome rot in heavy waterlogged patches; leaf blotch in high-humidity monsoon periods.',
    nextSteps: [
      'Select healthy, plump mother or finger rhizomes free of lesions (approx 1,000 kg/acre).',
      'Plant on raised beds of 120cm width with 2 lines of drip tubing and thick organic leaf mulch.',
      'Apply neem cake (200 kg/acre) in root zone at planting to suppress nematodes and soil grubs.',
    ],
    actionPlan: {
      prepare: 'Plough deeply 3 times; apply 10 tonnes/acre aged FYM and 200 kg neem cake; erect raised broad beds 120 cm wide and 20 cm high.',
      plant: 'Plant sound, disease-free seed rhizomes (mother or primary fingers) at 30 cm × 20 cm spacing at 4 cm depth; mulch immediately with green leaves.',
      monitor: 'Check bed drainage every week; earth up soil around rhizomes at 60 days and 90 days; re-apply leaf mulch to retain cool root temperature.',
      respondToWeather: 'Ensure furrows drain freely during peak monsoon rainfall; during cloudy humid weeks, apply preventive bio-drench of Trichoderma.',
      harvest: 'Harvest at 7–8 months when leaves turn completely yellow and dry out; carefully lift rhizome clumps with digging forks; boil and cure within 3 days.',
    },
    weatherNotes: (forecast) => {
      return 'Monsoon onset in forecast accelerates rhizome sprouting and leaf emergence; ensure furrows drain freely.';
    },
  },
];

export interface CropPlannerResult {
  status: 'ready' | 'missing_required_inputs';
  missingFields: string[];
  suggestions: CropSuggestion[];
  disclaimer: string;
}

export function generateCropSuggestions(
  inputs: CropPlannerInputs,
  weatherForecast: WeatherDay[] = []
): CropPlannerResult {
  const missingFields: string[] = [];

  // Required Field Checks: Land Area, Area Unit, Soil Type, Location
  const landAreaNum = typeof inputs.landArea === 'number' ? inputs.landArea : parseFloat(String(inputs.landArea));
  if (!landAreaNum || isNaN(landAreaNum) || landAreaNum <= 0) {
    missingFields.push('Land area (must be greater than 0)');
  }
  if (!inputs.soilType || !inputs.soilType.trim()) {
    missingFields.push('Soil type');
  }
  if (!inputs.location || !inputs.location.trim()) {
    missingFields.push('Location / region');
  }

  if (missingFields.length > 0) {
    return {
      status: 'missing_required_inputs',
      missingFields,
      suggestions: [],
      disclaimer: 'Please provide all required farming inputs to generate suitable agronomic suggestions.',
    };
  }

  const soilNorm = (inputs.soilType || '').toLowerCase();
  const seasonNorm = (inputs.currentSeason || '').toLowerCase();
  const goalNorm = (inputs.farmingGoal || '').toLowerCase();
  const prevCrop = inputs.previousCrop || 'None';
  const waterAvail = (inputs.waterAvailability || '').toLowerCase();
  const unitLabel = inputs.areaUnit || 'acres';

  // Score each crop against farmer conditions
  const scoredCrops = AGRONOMIC_CROPS.map((crop) => {
    let score = 0;
    const reasons: string[] = [];

    // 1. Soil Match
    const soilMatch = crop.suitableSoils.some((s) => soilNorm.includes(s.toLowerCase()) || s.toLowerCase().includes(soilNorm));
    let soilSuitabilityDetail = '';
    if (soilMatch) {
      score += 35;
      soilSuitabilityDetail = `Naturally adapted to ${inputs.soilType} with good root penetration.`;
      reasons.push(soilSuitabilityDetail);
    } else {
      score -= 15;
      soilSuitabilityDetail = `Requires soil conditioning or raised bed management to adapt to ${inputs.soilType}.`;
    }

    // 2. Previous Crop Rotation Synergy
    if (prevCrop && crop.rotationSynergies[prevCrop]) {
      score += 25;
      reasons.push(crop.rotationSynergies[prevCrop]);
    } else if (prevCrop && prevCrop !== 'None' && prevCrop !== 'Fallow / None') {
      score += 10;
      reasons.push(`Breaks monoculture after ${prevCrop}, mitigating specialized pest cycles.`);
    }

    // 3. Season Match
    let seasonWeatherDetail = '';
    if (seasonNorm) {
      const seasonMatch = crop.idealSeasons.some((s) => s.toLowerCase().includes(seasonNorm) || seasonNorm.includes(s.toLowerCase()));
      if (seasonMatch) {
        score += 20;
        seasonWeatherDetail = `Ideal planting window for ${inputs.currentSeason}.`;
        reasons.push(seasonWeatherDetail);
      } else {
        score -= 20;
        seasonWeatherDetail = `Secondary season; optimal planting is in ${crop.idealSeasons.join(' or ')}.`;
      }
    }

    // 4. Water Availability / Irrigation Compatibility
    if (waterAvail.includes('drip') || waterAvail.includes('sprinkler')) {
      if (crop.waterNeed === 'Moderate' || crop.waterNeed === 'High') {
        score += 15;
        reasons.push(`Well matched with your precision ${inputs.waterAvailability} system.`);
      }
    } else if (waterAvail.includes('rainfed') || waterAvail.includes('dryland')) {
      if (crop.waterNeed === 'Low') {
        score += 25;
        reasons.push('Low water requirement makes it safe and resilient under rainfed/dryland conditions.');
      } else {
        score -= 25;
      }
    }

    // 5. Farming Goal
    if (goalNorm) {
      const goalMatch = crop.goals.some((g) => g.toLowerCase().includes(goalNorm) || goalNorm.includes(g.toLowerCase()));
      if (goalMatch) {
        score += 15;
        reasons.push(`Directly advances your goal: ${inputs.farmingGoal}.`);
      }
    }

    // 6. Land Area sizing consideration
    let areaSuitabilityDetail = '';
    if (landAreaNum <= 2 && (crop.category === 'vegetables' || crop.category === 'spices')) {
      score += 10;
      areaSuitabilityDetail = `High gross margin per ${unitLabel} for compact farm holdings (${landAreaNum} ${unitLabel}).`;
      reasons.push(areaSuitabilityDetail);
    } else if (landAreaNum > 5 && (crop.category === 'pulses' || crop.category === 'grains' || crop.category === 'oilseeds')) {
      score += 10;
      areaSuitabilityDetail = `Mechanized planting and bulk harvesting well suited to ${landAreaNum} ${unitLabel}.`;
      reasons.push(areaSuitabilityDetail);
    } else {
      areaSuitabilityDetail = `Scale of ${landAreaNum} ${unitLabel} aligns well with modular bed and furrow management.`;
    }

    const weatherSuitability = crop.weatherNotes(weatherForecast);

    return {
      crop,
      score,
      whySuitable: reasons.join(' '),
      soilSuitabilityDetail,
      areaSuitabilityDetail,
      seasonWeatherDetail,
      weatherSuitability,
    };
  });

  // Sort descending by agronomic score
  scoredCrops.sort((a, b) => b.score - a.score);

  // Return top 3-4 distinct recommendations
  const topCrops = scoredCrops.slice(0, 4);

  const suggestions: CropSuggestion[] = topCrops.map(({ crop, whySuitable, soilSuitabilityDetail, areaSuitabilityDetail, seasonWeatherDetail, weatherSuitability }) => ({
    id: crop.id,
    cropName: crop.name,
    whySuitable,
    suitableSoil: crop.suitableSoils.join(', '),
    soilSuitabilityDetail,
    areaSuitabilityDetail,
    seasonWeatherDetail,
    growingDuration: crop.durationDays,
    waterRequirement: `${crop.waterNeed} water consumption`,
    suitableSeason: crop.idealSeasons.join(' or '),
    weatherSuitability,
    importantRisks: crop.baseRisks,
    expectedCareLevel: crop.careLevel,
    basicCareRequirements: crop.basicCareRequirements,
    suggestedNextSteps: crop.nextSteps,
    actionPlan: crop.actionPlan,
  }));

  return {
    status: 'ready',
    missingFields: [],
    suggestions,
    disclaimer: 'Suitable based on the provided conditions. Consider local agricultural guidance before planting (KVK / State Agricultural Department).',
  };
}
