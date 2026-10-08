import React, { useState } from 'react';
import { CheckCircle2, ShieldCheck, MapPin, Sprout, Building, Wallet, ArrowRight, UserCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { UserTypeSelector } from './UserTypeSelector';
import type { AuthUser, UserProfile, UserType } from '../../types/auth';

interface ProfileSetupProps {
  user: AuthUser;
  onComplete: (profile: UserProfile) => void;
}

const INDIAN_STATES = [
  'Uttar Pradesh',
  'Punjab',
  'Haryana',
  'Madhya Pradesh',
  'Rajasthan',
  'Maharashtra',
  'Gujarat',
  'Bihar',
  'Karnataka',
  'Andhra Pradesh',
  'Telangana',
  'West Bengal',
  'Uttarakhand',
  'Himachal Pradesh',
  'Tamil Nadu',
];

const FARM_SIZES = [
  '< 1 Acre (Marginal Farmer)',
  '1 - 2 Acres (Small Farmer)',
  '2 - 5 Acres (Semi-Medium)',
  '5 - 10 Acres (Medium)',
  '10+ Acres (Large Holding)',
  'N/A (Buyer / Organization)',
];

const POPULAR_CROPS = [
  'Tomatoes',
  'Wheat',
  'Potatoes',
  'Basmati Rice',
  'Mustard',
  'Onions',
  'Paddy',
  'Pulses (Chana/Dal)',
  'Soybean',
  'Sugarcane',
  'Cotton',
  'Green Chillies',
];

export const ProfileSetup: React.FC<ProfileSetupProps> = ({ user, onComplete }) => {
  const [userType, setUserType] = useState<UserType>(user.userType || 'farmer');
  const [name, setName] = useState(user.profile?.name || user.name || 'Demo Farmer');
  const [mobile, setMobile] = useState(user.profile?.mobile || user.phoneNumber || '+91 98765 43210');
  const [village, setVillage] = useState(user.profile?.village || 'Dasna');
  const [district, setDistrict] = useState(user.profile?.district || 'Ghaziabad');
  const [state, setState] = useState(user.profile?.state || 'Uttar Pradesh');
  const [farmSize, setFarmSize] = useState(user.profile?.farmSize || '2 - 5 Acres (Semi-Medium)');
  const [selectedCrops, setSelectedCrops] = useState<string[]>(
    user.profile?.mainCrops?.length ? user.profile.mainCrops : ['Tomatoes', 'Wheat']
  );
  const [bankStatus, setBankStatus] = useState<'dbt_linked' | 'jan_dhan_active' | 'aeps_ready' | 'pending'>(
    user.profile?.bankStatus || 'dbt_linked'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleCrop = (crop: string) => {
    if (selectedCrops.includes(crop)) {
      setSelectedCrops(selectedCrops.filter((c) => c !== crop));
    } else {
      setSelectedCrops([...selectedCrops, crop]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const completeProfile: UserProfile = {
      name: name.trim() || 'Demo Farmer',
      mobile: mobile.trim(),
      email: user.email || undefined,
      userType,
      village: village.trim() || 'Village Center',
      district: district.trim() || 'District Hub',
      state,
      farmSize: userType === 'farmer' || userType === 'fpo' ? farmSize : 'N/A',
      mainCrops: selectedCrops,
      bankStatus,
      authMethod: user.authMethod,
      verifiedAt: new Date().toISOString(),
      verificationBadge:
        user.authMethod === 'digilocker'
          ? 'DigiLocker Verified (Prototype)'
          : user.authMethod === 'aadhaar'
          ? 'Aadhaar e-KYC (Prototype)'
          : 'Firebase Auth Verified',
      isDemo: user.isDemo,
    };

    setTimeout(() => {
      onComplete(completeProfile);
    }, 600);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Verification Success Notice Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-300 text-emerald-950 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Identity Authenticated
            </span>
            <h3 className="text-base font-extrabold text-emerald-950 leading-tight">
              {user.verificationMessage || '✓ Verification successful (Prototype)'}
            </h3>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-200/80 text-emerald-900 text-xs font-extrabold">
          <ShieldCheck className="w-4 h-4 text-emerald-700" />
          <span>Verified Session</span>
        </div>
      </div>

      {/* Main Profile Form Card */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Complete Your Digital Kisan Profile
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Setup your agricultural profile to connect directly with wholesale buyers and transparent mandi rates.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: User Type Selector */}
          <UserTypeSelector selectedType={userType} onSelect={setUserType} />

          {/* Step 2: Personal & Location Details */}
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Personal & Agricultural Details
              </label>
              <span className="text-[11px] text-emerald-700 font-semibold">Step 2 of 2</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name / Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Mobile Number
                </label>
                <input
                  type="text"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Village / Tehsil
                </label>
                <input
                  type="text"
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Dasna"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  District
                </label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Ghaziabad"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  State
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Farm Size (Applicable for farmers/FPOs) */}
            {(userType === 'farmer' || userType === 'fpo') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Total Farm Cultivation Size
                </label>
                <select
                  value={farmSize}
                  onChange={(e) => setFarmSize(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
                >
                  {FARM_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Main Crops Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Primary Crops Produced / Traded (Click to toggle)
              </label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_CROPS.map((crop) => {
                  const isChecked = selectedCrops.includes(crop);
                  return (
                    <button
                      type="button"
                      key={crop}
                      onClick={() => toggleCrop(crop)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isChecked
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}
                      {crop}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bank Account Status (Do NOT collect real bank numbers) */}
            <div className="pt-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Direct Benefit Transfer (DBT) & Settlement Status
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { id: 'dbt_linked', title: 'PM-KISAN DBT Linked', desc: 'Direct bank credit enabled' },
                  { id: 'jan_dhan_active', title: 'Jan Dhan Account Active', desc: 'Zero balance DBT ready' },
                  { id: 'aeps_ready', title: 'AePS / Aadhaar Ready', desc: 'Micro-ATM withdrawal enabled' },
                ].map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setBankStatus(item.id as any)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      bankStatus === item.id
                        ? 'border-emerald-600 bg-emerald-50/70'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">{item.title}</span>
                      {bankStatus === item.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{item.desc}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Note: No real bank account numbers or IFSC codes are requested or stored.
              </p>
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            type="submit"
            disabled={isSubmitting}
            icon={<ArrowRight className="w-4 h-4" />}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20"
          >
            {isSubmitting ? 'Saving Profile...' : 'Complete Profile & Enter Dashboard'}
          </Button>
        </form>
      </div>
    </div>
  );
};
