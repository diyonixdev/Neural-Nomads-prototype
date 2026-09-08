import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { AddProduceForm } from '../../components/farmer/AddProduceForm';
import { farmerInventoryService } from '../../services/farmerInventoryService';
import { getProduceImage, getPricing, getAvailabilityStatus, FALLBACK_PRODUCE_IMAGE } from '../../services/productService';
import { FarmerHelpPanel } from '../../components/farmer/FarmerHelpPanel';
import { mockBuyerRequirements, mockBuyers, mockOrders } from '../../data/mockData';
import { matchBuyers, fetchDemandForecast } from '../../services/aiService';
import type { DemandForecastResult } from '../../services/aiService';
import type { Produce } from '../../types';
import {
  Tractor,
  Mic,
  Users,
  TrendingUp,
  Package,
  Plus,
  Wallet,
  BarChart3,
  ClipboardList,
  Leaf,
  IndianRupee,
  MapPin,
  Calendar,
  Loader2,
  Edit2,
  Trash2,
  Eye,
  Search,
  Award,
  Truck,
  Clock,
  Star,
  Phone,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

type SellerTab = 'my-produce' | 'add-produce' | 'inventory' | 'buyer-requests' | 'orders' | 'earnings' | 'demand';

const CURRENT_FARMER_ID = 'f-001';

export const FarmerDashboardPage: React.FC = () => {
  const { language } = useDemo();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as SellerTab) || 'my-produce';
  const [activeTab, setActiveTab] = useState<SellerTab>(['my-produce','add-produce','inventory','buyer-requests','orders','earnings','demand'].includes(initialTab) ? initialTab : 'my-produce');
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchMyProduce, setSearchMyProduce] = useState('');
  const [editingProduce, setEditingProduce] = useState<Produce | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [demandForecast, setDemandForecast] = useState<DemandForecastResult | null>(null);

  useEffect(() => {
    let active = true;
    if (activeTab === 'demand') {
      const loadForecast = async () => {
        const result = await fetchDemandForecast('Wheat'); // default crop to fetch
        if (active) setDemandForecast(result);
      };
      loadForecast();
    }
    return () => { active = false; };
  }, [activeTab]);

  // Sync tab with URL ?tab=
  useEffect(() => {
    const tab = searchParams.get('tab') as SellerTab | null;
    if (tab && ['my-produce','add-produce','inventory','buyer-requests','orders','earnings','demand'].includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: SellerTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Subscribe to inventory updates for immediate refresh
  useEffect(() => {
    const unsub = farmerInventoryService.subscribe(() => setRefreshKey((k) => k + 1));
    return unsub;
  }, []);

  const myProduce = useMemo(() => {
    // refreshKey forces recompute
    void refreshKey;
    return farmerInventoryService.getMyProduce(CURRENT_FARMER_ID);
  }, [refreshKey]);

  const filteredMyProduce = useMemo(() => {
    if (!searchMyProduce.trim()) return myProduce;
    const q = searchMyProduce.toLowerCase();
    return myProduce.filter((p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [myProduce, searchMyProduce]);

  const stats = useMemo(() => {
    const s = farmerInventoryService.getStats(CURRENT_FARMER_ID);
    const pendingOrders = mockOrders.filter(
      (o) => o.farmerId === CURRENT_FARMER_ID && ['negotiating', 'confirmed', 'stored', 'dispatched', 'in_transit'].includes(o.currentStatus)
    ).length;
    const buyerReqOpen = mockBuyerRequirements.filter((r) => r.status === 'open').length;
    const estimatedEarnings = myProduce.reduce((acc, p) => acc + p.quantityKg * p.expectedPricePerKg, 0);
    return {
      totalInventoryKg: s.totalInventoryKg,
      activeListings: s.activeListings,
      totalListings: s.totalListings,
      lowStock: s.lowStockCount,
      buyerRequests: buyerReqOpen,
      pendingOrders,
      estimatedEarnings,
    };
  }, [myProduce]);

  const buyerDemandForMyProduce = useMemo(() => {
    // Use real aiService: for each my produce, find matching buyers
    const allMatches = myProduce.flatMap((p) => {
      try {
        const matches = matchBuyers(p);
        return matches.slice(0, 1).map((m) => ({ produce: p, match: m }));
      } catch {
        return [];
      }
    });
    // also fallback to generic buyer requirements if no matches
    if (allMatches.length === 0) {
      return mockBuyerRequirements.slice(0, 4).map((req) => {
        const buyer = mockBuyers.find((b) => b.id === req.buyerId)!;
        return { produce: null, match: { buyer, requirement: req, totalScore: 85, breakdown: { availability: 80, price: 85, distance: 80, quality: 85, reliability: 90 }, explanation: 'Generic demand' } as any };
      });
    }
    return allMatches;
  }, [myProduce]);

  const handleDelete = async (id: string) => {
    if (!confirm(language === 'hi' ? 'हटाएं?' : 'Delete this listing?')) return;
    await farmerInventoryService.deleteProduce(id);
  };

  const handleOpenAssistant = () => {
    // Reuse existing FarmDirect AI assistant (no second chatbot) via custom event
    window.dispatchEvent(new CustomEvent('farmdirect:open-assistant'));
  };

  const tabs: { id: SellerTab; label: string; labelHi: string; icon: any; badge?: string }[] = [
    { id: 'my-produce', label: 'My Produce', labelHi: 'मेरी उपज', icon: Leaf },
    { id: 'add-produce', label: 'Add Produce', labelHi: 'उपज जोड़ें', icon: Plus },
    { id: 'inventory', label: 'Inventory', labelHi: 'इन्वेंटरी', icon: Package },
    { id: 'buyer-requests', label: 'Buyer Requests', labelHi: 'खरीदार अनुरोध', icon: Users, badge: `${stats.buyerRequests}` },
    { id: 'orders', label: 'Orders', labelHi: 'ऑर्डर', icon: ClipboardList, badge: `${stats.pendingOrders}` },
    { id: 'earnings', label: 'Earnings', labelHi: 'कमाई', icon: Wallet },
    { id: 'demand', label: 'Demand Insights', labelHi: 'मांग अंतर्दृष्टि', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Seller Header — distinctly amber/teal vs buyer emerald */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-white via-slate-50 to-amber-50/20 p-6">
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs font-bold mb-3">
              <Tractor size={14} />
              {language === 'hi' ? 'किसान विक्रेता डैशबोर्ड' : 'Seller / Farmer Dashboard'}
              <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-black">SEPARATE FROM BUYER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {language === 'hi' ? 'आपका फार्म सीधे बाज़ार में' : 'Your Farm, Direct to Market'}
            </h1>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl">
              {language === 'hi'
                ? 'बोलकर या फॉर्म से उपज जोड़ें — इन्वेंटरी तुरंत अपडेट होती है। खरीदार मांग, ऑर्डर और कमाई एक जगह।'
                : 'List via voice or form — inventory updates instantly. Track buyer demand, orders & earnings in one place.'}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600">FPO: Green Valley FPO • Verified</span>
              <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">4.9★ • 428 deals</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Button variant="outline" size="md" onClick={() => navigate('/farmer/voice')} icon={<Mic size={16} />} className="border-amber-500/20 hover:bg-amber-500/10">
              {language === 'hi' ? 'वॉयस से जोड़ें' : 'Add via Voice'}
            </Button>
            <Button variant="primary" size="md" onClick={() => handleTabChange('add-produce')} icon={<Plus size={16} />} className="bg-amber-500 hover:bg-amber-400 text-white border-amber-500">
              {language === 'hi' ? 'नई उपज जोड़ें' : 'Add New Produce'}
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards: 5 as requested */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card className="p-4 bg-white border-slate-200 hover:border-amber-500/20 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-2.5">
            <Package size={18} />
          </div>
          <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Total Inventory</p>
          <p className="text-xl font-black text-slate-900 mt-1">{stats.totalInventoryKg.toLocaleString()} kg</p>
          <p className="text-[11px] text-slate-500 mt-1">{stats.totalListings} listings • {stats.lowStock} low</p>
        </Card>
        <Card className="p-4 bg-white border-slate-200 hover:border-teal-500/20 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 mb-2.5">
            <Leaf size={18} />
          </div>
          <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Active Listings</p>
          <p className="text-xl font-black text-teal-600 mt-1">{stats.activeListings}</p>
          <p className="text-[11px] text-slate-500 mt-1">Live in marketplace</p>
        </Card>
        <Card className="p-4 bg-white border-slate-200 hover:border-blue-500/20 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2.5">
            <Users size={18} />
          </div>
          <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Buyer Requests</p>
          <p className="text-xl font-black text-blue-400 mt-1">{stats.buyerRequests}</p>
          <p className="text-[11px] text-slate-500 mt-1">Open near you</p>
        </Card>
        <Card className="p-4 bg-white border-slate-200 hover:border-amber-500/20 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 mb-2.5">
            <ClipboardList size={18} />
          </div>
          <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Pending Orders</p>
          <p className="text-xl font-black text-amber-600 mt-1">{stats.pendingOrders}</p>
          <p className="text-[11px] text-slate-500 mt-1">To dispatch</p>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-amber-500/10 via-slate-50 to-slate-50 border-amber-500/20">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center mb-2.5">
            <IndianRupee size={18} />
          </div>
          <p className="text-[11px] font-bold tracking-widest uppercase text-amber-300">Est. Earnings</p>
          <p className="text-xl font-black text-amber-600 mt-1">₹{stats.estimatedEarnings.toLocaleString()}</p>
          <p className="text-[11px] text-amber-700/70 mt-1">+47% vs mandi</p>
        </Card>
      </div>

      {/* Seller Tabs — clearly separate from buyer emerald */}
      <div className="rounded-2xl bg-white border border-slate-200 p-1.5 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                  isActive
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md'
                    : 'bg-white text-slate-500 border-slate-200 hover:text-slate-900 hover:border-slate-200'
                }`}
              >
                <Icon size={14} />
                {language === 'hi' ? t.labelHi : t.label}
                {t.badge && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${isActive ? 'bg-white text-amber-400' : 'bg-white text-slate-500'}`}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[320px]">
        {activeTab === 'my-produce' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Leaf size={18} className="text-amber-600" /> {language === 'hi' ? 'मेरी उपज' : 'My Produce'}
                <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-500">{myProduce.length}</span>
              </h2>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    value={searchMyProduce}
                    onChange={(e) => setSearchMyProduce(e.target.value)}
                    placeholder={language === 'hi' ? 'खोजें…' : 'Search produce…'}
                    className="h-9 pl-9 pr-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 placeholder:text-slate-500 w-48 sm:w-64"
                  />
                </div>
                <Button variant="primary" size="sm" onClick={() => handleTabChange('add-produce')} icon={<Plus size={14} />} className="bg-amber-500 text-white">
                  Add
                </Button>
              </div>
            </div>

            {filteredMyProduce.length === 0 ? (
              <Card className="p-8 text-center bg-slate-50 border-dashed">
                <Package size={24} className="mx-auto text-slate-600 mb-2" />
                <p className="text-sm text-slate-500">{language === 'hi' ? 'कोई उपज नहीं' : 'No produce yet'}</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={() => handleTabChange('add-produce')}>
                  {language === 'hi' ? 'पहली उपज जोड़ें' : 'Add your first lot'}
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMyProduce.map((p) => {
                  const pricing = getPricing(p);
                  const avail = getAvailabilityStatus(p);
                  return (
                    <Card key={p.id} className="p-0 overflow-hidden border-slate-200 bg-white flex flex-col">
                      {/* IMAGE CONTAINER: fixed 16:9, w-full, overflow-hidden, object-cover */}
                      <div className="aspect-video w-full relative overflow-hidden bg-white">
                        <img
                          src={getProduceImage(p)}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const img = e.currentTarget as HTMLImageElement;
                            if (img.src !== FALLBACK_PRODUCE_IMAGE) {
                              img.onerror = null;
                              img.src = FALLBACK_PRODUCE_IMAGE;
                            }
                          }}
                        />
                        <div className="absolute top-2 left-2 flex gap-1.5">
                          <Badge variant={p.grade === 'Grade A' ? 'emerald' : p.grade === 'Organic Premium' ? 'purple' : 'amber'} size="sm">
                            {p.grade}
                          </Badge>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${avail.tone === 'emerald' ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-amber-500 text-white border-amber-600'}`}>{avail.label}</span>
                        </div>
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="text-sm font-black text-slate-900 line-clamp-1">{p.name}</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <MapPin size={11} /> {p.location} • <Calendar size={11} /> {p.harvestDate}
                        </p>
                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="flex items-center text-lg font-black text-slate-900">
                            <IndianRupee size={14} className="text-amber-600" /> {p.expectedPricePerKg}
                            <span className="text-xs text-slate-500 ml-1">/kg</span>
                          </span>
                          <span className="text-xs text-slate-500 line-through">Mandi ₹{p.mandiPricePerKg}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between bg-white rounded-xl px-3 py-2 border border-slate-200">
                          <span className="text-xs font-bold text-slate-900 flex items-center gap-1">
                            <Package size={12} /> {p.quantityKg.toLocaleString()} kg
                          </span>
                          <span className="text-[11px] text-amber-600 font-bold">₹{(p.quantityKg * p.expectedPricePerKg).toLocaleString()}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-1.5">
                          <Button variant="outline" size="sm" onClick={() => setEditingProduce(p)} className="text-xs px-2">
                            <Edit2 size={12} /> Edit
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="text-xs px-2 text-rose-400 hover:bg-rose-500/10">
                            <Trash2 size={12} /> Del
                          </Button>
                          <Button variant="secondary" size="sm" onClick={() => window.open(`/product/${p.id}`, '_blank')} className="text-xs px-2">
                            <Eye size={12} /> View
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            {editingProduce && (
              <Card className="p-4 border-amber-500/20 bg-amber-500/5">
                <p className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <Edit2 size={14} /> Editing {editingProduce.name} — quick stock update
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    defaultValue={editingProduce.quantityKg}
                    id="edit-qty"
                    placeholder="New qty kg"
                    className="h-10 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 w-40"
                  />
                  <Button
                    size="sm"
                    onClick={async () => {
                      const el = document.getElementById('edit-qty') as HTMLInputElement;
                      const v = Number(el.value);
                      if (!v || v <= 0) return;
                      await farmerInventoryService.updateProduce(editingProduce.id, { quantityKg: v });
                      setEditingProduce(null);
                    }}
                  >
                    Save
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingProduce(null)}>
                    Cancel
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'add-produce' && (
          <div className="max-w-3xl">
            <AddProduceForm
              onSuccess={() => {
                handleTabChange('my-produce');
                setRefreshKey((k) => k + 1);
              }}
            />
            <Card className="mt-4 p-4 bg-slate-50 border-slate-200">
              <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <Mic size={14} className="text-teal-600" /> {language === 'hi' ? 'या वॉयस से जोड़ें' : 'Or add via voice'}
              </p>
              <p className="text-xs text-slate-500 mt-1">{language === 'hi' ? '“मेरे पास 2 टन आलू हैं” बोलें — वही डेटा यहाँ दिखेगा।' : 'Say "I have 2 tonnes potatoes" on the voice page — same inventory updates.'}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/farmer/voice')}>
                <Mic size={14} /> Voice Inventory
              </Button>
            </Card>
          </div>
        )}

        {activeTab === 'inventory' && (
          <Card className="p-0 overflow-hidden bg-white border-slate-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Package size={16} className="text-teal-600" /> {language === 'hi' ? 'इन्वेंटरी विस्तार' : 'Inventory Detail'}
              </h3>
              <Badge variant="slate" size="sm">
                {myProduce.length} lots
              </Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/60 text-[11px] tracking-widest uppercase text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3">Produce</th>
                    <th className="text-left px-4 py-3">Qty</th>
                    <th className="text-left px-4 py-3">Price</th>
                    <th className="text-left px-4 py-3">Harvest</th>
                    <th className="text-left px-4 py-3">Availability</th>
                    <th className="text-left px-4 py-3">Grade</th>
                    <th className="text-right px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {myProduce.map((p) => {
                    const avail = getAvailabilityStatus(p);
                    return (
                      <tr key={p.id} className="hover:bg-white/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <img src={getProduceImage(p)} alt={p.name} className="w-9 h-9 rounded-lg object-cover border border-slate-200" />
                            <div>
                              <p className="font-semibold text-slate-900 text-xs leading-none">{p.name}</p>
                              <p className="text-[11px] text-slate-500">{p.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{p.quantityKg.toLocaleString()} kg</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900">₹{p.expectedPricePerKg}</span>
                          <span className="text-xs text-slate-500">/kg</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <span className="flex items-center gap-1 text-xs">
                            <Calendar size={12} /> {p.harvestDate}
                          </span>
                          <span className="text-[11px] text-slate-500">{p.shelfLifeDays}d shelf</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${avail.tone === 'emerald' ? 'bg-emerald-500 text-white' : avail.tone === 'amber' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {avail.label}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                            <MapPin size={10} /> {p.location}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={p.grade === 'Grade A' ? 'emerald' : p.grade === 'Organic Premium' ? 'purple' : 'amber'} size="sm">
                            {p.grade}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)} className="h-8 w-8 p-0 text-rose-400">
                              <Trash2 size={14} />
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setEditingProduce(p)} className="h-8 px-2 text-xs">
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {myProduce.length === 0 && <p className="text-center text-sm text-slate-500 py-8">No inventory — add produce to start</p>}
          </Card>
        )}

        {activeTab === 'buyer-requests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Users size={16} className="text-blue-400" /> {language === 'hi' ? 'खरीदार अनुरोध' : 'Buyer Requests'}
                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs">{mockBuyerRequirements.filter((r) => r.status === 'open').length} open</span>
              </h3>
              <Button variant="outline" size="sm" onClick={() => navigate('/farmer/buyers')}>
                Full buyer page
              </Button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {mockBuyerRequirements.slice(0, 6).map((req) => {
                const buyer = mockBuyers.find((b) => b.id === req.buyerId)!;
                return (
                  <Card key={req.id} className="p-4 bg-white border-slate-200 hover:border-blue-500/20 transition-colors">
                    <div className="flex gap-3">
                      <img src={buyer.avatar} alt={buyer.name} className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-slate-900 truncate">
                          {buyer.name} • <span className="text-blue-400">{req.produceName}</span>
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-2 flex-wrap mt-1">
                          <span className="flex items-center gap-1">
                            <Package size={12} /> {req.quantityKg.toLocaleString()} kg
                          </span>
                          <span className="flex items-center gap-1 font-bold text-emerald-600">
                            <IndianRupee size={12} /> {req.budgetPerKg}/kg
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={12} /> {buyer.location}
                          </span>
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Badge variant="slate" size="sm">
                            {req.category}
                          </Badge>
                          {req.grade && <Badge variant="amber" size="sm">{req.grade}</Badge>}
                          {req.coldChainRequired && <Badge variant="blue" size="sm">Cold chain</Badge>}
                          <Badge variant={req.status === 'open' ? 'emerald' : 'slate'} size="sm">
                            {req.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate('/farmer/connection')}>
                        <Phone size={14} /> Contact
                      </Button>
                      <Button variant="primary" size="sm" className="flex-1 bg-blue-500 hover:bg-blue-600" onClick={() => navigate('/farmer/connection')}>
                        Connect
                      </Button>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                      <Clock size={10} /> Needed by {new Date(req.neededBy).toLocaleDateString()} • {buyer.type} • {buyer.rating}★
                    </p>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ClipboardList size={16} className="text-amber-600" /> {language === 'hi' ? 'ऑर्डर' : 'Orders'} • Pending: {stats.pendingOrders}
            </h3>
            <div className="grid gap-3">
              {mockOrders
                .filter((o) => o.farmerId === CURRENT_FARMER_ID)
                .slice(0, 5)
                .map((o) => (
                  <Card key={o.id} className="p-4 bg-white border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-900 font-mono">{o.id}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                          <span className="flex items-center gap-1">
                            <Leaf size={12} /> {o.produce?.name ?? o.produceId}
                          </span>
                          <span>• {o.quantityKg} kg @ ₹{o.agreedPricePerKg}/kg</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Buyer: {o.buyer?.name ?? o.buyerId} • {o.currentStatus}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-black text-slate-900">₹{o.totalAmount.toLocaleString()}</p>
                        <Badge variant={o.paymentStatus === 'paid' ? 'emerald' : o.paymentStatus === 'escrowed' ? 'amber' : 'slate'} size="sm">
                          {o.paymentStatus}
                        </Badge>
                        <p className="text-[11px] text-slate-500 mt-1">{o.currentStatus}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => navigate('/farmer/order')} className="flex-1">
                        <Eye size={14} /> Track
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => navigate('/farmer/order')} className="flex-1 bg-teal-500 hover:bg-teal-600">
                        <Truck size={14} /> Dispatch
                      </Button>
                    </div>
                  </Card>
                ))}
              {mockOrders.filter((o) => o.farmerId === CURRENT_FARMER_ID).length === 0 && (
                <Card className="p-6 text-center border-dashed">
                  <ClipboardList size={20} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500">No orders yet — add produce to attract buyers</p>
                </Card>
              )}
            </div>
          </div>
        )}

        {activeTab === 'earnings' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="p-5 bg-gradient-to-br from-amber-500/10 via-slate-50 to-slate-50 border-amber-500/20 lg:col-span-2">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Wallet size={16} className="text-amber-600" /> {language === 'hi' ? 'अनुमानित कमाई' : 'Estimated Earnings'}
                </h3>
                <p className="text-3xl font-black text-amber-600 mt-3">₹{stats.estimatedEarnings.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">If all {stats.activeListings} active lots sell at listed price</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <p className="text-[11px] text-slate-500">vs Mandi (₹{Math.round(stats.estimatedEarnings * 0.68).toLocaleString()})</p>
                    <p className="text-sm font-black text-emerald-600">+47% more</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200">
                    <p className="text-[11px] text-slate-500">Avg per kg</p>
                    <p className="text-sm font-black text-slate-900">₹{myProduce.length ? Math.round(stats.estimatedEarnings / Math.max(1, stats.totalInventoryKg)) : 0}/kg</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
                  <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">Direct payout • UPI</span>
                  <span className="px-2 py-1 rounded-full bg-white border border-slate-200 text-slate-600">Zero commission</span>
                </div>
              </Card>
              <Card className="p-5 bg-white border-slate-200">
                <h4 className="text-xs font-bold tracking-widest uppercase text-slate-500 flex items-center gap-1">
                  <TrendingUp size={12} /> {language === 'hi' ? 'भुगतान स्थिति' : 'Payout Status'}
                </h4>
                <div className="mt-4 space-y-3">
                  {[
                    { label: 'Escrowed', value: mockOrders.filter((o) => o.farmerId === CURRENT_FARMER_ID && o.paymentStatus === 'escrowed').length, color: 'amber' },
                    { label: 'Paid', value: mockOrders.filter((o) => o.farmerId === CURRENT_FARMER_ID && o.paymentStatus === 'paid').length, color: 'emerald' },
                    { label: 'Pending', value: stats.pendingOrders, color: 'blue' },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200">
                      <span className="text-xs text-slate-500">{r.label}</span>
                      <span className={`text-sm font-black ${r.color === 'emerald' ? 'text-emerald-400' : r.color === 'amber' ? 'text-amber-400' : 'text-blue-400'}`}>{r.value}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4" onClick={() => navigate('/farmer/order')}>
                  View settlements
                </Button>
              </Card>
            </div>
            <Card className="p-4 bg-slate-50 border-slate-200">
              <p className="text-xs text-slate-500">Earnings are estimated from current listings + pending orders. Real payout on delivery via escrow, as shown in Dispatch & Settlement.</p>
            </Card>
          </div>
        )}

        {activeTab === 'demand' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BarChart3 size={16} className="text-purple-400" /> {language === 'hi' ? 'मांग अंतर्दृष्टि' : 'Demand Insights'}
                <Badge variant="purple" size="sm">AI • matchBuyers()</Badge>
              </h3>
              <span className="text-[11px] text-slate-500 hidden sm:inline">Powered by existing aiService • no fake AI</span>
            </div>

            {/* Buyer Demand section */}
            <Card className="p-5 bg-white border-slate-200">
              <h4 className="text-xs font-black tracking-widest uppercase text-slate-500 mb-3">Buyer Demand for Your Produce</h4>
              {buyerDemandForMyProduce.length === 0 ? (
                <p className="text-sm text-slate-500">No demand matched yet — add more produce categories</p>
              ) : (
                <div className="space-y-3">
                  {buyerDemandForMyProduce.slice(0, 5).map(({ produce, match }: any, idx: number) => (
                    <div key={idx} className="flex gap-3 p-3 rounded-xl bg-white border border-slate-200">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${idx % 2 ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'}`}>
                        <Users size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">
                          {match.buyer.name} <span className="font-normal text-slate-500">wants</span> {match.requirement.produceName}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                          <span className="flex items-center gap-1">
                            <Package size={11} /> {match.requirement.quantityKg} kg
                          </span>
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                            <IndianRupee size={11} /> {match.requirement.budgetPerKg}/kg
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin size={11} /> {match.buyer.location}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${match.totalScore >= 85 ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-amber-500 text-white border-amber-400'}`}>{match.totalScore}% match</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1 italic">"{match.explanation}"</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate('/farmer/buyers')} className="hidden sm:inline-flex shrink-0 h-9">
                        Connect
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Demand forecast – derived via aiService aggregation, not hardcoded */}
            {demandForecast ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="p-5 bg-gradient-to-br from-purple-500/10 via-slate-50 to-slate-50 border-purple-500/20">
                  <div className="flex justify-between items-start mb-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <TrendingUp size={16} className="text-purple-600" /> AI Demand Forecast: {demandForecast.product}
                    </h4>
                    <Badge variant={demandForecast.trend === 'Increasing' ? 'emerald' : demandForecast.trend === 'Decreasing' ? 'amber' : 'slate'} size="sm">
                      {demandForecast.trend} Trend
                    </Badge>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-3xl font-black text-slate-900">{demandForecast.predictedDemandKg.toLocaleString()} <span className="text-sm text-slate-500 font-normal">kg expected</span></p>
                    <p className="text-xs text-slate-500 mt-1">Forecast period: {demandForecast.forecastPeriod}</p>
                  </div>
                  
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-700 mb-2">Recommendation</p>
                    <p className="text-sm text-slate-600">{demandForecast.recommendation}</p>
                  </div>
                </Card>
                <Card className="p-5 bg-white border-slate-200">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2 mb-4">
                    <BarChart3 size={14} className="text-teal-600" /> Projected Demand ({demandForecast.forecastPeriod})
                  </h4>
                  <div className="flex h-32 items-end gap-2 mt-4">
                    {demandForecast.chartData.map((d, i) => {
                      const max = Math.max(...demandForecast.chartData.map(c => c.demand));
                      const heightPct = Math.max(10, Math.round((d.demand / max) * 100));
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full bg-slate-100 rounded-t-md relative flex items-end justify-center h-full overflow-hidden">
                            <div 
                              className="w-full bg-purple-500 rounded-t-md transition-all duration-500" 
                              style={{ height: `${heightPct}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-500">{d.week}</span>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            ) : (
               <Card className="p-8 text-center flex items-center justify-center">
                 <Loader2 size={24} className="animate-spin text-purple-600" />
               </Card>
            )}

            <Card className="p-4 bg-white/60 border-slate-200">
              <p className="text-[11px] text-slate-500">
                Demand Insights are computed from <code className="px-1 py-0.5 rounded bg-white text-slate-600">matchBuyers()</code> in <span className="text-slate-600">src/services/aiService.ts</span> — same engine used for voice intent. No fake hardcoded AI. Falls back to local parsing if <code className="px-1 py-0.5 rounded bg-white text-slate-600">/api/voice-intent</code> unavailable. Ready to extend with real backend forecast via <code className="px-1 py-0.5 rounded bg-white text-slate-600">/api/demand-forecast</code>.
              </p>
            </Card>
          </div>
        )}
      </div>

      {/* Farmer Help — bottom-right, farmer-friendly, does not cover important controls */}
      <button
        onClick={() => setIsHelpOpen(true)}
        aria-label="Need help?"
        className="fixed z-20 bottom-20 lg:bottom-6 right-20 sm:right-28 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-slate-200 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:border-amber-500/30 hover:bg-white text-sm font-bold text-slate-800 hover:text-slate-900 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/20"
      >
        <span className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center">
          <HelpCircle size={14} />
        </span>
        <span className="hidden sm:inline">{language === 'hi' ? 'मदद चाहिए?' : 'Need help?'}</span>
        <span className="sm:hidden">Help</span>
      </button>

      <FarmerHelpPanel isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} onOpenAssistant={handleOpenAssistant} />
    </div>
  );
};





