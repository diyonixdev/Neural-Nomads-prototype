import { BuyerRequirement } from '../types';
import { mockBuyers, mockBuyerRequirements } from './mockData';

export type CropCategory = 'all' | 'vegetables' | 'grains' | 'fruits' | 'pulses';
export type ForecastTimeframe = '7d' | '30d' | '90d';
export type ForecastRegion = 'ncr' | 'delhi' | 'western_up' | 'haryana' | 'agra';

export interface CropInfo {
  id: string;
  name: string;
  nameHi: string;
  category: 'vegetables' | 'grains' | 'fruits' | 'pulses';
  emoji: string;
  season: 'Kharif' | 'Rabi' | 'Zaid' | 'All-Season';
  seasonHi: string;
  currentModalPrice: number;
  mspPrice: number | null; // null if no official MSP (e.g. perishables have state benchmark)
  priceMin: number;
  priceMax: number;
  trend: 'Increasing' | 'Stable' | 'Decreasing';
  trendPct: number;
  totalRegionalDemandKg: number;
  totalMarketArrivalsKg: number;
  confidencePct: number;
  statusText: string;
  statusTextHi: string;
  optimalHarvestWindow: string;
  optimalHarvestWindowHi: string;
  drivers: string[];
  driversHi: string[];
  recommendation: string;
  recommendationHi: string;
  coldStorage: {
    viable: boolean;
    durationDays: number;
    dailyStorageCostPerKg: number;
    projectedGainPerKg: number;
    netBenefitPerKg: number;
    advice: string;
    adviceHi: string;
  };
  mandis: Array<{
    name: string;
    location: string;
    distanceKm: number;
    modalPrice: number;
    transportCostPerKg: number;
    netReturnPerKg: number;
    dailyArrivalTonnes: number;
    isBest: boolean;
  }>;
}

export interface ForecastDataPoint {
  period: string;
  periodLabel: string;
  demandKg: number;
  arrivalKg: number;
  projectedPrice: number;
  priceMin: number;
  priceMax: number;
  msp?: number;
  deficitKg: number;
}

export const SUPPORTED_CROPS: CropInfo[] = [
  {
    id: 'wheat',
    name: 'Wheat',
    nameHi: 'गेहूं',
    category: 'grains',
    emoji: '🌾',
    season: 'Rabi',
    seasonHi: 'रबी सीजन',
    currentModalPrice: 24.8,
    mspPrice: 22.75,
    priceMin: 23.5,
    priceMax: 27.2,
    trend: 'Increasing',
    trendPct: 9.4,
    totalRegionalDemandKg: 340000,
    totalMarketArrivalsKg: 265000,
    confidencePct: 94,
    statusText: 'Supply Deficit — High Buyer Procurement',
    statusTextHi: 'आपूर्ति घाटा — खरीदारों की उच्च खरीद मांग',
    optimalHarvestWindow: 'Immediate dispatch or hold in hermetic silo for +8% peak',
    optimalHarvestWindowHi: 'तुरंत प्रेषण या साइलो में रोककर +8% अधिक लाभ प्राप्त करें',
    drivers: [
      'Flour mills and biscuit manufacturers restocking procurement buffers',
      'FCI open-market sales stabilized at higher floor rate',
      'Strong interstate demand from Rajasthan and UP processing hubs',
      'Low moisture (under 11%) fetching +₹1.50/kg grade bonus'
    ],
    driversHi: [
      'आटा मिलें और बिस्कुट निर्माता बफर स्टॉक बढ़ा रहे हैं',
      'एफसीआई खुले बाजार बिक्री मूल्य में स्थिरता',
      'राजस्थान और यूपी प्रसंस्करण केंद्रों से मजबूत अंतर-राज्यीय मांग',
      '11% से कम नमी पर ₹1.50/किग्रा अतिरिक्त ग्रेड बोनस'
    ],
    recommendation: 'Holding dry grain in certified hermetic silos for 4-6 weeks will yield an estimated +₹2.40/kg margin over current spot mandi rates.',
    recommendationHi: 'हर्मेटिक साइलो में 4-6 सप्ताह अनाज रोकने पर मौजूदा मंडी भाव से +₹2.40/किग्रा अधिक लाभ मिलने का अनुमान है।',
    coldStorage: {
      viable: true,
      durationDays: 45,
      dailyStorageCostPerKg: 0.006,
      projectedGainPerKg: 2.4,
      netBenefitPerKg: 2.13,
      advice: 'Dry silo storage is highly cost-effective; monthly storage cost is under ₹0.20/kg while expected price rise is ₹2.40/kg.',
      adviceHi: 'साइलो भंडारण बहुत किफायती है; मासिक खर्च ₹0.20/किग्रा से कम है जबकि अनुमानित मूल्य वृद्धि ₹2.40/किग्रा है।'
    },
    mandis: [
      { name: 'Azadpur Mandi', location: 'Delhi', distanceKm: 42, modalPrice: 25.9, transportCostPerKg: 0.9, netReturnPerKg: 25.0, dailyArrivalTonnes: 920, isBest: true },
      { name: 'Hapur Mandi', location: 'Hapur, UP', distanceKm: 34, modalPrice: 25.2, transportCostPerKg: 0.6, netReturnPerKg: 24.6, dailyArrivalTonnes: 650, isBest: false },
      { name: 'Karnal Grain Market', location: 'Karnal, HR', distanceKm: 98, modalPrice: 25.5, transportCostPerKg: 1.4, netReturnPerKg: 24.1, dailyArrivalTonnes: 1200, isBest: false },
      { name: 'Meerut Wholesale Mandi', location: 'Meerut, UP', distanceKm: 58, modalPrice: 24.6, transportCostPerKg: 0.8, netReturnPerKg: 23.8, dailyArrivalTonnes: 480, isBest: false }
    ]
  },
  {
    id: 'tomato',
    name: 'Tomato',
    nameHi: 'टमाटर',
    category: 'vegetables',
    emoji: '🍅',
    season: 'All-Season',
    seasonHi: 'वर्षभर उपलब्ध',
    currentModalPrice: 32.5,
    mspPrice: 16.0, // Benchmark floor price
    priceMin: 28.0,
    priceMax: 44.0,
    trend: 'Increasing',
    trendPct: 21.5,
    totalRegionalDemandKg: 185000,
    totalMarketArrivalsKg: 128000,
    confidencePct: 91,
    statusText: 'Acute Shortage in NCR Wholesale Belts',
    statusTextHi: 'एनसीआर थोक मंडियों में भारी कमी और उच्च मांग',
    optimalHarvestWindow: 'Harvest mature greens now; sell red-ripe in next 3-7 days',
    optimalHarvestWindowHi: 'परिपक्व हरे टमाटर अभी तोड़ें; लाल-पके अगले 3-7 दिनों में बेचें',
    drivers: [
      'Heavy late monsoon in Nashik and Kolar disrupted south-to-north freight routes',
      'Local Western UP polyhouse yields at 65% capacity due to high humidity',
      'QSR burger chains & HoReCa institutional buyers bidding aggressively',
      'Direct FarmDirect AI buyers offering ₹3.50/kg above local commission agents'
    ],
    driversHi: [
      'नासिक व कोलार में भारी वर्षा से दक्षिण-से-उत्तर माल ढुलाई बाधित',
      'उच्च आर्द्रता के कारण पश्चिमी यूपी पॉलीहाउस उत्पादन 65% पर',
      'होटल, रेस्तरां और बर्गर श्रृंखलाओं की आक्रामक खरीद',
      'फार्मडायरेक्ट पर खरीदार स्थानीय आढ़तियों से ₹3.50/किग्रा अधिक दे रहे हैं'
    ],
    recommendation: 'Pre-cool in local solar micro-cold rooms for 5-8 days to target weekend wholesale demand peaks when prices hit ₹38-42/kg.',
    recommendationHi: 'सोलर माइक्रो-कोल्ड रूम में 5-8 दिन प्री-कूलिंग करें और सप्ताहांत में जब भाव ₹38-42/किग्रा पहुंचे तब बेचें।',
    coldStorage: {
      viable: true,
      durationDays: 10,
      dailyStorageCostPerKg: 0.35,
      projectedGainPerKg: 8.5,
      netBenefitPerKg: 5.0,
      advice: 'Storing Grade A tomatoes in solar cold room (8°C-12°C) prevents post-harvest rot and nets +₹5.00/kg clear profit after power and room fees.',
      adviceHi: 'सोलर कोल्ड रूम (8°C-12°C) में ग्रेड A टमाटर रखने से सड़न रुकती है और खर्च काटकर ₹5.00/किग्रा शुद्ध लाभ होता है।'
    },
    mandis: [
      { name: 'Azadpur Mandi', location: 'Delhi', distanceKm: 38, modalPrice: 37.0, transportCostPerKg: 1.4, netReturnPerKg: 35.6, dailyArrivalTonnes: 410, isBest: true },
      { name: 'Sahibabad Vegetable Mandi', location: 'Ghaziabad, UP', distanceKm: 14, modalPrice: 33.5, transportCostPerKg: 0.5, netReturnPerKg: 33.0, dailyArrivalTonnes: 260, isBest: false },
      { name: 'Meerut Partapur Mandi', location: 'Meerut, UP', distanceKm: 54, modalPrice: 31.0, transportCostPerKg: 1.1, netReturnPerKg: 29.9, dailyArrivalTonnes: 190, isBest: false },
      { name: 'Agra Sikandra Mandi', location: 'Agra, UP', distanceKm: 175, modalPrice: 29.0, transportCostPerKg: 2.8, netReturnPerKg: 26.2, dailyArrivalTonnes: 320, isBest: false }
    ]
  },
  {
    id: 'potato',
    name: 'Potato',
    nameHi: 'आलू',
    category: 'vegetables',
    emoji: '🥔',
    season: 'Rabi',
    seasonHi: 'रबी सीजन',
    currentModalPrice: 21.0,
    mspPrice: 12.5,
    priceMin: 19.0,
    priceMax: 24.5,
    trend: 'Stable',
    trendPct: 3.2,
    totalRegionalDemandKg: 380000,
    totalMarketArrivalsKg: 360000,
    confidencePct: 95,
    statusText: 'Balanced Market with Solid Processing Demand',
    statusTextHi: 'संतुलित बाजार व चिप्स प्रसंस्करण की मजबूत मांग',
    optimalHarvestWindow: 'Staggered release from cold store across next 60 days',
    optimalHarvestWindowHi: 'अगले 60 दिनों में कोल्ड स्टोर से चरणबद्ध निकासी करें',
    drivers: [
      'Agra, Aligarh, and Meerut cold storage out-turn running at normal capacity',
      'Snack and chip manufacturers maintaining fixed contract take-offs at ₹22-24/kg',
      'Export inquiries picking up from Bangladesh and Nepal via East corridor',
      'Medium-sized tubers (45-55mm) commanding premium over oversized lots'
    ],
    driversHi: [
      'आगरा, अलीगढ़ और मेरठ कोल्ड स्टोरेज से सामान्य गति से निकासी',
      'चिप्स निर्माताओं के ₹22-24/किग्रा पर स्थिर खरीद अनुबंध',
      'पूर्वी कॉरिडोर से बांग्लादेश और नेपाल के लिए निर्यात मांग',
      'मध्यम आकार (45-55mm) के आलू पर बड़े आलू से अधिक प्रीमियम'
    ],
    recommendation: 'Market is stable. Avoid dumping full truckloads at once; split sales into 25-30% weekly tranches to maintain price defense.',
    recommendationHi: 'बाजार स्थिर है। एक साथ पूरा माल न बेचें; भाव सुरक्षित रखने के लिए हर हफ्ते 25-30% माल चरणबद्ध रूप से निकालें।',
    coldStorage: {
      viable: true,
      durationDays: 60,
      dailyStorageCostPerKg: 0.03,
      projectedGainPerKg: 3.5,
      netBenefitPerKg: 1.7,
      advice: 'Traditional cold storage cost is amortized; gradual liquidation till mid-November captures festive snack demand.',
      adviceHi: 'कोल्ड स्टोरेज खर्च कम है; नवंबर मध्य तक धीरे-धीरे बेचने से त्योहारी मांग का पूरा फायदा मिलेगा।'
    },
    mandis: [
      { name: 'Azadpur Mandi', location: 'Delhi', distanceKm: 44, modalPrice: 23.5, transportCostPerKg: 1.0, netReturnPerKg: 22.5, dailyArrivalTonnes: 1450, isBest: true },
      { name: 'Sahibabad Mandi', location: 'Ghaziabad, UP', distanceKm: 18, modalPrice: 21.8, transportCostPerKg: 0.5, netReturnPerKg: 21.3, dailyArrivalTonnes: 820, isBest: false },
      { name: 'Meerut Mandi', location: 'Meerut, UP', distanceKm: 56, modalPrice: 20.5, transportCostPerKg: 0.9, netReturnPerKg: 19.6, dailyArrivalTonnes: 680, isBest: false },
      { name: 'Agra Khandari Mandi', location: 'Agra, UP', distanceKm: 165, modalPrice: 19.8, transportCostPerKg: 2.2, netReturnPerKg: 17.6, dailyArrivalTonnes: 2100, isBest: false }
    ]
  },
  {
    id: 'onion',
    name: 'Onion',
    nameHi: 'प्याज',
    category: 'vegetables',
    emoji: '🧅',
    season: 'Kharif',
    seasonHi: 'खरीफ व रबी भंडारण',
    currentModalPrice: 28.5,
    mspPrice: 18.0,
    priceMin: 24.0,
    priceMax: 33.0,
    trend: 'Decreasing',
    trendPct: -7.8,
    totalRegionalDemandKg: 220000,
    totalMarketArrivalsKg: 255000,
    confidencePct: 92,
    statusText: 'Surplus Inflow — Prices Cooling Down',
    statusTextHi: 'आवक में बढ़ोतरी — थोक कीमतों में नरमी',
    optimalHarvestWindow: 'Sell Grade B stock immediately; grade and sort before dispatch',
    optimalHarvestWindowHi: 'ग्रेड B माल तुरंत बेचें; प्रेषण से पहले छंटाई व ग्रेडिंग अवश्य करें',
    drivers: [
      'Early Kharif arrivals from Karnataka and Maharashtra entering north Indian markets',
      'NAFED and NCCF releasing buffer stock through retail subsidized vans',
      'Moisture levels in transit onions causing 6-8% sorting losses in wholesale yards',
      'Well-cured dry red onions retaining ₹4/kg premium over semi-cured lots'
    ],
    driversHi: [
      'कर्नाटक और महाराष्ट्र से नई खरीफ आवक उत्तर भारतीय मंडियों में शुरू',
      'नेफेड और एनसीसीएफ द्वारा बफर स्टॉक से सस्ती बिक्री जारी',
      'रास्ते में नमी के कारण थोक मंडियों में 6-8% छंटाई का नुकसान',
      'अच्छी तरह सुखाया गया लाल प्याज नम प्याज से ₹4/किग्रा महंगा'
    ],
    recommendation: 'Do not hold moist stock. Grade thoroughly to remove sprouted bulbs and sell via FarmDirect AI direct-to-retail buyers to bypass 7% commission fees.',
    recommendationHi: 'नम प्याज बिल्कुल न रोकें। अंकुरित प्याज हटाकर फार्मडायरेक्ट खरीदारों को सीधे बेचें ताकि आढ़त और दलाली बचे।',
    coldStorage: {
      viable: false,
      durationDays: 14,
      dailyStorageCostPerKg: 0.38,
      projectedGainPerKg: 1.2,
      netBenefitPerKg: -4.12,
      advice: 'Refrigerated cold storage not advised for onions due to sprouting risks; use naturally ventilated raised sheds instead.',
      adviceHi: 'प्याज के लिए सामान्य कोल्ड स्टोरेज ठीक नहीं है क्योंकि अंकुरण हो सकता है; हवादार शेड का प्रयोग करें।'
    },
    mandis: [
      { name: 'Azadpur Mandi', location: 'Delhi', distanceKm: 40, modalPrice: 30.5, transportCostPerKg: 1.1, netReturnPerKg: 29.4, dailyArrivalTonnes: 790, isBest: true },
      { name: 'Sahibabad Mandi', location: 'Ghaziabad, UP', distanceKm: 16, modalPrice: 28.5, transportCostPerKg: 0.6, netReturnPerKg: 27.9, dailyArrivalTonnes: 440, isBest: false },
      { name: 'Sonipat Mandi', location: 'Sonipat, HR', distanceKm: 62, modalPrice: 28.0, transportCostPerKg: 1.2, netReturnPerKg: 26.8, dailyArrivalTonnes: 310, isBest: false },
      { name: 'Meerut Mandi', location: 'Meerut, UP', distanceKm: 52, modalPrice: 27.2, transportCostPerKg: 0.9, netReturnPerKg: 26.3, dailyArrivalTonnes: 280, isBest: false }
    ]
  },
  {
    id: 'rice',
    name: 'Rice (Basmati & Non-Basmati)',
    nameHi: 'चावल (बासमती व परमल)',
    category: 'grains',
    emoji: '🍚',
    season: 'Kharif',
    seasonHi: 'खरीफ सीजन',
    currentModalPrice: 42.0,
    mspPrice: 23.0,
    priceMin: 36.0,
    priceMax: 82.0, // Basmati premium
    trend: 'Increasing',
    trendPct: 12.6,
    totalRegionalDemandKg: 290000,
    totalMarketArrivalsKg: 215000,
    confidencePct: 93,
    statusText: 'Strong Export & Processing Demand',
    statusTextHi: 'निर्यात और मिलर्स की मजबूत खरीद मांग',
    optimalHarvestWindow: 'Peak harvest demand window now through next 4 weeks',
    optimalHarvestWindowHi: 'अगले 4 सप्ताह तक चरम खरीद मांग रहेगी',
    drivers: [
      'Government lifted export floor price (MEP) on Basmati, spurring exporter buying',
      'Pusa 1121 and 1509 paddy arriving with excellent grain elongation quality',
      'Domestic urban supermarket chains booking 3-month rolling inventory',
      'Milling yields testing above 68% head rice recovery'
    ],
    driversHi: [
      'सरकार द्वारा बासमती पर न्यूनतम निर्यात मूल्य हटाने से निर्यातकों की सक्रियता',
      'पूसा 1121 और 1509 धान की उत्कृष्ट दाना गुणवत्ता और चमक',
      'शहरी सुपरमार्केट चेन 3 महीने का एडवांस स्टॉक बुक कर रही हैं',
      'राइस मिलों में 68% से अधिक हेड राइस रिकवरी आ रही है'
    ],
    recommendation: 'Target export aggregation hubs in Karnal and Panipat for Basmati varieties; local non-basmati yields best net return in Hapur.',
    recommendationHi: 'बासमती के लिए करनाल और पानीपत निर्यात हब पर माल भेजें; परमल और मोटे धान के लिए हापुड़ सर्वश्रेष्ठ है।',
    coldStorage: {
      viable: true,
      durationDays: 90,
      dailyStorageCostPerKg: 0.008,
      projectedGainPerKg: 5.5,
      netBenefitPerKg: 4.78,
      advice: 'Aged rice commands up to 15% price premium in commercial retail pack segments.',
      adviceHi: 'पुराना चावल खुदरा बाजार में 15% तक अधिक दाम पर बिकता है।'
    },
    mandis: [
      { name: 'Karnal Grain Market', location: 'Karnal, HR', distanceKm: 95, modalPrice: 46.5, transportCostPerKg: 1.5, netReturnPerKg: 45.0, dailyArrivalTonnes: 1850, isBest: true },
      { name: 'Panipat Mandi', location: 'Panipat, HR', distanceKm: 76, modalPrice: 44.5, transportCostPerKg: 1.2, netReturnPerKg: 43.3, dailyArrivalTonnes: 1100, isBest: false },
      { name: 'Narela Mandi', location: 'Delhi', distanceKm: 52, modalPrice: 43.0, transportCostPerKg: 1.1, netReturnPerKg: 41.9, dailyArrivalTonnes: 850, isBest: false },
      { name: 'Hapur Mandi', location: 'Hapur, UP', distanceKm: 32, modalPrice: 40.5, transportCostPerKg: 0.6, netReturnPerKg: 39.9, dailyArrivalTonnes: 620, isBest: false }
    ]
  },
  {
    id: 'cauliflower',
    name: 'Cauliflower',
    nameHi: 'फूलगोभी',
    category: 'vegetables',
    emoji: '🥦',
    season: 'Rabi',
    seasonHi: 'शीतकालीन रबी',
    currentModalPrice: 26.0,
    mspPrice: 14.0,
    priceMin: 22.0,
    priceMax: 35.0,
    trend: 'Increasing',
    trendPct: 15.2,
    totalRegionalDemandKg: 95000,
    totalMarketArrivalsKg: 72000,
    confidencePct: 90,
    statusText: 'High Restaurant & Wedding Season Demand',
    statusTextHi: 'होटल, कैटरिंग व शादी सीजन की भारी मांग',
    optimalHarvestWindow: 'Cut early morning; pack in ventilated crates for same-day delivery',
    optimalHarvestWindowHi: 'सुबह जल्दी कटाई करें; जालीदार क्रेट में पैक कर उसी दिन भेजें',
    drivers: [
      'Early winter crop fetches first-arrival premium before bulk arrivals in Nov',
      'Catering companies booking bulk 500-1000 kg daily lots for banquet halls',
      'White curd heads with tight florets achieving 100% price realization'
    ],
    driversHi: [
      'शुरुआती सर्दियों की गोभी को पहली आवक का प्रीमियम मूल्य मिल रहा है',
      'कैटरिंग कंपनियां बैंक्वेट हॉलों के लिए रोजाना 500-1000 किग्रा थोक लॉट बुक कर रही हैं',
      'सफेद और गठीले फूल पर पूरा 100% भाव मिल रहा है'
    ],
    recommendation: 'Sell immediately after dawn cutting; direct dispatch to Azadpur or Sahibabad nets ₹4-6/kg over local village collectors.',
    recommendationHi: 'सुबह कटाई के तुरंत बाद सीधे साहिबाबाद या आजादपुर भेजें, गांव के बिचौलियों से ₹4-6/किग्रा अधिक मिलेगा।',
    coldStorage: {
      viable: false,
      durationDays: 4,
      dailyStorageCostPerKg: 0.32,
      projectedGainPerKg: 1.0,
      netBenefitPerKg: -0.28,
      advice: 'Highly perishable; storage causes curd yellowing. Direct EV transit is recommended.',
      adviceHi: 'जल्दी खराब होने वाली फसल है; रखने पर पीलापन आ जाता है। सीधे ईवी वाहन से तुरंत भेजें।'
    },
    mandis: [
      { name: 'Azadpur Mandi', location: 'Delhi', distanceKm: 38, modalPrice: 29.5, transportCostPerKg: 1.2, netReturnPerKg: 28.3, dailyArrivalTonnes: 180, isBest: true },
      { name: 'Sahibabad Mandi', location: 'Ghaziabad, UP', distanceKm: 15, modalPrice: 27.0, transportCostPerKg: 0.5, netReturnPerKg: 26.5, dailyArrivalTonnes: 120, isBest: false },
      { name: 'Meerut Mandi', location: 'Meerut, UP', distanceKm: 52, modalPrice: 24.5, transportCostPerKg: 0.9, netReturnPerKg: 23.6, dailyArrivalTonnes: 90, isBest: false }
    ]
  },
  {
    id: 'cabbage',
    name: 'Cabbage',
    nameHi: 'पत्तागोभी',
    category: 'vegetables',
    emoji: '🥬',
    season: 'Rabi',
    seasonHi: 'रबी सीजन',
    currentModalPrice: 18.0,
    mspPrice: 10.0,
    priceMin: 15.0,
    priceMax: 23.0,
    trend: 'Stable',
    trendPct: 2.5,
    totalRegionalDemandKg: 78000,
    totalMarketArrivalsKg: 76000,
    confidencePct: 92,
    statusText: 'Steady Demand with Moderate Supply',
    statusTextHi: 'स्थिर मांग और संतुलित आपूर्ति',
    optimalHarvestWindow: 'Weekly staggered cutting as heads firm up',
    optimalHarvestWindowHi: 'जैसे-जैसे गट्टे सख्त हों, साप्ताहिक अंतराल पर कटाई करें',
    drivers: [
      'Street food and Chinese fast food processing hubs in Delhi NCR maintain steady uptake',
      'Longer field holding capacity (7-10 days) allows farmers to time dispatch',
      'Solid heads without loose wrapper leaves attract fast wholesale clearance'
    ],
    driversHi: [
      'दिल्ली एनसीआर में फास्ट फूड और स्ट्रीट फूड स्टॉल्स से लगातार उठाव',
      'खेत में 7-10 दिन रुकने की क्षमता से किसान भाव देखकर काट सकते हैं',
      'ठोस और कसे हुए गट्टों की थोक मंडियों में तुरंत बिक्री'
    ],
    recommendation: 'Bundle in 40 kg mesh bags; deliver to Ghaziabad or Sonipat wholesale yards.',
    recommendationHi: '40 किग्रा जालीदार बोरों में पैक करें; गाजियाबाद या सोनीपत थोक यार्ड में भेजें।',
    coldStorage: {
      viable: false,
      durationDays: 7,
      dailyStorageCostPerKg: 0.28,
      projectedGainPerKg: 1.5,
      netBenefitPerKg: -0.46,
      advice: 'Holding in field is free; mechanical cold storage is not financially needed.',
      adviceHi: 'खेत में खड़ा रखना मुफ्त है; कोल्ड स्टोर में रखने की कोई जरूरत नहीं है।'
    },
    mandis: [
      { name: 'Sahibabad Mandi', location: 'Ghaziabad, UP', distanceKm: 15, modalPrice: 19.5, transportCostPerKg: 0.5, netReturnPerKg: 19.0, dailyArrivalTonnes: 140, isBest: true },
      { name: 'Azadpur Mandi', location: 'Delhi', distanceKm: 40, modalPrice: 20.0, transportCostPerKg: 1.1, netReturnPerKg: 18.9, dailyArrivalTonnes: 210, isBest: false },
      { name: 'Meerut Mandi', location: 'Meerut, UP', distanceKm: 50, modalPrice: 17.5, transportCostPerKg: 0.9, netReturnPerKg: 16.6, dailyArrivalTonnes: 95, isBest: false }
    ]
  },
  {
    id: 'carrot',
    name: 'Carrot (Red & Orange)',
    nameHi: 'गाजर (लाल व ऑरेंज)',
    category: 'vegetables',
    emoji: '🥕',
    season: 'Rabi',
    seasonHi: 'रबी सीजन',
    currentModalPrice: 34.0,
    mspPrice: 15.0,
    priceMin: 28.0,
    priceMax: 42.0,
    trend: 'Increasing',
    trendPct: 14.8,
    totalRegionalDemandKg: 110000,
    totalMarketArrivalsKg: 82000,
    confidencePct: 91,
    statusText: 'High Demand for Juice and Sweet Halwa Season',
    statusTextHi: 'जूस व हलवा सीजन के लिए भारी मांग',
    optimalHarvestWindow: 'Wash and sort thoroughly before morning dispatch',
    optimalHarvestWindowHi: 'सुबह भेजने से पहले अच्छी तरह धुलाई और छंटाई करें',
    drivers: [
      'Early winter red carrot brings high sugar Brix scores favored for Gajar Halwa',
      'Fresh juice parlors and institutional canteens running daily procurement contracts',
      'Mechanically washed and graded carrots fetch +₹5.00/kg over muddy field lots'
    ],
    driversHi: [
      'सर्दियों की पहली लाल गाजर में मिठास अधिक होने से हलवाई बाजार में भारी मांग',
      'ताजा जूस कॉर्नर और संस्थानिक कैंटीनों के दैनिक खरीद अनुबंध',
      'मशीन से धुली और छंटी गाजर पर मैली गाजर से ₹5.00/किग्रा अधिक दाम'
    ],
    recommendation: 'Invest ₹0.50/kg in automated tuber washing; nets ₹4.00-6.00/kg higher auction price at Azadpur gate.',
    recommendationHi: 'गाजर धुलाई पर 50 पैसे प्रति किलो खर्च करें; आजादपुर गेट पर ₹4 से ₹6 अधिक नीलामी भाव मिलेगा।',
    coldStorage: {
      viable: true,
      durationDays: 15,
      dailyStorageCostPerKg: 0.30,
      projectedGainPerKg: 7.0,
      netBenefitPerKg: 2.5,
      advice: 'Washed and pre-cooled carrots maintain crisp turgidity in cold storage (1°C-4°C).',
      adviceHi: 'धुली गाजर को 1°C-4°C कोल्ड स्टोर में रखने से ताजगी और कड़ापन बना रहता है।'
    },
    mandis: [
      { name: 'Azadpur Mandi', location: 'Delhi', distanceKm: 42, modalPrice: 37.5, transportCostPerKg: 1.2, netReturnPerKg: 36.3, dailyArrivalTonnes: 260, isBest: true },
      { name: 'Sahibabad Mandi', location: 'Ghaziabad, UP', distanceKm: 16, modalPrice: 34.0, transportCostPerKg: 0.5, netReturnPerKg: 33.5, dailyArrivalTonnes: 150, isBest: false },
      { name: 'Meerut Mandi', location: 'Meerut, UP', distanceKm: 54, modalPrice: 31.5, transportCostPerKg: 1.0, netReturnPerKg: 30.5, dailyArrivalTonnes: 110, isBest: false }
    ]
  },
  {
    id: 'peas',
    name: 'Green Peas (Matar)',
    nameHi: 'हरी मटर',
    category: 'vegetables',
    emoji: '🫛',
    season: 'Rabi',
    seasonHi: 'शीतकालीन रबी',
    currentModalPrice: 48.0,
    mspPrice: 20.0,
    priceMin: 38.0,
    priceMax: 68.0,
    trend: 'Increasing',
    trendPct: 24.5,
    totalRegionalDemandKg: 125000,
    totalMarketArrivalsKg: 84000,
    confidencePct: 93,
    statusText: 'Early Season Scarcity — Peak Premium Prices',
    statusTextHi: 'शुरुआती सीजन में कमी — उच्चतम प्रीमियम भाव',
    optimalHarvestWindow: 'Harvest immediately at pod plumpness; sell same day',
    optimalHarvestWindowHi: 'फलियां भरते ही तुरंत तोड़ें और उसी दिन बाजार में बेचें',
    drivers: [
      'Himachal hill crop winding down while plains harvest is only 15% underway',
      'Frozen food processors (Safal, ITC, Mother Dairy) actively booking early batches',
      'Sweet pods with 8-10 grains per pod capturing ₹10/kg premium'
    ],
    driversHi: [
      'हिमाचल की मटर समाप्त हो रही है और मैदानी इलाकों की आवक केवल 15% शुरू हुई है',
      'सफल, आईटीसी और मदर डेयरी जैसे फ्रोजन प्रोसेसर शुरुआती खेप बुक कर रहे हैं',
      '8-10 दानों वाली मीठी फलियों पर ₹10/किग्रा अतिरिक्त प्रीमियम'
    ],
    recommendation: 'Early harvesting before main Punjab/UP supply surge hits in late November guarantees maximum financial realization.',
    recommendationHi: 'नवंबर अंत में पंजाब/यूपी की भारी आवक से पहले जल्दी कटाई करने पर सबसे ज्यादा मुनाफा मिलेगा।',
    coldStorage: {
      viable: false,
      durationDays: 5,
      dailyStorageCostPerKg: 0.40,
      projectedGainPerKg: 3.0,
      netBenefitPerKg: 1.0,
      advice: 'Pods lose sugar fast; dispatch immediately in refrigerated reefer EV rather than stationary storage.',
      adviceHi: 'मटर की मिठास तेजी से कम होती है; स्टोरेज में रखने की बजाय सीधे रेफ्रिजरेटेड ईवी वैन से भेजें।'
    },
    mandis: [
      { name: 'Azadpur Mandi', location: 'Delhi', distanceKm: 42, modalPrice: 54.0, transportCostPerKg: 1.3, netReturnPerKg: 52.7, dailyArrivalTonnes: 190, isBest: true },
      { name: 'Sahibabad Mandi', location: 'Ghaziabad, UP', distanceKm: 16, modalPrice: 49.0, transportCostPerKg: 0.6, netReturnPerKg: 48.4, dailyArrivalTonnes: 110, isBest: false },
      { name: 'Sonipat Mandi', location: 'Sonipat, HR', distanceKm: 60, modalPrice: 46.5, transportCostPerKg: 1.1, netReturnPerKg: 45.4, dailyArrivalTonnes: 85, isBest: false }
    ]
  },
  {
    id: 'mustard',
    name: 'Mustard Seed (Sarson)',
    nameHi: 'सरसों (राई व लाहा)',
    category: 'pulses',
    emoji: '🌱',
    season: 'Rabi',
    seasonHi: 'रबी सीजन',
    currentModalPrice: 58.5,
    mspPrice: 56.5,
    priceMin: 55.0,
    priceMax: 64.0,
    trend: 'Increasing',
    trendPct: 8.2,
    totalRegionalDemandKg: 160000,
    totalMarketArrivalsKg: 135000,
    confidencePct: 94,
    statusText: 'Firm Crushing Demand from Edible Oil Mills',
    statusTextHi: 'खाद्य तेल मिलों से मजबूत पेराई मांग',
    optimalHarvestWindow: 'Sun-dry to 8% moisture before packaging in jute sacks',
    optimalHarvestWindowHi: 'जूट के बोरों में पैक करने से पहले धूप में 8% नमी तक सुखाएं',
    drivers: [
      'Import duties on crude palm and sunflower oils raised, boosting domestic mustard oil',
      'Oil mills running at 85% processing capacity across Alwar, Bharatpur, and Mathura',
      'High oil content (>40%) lots earning ₹120-150/quintal lab bonus'
    ],
    driversHi: [
      'पाम और सूरजमुखी तेल पर आयात शुल्क बढ़ने से देशी सरसों तेल की मांग बढ़ी',
      'अलवर, भरतपुर और मथुरा में तेल मिलें 85% क्षमता पर चल रही हैं',
      '40% से अधिक तेल अंश वाली सरसों पर ₹120-150 प्रति क्विंटल बोनस'
    ],
    recommendation: 'Test oil content at FPO lab before dispatch; sell directly to millers via FarmDirect AI to secure full oil-percentage bonus.',
    recommendationHi: 'एफपीओ लैब में तेल प्रतिशत की जांच कराएं; पूरा लैब बोनस पाने के लिए फार्मडायरेक्ट पर सीधे तेल मिलों को बेचें।',
    coldStorage: {
      viable: true,
      durationDays: 120,
      dailyStorageCostPerKg: 0.005,
      projectedGainPerKg: 4.5,
      netBenefitPerKg: 3.9,
      advice: 'Oilseeds store extremely well in dry hermetic silos for up to 6 months with zero deterioration.',
      adviceHi: 'तिलहन हर्मेटिक साइलो में 6 महीने तक बिना किसी खराबी के सुरक्षित रहता है।'
    },
    mandis: [
      { name: 'Hapur Mandi', location: 'Hapur, UP', distanceKm: 35, modalPrice: 60.5, transportCostPerKg: 0.7, netReturnPerKg: 59.8, dailyArrivalTonnes: 450, isBest: true },
      { name: 'Kharari Mandi, Agra', location: 'Agra, UP', distanceKm: 160, modalPrice: 61.0, transportCostPerKg: 2.1, netReturnPerKg: 58.9, dailyArrivalTonnes: 780, isBest: false },
      { name: 'Meerut Mandi', location: 'Meerut, UP', distanceKm: 55, modalPrice: 58.0, transportCostPerKg: 0.9, netReturnPerKg: 57.1, dailyArrivalTonnes: 320, isBest: false }
    ]
  },
  {
    id: 'garlic',
    name: 'Garlic (Lahsun)',
    nameHi: 'लहसुन',
    category: 'vegetables',
    emoji: '🧄',
    season: 'Rabi',
    seasonHi: 'रबी सीजन',
    currentModalPrice: 148.0,
    mspPrice: 60.0,
    priceMin: 125.0,
    priceMax: 185.0,
    trend: 'Increasing',
    trendPct: 26.8,
    totalRegionalDemandKg: 62000,
    totalMarketArrivalsKg: 41000,
    confidencePct: 91,
    statusText: 'Severe National Deficit — Historical High Margins',
    statusTextHi: 'राष्ट्रीय स्तर पर कमी — ऐतिहासिक उच्च मुनाफा',
    optimalHarvestWindow: 'Cure roots and stems completely; grade into Big/Medium/Small cloves',
    optimalHarvestWindowHi: 'जड़ें और डंठल सुखाएं; मोटे, मध्यम और छोटे कंदों में ग्रेडिंग करें',
    drivers: [
      'Madhya Pradesh and Rajasthan acreage reduction in previous season created structural shortage',
      'Food processing and pickle factories competing with domestic household demand',
      'Grade A (40mm+ diameter) selling above ₹170/kg at Azadpur'
    ],
    driversHi: [
      'मध्य प्रदेश और राजस्थान में पिछले साल बुवाई घटने से देश भर में भारी कमी',
      'अचार और मसाला कंपनियां घरेलू बाजार से प्रतिस्पर्धा कर रही हैं',
      '40mm से बड़े आकार का लहसुन आजादपुर में ₹170/किग्रा से ऊपर बिक रहा है'
    ],
    recommendation: 'Sort into Grade A (Jumbo) and Grade B; do not mix sizes. Jumbo lots command a massive ₹35/kg premium over mixed bags.',
    recommendationHi: 'जंबो और छोटे लहसुन को अलग-अलग बोरों में पैक करें। जंबो लहसुन पर ₹35/किग्रा अधिक दाम मिलता है।',
    coldStorage: {
      viable: true,
      durationDays: 45,
      dailyStorageCostPerKg: 0.05,
      projectedGainPerKg: 22.0,
      netBenefitPerKg: 19.75,
      advice: 'Properly dried garlic stored in cool ventilated rooms yields tremendous arbitrage in high-price years.',
      adviceHi: 'अच्छी तरह सुखाया लहसुन हवादार शेड में रखने पर बहुत बड़ा मुनाफा देता है।'
    },
    mandis: [
      { name: 'Azadpur Mandi', location: 'Delhi', distanceKm: 40, modalPrice: 158.0, transportCostPerKg: 1.2, netReturnPerKg: 156.8, dailyArrivalTonnes: 95, isBest: true },
      { name: 'Sahibabad Mandi', location: 'Ghaziabad, UP', distanceKm: 15, modalPrice: 150.0, transportCostPerKg: 0.5, netReturnPerKg: 149.5, dailyArrivalTonnes: 60, isBest: false },
      { name: 'Meerut Mandi', location: 'Meerut, UP', distanceKm: 52, modalPrice: 144.0, transportCostPerKg: 0.9, netReturnPerKg: 143.1, dailyArrivalTonnes: 45, isBest: false }
    ]
  },
  {
    id: 'mango',
    name: 'Mango (Chausa / Dussehri)',
    nameHi: 'आम (चौसा / दशहरी)',
    category: 'fruits',
    emoji: '🥭',
    season: 'Zaid',
    seasonHi: 'ग्रीष्मकालीन जायद',
    currentModalPrice: 65.0,
    mspPrice: 35.0,
    priceMin: 50.0,
    priceMax: 90.0,
    trend: 'Stable',
    trendPct: 1.2,
    totalRegionalDemandKg: 55000,
    totalMarketArrivalsKg: 52000,
    confidencePct: 89,
    statusText: 'Late Season Premium Varietal Demand',
    statusTextHi: 'देर से पकने वाली किस्मों की प्रीमियम मांग',
    optimalHarvestWindow: 'Pluck with 1-inch stem at mature green stage; hot water treatment',
    optimalHarvestWindowHi: '1 इंच डंठल के साथ तोड़ें; गर्म पानी से उपचार कर ग्रेडिंग करें',
    drivers: [
      'Late Chausa crop from Saharanpur and Malihabad commanding sweet dessert premium',
      'Modern retail supermarket fruit sections requiring carton-packed cushioned fruit',
      'Pulp processors fulfilling seasonal canning contracts'
    ],
    driversHi: [
      'सहारनपुर और मलिहाबाद के देर से पकने वाले चौसा आम की भारी मांग',
      'सुपरमार्केट फल काउंटरों को फोम-नेट व कार्टन में पैक आम की आवश्यकता',
      'पल्प और जूस कंपनियां सीजन का बचा अनुबंध पूरा कर रही हैं'
    ],
    recommendation: 'Cushion packaging in 5 kg corrugated boxes increases gross value by 22% over open wooden crate bulk auction.',
    recommendationHi: '5 किग्रा के कोरूगेटेड बॉक्स में फोम लगाकर बेचने से लकड़ी की पेटी से 22% अधिक भाव मिलता है।',
    coldStorage: {
      viable: true,
      durationDays: 14,
      dailyStorageCostPerKg: 0.38,
      projectedGainPerKg: 12.0,
      netBenefitPerKg: 6.68,
      advice: 'CA storage or 12°C chilling chamber delays ripening evenly without chilling injury.',
      adviceHi: '12°C चिलिंग चैंबर में रखने से आम बिना दाग-धब्बे के एक समान रूप से पकता है।'
    },
    mandis: [
      { name: 'Azadpur Mandi', location: 'Delhi', distanceKm: 42, modalPrice: 72.0, transportCostPerKg: 1.5, netReturnPerKg: 70.5, dailyArrivalTonnes: 140, isBest: true },
      { name: 'Sahibabad Mandi', location: 'Ghaziabad, UP', distanceKm: 16, modalPrice: 66.0, transportCostPerKg: 0.6, netReturnPerKg: 65.4, dailyArrivalTonnes: 85, isBest: false },
      { name: 'Meerut Mandi', location: 'Meerut, UP', distanceKm: 55, modalPrice: 62.0, transportCostPerKg: 1.0, netReturnPerKg: 61.0, dailyArrivalTonnes: 60, isBest: false }
    ]
  }
];

export interface ComprehensiveDemandForecast {
  crop: CropInfo;
  timeframe: ForecastTimeframe;
  region: ForecastRegion;
  regionLabel: string;
  predictedDemandKg: number;
  expectedArrivalsKg: number;
  marketDeficitSurplusKg: number;
  forecastPeriod: string;
  forecastPeriodHi: string;
  trend: 'Increasing' | 'Stable' | 'Decreasing';
  trendPct: number;
  currentModalPrice: number;
  mspPrice: number | null;
  projectedPriceAvg: number;
  projectedPriceMin: number;
  projectedPriceMax: number;
  confidencePct: number;
  statusText: string;
  statusTextHi: string;
  recommendation: string;
  recommendationHi: string;
  harvestWindow: string;
  harvestWindowHi: string;
  drivers: string[];
  driversHi: string[];
  coldStorage: CropInfo['coldStorage'];
  mandis: CropInfo['mandis'];
  chartData: ForecastDataPoint[];
  matchingBuyerRequests: BuyerRequirement[];
}

export function generateDemandForecast(
  cropQuery: string = 'wheat',
  timeframe: ForecastTimeframe = '30d',
  region: ForecastRegion = 'ncr'
): ComprehensiveDemandForecast {
  const query = cropQuery.toLowerCase().trim();
  
  // Find matching crop or fallback to first
  const crop =
    SUPPORTED_CROPS.find((c) =>
      c.id.toLowerCase() === query ||
      c.name.toLowerCase().includes(query) ||
      c.nameHi.includes(query)
    ) ||
    SUPPORTED_CROPS.find((c) => query.includes(c.id.toLowerCase())) ||
    SUPPORTED_CROPS[0];

  const regionNames: Record<ForecastRegion, { en: string; hi: string }> = {
    ncr: { en: 'Delhi NCR & Western UP', hi: 'दिल्ली एनसीआर व पश्चिमी यूपी' },
    delhi: { en: 'Delhi NCT & Azadpur Belt', hi: 'दिल्ली एनसीटी व आजादपुर क्षेत्र' },
    western_up: { en: 'Western UP (Meerut, Hapur, Ghaziabad)', hi: 'पश्चिमी यूपी (मेरठ, हापुड़, गाजियाबाद)' },
    haryana: { en: 'Haryana GT Road (Sonipat, Karnal, Panipat)', hi: 'हरियाणा जीटी रोड (सोनीपत, करनाल, पानीपत)' },
    agra: { en: 'Agra & Braj Agricultural Belt', hi: 'आगरा व ब्रज कृषि क्षेत्र' },
  };

  // Generate chart data points based on timeframe
  const chartData: ForecastDataPoint[] = [];
  const baseDemand = crop.totalRegionalDemandKg;
  const baseArrival = crop.totalMarketArrivalsKg;
  const basePrice = crop.currentModalPrice;
  const trendMultiplier = crop.trend === 'Increasing' ? 1.05 : crop.trend === 'Decreasing' ? 0.95 : 1.01;

  if (timeframe === '7d') {
    const days = ['Day 1 (Today)', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
    days.forEach((day, idx) => {
      const dayFactor = 1 + (idx * (crop.trendPct / 100)) / 7 + (Math.sin(idx * 1.5) * 0.03);
      const demand = Math.round((baseDemand / 30) * dayFactor * 1.1);
      const arrival = Math.round((baseArrival / 30) * (1 + (idx * 0.01)));
      const price = Math.round(basePrice * (crop.trend === 'Increasing' ? 1 + (idx * 0.02) : crop.trend === 'Decreasing' ? 1 - (idx * 0.015) : 1) * 10) / 10;
      chartData.push({
        period: `D${idx + 1}`,
        periodLabel: day,
        demandKg: demand,
        arrivalKg: arrival,
        projectedPrice: price,
        priceMin: Math.round((price * 0.93) * 10) / 10,
        priceMax: Math.round((price * 1.08) * 10) / 10,
        msp: crop.mspPrice ?? undefined,
        deficitKg: demand - arrival,
      });
    });
  } else if (timeframe === '30d') {
    const weeks = [
      { id: 'W1', label: 'Week 1 (Oct 1 - Oct 7)' },
      { id: 'W2', label: 'Week 2 (Oct 8 - Oct 14)' },
      { id: 'W3', label: 'Week 3 (Oct 15 - Oct 21)' },
      { id: 'W4', label: 'Week 4 (Oct 22 - Oct 28)' },
    ];
    weeks.forEach((w, idx) => {
      const mult = Math.pow(trendMultiplier, idx);
      const demand = Math.round((baseDemand / 4) * mult);
      const arrival = Math.round((baseArrival / 4) * (1 + (idx * (crop.trend === 'Increasing' ? 0.02 : 0.05))));
      const price = Math.round(basePrice * (1 + ((idx * crop.trendPct) / 100) * 0.5) * 10) / 10;
      chartData.push({
        period: w.id,
        periodLabel: w.label,
        demandKg: demand,
        arrivalKg: arrival,
        projectedPrice: price,
        priceMin: Math.round((price * 0.91) * 10) / 10,
        priceMax: Math.round((price * 1.11) * 10) / 10,
        msp: crop.mspPrice ?? undefined,
        deficitKg: demand - arrival,
      });
    });
  } else {
    // 90d (3 Months)
    const months = [
      { id: 'M1', label: 'Month 1 (October)' },
      { id: 'M2', label: 'Month 2 (November)' },
      { id: 'M3', label: 'Month 3 (December)' },
    ];
    months.forEach((m, idx) => {
      const mult = Math.pow(trendMultiplier, idx * 2.2);
      const demand = Math.round(baseDemand * mult);
      const arrival = Math.round(baseArrival * (1 + (idx * 0.08)));
      const price = Math.round(basePrice * (1 + ((idx * crop.trendPct) / 100) * 0.9) * 10) / 10;
      chartData.push({
        period: m.id,
        periodLabel: m.label,
        demandKg: demand,
        arrivalKg: arrival,
        projectedPrice: price,
        priceMin: Math.round((price * 0.88) * 10) / 10,
        priceMax: Math.round((price * 1.15) * 10) / 10,
        msp: crop.mspPrice ?? undefined,
        deficitKg: demand - arrival,
      });
    });
  }

  // Calculate aggregated metrics
  const totalDemand = chartData.reduce((acc, c) => acc + c.demandKg, 0);
  const totalArrivals = chartData.reduce((acc, c) => acc + c.arrivalKg, 0);
  const avgPrice = Math.round((chartData.reduce((acc, c) => acc + c.projectedPrice, 0) / chartData.length) * 10) / 10;
  const minPrice = Math.min(...chartData.map((c) => c.priceMin));
  const maxPrice = Math.max(...chartData.map((c) => c.priceMax));

  // Find matching buyer requirements from mockData
  const matchingBuyers = mockBuyerRequirements.filter((r) =>
    r.produceName.toLowerCase().includes(crop.id) ||
    crop.name.toLowerCase().includes(r.produceName.toLowerCase()) ||
    r.category === crop.category
  );

  const forecastPeriodText = timeframe === '7d' ? 'Next 7 Days (Spot Horizon)' : timeframe === '30d' ? 'Next 30 Days (Harvest Plan)' : 'Next 90 Days (Seasonal Outlook)';
  const forecastPeriodTextHi = timeframe === '7d' ? 'अगले 7 दिन (दैनिक हाजिर भाव)' : timeframe === '30d' ? 'अगले 30 दिन (कटाई व बिक्री योजना)' : 'अगले 90 दिन (मौसमी परिदृश्य)';

  return {
    crop,
    timeframe,
    region,
    regionLabel: regionNames[region].en,
    predictedDemandKg: totalDemand,
    expectedArrivalsKg: totalArrivals,
    marketDeficitSurplusKg: totalDemand - totalArrivals,
    forecastPeriod: forecastPeriodText,
    forecastPeriodHi: forecastPeriodTextHi,
    trend: crop.trend,
    trendPct: crop.trendPct,
    currentModalPrice: crop.currentModalPrice,
    mspPrice: crop.mspPrice,
    projectedPriceAvg: avgPrice,
    projectedPriceMin: minPrice,
    projectedPriceMax: maxPrice,
    confidencePct: crop.confidencePct,
    statusText: crop.statusText,
    statusTextHi: crop.statusTextHi,
    recommendation: crop.recommendation,
    recommendationHi: crop.recommendationHi,
    harvestWindow: crop.optimalHarvestWindow,
    harvestWindowHi: crop.optimalHarvestWindowHi,
    drivers: crop.drivers,
    driversHi: crop.driversHi,
    coldStorage: crop.coldStorage,
    mandis: crop.mandis,
    chartData,
    matchingBuyerRequests: matchingBuyers.length > 0 ? matchingBuyers : mockBuyerRequirements.slice(0, 3),
  };
}

export function calculateFarmerProfitSimulation(
  crop: CropInfo,
  harvestVolumeKg: number,
  grade: 'Grade A' | 'Grade B' | 'Organic Premium' = 'Grade A',
  sellStrategy: 'immediate' | 'cold_storage' | 'split' = 'immediate'
) {
  const gradeMultiplier = grade === 'Organic Premium' ? 1.25 : grade === 'Grade A' ? 1.0 : 0.88;
  const baseRate = crop.currentModalPrice * gradeMultiplier;

  // Immediate APMC middleman benchmark (usually 18% lower due to commission + grading cut)
  const apmcBenchmarkRate = baseRate * 0.82;
  const apmcGrossIncome = Math.round(harvestVolumeKg * apmcBenchmarkRate);

  // Best Mandi
  const bestMandi = crop.mandis.find((m) => m.isBest) || crop.mandis[0];
  const mandiRate = bestMandi.netReturnPerKg * gradeMultiplier;

  // FarmDirect Direct Buyer Rate (Direct buyer cuts out commission, paying +12% over spot mandi)
  const farmDirectRate = Math.round((baseRate * 1.12) * 10) / 10;
  const farmDirectGross = Math.round(harvestVolumeKg * farmDirectRate);

  // Cold storage strategy
  let storageCost = 0;
  let finalRate = farmDirectRate;
  if (sellStrategy === 'cold_storage' && crop.coldStorage.viable) {
    storageCost = Math.round(harvestVolumeKg * crop.coldStorage.dailyStorageCostPerKg * crop.coldStorage.durationDays);
    finalRate = farmDirectRate + crop.coldStorage.projectedGainPerKg;
  } else if (sellStrategy === 'split') {
    const storedKg = harvestVolumeKg * 0.5;
    storageCost = Math.round(storedKg * crop.coldStorage.dailyStorageCostPerKg * crop.coldStorage.durationDays);
    finalRate = (farmDirectRate + (farmDirectRate + crop.coldStorage.projectedGainPerKg)) / 2;
  }

  const projectedTotalRevenue = Math.round(harvestVolumeKg * finalRate);
  const netEarnings = projectedTotalRevenue - storageCost;
  const extraOverMandi = netEarnings - apmcGrossIncome;
  const extraPct = Math.round((extraOverMandi / apmcGrossIncome) * 100);

  return {
    harvestVolumeKg,
    grade,
    sellStrategy,
    apmcGrossIncome,
    mandiRate,
    farmDirectRate,
    projectedTotalRevenue,
    storageCost,
    netEarnings,
    extraOverMandi,
    extraPct,
    bestMandiName: bestMandi.name,
  };
}
