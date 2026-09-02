import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDemo } from '../context/DemoContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { getProductByIdSync, getProduceImage, getFarmerForProduce, getFPOForProduce, getPricing, getAvailabilityStatus, parseDisplayName } from '../services/productService';
import {
  ArrowLeft,
  MapPin,
  Package,
  IndianRupee,
  Star,
  ShieldCheck,
  Phone,
  ShoppingCart,
  Leaf,
  Clock,
  Award,
  Warehouse,
  Truck,
  Calendar,
  Thermometer,
  Droplets,
  TrendingDown,
  Eye,
} from 'lucide-react';

export const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, setRole } = useDemo();
  const produce = useMemo(() => (id ? getProductByIdSync(id) : undefined), [id]);
  const [qty, setQty] = useState<number>(produce ? Math.min(100, produce.quantityKg) : 100);

  if (!produce) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p className="text-slate-500">Product not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/')} className="mt-4">
          Back to marketplace
        </Button>
      </div>
    );
  }

  const farmer = getFarmerForProduce(produce);
  const fpo = getFPOForProduce(produce);
  const pricing = getPricing(produce);
  const availability = getAvailabilityStatus(produce);
  const display = parseDisplayName(produce);

  const totalSelling = qty * pricing.sellingPrice;
  const totalMarket = qty * pricing.marketPrice;
  const totalSaving = totalMarket - totalSelling;

  const handleBuy = () => {
    setRole('consumer');
    navigate('/consumer/order');
  };
  const handleContact = () => {
    setRole('consumer');
    navigate('/consumer/call');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6">
        {/* Left: image + details */}
        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden bg-white border border-slate-200">
            <img src={getProduceImage(produce)} alt={produce.name} className="w-full h-72 object-cover" />
          </div>

          <Card className="p-5">
            <h1 className="text-2xl font-black text-slate-900">{produce.name}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {display.crop} • {produce.category} • {farmer.village}, {farmer.district}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant={produce.grade === 'Grade A' ? 'emerald' : produce.grade === 'Organic Premium' ? 'purple' : 'amber'}>{produce.grade}</Badge>
              {produce.certifications?.map((c) => (
                <Badge key={c} variant="slate">
                  {c}
                </Badge>
              ))}
              <span
                className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                  availability.tone === 'emerald'
                    ? 'bg-emerald-500 text-white border-emerald-400'
                    : availability.tone === 'amber'
                      ? 'bg-amber-500 text-white border-amber-400'
                      : 'bg-rose-500 text-white border-rose-400'
                }`}
              >
                {availability.label}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-white border border-slate-200 p-3">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Package size={12} /> Quantity available
                </p>
                <p className="font-bold text-slate-900 mt-1">{produce.quantityKg.toLocaleString()} kg</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-3">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin size={12} /> Location
                </p>
                <p className="font-bold text-slate-900 mt-1">{produce.location}</p>
                <p className="text-xs text-slate-500">{produce.state}</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-3">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Calendar size={12} /> Harvest
                </p>
                <p className="font-bold text-slate-900 mt-1">{produce.harvestDate ?? '—'}</p>
                <p className="text-xs text-slate-500">{produce.shelfLifeDays ? `${produce.shelfLifeDays} days shelf life` : ''}</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-3">
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Leaf size={12} /> Category
                </p>
                <p className="font-bold text-slate-900 mt-1 capitalize">{produce.category}</p>
              </div>
            </div>

            {produce.storageRequirements && (
              <div className="mt-4 rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-500">
                <p className="font-bold text-slate-900 flex items-center gap-2 mb-1">
                  <Warehouse size={14} className="text-teal-600" /> Storage
                </p>
                <p className="flex items-center gap-2">
                  <Thermometer size={12} /> {produce.storageRequirements.temperatureCMin}–{produce.storageRequirements.temperatureCMax}°C
                  <Droplets size={12} className="ml-3" /> {produce.storageRequirements.humidityPctMin}–{produce.storageRequirements.humidityPctMax}%
                </p>
                <p className="flex items-center gap-1 mt-1">
                  <Truck size={12} /> {produce.storageRequirements.coldChainRequired ? 'Cold-chain required' : 'Ambient OK'}
                </p>
              </div>
            )}
          </Card>
        </div>

        {/* Right: pricing + seller + actions */}
        <div className="space-y-4">
          <Card className="p-5 bg-gradient-to-br from-white to-slate-50/60">
            <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500">Pricing</p>
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className="flex items-center text-3xl font-black text-slate-900">
                  <IndianRupee size={22} className="text-emerald-600" />
                  {pricing.sellingPrice}
                  <span className="text-sm font-bold text-slate-500 ml-1">/kg</span>
                </span>
                <span className="px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-1">
                  <TrendingDown size={12} /> -{pricing.discountPercent}% OFF
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                <span className="line-through">Market price ₹{pricing.marketPrice}/kg</span>
                <span>• Save ₹{pricing.savingPerKg}/kg</span>
              </p>
              <p className="text-xs text-slate-600 mt-1">Mandi ref ₹{pricing.referenceMandiPrice}/kg</p>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quantity (kg)</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setQty((p) => Math.max(10, p - 50))} className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-900">
                  −
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Math.min(Math.max(10, Number(e.target.value) || 10), produce.quantityKg))}
                  className="flex-1 h-9 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 text-center"
                />
                <button onClick={() => setQty((p) => Math.min(produce.quantityKg, p + 50))} className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-900">
                  +
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-white border border-slate-200 p-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  {qty} kg × ₹{pricing.sellingPrice}
                </span>
                <span className="font-bold text-slate-900">₹{totalSelling.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 line-through">
                <span>Market</span>
                <span>₹{totalMarket.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-emerald-600 mt-2 pt-2 border-t border-slate-200">
                <span>You save</span>
                <span>₹{totalSaving.toLocaleString()}</span>
              </div>
            </div>

            <Button variant="primary" size="lg" onClick={handleBuy} icon={<ShoppingCart size={18} />} className="w-full mt-4 justify-center">
              Buy Now • ₹{totalSelling.toLocaleString()}
            </Button>
            <Button variant="outline" size="md" onClick={handleContact} icon={<Phone size={16} />} className="w-full mt-2 justify-center">
              Contact Farmer Directly
            </Button>
            <p className="text-[11px] text-slate-500 mt-2 text-center">Direct trade • UPI escrow • Zero commission</p>
          </Card>

          <Card className="p-5">
            <p className="text-xs font-bold tracking-widest uppercase text-slate-500 mb-3">Seller Information</p>
            <div className="flex items-start gap-3">
              <img src={farmer.avatar} alt={farmer.name} className="w-12 h-12 rounded-2xl object-cover border border-slate-200" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                  {farmer.name}
                  {farmer.verificationStatus === 'verified' && <Badge variant="emerald" size="sm"><ShieldCheck size={10} /> Verified</Badge>}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={12} /> {farmer.village}, {farmer.district}, {farmer.state}
                </p>
                <p className="text-xs text-slate-600 mt-2 flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Star size={12} className="text-amber-600 fill-amber-400" /> {farmer.rating} ({farmer.totalDeals} deals)
                  </span>
                  {(farmer as any).reliabilityPct && <span className="text-emerald-600 flex items-center gap-1"><Award size={12} /> {(farmer as any).reliabilityPct}%</span>}
                </p>
                {fpo && <p className="text-xs text-slate-500 mt-2">FPO: <span className="font-semibold text-slate-800">{fpo.name}</span></p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={`tel:${farmer.phone}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold">
                    <Phone size={12} /> {farmer.phone}
                  </a>
                  <Button variant="outline" size="sm" onClick={handleContact}>
                    Direct Contact
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Warehouse size={14} className="text-emerald-600" /> Logistics
            </p>
            <p className="text-xs text-slate-500 mt-1">EV cold-chain, FPO aggregation, same-day delivery where available.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/consumer/logistics')}>
                <Truck size={14} /> Logistics
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/consumer/storage')}>
                <Warehouse size={14} /> Storage
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};


