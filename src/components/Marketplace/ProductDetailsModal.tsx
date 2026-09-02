import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Produce } from '../../types';
import { getProduceImage, getFarmerForProduce, getFPOForProduce, getPricing, getAvailabilityStatus, parseDisplayName } from '../../services/productService';
import { useDemo } from '../../context/DemoContext';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import {
  MapPin,
  Package,
  IndianRupee,
  Star,
  Award,
  Leaf,
  Clock,
  ShieldCheck,
  Phone,
  Truck,
  Warehouse,
  TrendingDown,
  ShoppingCart,
  Eye,
  Calendar,
  Thermometer,
  Droplets,
  X,
} from 'lucide-react';

interface ProductDetailsModalProps {
  produce: Produce;
  isOpen: boolean;
  onClose: () => void;
  onBuy: (produce: Produce) => void;
  onContact: (produce: Produce) => void;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({ produce, isOpen, onClose, onBuy, onContact }) => {
  const { language } = useDemo();
  const navigate = useNavigate();
  const [qty, setQty] = useState<number>(Math.min(100, produce.quantityKg));
  const [showFullImage, setShowFullImage] = useState(false);

  const farmer = getFarmerForProduce(produce);
  const fpo = getFPOForProduce(produce);
  const pricing = getPricing(produce);
  const availability = getAvailabilityStatus(produce);
  const display = parseDisplayName(produce);

  const totalSelling = qty * pricing.sellingPrice;
  const totalMarket = qty * pricing.marketPrice;
  const totalSaving = totalMarket - totalSelling;

  const handleQtyChange = (delta: number) => {
    setQty((prev) => {
      const next = prev + delta;
      if (next < 10) return 10;
      if (next > produce.quantityKg) return produce.quantityKg;
      return next;
    });
  };

  const handleDirectBuy = () => {
    onBuy(produce);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={display.crop} maxWidth="max-w-3xl">
      <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1 -mr-1">
        {/* Image + quick badges */}
        <div className="relative rounded-2xl overflow-hidden bg-white border border-slate-200">
          <img
            src={getProduceImage(produce)}
            alt={produce.name}
            className="w-full h-56 sm:h-64 object-cover cursor-zoom-in"
            onClick={() => setShowFullImage(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white/70 via-transparent to-transparent pointer-events-none" />
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-white backdrop-blur border border-slate-200 text-slate-900">
              {produce.grade}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500 text-white shadow">-{pricing.discountPercent}% OFF</span>
          </div>
          <div className="absolute top-3 right-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-bold border backdrop-blur ${
                availability.tone === 'emerald'
                  ? 'bg-emerald-500 text-white border-emerald-400'
                  : availability.tone === 'amber'
                    ? 'bg-amber-500 text-white border-amber-400'
                    : 'bg-rose-500 text-white border-rose-400'
              }`}
            >
              {availability.label} • {produce.quantityKg.toLocaleString()} kg
            </span>
          </div>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white backdrop-blur border border-slate-200 text-xs font-medium text-slate-800">
              <Leaf size={12} className="text-emerald-600" /> {produce.category} • {produce.state}
            </span>
            <button
              onClick={() => setShowFullImage(true)}
              className="p-2 rounded-full bg-white/90 text-slate-900 hover:bg-white transition-colors"
              title="View larger"
            >
              <Eye size={14} />
            </button>
          </div>
        </div>

        {/* Title + grade */}
        <div>
          <h3 className="text-xl font-black text-slate-900 leading-tight">{produce.name}</h3>
          <p className="text-sm text-slate-500 mt-1">
            {produce.nameHi !== produce.name ? produce.nameHi + ' • ' : ''}
            {farmer.village}, {farmer.district} • Harvest {produce.harvestDate ?? '—'}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={produce.grade === 'Grade A' ? 'emerald' : produce.grade === 'Organic Premium' ? 'purple' : 'amber'} size="sm">
              {produce.grade}
            </Badge>
            {produce.certifications?.map((c) => (
              <Badge key={c} variant="slate" size="sm" icon={<ShieldCheck size={10} />}>
                {c}
              </Badge>
            ))}
            {produce.pesticideResidueStatus === 'clear' && (
              <Badge variant="emerald" size="sm">
                Residue clear
              </Badge>
            )}
            {produce.shelfLifeDays && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs text-slate-600">
                <Clock size={12} /> {produce.shelfLifeDays} days shelf life
              </span>
            )}
          </div>
        </div>

        {/* Pricing hierarchy as per spec */}
        <div className="rounded-2xl bg-gradient-to-br from-white to-slate-50/60 border border-slate-200 p-4">
          <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-2">Pricing</p>
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="flex items-center text-2xl font-black text-slate-900">
              <IndianRupee size={20} className="text-emerald-600" />
              {pricing.sellingPrice}
              <span className="text-sm font-bold text-slate-500 ml-1">/kg</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold">
              <TrendingDown size={12} /> Save ₹{pricing.savingPerKg}/kg
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-slate-500">
              <span className="line-through flex items-center">
                Market price <IndianRupee size={10} className="ml-1" /> {pricing.marketPrice}/kg
              </span>
              <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white text-[10px] font-black">-{pricing.discountPercent}% OFF</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-500">
              Mandi ref <IndianRupee size={10} className="inline" /> {pricing.referenceMandiPrice}/kg
            </span>
          </div>

          {/* Qty selector + totals */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Quantity (kg)</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleQtyChange(-50)}
                  className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center"
                >
                  −
                </button>
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isNaN(v)) setQty(Math.min(Math.max(10, v), produce.quantityKg));
                  }}
                  className="flex-1 h-9 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  onClick={() => handleQtyChange(50)}
                  className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center"
                >
                  +
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{availability.label} • {produce.quantityKg.toLocaleString()} kg available</p>
            </div>
            <div className="rounded-xl bg-white border border-slate-200 p-3">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{qty} kg × ₹{pricing.sellingPrice}</span>
                <span className="font-bold text-slate-900">₹{totalSelling.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 line-through mt-1">
                <span>Market</span>
                <span>₹{totalMarket.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-emerald-600 mt-2 pt-2 border-t border-slate-200">
                <span>You save</span>
                <span>₹{totalSaving.toLocaleString()} ({pricing.discountPercent}% OFF)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <Button variant="primary" size="md" onClick={handleDirectBuy} icon={<ShoppingCart size={16} />} className="flex-1 justify-center">
              {language === 'hi' ? 'ऑर्डर करें' : `Buy ${qty}kg • ₹${totalSelling.toLocaleString()}`}
            </Button>
            <Button variant="outline" size="md" onClick={() => onContact(produce)} icon={<Phone size={16} />} className="sm:w-auto justify-center">
              Contact Farmer
            </Button>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-600" /> Direct farmer trade • UPI escrow • No commission
          </p>
        </div>

        {/* Seller / Farmer info */}
        <div className="rounded-2xl bg-white border border-slate-200 p-4">
          <p className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-3">Seller Information</p>
          <div className="flex items-start gap-3">
            <img src={farmer.avatar} alt={farmer.name} className="w-12 h-12 rounded-2xl object-cover border border-slate-200 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black text-slate-900 flex items-center gap-2">
                {farmer.name}
                {farmer.verificationStatus === 'verified' && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-bold">
                    <ShieldCheck size={10} /> Verified
                  </span>
                )}
                {farmer.fpoMember && (
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">{farmer.fpoName ?? 'FPO'}</span>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <MapPin size={12} /> {farmer.village}, {farmer.district}, {farmer.state} • {farmer.distanceKm ?? 0} km away
              </p>
              <div className="mt-2 flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-slate-600">
                  <Star size={12} className="text-amber-600 fill-amber-400" /> {farmer.rating} ({farmer.totalDeals} deals)
                </span>
                {typeof (farmer as any).reliabilityPct === 'number' && (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <Award size={12} /> {(farmer as any).reliabilityPct}% reliable
                  </span>
                )}
              </div>
              {fpo && (
                <p className="text-xs text-slate-500 mt-2">
                  FPO: <span className="font-semibold text-slate-800">{fpo.name}</span> • {fpo.primaryCrops.slice(0, 3).join(', ')}
                </p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`tel:${farmer.phone}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
                >
                  <Phone size={12} /> {farmer.phone}
                </a>
                <button
                  onClick={() => onContact(produce)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800"
                >
                  <ShieldCheck size={12} /> Direct Contact
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Availability + location + logistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Package size={14} className="text-emerald-600" /> Availability
            </p>
            <p className="text-sm font-semibold text-slate-900 mt-1">{produce.quantityKg.toLocaleString()} kg</p>
            <p className="text-xs text-slate-500">
              Location: {produce.location}, {produce.state} • Harvest: {produce.harvestDate ?? '—'}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {produce.availableFrom && (
                <span className="px-2 py-1 rounded-full bg-white border border-slate-200 text-[11px] text-slate-600 flex items-center gap-1">
                  <Calendar size={10} /> From {new Date(produce.availableFrom).toLocaleDateString()}
                </span>
              )}
              {produce.shelfLifeDays && (
                <span className="px-2 py-1 rounded-full bg-white border border-slate-200 text-[11px] text-slate-600 flex items-center gap-1">
                  <Clock size={10} /> {produce.shelfLifeDays} days
                </span>
              )}
            </div>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Warehouse size={14} className="text-teal-600" /> Storage & Logistics
            </p>
            {produce.storageRequirements ? (
              <div className="mt-1 space-y-1 text-xs text-slate-500">
                <p className="flex items-center gap-1.5">
                  <Thermometer size={12} /> {produce.storageRequirements.temperatureCMin}–{produce.storageRequirements.temperatureCMax}°C{' '}
                  <Droplets size={12} className="ml-2" /> {produce.storageRequirements.humidityPctMin}–{produce.storageRequirements.humidityPctMax}%
                </p>
                <p className="flex items-center gap-1.5">
                  <Truck size={12} /> {produce.storageRequirements.coldChainRequired ? 'Cold-chain required' : 'Ambient OK'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Standard handling • EV logistics available</p>
            )}
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500">
              <Truck size={12} /> Same-day EV cold-chain • <Warehouse size={12} /> FPO aggregation
            </div>
          </div>
        </div>

        {/* View full product page link */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <button
            onClick={() => {
              onClose();
              navigate(`/product/${produce.id}`);
            }}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-300 inline-flex items-center gap-1"
          >
            <Eye size={12} /> View full product page
          </button>
          <span className="text-[11px] text-slate-500">ID: {produce.id}</span>
        </div>
      </div>

      {/* Full image overlay */}
      {showFullImage && (
        <div className="fixed inset-0 z-[60] bg-white/90 backdrop-blur flex items-center justify-center p-4" onClick={() => setShowFullImage(false)}>
          <img src={getProduceImage(produce)} alt={produce.name} className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl" />
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white border border-slate-200 text-slate-900 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </Modal>
  );
};


