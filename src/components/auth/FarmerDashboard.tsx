import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tractor,
  Package,
  Plus,
  ClipboardList,
  TrendingUp,
  BarChart3,
  Truck,
  Mic,
  ShieldCheck,
  CheckCircle2,
  MapPin,
  Leaf,
  IndianRupee,
  Calendar,
  Sparkles,
  ArrowRight,
  LogOut,
  User,
  AlertCircle,
  Building,
  Star,
  Clock,
  Search,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import { mockOrders } from '../../data/mockData';
import { farmerInventoryService } from '../../services/farmerInventoryService';
import type { Produce, ProduceCategory, ProduceGrade } from '../../types';

type DashboardTab =
  | 'my-products'
  | 'add-product'
  | 'orders'
  | 'market-prices'
  | 'demand-forecast'
  | 'logistics'
  | 'ai-assistant';

const MANDI_PRICES = [
  { crop: 'Tomatoes (Hybrid)', mandi: 'Azadpur Mandi, Delhi', modalPrice: 28, msp: 18, trend: '+6.2%', status: 'high' },
  { crop: 'Wheat (Sharbati)', mandi: 'Khanna Mandi, Punjab', modalPrice: 32, msp: 24, trend: '+2.4%', status: 'stable' },
  { crop: 'Potatoes (Jyoti)', mandi: 'Agra Mandi, UP', modalPrice: 16, msp: 12, trend: '-1.8%', status: 'low' },
  { crop: 'Mustard Seeds', mandi: 'Alwar Mandi, Rajasthan', modalPrice: 58, msp: 56.5, trend: '+4.1%', status: 'high' },
  { crop: 'Basmati Rice (1121)', mandi: 'Karnal Mandi, Haryana', modalPrice: 85, msp: 70, trend: '+8.5%', status: 'high' },
  { crop: 'Onions (Red)', mandi: 'Lasalgaon Mandi, MH', modalPrice: 22, msp: 15, trend: '+3.0%', status: 'stable' },
];

export const FarmerDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>('my-products');

  // New product form state
  const [newProductName, setNewProductName] = useState('');
  const [newCategory, setNewCategory] = useState<ProduceCategory>('vegetables');
  const [newQuantity, setNewQuantity] = useState('500');
  const [newPrice, setNewPrice] = useState('32');
  const [newGrade, setNewGrade] = useState<ProduceGrade>('Grade A');
  const [addSuccessMsg, setAddSuccessMsg] = useState('');

  // Local state for products
  const [products, setProducts] = useState<Produce[]>(() => {
    return farmerInventoryService.getMyProduce(user?.uid || 'f-001');
  });

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim()) return;

    const added = farmerInventoryService.addProduce({
      produceName: newProductName.trim(),
      category: newCategory,
      quantity: parseFloat(newQuantity) || 100,
      unit: 'kg',
      grade: newGrade,
      expectedPrice: parseFloat(newPrice) || 20,
      location: `${user?.profile?.village || 'Dasna'}, ${user?.profile?.district || 'Ghaziabad'}`,
      state: user?.profile?.state || 'Uttar Pradesh',
      harvestDate: new Date().toISOString().split('T')[0],
      farmerId: user?.uid || 'f-001',
    });

    const updated = farmerInventoryService.getMyProduce(user?.uid || 'f-001');
    setProducts(updated);
    setAddSuccessMsg(`✓ Successfully listed ${newQuantity} kg of ${newProductName.trim()}!`);
    setNewProductName('');

    setTimeout(() => {
      setAddSuccessMsg('');
      setActiveTab('my-products');
    }, 1200);
  };

  const handleTriggerAiAssistant = () => {
    window.dispatchEvent(new CustomEvent('farmdirect:open-assistant'));
  };

  const verificationBadgeText = useMemo(() => {
    if (user?.profile?.verificationBadge) return user.profile.verificationBadge;
    if (user?.authMethod === 'digilocker') return 'DigiLocker Verified (Prototype)';
    if (user?.authMethod === 'aadhaar') return 'Aadhaar e-KYC (Prototype)';
    if (user?.authMethod === 'firebase-mobile') return 'Firebase Phone Verified';
    return 'Firebase Email Verified';
  }, [user]);

  const tabs: { id: DashboardTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'my-products', label: 'My Products', icon: Leaf },
    { id: 'add-product', label: 'Add Product', icon: Plus },
    { id: 'orders', label: 'Orders & Sales', icon: ClipboardList },
    { id: 'market-prices', label: 'Market Prices', icon: TrendingUp },
    { id: 'demand-forecast', label: 'Demand Forecast', icon: BarChart3 },
    { id: 'logistics', label: 'Logistics & Storage', icon: Truck },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Mic },
  ];

  return (
    <div className="space-y-6">
      {/* Official Top Welcome Banner with Verification Badge */}
      <div className="relative overflow-hidden rounded-3xl border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white p-6 shadow-xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {/* Mandatory Auth Method Verification Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-400/20 border border-emerald-300/40 text-emerald-200 text-xs font-bold shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>{verificationBadgeText}</span>
              </div>

              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[11px] font-semibold">
                <MapPin className="w-3.5 h-3.5 text-amber-300" />
                <span>
                  {user?.profile?.village || 'Dasna'}, {user?.profile?.district || 'Ghaziabad'} (
                  {user?.profile?.state || 'UP'})
                </span>
              </div>

              {user?.profile?.farmSize && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-200 text-[11px] font-semibold border border-amber-400/30">
                  Farm Size: {user.profile.farmSize}
                </span>
              )}
            </div>

            {/* Welcome, Demo Farmer 👋 headline */}
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome, {user?.name || 'Demo Farmer'} 👋
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
              Your verified agricultural dashboard. Direct wholesale marketplace, real-time APMC Mandi rates, temperature-controlled logistics & AI crop intelligence.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTriggerAiAssistant}
              icon={<Mic className="w-4 h-4 text-emerald-300" />}
              className="border-white/30 text-white hover:bg-white/10 bg-white/5"
            >
              Voice AI Assistant
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={logout}
              icon={<LogOut className="w-4 h-4 text-rose-300" />}
              className="border-rose-400/40 text-rose-200 hover:bg-rose-500/20 bg-rose-500/10"
            >
              Sign Out
            </Button>
          </div>
        </div>

        {/* Quick Profile Summary Bar */}
        <div className="mt-5 pt-4 border-t border-emerald-600/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-emerald-300/80 text-[11px] block">Category:</span>
            <span className="font-bold text-white capitalize">{user?.profile?.userType || 'Farmer'}</span>
          </div>
          <div>
            <span className="text-emerald-300/80 text-[11px] block">DBT Status:</span>
            <span className="font-bold text-amber-300">
              {user?.profile?.bankStatus === 'dbt_linked' ? '✓ PM-KISAN Active' : 'AePS Ready'}
            </span>
          </div>
          <div>
            <span className="text-emerald-300/80 text-[11px] block">Active Listings:</span>
            <span className="font-bold text-white">{products.length} Lots Listed</span>
          </div>
          <div>
            <span className="text-emerald-300/80 text-[11px] block">Settlement Cycle:</span>
            <span className="font-bold text-emerald-200">T+0 Direct UPI / NEFT</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT 1: My Products */}
      {activeTab === 'my-products' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">My Listed Produce ({products.length})</h3>
              <p className="text-xs text-slate-500">Live lots accessible by institutional and retail buyers.</p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('add-product')}
              icon={<Plus className="w-4 h-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Add New Lot
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl border-2 border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 capitalize">
                        {prod.category}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 mt-1">{prod.name}</h4>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                      {prod.grade || 'Grade A'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2">
                    {prod.nameHi ? `पारंपरिक उपज (${prod.nameHi})` : 'Farm-fresh quality harvested lot.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Available Qty:</span>
                      <span className="font-extrabold text-slate-900">{prod.quantityKg} kg</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Asking Rate:</span>
                      <span className="font-extrabold text-emerald-700">₹{prod.expectedPricePerKg}/kg</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-100">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    {prod.location || 'Ghaziabad, UP'}
                  </span>
                  <span className="text-emerald-700 font-bold">● Active in Mandi</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: Add Product */}
      {activeTab === 'add-product' && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border-2 border-slate-200 p-6 sm:p-8 shadow-md">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h3 className="text-lg font-bold text-slate-900">List New Produce for Sale</h3>
              <p className="text-xs text-slate-500">Post directly to the FarmDirect marketplace without brokers.</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              0% Mandi Commission
            </span>
          </div>

          {addSuccessMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{addSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleAddProduct} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Produce / Crop Name
              </label>
              <input
                type="text"
                required
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="e.g. Desi Hybrid Tomatoes / Sharbati Wheat"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="vegetables">Vegetables</option>
                  <option value="grains">Grains</option>
                  <option value="fruits">Fruits</option>
                  <option value="pulses">Pulses</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quantity (in Kilograms)
                </label>
                <input
                  type="number"
                  required
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="500"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expected Rate (₹ per Kg)
                </label>
                <input
                  type="number"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="32"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Quality Grade
                </label>
                <select
                  value={newGrade}
                  onChange={(e) => setNewGrade(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
                >
                  <option value="Grade A">Grade A (Export / Premium Quality)</option>
                  <option value="Grade B">Grade B (Standard Mandi Quality)</option>
                  <option value="Organic Premium">Organic Premium</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Storage Type
                </label>
                <select className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                  <option>Ambient Farm Storage</option>
                  <option>Cold Storage Available</option>
                  <option>Dry Warehouse Stored</option>
                </select>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                type="button"
                onClick={() => setActiveTab('my-products')}
                className="flex-1 py-3"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                icon={<CheckCircle2 className="w-4 h-4" />}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                List Produce Now
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* TAB CONTENT 3: Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Procurement Orders & Deliveries</h3>
              <p className="text-xs text-slate-500">Track buyers, payment settlements, and logistics pickup status.</p>
            </div>
          </div>

          <div className="space-y-3">
            {mockOrders.slice(0, 4).map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">{order.id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900">
                      {order.currentStatus.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-slate-900">{order.produce?.name || 'Produce Lot'}</h4>
                  <p className="text-xs text-slate-500">
                    Buyer: <span className="font-semibold text-slate-700">{order.buyer?.name || order.buyerId || 'Kisan Agro Traders'}</span> • Quantity:{' '}
                    <span className="font-bold text-slate-800">{order.quantityKg} kg</span>
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <span className="text-xs text-slate-400">Total Settlement:</span>
                  <span className="text-lg font-black text-emerald-700">₹{order.totalAmount.toLocaleString()}</span>
                  <span className="text-[10px] text-emerald-600 font-bold mt-0.5">Escrow Guaranteed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: Market Prices */}
      {activeTab === 'market-prices' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Real-Time APMC Mandi Rates</h3>
              <p className="text-xs text-slate-500">National Agriculture Market (e-NAM) daily spot pricing & MSP.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Crop / Commodity</th>
                    <th className="px-4 py-3">Reporting APMC Mandi</th>
                    <th className="px-4 py-3 text-right">Modal Rate (₹/Kg)</th>
                    <th className="px-4 py-3 text-right">Govt. MSP (₹/Kg)</th>
                    <th className="px-4 py-3 text-right">24h Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MANDI_PRICES.map((row) => (
                    <tr key={row.crop} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5 font-bold text-slate-900">{row.crop}</td>
                      <td className="px-4 py-3.5 text-slate-600">{row.mandi}</td>
                      <td className="px-4 py-3.5 text-right font-extrabold text-slate-900">₹{row.modalPrice}</td>
                      <td className="px-4 py-3.5 text-right text-slate-500 font-medium">₹{row.msp}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-600">{row.trend}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: Demand Forecast */}
      {activeTab === 'demand-forecast' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">AI-Powered Demand & Price Prediction</h3>
            <p className="text-xs text-slate-500">
              Harvest timing advisory based on wholesale contract volume and historic festival demand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Tomatoes</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  SURGE EXPECTED
                </span>
              </div>
              <h4 className="text-xl font-extrabold text-emerald-700">₹34 - ₹38 / kg</h4>
              <p className="text-xs text-slate-500">
                Supply contraction in southern mandis anticipated. Best selling window: next 10-14 days.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Wheat (Sharbati)</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                  HIGH INSTITUTIONAL DEMAND
                </span>
              </div>
              <h4 className="text-xl font-extrabold text-blue-700">₹32 - ₹35 / kg</h4>
              <p className="text-xs text-slate-500">
                Major flour mills seeking 5,000+ MT lots with protein certification.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Mustard Seeds</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                  STEADY BUYING
                </span>
              </div>
              <h4 className="text-xl font-extrabold text-amber-700">₹58 - ₹62 / kg</h4>
              <p className="text-xs text-slate-500">
                Oil processing demand stable. Excellent export opportunities for Grade A lots.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 6: Logistics */}
      {activeTab === 'logistics' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Farm Logistics & Cold Chain Network</h3>
            <p className="text-xs text-slate-500">Book refrigerated transport and nearby solar cold storages.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Farm-Gate Pickup Vehicles</h4>
                  <p className="text-xs text-slate-500">Available across NCR, Haryana, and West UP</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Schedule an electric mini-truck (1 MT capacity) or large 5 MT insulated container directly to your farm.
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Check Vehicle Availability
              </Button>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Nearby Gramin Cold Storage</h4>
                  <p className="text-xs text-slate-500">Dasna Hub • 3.2 km from your registered village</p>
                </div>
              </div>
              <p className="text-xs text-slate-600">
                Capacity: 45 MT available. Subsidized rates under Agriculture Infrastructure Fund (AIF).
              </p>
              <Button variant="outline" size="sm" className="w-full">
                Reserve Storage Space
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 7: AI Assistant */}
      {activeTab === 'ai-assistant' && (
        <div className="bg-white rounded-2xl border-2 border-emerald-500/30 p-6 sm:p-8 text-center space-y-4 shadow-md">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-600 mx-auto flex items-center justify-center shadow-inner">
            <Mic className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900">FarmDirect Multilingual AI Voice Assistant</h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-lg mx-auto">
              Speak naturally in Hindi, English, Punjabi, or Bhojpuri to check mandi rates, add produce, or connect with buyers.
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={handleTriggerAiAssistant}
              icon={<Sparkles className="w-5 h-5 text-amber-300" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-emerald-600/20"
            >
              Open Live Voice Assistant Widget
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
