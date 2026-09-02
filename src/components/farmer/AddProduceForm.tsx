import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { ProduceCategory, ProduceGrade } from '../../types';
import { farmerInventoryService, type ProduceUnit } from '../../services/farmerInventoryService';
import { CheckCircle2, AlertCircle, Package, IndianRupee, MapPin, Calendar, Leaf, Award, Image as ImageIcon, Truck } from 'lucide-react';

interface AddProduceFormProps {
  onSuccess?: (produceId: string) => void;
  onCancel?: () => void;
}

const categories: ProduceCategory[] = ['vegetables', 'fruits', 'grains', 'pulses', 'spices'];
const grades: ProduceGrade[] = ['Grade A', 'Grade B', 'Organic Premium'];
const units: ProduceUnit[] = ['kg', 'quintal', 'tonne', 'bag'];
const unitLabels: Record<ProduceUnit, string> = {
  kg: 'kg',
  quintal: 'quintal (100 kg)',
  tonne: 'tonne (1000 kg)',
  bag: 'bag (50 kg)',
};

export const AddProduceForm: React.FC<AddProduceFormProps> = ({ onSuccess, onCancel }) => {
  const [produceName, setProduceName] = useState('');
  const [category, setCategory] = useState<ProduceCategory>('vegetables');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<ProduceUnit>('kg');
  const [grade, setGrade] = useState<ProduceGrade>('Grade A');
  const [expectedPrice, setExpectedPrice] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [location, setLocation] = useState('');
  const [stateName, setStateName] = useState('Uttar Pradesh');
  const [harvestDate, setHarvestDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [image, setImage] = useState('');
  const [shelfLife, setShelfLife] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!produceName.trim()) e.produceName = 'Produce/crop name is required';
    if (!quantity || Number(quantity) <= 0) e.quantity = 'Quantity must be > 0';
    if (!expectedPrice || Number(expectedPrice) <= 0) e.expectedPrice = 'Expected price is required';
    if (Number(minPrice) > Number(expectedPrice) && minPrice) e.minPrice = 'Min price cannot exceed expected price';
    if (!location.trim()) e.location = 'Location is required';
    if (!harvestDate) e.harvestDate = 'Harvest date is required';
    if (image && !/^https?:\/\/.+/.test(image.trim())) e.image = 'Image must be a valid URL';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setSuccess(null);
    if (!validate()) return;
    setSubmitting(true);
    try {
      const produce = await farmerInventoryService.addProduce({
        produceName: produceName.trim(),
        category,
        quantity: Number(quantity),
        unit,
        grade,
        expectedPrice: Number(expectedPrice),
        minPrice: minPrice ? Number(minPrice) : undefined,
        location: location.trim(),
        state: stateName.trim() || 'Uttar Pradesh',
        harvestDate,
        image: image.trim() || undefined,
        shelfLifeDays: shelfLife ? Number(shelfLife) : undefined,
      });
      setSuccess(`Added ${produce.name} — ${produce.quantityKg} kg now in inventory`);
      // reset form partially
      setProduceName('');
      setQuantity('');
      setExpectedPrice('');
      setMinPrice('');
      setImage('');
      // notify parent for immediate inventory refresh
      onSuccess?.(produce.id);
    } catch (err: any) {
      setErrors({ submit: err?.message ?? 'Failed to add produce' });
    } finally {
      setSubmitting(false);
    }
  };

  const qtyKgPreview = quantity ? Math.round(farmerInventoryService.unitToKg(Number(quantity) || 0, unit)) : 0;

  return (
    <Card className="p-5 sm:p-6 bg-white border-slate-200 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Package size={18} className="text-amber-600" /> Add Produce
          </h3>
          <p className="text-xs text-slate-500 mt-1">List your harvest directly — buyers see it instantly in the marketplace.</p>
        </div>
        <Badge variant="amber" size="sm">Seller • FPO verified</Badge>
      </div>

      {success && (
        <div className="mb-4 flex gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {errors.submit && (
        <div className="mb-4 flex gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{errors.submit}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Row1: produce name + category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Produce / Crop name <span className="text-rose-500">*</span>
            </label>
            <input
              value={produceName}
              onChange={(e) => setProduceName(e.target.value)}
              placeholder="e.g. Tomato, Potato, Wheat"
              className={`w-full h-11 px-3 rounded-xl bg-white border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${errors.produceName ? 'border-rose-300' : 'border-slate-200 focus:border-amber-300'}`}
            />
            {errors.produceName && <p className="text-[11px] text-rose-600 mt-1">{errors.produceName}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Leaf size={11} className="text-emerald-600" /> Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProduceCategory)}
              className="w-full h-11 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
            >
              {categories.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row2: quantity + unit + grade */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Quantity <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="500"
              className={`w-full h-11 px-3 rounded-xl bg-white border text-sm text-slate-900 focus:outline-none focus:ring-2 ${errors.quantity ? 'border-rose-300' : 'border-slate-200 focus:border-amber-300'}`}
            />
            {errors.quantity && <p className="text-[11px] text-rose-600 mt-1">{errors.quantity}</p>}
            {qtyKgPreview > 0 && <p className="text-[11px] text-amber-600 mt-1">= {qtyKgPreview.toLocaleString()} kg</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Unit <span className="text-rose-500">*</span></label>
            <select value={unit} onChange={(e) => setUnit(e.target.value as ProduceUnit)} className="w-full h-11 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900">
              {units.map((u) => (
                <option key={u} value={u}>
                  {unitLabels[u]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Award size={11} className="text-amber-600" /> Grade / Quality <span className="text-rose-500">*</span>
            </label>
            <select value={grade} onChange={(e) => setGrade(e.target.value as ProduceGrade)} className="w-full h-11 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900">
              {grades.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row3: prices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <IndianRupee size={11} /> Expected price (₹/kg) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={expectedPrice}
              onChange={(e) => setExpectedPrice(e.target.value)}
              placeholder="27"
              className={`w-full h-11 px-3 rounded-xl bg-white border text-sm text-slate-900 ${errors.expectedPrice ? 'border-rose-300' : 'border-slate-200'}`}
            />
            {errors.expectedPrice && <p className="text-[11px] text-rose-600 mt-1">{errors.expectedPrice}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <IndianRupee size={11} /> Min acceptable price (₹/kg)
            </label>
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Optional"
              className={`w-full h-11 px-3 rounded-xl bg-white border text-sm text-slate-900 ${errors.minPrice ? 'border-rose-300' : 'border-slate-200'}`}
            />
            {errors.minPrice && <p className="text-[11px] text-rose-600 mt-1">{errors.minPrice}</p>}
            <p className="text-[11px] text-slate-500 mt-1">If supported — fallback is 75% of expected</p>
          </div>
        </div>

        {/* Row4: location + state + harvest */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <MapPin size={11} /> Location <span className="text-rose-500">*</span>
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Dasna, Ghaziabad"
              className={`w-full h-11 px-3 rounded-xl bg-white border text-sm text-slate-900 ${errors.location ? 'border-rose-300' : 'border-slate-200'}`}
            />
            {errors.location && <p className="text-[11px] text-rose-600 mt-1">{errors.location}</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">State</label>
            <input value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="Uttar Pradesh" className="w-full h-11 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Calendar size={11} /> Harvest date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              className={`w-full h-11 px-3 rounded-xl bg-white border text-sm text-slate-900 ${errors.harvestDate ? 'border-rose-300' : 'border-slate-200'}`}
            />
            {errors.harvestDate && <p className="text-[11px] text-rose-600 mt-1">{errors.harvestDate}</p>}
          </div>
        </div>

        {/* Row5: shelf life + image */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Truck size={11} /> Availability / Shelf life (days)
            </label>
            <input type="number" min="1" value={shelfLife} onChange={(e) => setShelfLife(e.target.value)} placeholder="Auto by category" className="w-full h-11 px-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-900" />
            <p className="text-[11px] text-slate-500 mt-1">Leave blank to auto (veg 5, fruit 7, grain 180)</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <ImageIcon size={11} /> Product image URL
            </label>
            <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." className={`w-full h-11 px-3 rounded-xl bg-white border text-sm text-slate-900 ${errors.image ? 'border-rose-300' : 'border-slate-200'}`} />
            {errors.image && <p className="text-[11px] text-rose-600 mt-1">{errors.image}</p>}
            <p className="text-[11px] text-slate-500 mt-1">If supported — shown in marketplace</p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" disabled={submitting} className="flex-1 bg-amber-500 hover:bg-amber-400 text-white border-amber-500">
            {submitting ? 'Adding...' : 'Add to Inventory'}
          </Button>
        </div>
        <p className="text-[11px] text-slate-500 text-center">Validates locally • Attempts /api/produce then localStorage • Inventory refreshes instantly</p>
      </form>
    </Card>
  );
};
