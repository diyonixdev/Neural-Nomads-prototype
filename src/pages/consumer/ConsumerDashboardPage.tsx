import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { mockOrders } from '../../data/mockData';
import {
  Mic,
  Keyboard,
  Sprout,
  ShieldCheck,
  ShoppingBag,
  MapPin,
  Package,
  Clock,
  ArrowRight,
  User,
} from 'lucide-react';

export const ConsumerDashboardPage: React.FC = () => {
  const { language } = useDemo();
  const navigate = useNavigate();
  const [typedRequirement, setTypedRequirement] = useState('');

  // UI-only recent requests from existing mock data (no business logic)
  const recentRequests = mockOrders.slice(0, 3);

  const handleVoiceStart = () => {
    navigate('/consumer/voice');
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // UI only – route to voice page where processing happens
    // Do not implement processing here per STEP 6 constraints
    if (typedRequirement.trim().length > 0) {
      navigate('/consumer/voice');
    } else {
      navigate('/consumer/voice');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Brand / Tagline Header */}
      <div className="text-center space-y-3 pt-2">
        <div className="inline-flex items-center justify-center gap-2">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Sprout size={22} />
          </div>
          <div className="text-left">
            <p className="text-[11px] font-bold tracking-widest text-emerald-600 uppercase leading-none">
              FarmDirect AI
            </p>
            <p className="text-sm font-extrabold text-slate-900 leading-none">Neural Nomads</p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
          {language === 'hi'
            ? 'बिना बिचौलियों के — सीधे किसान से ताज़ा उपज | किसानों और खरीदारों के लिए वॉयस-फर्स्ट बाज़ार'
            : 'Zero-middleman, farm-fresh sourcing — voice-first marketplace for buyers and farmers.'}
        </p>
      </div>

      {/* Main Voice CTA Card */}
      <Card className="p-6 sm:p-8 border-slate-200 bg-gradient-to-br from-white via-slate-50 to-white relative overflow-hidden">
        {/* subtle glow */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center space-y-5">
          <div className="space-y-2">
            <Badge variant="emerald" size="sm" icon={<ShieldCheck size={12} />}>
              {language === 'hi' ? 'हिंदी • Hinglish • English' : 'Hindi • Hinglish • English'}
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
              {language === 'hi' ? 'आज आपको क्या चाहिए?' : 'What do you need today?'}
            </h1>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {language === 'hi'
                ? 'अपनी फसल, मात्रा और जगह बोलें — हम सीधे सत्यापित किसानों से जोड़ेंगे।'
                : 'Speak your crop, quantity and delivery location — we match you directly with verified farmers.'}
            </p>
          </div>

          {/* Primary Voice CTA */}
          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              icon={<Mic size={20} />}
              onClick={handleVoiceStart}
              className="w-full sm:w-auto min-w-[280px] h-[56px] text-[15px] shadow-emerald-500/25"
            >
              <span role="img" aria-label="mic" className="mr-0.5">
                🎙️
              </span>
              {language === 'hi' ? 'वॉयस अनुरोध शुरू करें' : 'Start Voice Request'}
            </Button>
            <p className="text-[11px] text-slate-500 mt-2.5">
              {language === 'hi' ? 'माइक दबाएँ और स्वाभाविक रूप से बोलें' : 'Tap, speak naturally — no typing needed'}
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 max-w-sm mx-auto py-1">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
              {language === 'hi' ? 'या' : 'or'}
            </span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Secondary Text CTA – UI only */}
          <form onSubmit={handleTextSubmit} className="max-w-md mx-auto space-y-2.5 text-left">
            <label htmlFor="typed-requirement" className="block text-xs font-semibold text-slate-600">
              {language === 'hi' ? 'अपनी आवश्यकता टाइप करें' : 'Type your requirement'}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Keyboard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="typed-requirement"
                  type="text"
                  value={typedRequirement}
                  onChange={(e) => setTypedRequirement(e.target.value)}
                  placeholder={
                    language === 'hi'
                      ? 'उदा. मुझे 500 किलो टमाटर गाजियाबाद में चाहिए'
                      : 'e.g. I need 500 kg tomatoes in Ghaziabad tomorrow'
                  }
                  className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40"
                />
              </div>
              <Button type="submit" variant="outline" size="md" className="shrink-0 h-11">
                <ArrowRight size={16} />
                <span className="hidden sm:inline ml-1">{language === 'hi' ? 'जाएँ' : 'Go'}</span>
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">
              {language === 'hi'
                ? 'टाइप करके भी वॉयस पेज पर जाएँ — प्रोसेसिंग वहीं होगी'
                : 'Typing routes to the voice page — processing stays there'}
            </p>
          </form>
        </div>
      </Card>

      {/* Trust / Info Strip */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
        <Card className="p-3 bg-slate-50 border-slate-200 flex flex-col items-center gap-1.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <ShieldCheck size={16} />
          </div>
          <span className="text-[11px] font-semibold text-slate-800">
            {language === 'hi' ? 'सत्यापित किसान' : 'Verified Farmers'}
          </span>
          <span className="text-[10px] text-slate-500 leading-tight">
            {language === 'hi' ? 'FPO जाँचा' : 'FPO-verified'}
          </span>
        </Card>
        <Card className="p-3 bg-slate-50 border-slate-200 flex flex-col items-center gap-1.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
            <Package size={16} />
          </div>
          <span className="text-[11px] font-semibold text-slate-800">
            {language === 'hi' ? 'सीधा सौदा' : 'Direct Trade'}
          </span>
          <span className="text-[10px] text-slate-500 leading-tight">
            {language === 'hi' ? '0% कमीशन' : '0% commission'}
          </span>
        </Card>
        <Card className="p-3 bg-slate-50 border-slate-200 flex flex-col items-center gap-1.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
            <Clock size={16} />
          </div>
          <span className="text-[11px] font-semibold text-slate-800">
            {language === 'hi' ? 'तेज़ डिलीवरी' : 'Fast Fulfilment'}
          </span>
          <span className="text-[10px] text-slate-500 leading-tight">
            {language === 'hi' ? 'कोल्ड-चेन' : 'Cold-chain'}
          </span>
        </Card>
      </div>

      {/* Recent Requests – from existing mock data (UI only) */}
      <Card className="p-5 border-slate-200/60 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag size={14} className="text-emerald-600" />
              {language === 'hi' ? 'हाल के अनुरोध' : 'Recent Requests'}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {language === 'hi' ? 'आपके पिछले ऑर्डर — केवल प्रदर्शन' : 'Your recent orders — display only'}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/consumer/order')} className="text-xs">
            {language === 'hi' ? 'सभी देखें' : 'View all'}
            <ArrowRight size={12} />
          </Button>
        </div>

        <div className="space-y-3">
          {recentRequests.map((order) => (
            <div
              key={order.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-white/50 border border-slate-200 hover:border-slate-200 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <Package size={16} className="text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-slate-900 truncate">
                    {order.produce?.name ?? order.produceId ?? 'Produce'}
                  </span>
                  <Badge
                    variant={
                      order.currentStatus === 'in_transit'
                        ? 'blue'
                        : order.currentStatus === 'delivered'
                          ? 'emerald'
                          : order.currentStatus === 'negotiating'
                            ? 'amber'
                            : 'slate'
                    }
                    size="sm"
                  >
                    {order.currentStatus.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Package size={11} /> {order.quantityKg} kg
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin size={11} /> {order.produce?.location ?? order.storageAllocated?.location ?? 'Ghaziabad'}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/consumer/order')}
                className="shrink-0 hidden sm:inline-flex"
              >
                {language === 'hi' ? 'विवरण' : 'Details'}
              </Button>
            </div>
          ))}
        </div>

        {recentRequests.length === 0 && (
          <p className="text-xs text-slate-500 text-center py-6">
            {language === 'hi' ? 'अभी कोई अनुरोध नहीं' : 'No requests yet — start with voice above'}
          </p>
        )}
      </Card>

      {/* Consumer Profile / Account Area – from existing context */}
      <Card className="p-5 border-slate-200/60 bg-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-800 shrink-0">
            <User size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold tracking-widest text-slate-500 uppercase">
              {language === 'hi' ? 'खरीदार खाता' : 'Consumer Account'}
            </p>
            <p className="text-sm font-bold text-slate-900 truncate">
              {language === 'hi' ? 'सत्यापित खरीदार' : 'Verified Buyer'}
            </p>
            <p className="text-[11px] text-slate-500 truncate">
              {language === 'hi' ? 'उपभोक्ता मोड • भाषा: ' : 'Consumer mode • Language: '}
              {language === 'hi' ? 'हिन्दी' : 'English'}
            </p>
          </div>
          <Badge variant="emerald" icon={<ShieldCheck size={12} />}>
            {language === 'hi' ? 'सत्यापित' : 'Verified'}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/consumer/matches')} className="w-full">
            <ShoppingBag size={14} />
            {language === 'hi' ? 'किसान देखें' : 'Browse Farmers'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/consumer/tracking')} className="w-full">
            <MapPin size={14} />
            {language === 'hi' ? 'ट्रैकिंग' : 'Tracking'}
          </Button>
        </div>
      </Card>

      {/* Simple bottom helper */}
      <p className="text-center text-[11px] text-slate-500 px-4">
        {language === 'hi'
          ? 'सुझाव: स्पष्ट बोलें — “मुझे 200 किलो आलू नोएडा में चाहिए”'
          : 'Tip: Speak clearly — e.g., “I need 200 kg potatoes in Noida tomorrow”'}
      </p>
    </div>
  );
};





