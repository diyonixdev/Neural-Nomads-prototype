import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { mockFarmers, mockBuyerRequirements, mockBuyers } from '../data/mockData';
import type { Produce } from '../types';
import { ProductDetailsModal } from '../components/Marketplace/ProductDetailsModal';
import {
  getProduceImage,
  getFarmerForProduce,
  getPricing,
  getAvailabilityStatus,
  getFreshnessScore,
  getUniqueLocations,
  parseDisplayName,
  getAllProductsSync,
} from '../services/productService';
import { farmerInventoryService } from '../services/farmerInventoryService';
import {
  ShoppingBag,
  Tractor,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  MapPin,
  Package,
  IndianRupee,
  Mic,
  Store,
  Truck,
  Users,
  BarChart3,
  Wallet,
  Plus,
  Search,
  Filter,
  Eye,
  ShoppingCart,
  Leaf,
  Clock,
  Award,
  ChevronRight,
  Play,
  Zap,
  Globe,
  SlidersHorizontal,
  RotateCcw,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { setRole, role, language } = useDemo();
  const navigate = useNavigate();
  const [buyerFilter, setBuyerFilter] = useState<'all' | 'vegetables' | 'fruits' | 'grains'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [priceMin, setPriceMin] = useState<string>('');
  const [priceMax, setPriceMax] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recommended' | 'price-asc' | 'price-desc' | 'discount-desc' | 'freshness' | 'availability'>(
    'recommended'
  );
  const [selectedProduct, setSelectedProduct] = useState<Produce | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inventoryVersion, setInventoryVersion] = useState(0);

  // Listen for seller inventory updates — buyer marketplace reflects new lots instantly
  useEffect(() => {
    const unsub = farmerInventoryService.subscribe(() => setInventoryVersion((v) => v + 1));
    return unsub;
  }, []);

  const handleShopNow = () => {
    setRole('consumer');
    // Keep buyer marketplace immediately visible on homepage; scroll to it.
    // Also provide explicit navigation to full marketplace via header button.
    const el = document.getElementById('marketplace');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/consumer/matches');
    }
  };

  const handleStartSelling = () => {
    setRole('farmer');
    navigate('/farmer/voice');
  };

  const handleViewProduct = (produce: Produce) => {
    // Spec: open existing product details route if exists — ProductDetailsPage at /product/:id
    navigate(`/product/${produce.id}`);
  };

  const handleQuickView = (produce: Produce) => {
    // Quick preview modal (secondary) — keeps buyer browsing fast without navigation
    setSelectedProduct(produce);
    setIsModalOpen(true);
  };

  const handleBuyFromModal = (_produce: Produce) => {
    setRole('consumer');
    navigate('/consumer/order');
    setIsModalOpen(false);
  };

  const handleContactFarmer = (_produce: Produce) => {
    setRole('consumer');
    navigate('/consumer/call');
    setIsModalOpen(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const uniqueLocations = useMemo(() => getUniqueLocations(), [inventoryVersion]);

  // Marketplace data — isolated via productService (wraps mockData, ready to swap to /api/products)
  // UI imports only via service for product listings; see src/services/productService.ts
  // inventoryVersion ensures seller-added produce appears instantly without reload
  const buyerProducts = useMemo(() => {
    void inventoryVersion;
    let filtered = [...getAllProductsSync()];

    if (buyerFilter !== 'all') filtered = filtered.filter((p) => p.category === buyerFilter);

    if (locationFilter !== 'all') {
      filtered = filtered.filter((p) => {
        const farmer = getFarmerForProduce(p);
        const district = p.location.split(',').pop()?.trim().toLowerCase();
        const locMatch =
          p.location.toLowerCase().includes(locationFilter.toLowerCase()) ||
          p.state.toLowerCase() === locationFilter.toLowerCase() ||
          district === locationFilter.toLowerCase() ||
          farmer.district.toLowerCase() === locationFilter.toLowerCase() ||
          farmer.state.toLowerCase() === locationFilter.toLowerCase();
        return locMatch;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          getFarmerForProduce(p).name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }

    const min = priceMin ? Number(priceMin) : undefined;
    const max = priceMax ? Number(priceMax) : undefined;
    if (min !== undefined && !Number.isNaN(min)) {
      filtered = filtered.filter((p) => getPricing(p).sellingPrice >= min);
    }
    if (max !== undefined && !Number.isNaN(max)) {
      filtered = filtered.filter((p) => getPricing(p).sellingPrice <= max);
    }

    // Sorting
    if (sortBy === 'price-asc') {
      filtered.sort((a, b) => getPricing(a).sellingPrice - getPricing(b).sellingPrice);
    } else if (sortBy === 'price-desc') {
      filtered.sort((a, b) => getPricing(b).sellingPrice - getPricing(a).sellingPrice);
    } else if (sortBy === 'discount-desc') {
      filtered.sort((a, b) => getPricing(b).discountPercent - getPricing(a).discountPercent);
    } else if (sortBy === 'freshness') {
      filtered.sort((a, b) => getFreshnessScore(b) - getFreshnessScore(a));
    } else if (sortBy === 'availability') {
      filtered.sort((a, b) => b.quantityKg - a.quantityKg);
    }
    // recommended keeps original order (could be by relevance)

    return filtered;
  }, [buyerFilter, searchQuery, locationFilter, priceMin, priceMax, sortBy, inventoryVersion]);

  const buyerPreviewProducts = useMemo(() => buyerProducts.slice(0, 12), [buyerProducts]);

  const stats = useMemo(
    () => ({
      farmers: mockFarmers.length,
      buyers: mockBuyers.length,
      listings: getAllProductsSync().length,
      demand: mockBuyerRequirements.reduce((a, b) => a + b.quantityKg, 0),
    }),
    [inventoryVersion]
  );

  const hasActiveFilters =
    buyerFilter !== 'all' ||
    locationFilter !== 'all' ||
    searchQuery.trim() !== '' ||
    priceMin !== '' ||
    priceMax !== '' ||
    sortBy !== 'recommended';

  const clearFilters = () => {
    setBuyerFilter('all');
    setLocationFilter('all');
    setSearchQuery('');
    setPriceMin('');
    setPriceMax('');
    setSortBy('recommended');
  };

  const sellerFeatures = [
    {
      icon: Leaf,
      title: language === 'hi' ? 'मेरी उपज' : 'My Produce',
      desc: language === 'hi' ? 'आपकी सक्रिय उपज — ग्रेड, मात्रा, मूल्य' : 'All your active lots — grade, qty & price live',
      cta: language === 'hi' ? 'उपज देखें' : 'View Lots',
      to: '/farmer?tab=my-produce',
      color: 'emerald',
      accent: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    },
    {
      icon: Plus,
      title: language === 'hi' ? 'उत्पाद जोड़ें' : 'Add Produce',
      desc: language === 'hi' ? 'वॉयस से फसल लिस्ट करें - मात्रा, ग्रेड, मूल्य' : 'List harvest via voice — quantity, grade, price in seconds',
      cta: language === 'hi' ? 'लिस्ट करें' : 'Add Now',
      to: '/farmer?tab=add-produce',
      color: 'amber',
      accent: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    },
    {
      icon: Package,
      title: language === 'hi' ? 'इन्वेंटरी' : 'Inventory',
      desc: language === 'hi' ? 'स्टॉक, शेल्फ लाइफ और उपलब्धता ट्रैक करें' : 'Track stock, shelf-life & availability across lots',
      cta: language === 'hi' ? 'देखें' : 'Manage',
      to: '/farmer?tab=inventory',
      color: 'teal',
      accent: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
    },
    {
      icon: Users,
      title: language === 'hi' ? 'खरीदार अनुरोध' : 'Buyer Requests',
      desc: language === 'hi' ? '500+ सत्यापित खरीदार आपकी उपज खोज रहे हैं' : 'Verified buyers actively searching for your produce',
      cta: language === 'hi' ? 'खरीदार देखें' : 'View Requests',
      to: '/farmer/buyers',
      color: 'blue',
      accent: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
      badge: `${mockBuyerRequirements.length} active`,
    },
    {
      icon: Truck,
      title: language === 'hi' ? 'ऑर्डर' : 'Orders',
      desc: language === 'hi' ? 'पिकअप से डिलीवरी तक लाइव ट्रैकिंग' : 'Live tracking from farm pickup to buyer handover',
      cta: language === 'hi' ? 'ऑर्डर देखें' : 'View Orders',
      to: '/farmer/order',
      color: 'amber',
      accent: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    },
    {
      icon: Wallet,
      title: language === 'hi' ? 'कमाई' : 'Earnings',
      desc: language === 'hi' ? 'APMC से 47% अधिक, सीधा बैंक भुगतान' : '47% more than APMC, instant direct bank payout',
      cta: language === 'hi' ? 'कमाई देखें' : 'View Earnings',
      to: '/farmer?tab=earnings',
      color: 'emerald',
      accent: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
      highlight: '+47.3% vs mandi',
    },
    {
      icon: BarChart3,
      title: language === 'hi' ? 'मांग अंतर्दृष्टि' : 'Demand Insights',
      desc: language === 'hi' ? 'AI मांग पूर्वानुमान और मूल्य सुझाव' : 'AI demand forecast & price suggestion for next harvest',
      cta: language === 'hi' ? 'इनसाइट्स' : 'Insights',
      to: '/farmer?tab=demand',
      color: 'purple',
      accent: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    },
  ];

  return (
    <div className="w-full animate-in fade-in duration-500">
      {/* ================= HERO SECTION ================= */}
      <section className="relative overflow-hidden border-b border-slate-200">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50 to-emerald-50/60" />
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)] opacity-20" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
          {/* Top pill */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-6">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
              <Sparkles size={14} />
              FarmDirect AI • SIH 26033
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium">
              <ShieldCheck size={12} className="text-emerald-700" />
              Zero commission • FPO verified
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-500 text-xs">
              <Globe size={12} /> Hindi • Hinglish • English
            </span>
          </div>

          <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-10 items-center">
            {/* Left: Headline */}
            <div className="text-center lg:text-left">
              <h1 className="text-[32px] sm:text-5xl lg:text-[52px] font-black tracking-tight leading-[0.95] text-slate-900">
                The Direct
                <br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                  Farmer-to-Buyer
                </span>
                <br />
                Marketplace
              </h1>
              <p className="mt-4 sm:mt-5 text-[15px] sm:text-base text-slate-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                {language === 'hi'
                  ? 'बिचौलियों को हटाएं — खरीदार सीधे किसानों से ताज़ा उपज खोजते हैं, तुलना करते हैं और खरीदते हैं; किसान सीधे अपनी उपज लिस्ट करके बेहतर दाम पाते हैं।'
                  : 'Buyers discover fresh produce directly from farmers — compare prices, discounts & availability and purchase. Farmers list produce, manage inventory and sell direct without mandi cuts.'}
              </p>

              {/* Trust stats */}
              <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg mx-auto lg:mx-0">
                <div className="rounded-2xl bg-white border border-slate-200 p-3 text-center">
                  <p className="text-lg font-black text-emerald-700">{stats.farmers}+</p>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Verified Farmers</p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-3 text-center">
                  <p className="text-lg font-black text-teal-600">{stats.buyers}+</p>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Active Buyers</p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-3 text-center">
                  <p className="text-lg font-black text-amber-600">0%</p>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500">Commission</p>
                </div>
              </div>

              {/* Mobile stacked CTAs duplicate already in cards, but add helper text */}
              <div className="mt-6 flex flex-wrap items-center justify-center lg:justify-start gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-600" /> Voice AI in Hindi & English
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1.5">
                  <Truck size={14} className="text-emerald-700" /> EV cold-chain logistics
                </span>
              </div>
            </div>

            {/* Right: Two prominent CTA Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4 sm:gap-5 max-w-xl mx-auto lg:mx-0 w-full">
              {/* BUY PRODUCTS */}
              <div
                onClick={handleShopNow}
                className="group relative overflow-hidden rounded-[24px] bg-gradient-to-br from-emerald-500 to-teal-600 p-[1px] cursor-pointer hover:scale-[1.01] transition-transform duration-300 shadow-xl shadow-emerald-500/20"
              >
                <div className="rounded-[23px] bg-gradient-to-br from-emerald-600 to-teal-700 p-5 sm:p-6 h-full flex flex-col">
                  <div className="w-12 h-12 rounded-2xl bg-white backdrop-blur flex items-center justify-center text-slate-700 border border-slate-200 shadow-sm mb-4 group-hover:scale-110 transition-transform">
                    <ShoppingBag size={24} />
                  </div>
                  <span className="text-[11px] font-black tracking-[0.14em] uppercase text-emerald-100">For Buyers</span>
                  <h3 className="text-xl font-black text-slate-900 leading-tight mt-1">
                    BUY
                    <br />
                    PRODUCTS
                  </h3>
                  <p className="text-sm text-emerald-50/90 mt-2 leading-snug flex-1">
                    {language === 'hi' ? 'किसानों से सीधे ताज़ा उपज खोजें' : 'Find fresh produce directly from farmers'}
                  </p>
                  <div className="mt-5">
                    <div className="w-full inline-flex items-center justify-center gap-2 bg-white text-emerald-700 font-black text-sm px-4 py-3 rounded-xl group-hover:bg-emerald-50 transition-colors">
                      <Store size={16} />
                      {language === 'hi' ? 'अभी खरीदें' : 'Shop Now'}
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-emerald-100/80 text-center mt-2">500+ lots • Verified FPOs • Save ~24%</p>
                  </div>
                </div>
              </div>

              {/* SELL PRODUCE */}
              <div
                onClick={handleStartSelling}
                className="group relative overflow-hidden rounded-[24px] bg-white p-[1px] cursor-pointer hover:scale-[1.01] transition-transform duration-300 shadow-xl shadow-slate-200/60"
              >
                <div className="rounded-[23px] bg-gradient-to-br from-white to-slate-50 p-5 sm:p-6 h-full flex flex-col border border-white/5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
                    <Tractor size={24} />
                  </div>
                  <span className="text-[11px] font-black tracking-[0.14em] uppercase text-amber-600">For Farmers</span>
                  <h3 className="text-xl font-black text-slate-900 leading-tight mt-1">
                    SELL
                    <br />
                    PRODUCE
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 leading-snug flex-1">
                    {language === 'hi' ? 'अपनी उपज सीधे खरीदारों को बेचें' : 'Sell your produce directly to buyers'}
                  </p>
                  <div className="mt-5">
                    <div className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black text-sm px-4 py-3 rounded-xl transition-colors">
                      <Leaf size={16} />
                      {language === 'hi' ? 'बेचना शुरू करें' : 'Start Selling'}
                      <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                    </div>
                    <p className="text-[11px] text-slate-500 text-center mt-2">Earn +47% more • Instant payout</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Spotlight: Official Government Kisan Portal & Digital e-KYC Banner */}
          <div className="mt-8 rounded-3xl bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 sm:p-6 border border-emerald-500/30 shadow-xl relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 font-black shadow-lg shadow-emerald-500/30">
                  <ShieldCheck size={26} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {language === 'hi' ? '🏛️ भारत सरकार ई-केवाईसी' : '🏛️ Digital India e-KYC'}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-bold">
                      DigiLocker • Aadhaar Demo • Mobile OTP
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                    {language === 'hi'
                      ? 'सत्यापित किसान पोर्टल एवं डिजिटल पहचान'
                      : 'Verified Kisan Portal & Digital Identity Setup'}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
                    {language === 'hi'
                      ? 'अपनी पहचान सत्यापित करें, भूमि अभिलेख लिंक करें और शून्य प्रतिशत आढ़ती कमीशन पर सीधे खरीदारों से जुड़ें।'
                      : 'Access the government-enabled farmer portal. Authenticate with Aadhaar demo, DigiLocker land records, or Mobile OTP to list verified produce lots directly.'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full md:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 cursor-pointer hover:scale-105"
                >
                  <ShieldCheck size={16} />
                  <span>{language === 'hi' ? 'लॉगिन / ई-केवाईसी खोलें →' : 'Access Login Portal & e-KYC →'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Concept: immediate communication */}
          <div className="mt-10 sm:mt-12 rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <p className="text-center text-[11px] font-black tracking-[0.18em] uppercase text-slate-500 mb-4">
              {language === 'hi' ? 'हमारा सरल वादा' : 'Our Simple Promise'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
              <div className="text-center p-4 rounded-2xl bg-white border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mx-auto mb-3">
                  <Tractor size={18} />
                </div>
                <p className="text-sm font-black text-slate-900">Farmers sell directly</p>
                <p className="text-xs text-slate-500 mt-1">{language === 'hi' ? 'बिना आढ़ती, सीधा खरीदार को' : 'No middleman, straight to buyer'}</p>
              </div>
              <div className="text-center p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-white border border-emerald-500/20 relative">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
                  <Sparkles size={18} />
                </div>
                <p className="text-sm font-black text-slate-900">FarmDirect AI connects them</p>
                <p className="text-xs text-emerald-700/70 mt-1">{language === 'hi' ? 'बुद्धिमान मिलान, हिंदी/अंग्रेज़ी वॉयस' : 'Intelligent matching, voice in Hindi/English'}</p>
                <span className="hidden md:block absolute top-1/2 -left-3 w-6 h-0.5 bg-gradient-to-r from-amber-500/30 to-emerald-500/30 -translate-y-1/2" />
                <span className="hidden md:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-emerald-500/30 to-teal-500/30 -translate-y-1/2" />
              </div>
              <div className="text-center p-4 rounded-2xl bg-white border border-slate-200">
                <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 mx-auto mb-3">
                  <IndianRupee size={18} />
                </div>
                <p className="text-sm font-black text-slate-900">Buyers get better prices</p>
                <p className="text-xs text-slate-500 mt-1">{language === 'hi' ? '~24% बचत, ताज़ा उपज' : '~24% savings, fresher produce'}</p>
              </div>
            </div>
            {/* Two obvious paths */}
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-emerald-500/5 border border-emerald-500/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black">BUY</span>
                  <span className="text-xs font-bold text-emerald-700">{language === 'hi' ? 'खरीदार प्रवाह' : 'Buyer Flow'}</span>
                  <ArrowRight size={12} className="text-emerald-600 ml-auto" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 overflow-x-auto scrollbar-none">
                  <span className="px-2.5 py-1.5 rounded-full bg-white border border-slate-200 whitespace-nowrap flex items-center gap-1"><Store size={12} className="text-emerald-700" /> Products</span>
                  <ChevronRight size={12} className="text-slate-600 shrink-0" />
                  <span className="px-2.5 py-1.5 rounded-full bg-white border border-slate-200 whitespace-nowrap flex items-center gap-1"><IndianRupee size={12} className="text-emerald-700" /> Prices</span>
                  <ChevronRight size={12} className="text-slate-600 shrink-0" />
                  <span className="px-2.5 py-1.5 rounded-full bg-white border border-slate-200 whitespace-nowrap flex items-center gap-1"><TrendingUp size={12} className="text-emerald-700" /> Discounts</span>
                  <ChevronRight size={12} className="text-slate-600 shrink-0" />
                  <span className="px-2.5 py-1.5 rounded-full bg-white border border-slate-200 whitespace-nowrap flex items-center gap-1"><Users size={12} className="text-emerald-700" /> Farmers</span>
                  <ChevronRight size={12} className="text-slate-600 shrink-0" />
                  <span className="px-2.5 py-1.5 rounded-full bg-emerald-500 text-white whitespace-nowrap">Purchase</span>
                </div>
              </div>
              <div className="rounded-2xl bg-amber-500/5 border border-amber-500/20 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 rounded-full bg-amber-500 text-white text-[10px] font-black">SELL</span>
                  <span className="text-xs font-bold text-amber-600">{language === 'hi' ? 'किसान प्रवाह' : 'Seller Flow'}</span>
                  <ArrowRight size={12} className="text-amber-600 ml-auto" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 overflow-x-auto scrollbar-none">
                  <span className="px-2.5 py-1.5 rounded-full bg-white border border-slate-200 whitespace-nowrap flex items-center gap-1"><Leaf size={12} className="text-amber-600" /> Produce</span>
                  <ChevronRight size={12} className="text-slate-600 shrink-0" />
                  <span className="px-2.5 py-1.5 rounded-full bg-white border border-slate-200 whitespace-nowrap flex items-center gap-1"><Package size={12} className="text-amber-600" /> Inventory</span>
                  <ChevronRight size={12} className="text-slate-600 shrink-0" />
                  <span className="px-2.5 py-1.5 rounded-full bg-white border border-slate-200 whitespace-nowrap flex items-center gap-1"><BarChart3 size={12} className="text-amber-600" /> Demand</span>
                  <ChevronRight size={12} className="text-slate-600 shrink-0" />
                  <span className="px-2.5 py-1.5 rounded-full bg-white border border-slate-200 whitespace-nowrap flex items-center gap-1"><Users size={12} className="text-amber-600" /> Matching</span>
                  <ChevronRight size={12} className="text-slate-600 shrink-0" />
                  <span className="px-2.5 py-1.5 rounded-full bg-amber-500 text-white whitespace-nowrap">Orders</span>
                </div>
              </div>
            </div>
            <p className="text-center text-[11px] text-slate-500 mt-4 flex items-center justify-center gap-1.5">
              <Sparkles size={12} className="text-emerald-700" /> {language === 'hi' ? 'AI दोनों पक्षों को बुद्धिमानी से जोड़ता है — बाधा नहीं' : 'AI is the intelligent layer connecting both sides — non-intrusive'}
            </p>
          </div>
        </div>
      </section>

      {/* ================= BUYER MARKETPLACE - Fresh Produce Direct From Farmers ================= */}
      <section id="marketplace" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 scroll-mt-20">
        {/* Section header - immediately visible buyer experience */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-3">
              <ShoppingBag size={14} />
              Buyer Marketplace
              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[10px] font-black">{buyerProducts.length} lots</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Fresh Produce Direct From Farmers</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl">
              Compare prices, discounts & availability without opening AI assistant — buy directly.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleShopNow} icon={<Store size={14} />}>
              {language === 'hi' ? 'पूरा बाज़ार देखें' : 'Full Marketplace'}
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('/consumer/voice')} icon={<Mic size={14} />}>
              {language === 'hi' ? 'वॉयस से खोजें' : 'Voice Search'}
            </Button>
          </div>
        </div>

        {/* Filters bar - Search + Category + Location + Price + Sort */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4 space-y-4 mb-6">
          {/* Row 1: Search */}
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'hi' ? 'टमाटर, आलू, किसान, जगह खोजें…' : 'Search tomatoes, potatoes, farmer, location…'}
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-200"
              />
            </div>

            {/* Category pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 lg:pb-0 shrink-0">
              {[
                { id: 'all', label: language === 'hi' ? 'सभी' : 'All' },
                { id: 'vegetables', label: language === 'hi' ? 'सब्ज़ियाँ' : 'Vegetables' },
                { id: 'fruits', label: language === 'hi' ? 'फल' : 'Fruits' },
                { id: 'grains', label: language === 'hi' ? 'अनाज' : 'Grains' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setBuyerFilter(f.id as any)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                    buyerFilter === f.id
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                      : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900 hover:border-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Location + Price + Sort */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1.2fr] gap-3">
            {/* Location filter */}
            <div className="relative">
              <label className="block text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                <MapPin size={12} /> Location
              </label>
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full h-10 pl-3 pr-9 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-200 appearance-none"
                >
                  <option value="all">All Locations</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Price filter */}
            <div>
              <label className="block text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                <IndianRupee size={12} /> Price (₹/kg)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <span className="text-slate-600">—</span>
                <input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                <SlidersHorizontal size={12} /> Sort by
              </label>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full h-10 pl-3 pr-9 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-200 appearance-none"
                >
                  <option value="recommended">Recommended</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="discount-desc">Discount: High to Low</option>
                  <option value="freshness">Freshness: Newest</option>
                  <option value="availability">Availability: High to Low</option>
                </select>
                <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Active filters footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80">
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500">
                <Filter size={12} /> {buyerProducts.length} results
              </span>
              {hasActiveFilters && (
                <span className="text-slate-500 hidden sm:inline">
                  {buyerPreviewProducts.length} shown • {buyerProducts.length} total
                </span>
              )}
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                <RotateCcw size={12} /> Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Product grid - redesigned hierarchy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {buyerPreviewProducts.map((produce) => {
            const farmer = getFarmerForProduce(produce);
            const pricing = getPricing(produce);
            const availability = getAvailabilityStatus(produce);
            const display = parseDisplayName(produce);
            const gradeColor =
              produce.grade === 'Organic Premium'
                ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                : produce.grade === 'Grade A'
                  ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 border-amber-500/20';
            const toneStyles =
              availability.tone === 'emerald'
                ? 'bg-emerald-500 text-white border-emerald-400'
                : availability.tone === 'amber'
                  ? 'bg-amber-500 text-white border-amber-400'
                  : 'bg-rose-500 text-white border-rose-400';
            return (
              <Card
                key={produce.id}
                className="p-0 overflow-hidden border-slate-200 bg-white hover:border-slate-200 group flex flex-col"
                hover
              >
                {/* Image - quick view on click */}
                <div
                  className="relative h-44 overflow-hidden bg-white cursor-pointer"
                  onClick={() => handleQuickView(produce)}
                  title="Quick view"
                >
                  <img
                    src={getProduceImage(produce)}
                    alt={produce.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/50 via-transparent to-transparent" />
                  {/* Top badges - grade + discount */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-black border backdrop-blur ${gradeColor}`}>{produce.grade}</span>
                  </div>
                  <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5">
                    <span className="px-2 py-1 rounded-full text-[10px] font-black bg-rose-500 text-white shadow">-{pricing.discountPercent}% OFF</span>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold border backdrop-blur flex items-center gap-1 ${toneStyles}`}>
                      <Package size={10} />
                      {availability.label}
                    </span>
                  </div>
                  <span className="absolute bottom-2 right-2 px-2 py-1 rounded-full bg-white backdrop-blur border border-slate-200 text-[10px] font-bold text-slate-800 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <Eye size={10} /> Quick view
                  </span>
                </div>

                {/* Body - spec visual hierarchy per requirements */}
                <div className="p-4 flex flex-col flex-1">
                  {/* Crop name */}
                  <div className="flex items-start justify-between gap-2">
                    <h3
                      className="text-[15px] font-black text-slate-900 leading-tight line-clamp-2 flex-1 cursor-pointer hover:text-emerald-300 transition-colors"
                      onClick={() => handleViewProduct(produce)}
                      title="Open product details page"
                    >
                      {display.crop}
                    </h3>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${gradeColor} hidden sm:inline-flex`}>
                      {produce.grade}
                    </span>
                  </div>
                  {/* Explicit Grade line if not duplicate */}
                  <p className="text-[11px] font-bold tracking-widest uppercase mt-0.5 flex items-center gap-1.5">
                    <span className={`inline-flex px-1.5 py-0.5 rounded border text-[10px] ${gradeColor}`}>{produce.grade}</span>
                    <span className="text-slate-500 line-clamp-1">{display.title.replace(display.crop, '').replace(/^ -/, '').trim() || produce.category}</span>
                  </p>

                  {/* Pricing hierarchy exactly as spec:
                      Crop name
                      Grade
                      Selling price
                      Market price
                      Discount % OFF
                   */}
                  <div className="mt-3 space-y-0.5">
                    <div className="flex items-baseline gap-2">
                      <span className="flex items-center text-xl font-black text-slate-900">
                        <IndianRupee size={16} className="text-emerald-700" />
                        {pricing.sellingPrice}
                        <span className="text-xs font-bold text-slate-500 ml-1">/kg</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                        Save ₹{pricing.savingPerKg}/kg
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-through flex items-center gap-1">
                      Market price <IndianRupee size={10} />{pricing.marketPrice}/kg
                    </p>
                    <p className="text-[11px] font-black text-rose-400 flex items-center gap-1">
                      {pricing.discountPercent}% OFF
                      <span className="font-medium text-slate-500">• Mandi ₹{pricing.referenceMandiPrice}/kg</span>
                    </p>
                  </div>

                  {/* Quantity + Availability */}
                  <div className="mt-3 flex items-center justify-between bg-white/60 rounded-xl px-3 py-2 border border-slate-200">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                      <Package size={12} className="text-slate-500" />
                      {produce.quantityKg.toLocaleString()} kg available
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${toneStyles}`}>{availability.label}</span>
                  </div>

                  {/* From: Farmer/seller + Location */}
                  <div className="mt-3 flex items-center gap-2.5 p-2.5 rounded-xl bg-white/40 border border-slate-200">
                    <img src={farmer.avatar} alt={farmer.name} className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate leading-none flex items-center gap-1">
                        {farmer.name}
                        {farmer.fpoMember && <Badge variant="emerald" size="sm" className="ml-1 hidden sm:inline-flex text-[9px] px-1 py-0">FPO</Badge>}
                      </p>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1 truncate mt-0.5">
                        <MapPin size={10} className="shrink-0" /> {produce.location} • {farmer.rating}★
                      </p>
                    </div>
                  </div>

                  {/* Freshness/quality extra */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-medium text-slate-600">
                      <Leaf size={10} className="text-emerald-700" /> {produce.category}
                    </span>
                    {produce.shelfLifeDays && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] text-slate-500">
                        <Clock size={10} /> {produce.shelfLifeDays}d fresh
                      </span>
                    )}
                    {(farmer as any).reliabilityPct && (farmer as any).reliabilityPct > 93 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                        <Award size={10} /> {(farmer as any).reliabilityPct}%
                      </span>
                    )}
                  </div>

                  {/* Actions - Buy/View Details */}
                  <div className="mt-4 space-y-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleViewProduct(produce)}
                      icon={<Eye size={14} />}
                      className="w-full text-xs font-bold"
                    >
                      View Product
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleContactFarmer(produce)}
                        className="w-full text-xs"
                      >
                        Contact Farmer
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleBuyFromModal(produce)}
                        icon={<ShoppingCart size={14} />}
                        className="w-full text-xs"
                      >
                        Buy Now
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {buyerProducts.length === 0 && (
          <div className="text-center py-12 rounded-2xl bg-slate-50 border border-dashed border-slate-200 mt-4">
            <Search size={24} className="mx-auto text-slate-600 mb-2" />
            <p className="text-sm text-slate-500">No products match your filters</p>
            <p className="text-xs text-slate-500 mt-1">Try clearing filters or adjusting price/location</p>
            <Button variant="ghost" size="sm" className="mt-3" onClick={clearFilters}>
              Clear all filters
            </Button>
          </div>
        )}

        {buyerProducts.length > buyerPreviewProducts.length && (
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500 mb-2">
              Showing {buyerPreviewProducts.length} of {buyerProducts.length} lots
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate('/consumer/matches')}>
              View all {buyerProducts.length} in marketplace <ArrowRight size={14} />
            </Button>
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {language === 'hi' ? 'खरीदार ~24% बचाते हैं, किसान +47% अधिक कमाते हैं' : 'Buyers save ~24% vs retail, farmers earn +47% vs mandi'}
              </p>
              <p className="text-xs text-slate-500">Direct trade • Same-day cold-chain • UPI escrow</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={handleShopNow} icon={<ArrowRight size={14} />}>
            {language === 'hi' ? 'खरीदारी शुरू करें' : 'Start Buying'}
          </Button>
        </div>
      </section>

      {/* ================= SELLER SECTION ================= */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-bold mb-3">
                <Tractor size={14} />
                {language === 'hi' ? 'किसान / विक्रेता हब' : 'Seller / Farmer Hub'}
                <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-black">+47% EARNINGS</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {language === 'hi' ? 'अपनी उपज सीधे बेचें' : 'Sell your produce directly'}
              </h2>
              <p className="text-sm text-slate-500 mt-2 max-w-2xl">
                {language === 'hi'
                  ? 'इन्वेंटरी जोड़ें, मांग देखें, ऑर्डर और कमाई प्रबंधित करें — वॉयस से।'
                  : 'List produce, see buyer demand, manage inventory, orders & earnings — by voice.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/farmer')}
                icon={<Package size={14} />}
                className="border-amber-500/20 hover:bg-amber-500/10"
              >
                {language === 'hi' ? 'डैशबोर्ड' : 'Seller Dashboard'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleStartSelling}
                icon={<Plus size={14} />}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 border-amber-500 focus:ring-amber-500"
              >
                {language === 'hi' ? 'बेचना शुरू करें' : 'Start Selling'}
              </Button>
            </div>
          </div>

          {/* 6 Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {sellerFeatures.map((f) => {
              const Icon = f.icon;
              return (
                <Card
                  key={f.title}
                  hover
                  className="p-5 bg-white border-slate-200 hover:border-slate-200 flex flex-col group cursor-pointer"
                  onClick={() => {
                    setRole('farmer');
                    navigate(f.to);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${f.accent}`}>
                      <Icon size={20} />
                    </div>
                    {f.badge && <Badge variant="emerald" size="sm" className="text-[10px]">{f.badge}</Badge>}
                    {f.highlight && (
                      <span className="px-2 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black">{f.highlight}</span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-300 transition-colors">{f.title}</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed flex-1">{f.desc}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-900 group-hover:gap-2 transition-all">
                      {f.cta} <ChevronRight size={14} className="text-slate-500 group-hover:text-slate-900" />
                    </span>
                    <span className="w-8 h-8 rounded-lg bg-white group-hover:bg-slate-100 flex items-center justify-center text-slate-500 group-hover:text-slate-900 transition-colors">
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Bottom seller trust + buyer demand preview */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-4">
            <Card className="p-5 bg-white/60 border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <Users size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  {language === 'hi' ? 'सक्रिय खरीदार मांग' : 'Live buyer demand near you'}
                </h3>
                <span className="ml-auto text-[11px] px-2 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
                  {mockBuyerRequirements.filter((r) => r.status === 'open').length} open requests
                </span>
              </div>
              <div className="space-y-2.5">
                {mockBuyerRequirements.slice(0, 3).map((req) => {
                  const buyer = mockBuyers.find((b) => b.id === req.buyerId) ?? mockBuyers[0];
                  return (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-slate-200 transition-colors"
                    >
                      <img src={buyer.avatar} alt={buyer.name} className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {buyer.name} • <span className="text-emerald-700">{req.produceName}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-2 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Package size={11} /> {req.quantityKg} kg
                          </span>
                          <span className="flex items-center gap-1">
                            <IndianRupee size={11} /> {req.budgetPerKg}/kg budget
                          </span>
                          <span className="hidden sm:inline-flex items-center gap-1">
                            <MapPin size={11} /> {buyer.location}
                          </span>
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRole('farmer');
                          navigate('/farmer/buyers');
                        }}
                        className="hidden sm:inline-flex shrink-0 text-xs py-1 px-3"
                      >
                        {language === 'hi' ? 'संपर्क' : 'Connect'}
                      </Button>
                    </div>
                  );
                })}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRole('farmer');
                  navigate('/farmer/buyers');
                }}
                className="w-full mt-3 text-xs"
              >
                {language === 'hi' ? 'सभी खरीदार मांग देखें' : 'View all buyer requests'} <ChevronRight size={14} />
              </Button>
            </Card>

            <Card className="p-5 bg-gradient-to-br from-amber-500/5 via-slate-50 to-slate-50 border-amber-500/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                  <Wallet size={16} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">{language === 'hi' ? 'किसान लाभ' : 'Why farmers love FarmDirect'}</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500">APMC mandi price</p>
                    <p className="text-sm font-bold text-slate-600 line-through">₹19/kg</p>
                  </div>
                  <ArrowRight size={14} className="text-slate-600" />
                  <div className="text-right">
                    <p className="text-xs text-emerald-600 font-bold">FarmDirect price</p>
                    <p className="text-sm font-black text-emerald-700">₹28/kg</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <p className="text-[11px] text-slate-500">Earnings boost</p>
                    <p className="text-lg font-black text-emerald-700">+47%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
                    <p className="text-[11px] text-slate-500">Buyer saving</p>
                    <p className="text-lg font-black text-teal-600">24%</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2 py-1 rounded-full bg-white border border-slate-200 text-[11px] text-slate-600">
                    ✓ Instant UPI payout
                  </span>
                  <span className="px-2 py-1 rounded-full bg-white border border-slate-200 text-[11px] text-slate-600">
                    ✓ No delay/commission
                  </span>
                  <span className="px-2 py-1 rounded-full bg-white border border-slate-200 text-[11px] text-slate-600">
                    ✓ EV & solar cold-chain
                  </span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ================= AI ASSISTANT STRIP ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className="p-6 sm:p-7 bg-gradient-to-br from-white via-slate-50 to-emerald-50/20 border-slate-200 overflow-hidden relative">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-900 shadow-lg">
                <Mic size={22} />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Sparkles size={16} className="text-emerald-700" />
                  {language === 'hi' ? 'AI सहायक — बोलकर व्यापार करें' : 'AI Assistant — trade by voice'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {language === 'hi'
                    ? '“मुझे 500 किलो टमाटर चाहिए” या “मेरे पास 2 टन आलू हैं” — बस बोलें।'
                    : '“I need 500 kg tomatoes” or “I have 2 tons potatoes” — just speak.'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setRole('consumer');
                  navigate('/consumer/voice');
                }}
                icon={<Play size={16} />}
                className="flex-1 lg:flex-initial justify-center"
              >
                {language === 'hi' ? 'खरीदार वॉयस' : 'Buyer Voice'}
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setRole('farmer');
                  navigate('/farmer/voice');
                }}
                icon={<Tractor size={16} />}
                className="flex-1 lg:flex-initial justify-center bg-teal-500/10 border-teal-500/20 text-teal-300 hover:bg-teal-500/20"
              >
                {language === 'hi' ? 'किसान वॉयस' : 'Farmer Voice'}
              </Button>
            </div>
          </div>
        </Card>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-900">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-sm font-black bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">
                  FarmDirect AI
                </p>
                <p className="text-[11px] text-slate-500">Direct farmer-to-buyer marketplace • SIH 26033 • Zero intermediaries</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <button onClick={() => navigate('/')} className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-900">
                Home
              </button>
              <button
                onClick={handleShopNow}
                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
              >
                Marketplace
              </button>
              <button
                onClick={() => {
                  setRole('farmer');
                  navigate('/farmer');
                }}
                className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
              >
                For Farmers
              </button>
              <button
                onClick={() => navigate(role === 'farmer' ? '/farmer/voice' : '/consumer/voice')}
                className="px-3 py-1.5 rounded-full bg-emerald-500 text-white font-bold"
              >
                AI Assistant
              </button>
            </div>
          </div>
          <p className="text-center text-[11px] text-slate-600 mt-6">
            © 2026 FarmDirect AI • Neural Nomads • Built with mock data architecture — ready to connect to backend APIs • No fake backend logic implemented
          </p>
        </div>
      </footer>

      {/* Product Details Modal — quick view, full page available at /product/:id via handleViewProduct */}
      {/* Voice assistant now provided globally via Layout -> FarmDirectAssistantWidget (floating, non-blocking) */}
      {selectedProduct && (
        <ProductDetailsModal
          produce={selectedProduct}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onBuy={handleBuyFromModal}
          onContact={handleContactFarmer}
        />
      )}
    </div>
  );
};







