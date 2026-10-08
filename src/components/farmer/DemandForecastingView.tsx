import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import {
  SUPPORTED_CROPS,
  ComprehensiveDemandForecast,
  CropInfo,
  ForecastTimeframe,
  ForecastRegion,
  generateDemandForecast,
  calculateFarmerProfitSimulation,
} from '../../data/demandForecastData';
import { fetchDemandForecast, DemandForecastResult } from '../../services/aiService';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  BarChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Calendar,
  MapPin,
  Sparkles,
  ArrowRight,
  Warehouse,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Layers,
  Scale,
  RefreshCw,
  Search,
  Filter,
  Users,
  ShieldCheck,
  ChevronRight,
  Info,
  Truck,
  PlusCircle,
  HelpCircle,
  Clock,
} from 'lucide-react';

interface DemandForecastingViewProps {
  initialCrop?: string;
  isStandalone?: boolean;
}

export const DemandForecastingView: React.FC<DemandForecastingViewProps> = ({
  initialCrop = 'wheat',
  isStandalone = false,
}) => {
  const { language, role } = useDemo();
  const navigate = useNavigate();

  // Selected filters
  const [selectedCropId, setSelectedCropId] = useState<string>(initialCrop.toLowerCase());
  const [timeframe, setTimeframe] = useState<ForecastTimeframe>('30d');
  const [region, setRegion] = useState<ForecastRegion>('ncr');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'vegetables' | 'grains' | 'fruits' | 'pulses'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Forecast Data & Loading
  const [forecast, setForecast] = useState<ComprehensiveDemandForecast>(() =>
    generateDemandForecast(initialCrop, '30d', 'ncr')
  );
  const [isLoading, setIsLoading] = useState(false);

  // Active Chart Mode: 'demand-supply' | 'price-corridor' | 'net-gap'
  const [chartMode, setChartMode] = useState<'demand-supply' | 'price-corridor' | 'net-gap'>('demand-supply');
  const [viewTable, setViewTable] = useState(false);

  // Simulation Calculator State
  const [calcQuantityKg, setCalcQuantityKg] = useState<number>(2500);
  const [calcGrade, setCalcGrade] = useState<'Grade A' | 'Grade B' | 'Organic Premium'>('Grade A');
  const [calcStrategy, setCalcStrategy] = useState<'immediate' | 'cold_storage' | 'split'>('immediate');

  // Load forecast when crop/timeframe/region changes
  useEffect(() => {
    let active = true;
    setIsLoading(true);

    const loadData = async () => {
      try {
        // Try backend API first via aiService
        const res: DemandForecastResult = await fetchDemandForecast(selectedCropId, timeframe, region);
        if (!active) return;

        // Merge with local comprehensive model for guaranteed full data richness
        const local = generateDemandForecast(selectedCropId, timeframe, region);
        setForecast({
          ...local,
          predictedDemandKg: res.predictedDemandKg || local.predictedDemandKg,
          expectedArrivalsKg: res.expectedArrivalsKg || local.expectedArrivalsKg,
          marketDeficitSurplusKg: (res.predictedDemandKg || local.predictedDemandKg) - (res.expectedArrivalsKg || local.expectedArrivalsKg),
          forecastPeriod: res.forecastPeriod || local.forecastPeriod,
          trend: res.trend || local.trend,
          trendPct: res.trendPct !== undefined ? res.trendPct : local.trendPct,
          currentModalPrice: res.currentModalPrice || local.currentModalPrice,
          mspPrice: res.mspPrice !== undefined ? res.mspPrice : local.mspPrice,
          projectedPriceAvg: res.projectedPriceAvg || local.projectedPriceAvg,
          projectedPriceMin: res.projectedPriceMin || local.projectedPriceMin,
          projectedPriceMax: res.projectedPriceMax || local.projectedPriceMax,
          recommendation: res.recommendation || local.recommendation,
          mandis: res.mandis && res.mandis.length > 0 ? (res.mandis as any) : local.mandis,
          chartData: local.chartData, // High-fidelity timeline data points
        });
      } catch (err) {
        if (active) {
          setForecast(generateDemandForecast(selectedCropId, timeframe, region));
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [selectedCropId, timeframe, region]);

  // Filter crops list for selector
  const filteredCrops = useMemo(() => {
    return SUPPORTED_CROPS.filter((crop) => {
      const matchesCat = categoryFilter === 'all' || crop.category === categoryFilter;
      const matchesQuery =
        !searchQuery.trim() ||
        crop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        crop.nameHi.includes(searchQuery);
      return matchesCat && matchesQuery;
    });
  }, [categoryFilter, searchQuery]);

  // Active crop metadata
  const currentCrop = forecast.crop;

  // Real-time calculation results
  const simulation = useMemo(() => {
    return calculateFarmerProfitSimulation(currentCrop, calcQuantityKg, calcGrade, calcStrategy);
  }, [currentCrop, calcQuantityKg, calcGrade, calcStrategy]);

  // Handle navigate to list produce pre-filled
  const handleListProducePrefilled = () => {
    navigate(`/farmer?tab=add-produce&product=${encodeURIComponent(currentCrop.name)}&price=${simulation.farmDirectRate}&quantity=${calcQuantityKg}`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ================= 1. HEADER & CONTROLS ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                <BarChart3 size={18} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                {language === 'hi' ? 'एआई मांग व मूल्य पूर्वानुमान' : 'AI Demand & Price Intelligence'}
              </span>
              <Badge variant="purple" size="sm" icon={<Sparkles size={11} />}>
                Live APMC + AI Models
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {language === 'hi'
                ? `${currentCrop.nameHi} मांग पूर्वानुमान व बाजार विश्लेषण`
                : `${currentCrop.name} Demand Forecasting & Price Outlook`}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {language === 'hi'
                ? 'मंडी आवक, खरीदार अग्रिम मांग और मौसमी रुझानों के आधार पर वास्तविक अनुमान'
                : 'Empowering growers with predictive arrival volumes, modal price trajectories, and mandi arbitrage.'}
            </p>
          </div>

          {/* Timeframe & Region Switchers */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Horizon Pills */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
              {(
                [
                  { id: '7d', label: '7 Days', labelHi: '7 दिन' },
                  { id: '30d', label: '30 Days', labelHi: '30 दिन' },
                  { id: '90d', label: '90 Days', labelHi: '90 दिन' },
                ] as const
              ).map((h) => (
                <button
                  key={h.id}
                  onClick={() => setTimeframe(h.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    timeframe === h.id
                      ? 'bg-white text-purple-700 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {language === 'hi' ? h.labelHi : h.label}
                </button>
              ))}
            </div>

            {/* Region Selector */}
            <div className="relative">
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as ForecastRegion)}
                className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 outline-none hover:border-purple-300 transition-colors shadow-xs"
              >
                <option value="ncr">Delhi NCR & Western UP</option>
                <option value="delhi">Delhi NCT / Azadpur Belt</option>
                <option value="western_up">Western UP (Meerut / Hapur)</option>
                <option value="haryana">Haryana (GT Road Corridor)</option>
                <option value="agra">Agra & Braj Zone</option>
              </select>
            </div>

            {/* Re-sync Button */}
            <button
              onClick={() => {
                setIsLoading(true);
                setTimeout(() => setIsLoading(false), 500);
              }}
              disabled={isLoading}
              title="Refresh Forecast Data"
              className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin text-purple-600' : ''} />
            </button>
          </div>
        </div>

        {/* Crop Selection Bar with Quick Chips & Category Filter */}
        <div className="pt-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {language === 'hi' ? 'फसल चुनें:' : 'Select Produce / Crop:'}
            </span>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
              {(
                [
                  { id: 'all', label: 'All Crops', labelHi: 'सभी फसलें' },
                  { id: 'vegetables', label: 'Vegetables', labelHi: 'सब्जियां' },
                  { id: 'grains', label: 'Grains & Cereals', labelHi: 'अनाज' },
                  { id: 'fruits', label: 'Fruits', labelHi: 'फल' },
                  { id: 'pulses', label: 'Oilseeds & Pulses', labelHi: 'दलहन व तिलहन' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                    categoryFilter === cat.id
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {language === 'hi' ? cat.labelHi : cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Crop Chips */}
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
            {filteredCrops.map((c) => {
              const isSelected = selectedCropId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCropId(c.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 ${
                    isSelected
                      ? 'bg-purple-50 text-purple-800 border-purple-300 shadow-xs scale-102 ring-2 ring-purple-500/20'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <span className="text-base">{c.emoji}</span>
                  <span>{language === 'hi' ? c.nameHi : c.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-black ${
                      c.trend === 'Increasing'
                        ? 'bg-emerald-100 text-emerald-700'
                        : c.trend === 'Decreasing'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {c.trend === 'Increasing' ? `+${c.trendPct}%` : c.trend === 'Decreasing' ? `${c.trendPct}%` : 'Stable'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================= 2. HERO KPI CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Predicted Regional Demand */}
        <Card className="p-4 bg-white border-slate-200 hover:border-purple-300 transition-colors shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{language === 'hi' ? 'अनुमानित कुल मांग' : 'Projected Regional Demand'}</span>
            <span className="p-1 rounded-md bg-purple-50 text-purple-600">
              <BarChart3 size={14} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {forecast.predictedDemandKg >= 1000
                ? `${(forecast.predictedDemandKg / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} MT`
                : `${forecast.predictedDemandKg.toLocaleString()} kg`}
            </span>
            <Badge
              variant={forecast.trend === 'Increasing' ? 'emerald' : forecast.trend === 'Decreasing' ? 'rose' : 'slate'}
              size="sm"
            >
              {forecast.trend === 'Increasing' ? `+${forecast.trendPct}%` : `${forecast.trendPct}%`}
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <Clock size={11} className="text-purple-500" />
            <span>{forecast.forecastPeriod}</span>
          </p>
        </Card>

        {/* KPI 2: Expected Modal Price vs MSP */}
        <Card className="p-4 bg-white border-slate-200 hover:border-purple-300 transition-colors shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{language === 'hi' ? 'अनुमानित थोक भाव' : 'Expected Modal Price'}</span>
            <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
              <IndianRupee size={14} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              ₹{forecast.projectedPriceAvg}
              <span className="text-xs font-bold text-slate-500">/kg</span>
            </span>
            <span className="text-[11px] text-slate-500">
              (₹{forecast.projectedPriceMin} - ₹{forecast.projectedPriceMax})
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {forecast.mspPrice ? (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                <CheckCircle2 size={11} /> Govt MSP: ₹{forecast.mspPrice}/kg (+{Math.round(((forecast.projectedPriceAvg - forecast.mspPrice) / forecast.mspPrice) * 100)}% above)
              </span>
            ) : (
              <span className="text-slate-500">Floor Benchmark: ₹{forecast.currentModalPrice * 0.75}/kg</span>
            )}
          </p>
        </Card>

        {/* KPI 3: Supply-Demand Balance */}
        <Card className="p-4 bg-white border-slate-200 hover:border-purple-300 transition-colors shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{language === 'hi' ? 'बाजार संतुलन स्थिति' : 'Market Supply Balance'}</span>
            <span className="p-1 rounded-md bg-amber-50 text-amber-600">
              <Scale size={14} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-base sm:text-lg font-black truncate ${
              forecast.marketDeficitSurplusKg > 0 ? 'text-amber-600' : 'text-slate-800'
            }`}>
              {forecast.marketDeficitSurplusKg > 0
                ? `${language === 'hi' ? 'मांग घाटा' : 'Supply Deficit'} (${Math.abs(Math.round(forecast.marketDeficitSurplusKg / 1000))} MT)`
                : `${language === 'hi' ? 'अधिशेष आवक' : 'Surplus Supply'}`}
            </span>
          </div>
          {/* Progress bar comparing arrivals vs demand */}
          <div className="mt-2 space-y-1">
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-purple-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((forecast.expectedArrivalsKg / forecast.predictedDemandKg) * 100))}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-medium">
              <span>Arrivals: {(forecast.expectedArrivalsKg / 1000).toFixed(0)} MT</span>
              <span>Demand: {(forecast.predictedDemandKg / 1000).toFixed(0)} MT</span>
            </div>
          </div>
        </Card>

        {/* KPI 4: AI Model Confidence */}
        <Card className="p-4 bg-white border-slate-200 hover:border-purple-300 transition-colors shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>{language === 'hi' ? 'पूर्वानुमान सटीकता स्कोर' : 'Forecast Confidence'}</span>
            <span className="p-1 rounded-md bg-blue-50 text-blue-600">
              <ShieldCheck size={14} />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-blue-600 tracking-tight">
              {forecast.confidencePct}%
            </span>
            <Badge variant="blue" size="sm">
              High Accuracy
            </Badge>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 truncate">
            {language === 'hi' ? 'मंडी गेट डेटा व 500+ खरीदारों से सत्यापित' : 'Validated against APMC gates & 500+ pre-orders'}
          </p>
        </Card>
      </div>

      {/* ================= 3. INTERACTIVE CHART SECTION ================= */}
      <Card className="p-5 bg-white border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <TrendingUp size={16} className="text-purple-600" />
              {language === 'hi'
                ? `${currentCrop.nameHi} - समयबद्ध रुझान एवं पूर्वानुमान चार्ट`
                : `${currentCrop.name} Time-Series Projection & Forecast Corridor`}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'hi'
                ? `${forecast.forecastPeriodHi} • क्षेत्र: ${forecast.regionLabel}`
                : `${forecast.forecastPeriod} • Region: ${forecast.regionLabel}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Chart Mode Buttons */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200 text-xs">
              <button
                onClick={() => setChartMode('demand-supply')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  chartMode === 'demand-supply'
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {language === 'hi' ? 'मांग vs आवक' : 'Demand vs Supply'}
              </button>
              <button
                onClick={() => setChartMode('price-corridor')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  chartMode === 'price-corridor'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {language === 'hi' ? 'भाव कॉरिडोर (₹/kg)' : 'Price Corridor (₹/kg)'}
              </button>
              <button
                onClick={() => setChartMode('net-gap')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  chartMode === 'net-gap'
                    ? 'bg-white text-amber-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {language === 'hi' ? 'घाटा/अधिशेष गैप' : 'Net Market Gap'}
              </button>
            </div>

            {/* Toggle Table View */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewTable(!viewTable)}
              className="text-xs"
            >
              {viewTable ? 'Show Chart' : 'Table View'}
            </Button>
          </div>
        </div>

        {/* Chart View or Table View */}
        {!viewTable ? (
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === 'demand-supply' ? (
                <ComposedChart data={forecast.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="periodLabel" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    stroke="#cbd5e1"
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(val: any, name: string) => [
                      `${Number(val).toLocaleString()} kg`,
                      name === 'demandKg' ? 'Buyer Demand' : 'Market Arrivals'
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  <Bar dataKey="demandKg" name="Buyer Demand (kg)" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={28} />
                  <Bar dataKey="arrivalKg" name="Market Arrivals (kg)" fill="#94a3b8" radius={[6, 6, 0, 0]} barSize={28} />
                </ComposedChart>
              ) : chartMode === 'price-corridor' ? (
                <LineChart data={forecast.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="periodLabel" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    stroke="#cbd5e1"
                    domain={['auto', 'auto']}
                    tickFormatter={(val) => `₹${val}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(val: any, name: string) => [`₹${val}/kg`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
                  {forecast.mspPrice && (
                    <ReferenceLine
                      y={forecast.mspPrice}
                      label={{ value: `MSP: ₹${forecast.mspPrice}`, fill: '#059669', fontSize: 11, position: 'top' }}
                      stroke="#059669"
                      strokeDasharray="4 4"
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="projectedPrice"
                    name="Expected Price (₹/kg)"
                    stroke="#059669"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#059669' }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="priceMax"
                    name="Bullish Ceiling (₹/kg)"
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="priceMin"
                    name="Bearish Floor (₹/kg)"
                    stroke="#f59e0b"
                    strokeDasharray="3 3"
                    strokeWidth={1.5}
                    dot={false}
                  />
                </LineChart>
              ) : (
                <BarChart data={forecast.chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="periodLabel" tick={{ fontSize: 11, fill: '#64748b' }} stroke="#cbd5e1" />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    stroke="#cbd5e1"
                    tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', borderColor: '#e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(val: any) => [`${Number(val).toLocaleString()} kg`, 'Net Unmet Demand (Deficit)']}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" />
                  <Bar
                    dataKey="deficitKg"
                    name="Net Deficit (Positive = Shortage/Price Rise)"
                    fill="#f59e0b"
                    radius={[6, 6, 0, 0]}
                    barSize={32}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Period</th>
                  <th className="py-2.5 px-3">Buyer Demand</th>
                  <th className="py-2.5 px-3">Expected Arrivals</th>
                  <th className="py-2.5 px-3">Deficit / Surplus</th>
                  <th className="py-2.5 px-3">Modal Price</th>
                  <th className="py-2.5 px-3">Price Range</th>
                  {forecast.mspPrice && <th className="py-2.5 px-3">MSP Benchmark</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {forecast.chartData.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-slate-900">{d.periodLabel}</td>
                    <td className="py-2.5 px-3 text-purple-700 font-bold">{d.demandKg.toLocaleString()} kg</td>
                    <td className="py-2.5 px-3 text-slate-600">{d.arrivalKg.toLocaleString()} kg</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          d.deficitKg > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {d.deficitKg > 0 ? `+${d.deficitKg.toLocaleString()} kg shortage` : `${d.deficitKg.toLocaleString()} kg surplus`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-emerald-700">₹{d.projectedPrice}/kg</td>
                    <td className="py-2.5 px-3 text-slate-500">₹{d.priceMin} - ₹{d.priceMax}</td>
                    {forecast.mspPrice && <td className="py-2.5 px-3 text-slate-500">₹{forecast.mspPrice}/kg</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ================= 4. TWO COLUMNS: REGIONAL MANDI ARBITRAGE & STRATEGIC AI ADVISORY ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Regional Mandi Arbitrage Matrix */}
        <Card className="p-5 bg-white border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <MapPin size={16} className="text-emerald-600" />
                {language === 'hi' ? 'क्षेत्रीय मंडी तुलना व शुद्ध मुनाफा' : 'Regional Mandi Net-Profit Arbitrage'}
              </h3>
              <Badge variant="emerald" size="sm">
                Transport Adjusted
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              {language === 'hi'
                ? 'परिवहन व लोडिंग खर्च काटकर किस मंडी में आपको अधिकतम शुद्ध भुगतान मिलेगा:'
                : 'Comparing modal rates across wholesale hubs after deducting local transport & handling costs:'}
            </p>

            <div className="space-y-3">
              {forecast.mandis.map((m, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    m.isBest
                      ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{m.name}</span>
                        <span className="text-[11px] text-slate-500">({m.location})</span>
                        {m.isBest && (
                          <Badge variant="emerald" size="sm">
                            ⭐ Highest Net Return
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Truck size={11} /> {m.distanceKm} km away
                        </span>
                        <span>Transport: ₹{m.transportCostPerKg}/kg</span>
                        <span>Daily Inflow: {m.dailyArrivalTonnes} MT</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-400">Net Farmer Rate</div>
                      <div className="text-base sm:text-lg font-black text-emerald-700">
                        ₹{m.netReturnPerKg}
                        <span className="text-[10px] font-normal text-slate-500">/kg</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Mandi Price: ₹{m.modalPrice}/kg</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Tip: Book EV Logistics directly to save up to ₹0.40/kg in transport.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/consumer/logistics')}
              className="text-xs"
            >
              Book EV Transit
            </Button>
          </div>
        </Card>

        {/* Right: AI Strategic Advisory & Action Plan */}
        <Card className="p-5 bg-gradient-to-br from-purple-500/5 via-white to-purple-500/10 border-purple-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Sparkles size={16} className="text-purple-600" />
                {language === 'hi' ? 'एआई रणनीतिक परामर्श व कटाई योजना' : 'AI Strategic Advisory & Harvest Plan'}
              </h3>
              <Badge variant="purple" size="sm">
                Personalized
              </Badge>
            </div>

            {/* Harvest Window Box */}
            <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-xs mb-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900 mb-1">
                <Calendar size={13} className="text-purple-600" />
                <span>{language === 'hi' ? 'सर्वोत्तम कटाई व बिक्री समय सीमा:' : 'Optimal Harvest & Dispatch Timing:'}</span>
              </div>
              <p className="text-xs font-semibold text-slate-800">
                {language === 'hi' ? forecast.harvestWindowHi : forecast.harvestWindow}
              </p>
            </div>

            {/* Core Recommendation */}
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 mb-3.5">
              <div className="text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>{language === 'hi' ? 'मुख्य अनुशंसा:' : 'Actionable Recommendation:'}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {language === 'hi' ? forecast.recommendationHi : forecast.recommendation}
              </p>
            </div>

            {/* Cold Chain Viability Analysis */}
            {forecast.coldStorage && (
              <div className={`p-3.5 rounded-xl border ${
                forecast.coldStorage.viable ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Warehouse size={13} className={forecast.coldStorage.viable ? 'text-emerald-600' : 'text-slate-500'} />
                    {language === 'hi' ? 'कोल्ड स्टोरेज व्यवहार्यता:' : 'Cold Storage Arbitrage:'}
                  </span>
                  <Badge variant={forecast.coldStorage.viable ? 'emerald' : 'slate'} size="sm">
                    {forecast.coldStorage.viable
                      ? `+₹${forecast.coldStorage.netBenefitPerKg}/kg Net Profit`
                      : 'Direct Sale Advised'}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600">
                  {language === 'hi' ? forecast.coldStorage.adviceHi : forecast.coldStorage.advice}
                </p>
              </div>
            )}

            {/* Key Drivers */}
            <div className="mt-3.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                {language === 'hi' ? 'मांग को प्रभावित करने वाले मुख्य कारक:' : 'Market Drivers & Pricing Factors:'}
              </span>
              <ul className="space-y-1">
                {(language === 'hi' ? forecast.driversHi : forecast.drivers).slice(0, 3).map((driver, i) => (
                  <li key={i} className="text-xs text-slate-600 flex items-start gap-1.5">
                    <span className="text-purple-500 shrink-0">•</span>
                    <span>{driver}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Need solar storage?</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/consumer/storage')}
              className="text-xs"
            >
              Find Nearby Cold Hub
            </Button>
          </div>
        </Card>
      </div>

      {/* ================= 5. WHAT-IF PROFIT SIMULATOR & CALCULATOR ================= */}
      <Card className="p-5 bg-white border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Scale size={16} className="text-purple-600" />
              {language === 'hi'
                ? 'किसान आय सिमुलेटर (मुनाफा गणना कैलकुलेटर)'
                : 'Interactive Harvest Revenue & Net-Profit Simulator'}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'hi'
                ? 'अपनी उपज मात्रा और रणनीति डालकर देखें कि बिचौलियों के मुकाबले फार्मडायरेक्ट पर कितना अधिक मिलेगा:'
                : 'Calculate your exact net payout and see how FarmDirect AI out-yields traditional APMC middlemen:'}
            </p>
          </div>
          <Badge variant="purple" size="sm">
            Live Interactive Model
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls: Left 6 columns */}
          <div className="lg:col-span-6 space-y-4">
            {/* Quantity Slider */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="font-bold text-slate-700">
                  {language === 'hi' ? 'उपज मात्रा (kg):' : 'Estimated Harvest Volume (kg):'}
                </span>
                <span className="font-black text-purple-700 text-sm">{calcQuantityKg.toLocaleString()} kg</span>
              </div>
              <input
                type="range"
                min="200"
                max="20000"
                step="100"
                value={calcQuantityKg}
                onChange={(e) => setCalcQuantityKg(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>200 kg (Mini)</span>
                <span>5,000 kg (Tempo)</span>
                <span>20,000 kg (Truckload)</span>
              </div>
            </div>

            {/* Grade Selection */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1.5">
                {language === 'hi' ? 'उपज ग्रेड / गुणवत्ता:' : 'Produce Quality Grade:'}
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'Grade A', label: 'Grade A', sub: 'Standard Premium', bonus: '+12%' },
                    { id: 'Grade B', label: 'Grade B', sub: 'Commercial Cut', bonus: '-12%' },
                    { id: 'Organic Premium', label: 'Organic', sub: 'Certified Residue-free', bonus: '+25%' },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => setCalcGrade(g.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      calcGrade === g.id
                        ? 'bg-purple-50 text-purple-900 border-purple-300 ring-2 ring-purple-500/20'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-bold">{g.label}</div>
                    <div className="text-[10px] text-slate-500">{g.sub}</div>
                    <div className="text-[10px] font-black text-emerald-600 mt-0.5">{g.bonus}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sales Strategy */}
            <div>
              <span className="text-xs font-bold text-slate-700 block mb-1.5">
                {language === 'hi' ? 'बिक्री रणनीति:' : 'Sales & Holding Strategy:'}
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {(
                  [
                    { id: 'immediate', label: 'Sell Immediately', labelHi: 'तुरंत बेचें' },
                    { id: 'cold_storage', label: 'Store in Cold Room', labelHi: 'कोल्ड स्टोरेज रखें' },
                    { id: 'split', label: '50% Split Strategy', labelHi: '50-50 विभाजन' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setCalcStrategy(st.id)}
                    className={`p-2 rounded-xl border text-center font-bold transition-all ${
                      calcStrategy === st.id
                        ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {language === 'hi' ? st.labelHi : st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results Comparison: Right 6 columns */}
          <div className="lg:col-span-6 bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                {language === 'hi' ? 'प्रक्षेपित आय व तुलना:' : 'Projected Payout & APMC Comparison:'}
              </div>

              <div className="space-y-3">
                {/* APMC Middleman Rate */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                  <div>
                    <span className="text-xs font-semibold text-slate-600">
                      Traditional APMC Mandi (After Commission & Grading cuts)
                    </span>
                    <div className="text-[11px] text-slate-400">Effective: ~₹{(simulation.apmcGrossIncome / calcQuantityKg).toFixed(1)}/kg</div>
                  </div>
                  <div className="text-sm font-bold text-slate-600">
                    ₹{simulation.apmcGrossIncome.toLocaleString()}
                  </div>
                </div>

                {/* FarmDirect AI Rate */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/80 border border-purple-200">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-purple-900">
                        FarmDirect AI Direct Buyer Contract
                      </span>
                      <Badge variant="purple" size="sm">
                        0% Commission
                      </Badge>
                    </div>
                    <div className="text-[11px] text-purple-700 font-medium">
                      Direct rate: ₹{simulation.farmDirectRate}/kg {simulation.storageCost > 0 ? `(Storage fee: -₹${simulation.storageCost})` : ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base sm:text-lg font-black text-purple-900">
                      ₹{simulation.netEarnings.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Extra Profit Highlight */}
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-emerald-500 text-white">
                      <TrendingUp size={16} />
                    </span>
                    <div>
                      <span className="text-xs font-black text-emerald-900 block">
                        {language === 'hi' ? 'अतिरिक्त किसान मुनाफा:' : 'Your Extra Net Profit:'}
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        {language === 'hi'
                          ? `पारंपरिक आढ़त से +${simulation.extraPct}% अधिक शुद्ध बचत`
                          : `+${simulation.extraPct}% more take-home vs village middleman`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg sm:text-xl font-black text-emerald-700">
                      +₹{simulation.extraOverMandi.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA: Pre-fill Produce Listing */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
              <Button
                variant="primary"
                onClick={handleListProducePrefilled}
                className="w-full text-xs font-bold flex items-center justify-center gap-2"
              >
                <PlusCircle size={15} />
                <span>
                  {language === 'hi'
                    ? `इस मूल्य (₹${simulation.farmDirectRate}/kg) पर उपज सूचीबद्ध करें`
                    : `List ${calcQuantityKg} kg at ₹${simulation.farmDirectRate}/kg`}
                </span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* ================= 6. LIVE MATCHING BUYER DEMANDS ================= */}
      <Card className="p-5 bg-white border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Users size={16} className="text-purple-600" />
              {language === 'hi'
                ? `सक्रिय खरीदार मांग (${currentCrop.nameHi} के लिए)`
                : `Active Buyer Requirements for ${currentCrop.name}`}
            </h3>
            <p className="text-xs text-slate-500">
              {language === 'hi'
                ? 'फार्मडायरेक्ट पर सत्यापित खरीदार जो इस समय यह उपज खरीदने को तैयार हैं:'
                : 'Verified retail, wholesale, and institutional buyers actively seeking this crop:'}
            </p>
          </div>
          <Badge variant="emerald" size="sm">
            {forecast.matchingBuyerRequests.length} Active Pre-orders
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {forecast.matchingBuyerRequests.map((req, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-purple-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                      {req.produceName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block truncate">
                        {req.produceName}
                      </span>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <MapPin size={10} /> {req.deliveryLocation?.city || 'Delhi NCR'}
                      </span>
                    </div>
                  </div>
                  <Badge variant="emerald" size="sm">
                    {req.status === 'open' ? 'Open' : 'Active'}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-slate-600 my-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Required Quantity:</span>
                    <span className="font-bold text-slate-800">{req.quantityKg.toLocaleString()} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Buyer Budget:</span>
                    <span className="font-bold text-emerald-700">₹{req.budgetPerKg}/kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Grade:</span>
                    <span className="font-medium text-slate-700">{req.grade || 'Grade A'}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Direct Contract</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/farmer/buyers')}
                  className="text-xs h-7 px-2.5"
                >
                  Connect
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
