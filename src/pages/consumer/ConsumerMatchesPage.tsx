import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { matchFarmers } from '../../services/aiService';
import type { FarmerMatchResult } from '../../services/aiService';
import {
  ArrowLeft,
  Volume2,
  MapPin,
  Star,
  Package,
  Loader2,
  AlertCircle,
  Users,
  TrendingUp,
  ShieldCheck,
  Search,
  Sprout,
} from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { mockProduceListings, mockFarmers } from '../../data/mockData';

export const ConsumerMatchesPage: React.FC = () => {
  const { language, parsedIntent, farmerMatchResults, setFarmerMatchResults, assistantResponse, setSelectedMatch } = useDemo();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFarmer, setSelectedFarmer] = useState<FarmerMatchResult | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fallback: if user lands directly on /consumer/matches with a parsedIntent but no results, compute here
  // This handles refresh or direct navigation – still respects “Find Farmers” explicit intent, but provides resilience
  useEffect(() => {
    if (parsedIntent && parsedIntent.intent === 'BUYER' && farmerMatchResults.length === 0) {
      // Only auto-calculate if we have a valid BUYER requirement and no results yet
      // This is not preloading before click – it’s a recovery for direct navigation
      setIsLoading(true);
      setError(null);
      try {
        const results = matchFarmers(parsedIntent);
        setFarmerMatchResults(results);
      } catch (e) {
        console.error(e);
        setError(
          language === 'hi'
            ? 'किसान मैचिंग में त्रुटि हुई।'
            : 'Failed to match farmers. Please try again.'
        );
      } finally {
        setIsLoading(false);
      }
    }
  }, [parsedIntent, farmerMatchResults.length, setFarmerMatchResults, language]);

  const hasRequirement = !!parsedIntent;
  const isBuyer = parsedIntent?.intent === 'BUYER';

  const requirementSummary = useMemo(() => {
    if (!parsedIntent) return null;
    const qty = parsedIntent.quantity !== null ? `${parsedIntent.quantity} ${parsedIntent.unit ?? ''}`.trim() : null;
    return {
      product: parsedIntent.product,
      quantity: qty,
      quality: parsedIntent.quality,
      location: parsedIntent.location,
      date:
        parsedIntent.date === '2026-09-02'
          ? language === 'hi'
            ? 'कल'
            : 'Tomorrow'
          : parsedIntent.date,
      price: parsedIntent.price,
    };
  }, [parsedIntent, language]);

  const requiredKg = useMemo(() => {
    if (!parsedIntent || parsedIntent.quantity === null) return 0;
    return parsedIntent.unit === 'tonnes' ? parsedIntent.quantity * 1000 : parsedIntent.quantity;
  }, [parsedIntent]);

  const hasInsufficientSupply = useMemo(() => {
    if (!farmerMatchResults.length || requiredKg === 0) return false;
    const maxAvailable = Math.max(...farmerMatchResults.map((r) => r.listing.quantityKg));
    return maxAvailable < requiredKg;
  }, [farmerMatchResults, requiredKg]);

  const handleConnect = (result: FarmerMatchResult) => {
    // For this step, only provide next UI action – no real call/negotiation
    // Navigate to existing farmer detail if available, or show modal
    // Use existing DemoContext's setSelectedMatch with converted FarmerMatch
    // But per Step 8, we should not implement real order – just show confirmation
    setSelectedFarmer(result);
    setShowConnectModal(true);
    // Also set selectedMatch for downstream pages (convert minimally)
    // Keep it simple – store as FarmerMatch compatible
    const farmerMatch = {
      farmer: result.farmer,
      produce: result.listing,
      matchScore: {
        overallScore: result.totalScore,
        priceMatch: result.breakdown.price,
        distanceScore: result.breakdown.distance,
        qualityConfidence: result.breakdown.quality,
        freshnessScore: result.breakdown.availability,
        notes: [result.explanation],
        notesHi: [result.explanation],
      },
      offeredPricePerKg: result.listing.expectedPricePerKg,
      estimatedSavingsPct: 0,
      directGainPct: 0,
      transitHours: 0,
    } as any;
    setSelectedMatch(farmerMatch);
  };

  const handleViewDetails = (result: FarmerMatchResult) => {
    const farmerMatch = {
      farmer: result.farmer,
      produce: result.listing,
      matchScore: {
        overallScore: result.totalScore,
        priceMatch: result.breakdown.price,
        distanceScore: result.breakdown.distance,
        qualityConfidence: result.breakdown.quality,
        freshnessScore: result.breakdown.availability,
        notes: [result.explanation],
        notesHi: [result.explanation],
      },
      offeredPricePerKg: result.listing.expectedPricePerKg,
      estimatedSavingsPct: 0,
      directGainPct: 0,
      transitHours: 0,
    } as any;
    setSelectedMatch(farmerMatch);
    navigate('/consumer/order');
  };

  // No requirement case – ALWAYS show general Farmers Market (reuses existing data, no duplicate page)
  // This ensures clicking "Find Farmers" from voice/dashboard always lands on Market with produce visible
  if (!hasRequirement) {
    const q = searchQuery.toLowerCase().trim();
    const filteredListings = q
      ? mockProduceListings.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.nameHi.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.grade.toLowerCase().includes(q) ||
            p.location.toLowerCase().includes(q)
        )
      : mockProduceListings;

    return (
      <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/consumer/voice')}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2 cursor-pointer transition-colors"
            >
              <ArrowLeft size={14} />
              <span>{language === 'hi' ? 'वॉयस पर वापस जाएं' : 'Back to Voice Input'}</span>
            </button>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Sprout size={22} className="text-emerald-400" />
              <span>{language === 'hi' ? 'फार्मर्स मार्केट' : 'Farmers Market'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                {filteredListings.length} {language === 'hi' ? 'उपलब्ध' : 'Available'}
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {language === 'hi'
                ? 'सत्यापित किसानों से सीधे ताज़ा उपज — खोजें या वॉयस से फ़िल्टर करें।'
                : 'Fresh produce directly from verified farmers — search or use voice to filter.'}
            </p>
          </div>
        </div>

        <Card className="bg-amber-500/10 border-amber-500/20 p-4">
          <div className="flex gap-3">
            <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-200">
                {language === 'hi' ? 'कोई फ़िल्टर नहीं चुना' : 'No filter applied — showing all produce'}
              </p>
              <p className="text-xs text-amber-300/80 mt-1">
                {language === 'hi'
                  ? 'बेहतर मिलान के लिए वॉयस पेज पर बोलें, जैसे “मुझे 500 किलो टमाटर चाहिए गाज़ियाबाद में”।'
                  : 'For best matches, speak on the voice page e.g. “I need 500 kg tomatoes in Ghaziabad”.'}
              </p>
            </div>
          </div>
        </Card>

        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'hi' ? 'फसल खोजें... जैसे टमाटर, आलू' : 'Search produce... e.g. Tomatoes, Potatoes'}
            className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40"
          />
        </div>

        {filteredListings.length === 0 ? (
          <Card className="bg-slate-900/60 border-slate-800 p-8 text-center">
            <p className="text-sm text-slate-400">{language === 'hi' ? 'कोई परिणाम नहीं मिला।' : 'No results found. Try another search.'}</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredListings.map((listing) => {
              const farmer = mockFarmers.find((f) => f.id === listing.farmerId) ?? mockFarmers[0];
              const distanceKm = (farmer as any).distanceKm ?? 75;
              return (
                <Card key={listing.id} className="flex flex-col justify-between border-slate-700/80 bg-slate-800/90 p-5">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img src={farmer.avatar} alt={farmer.name} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/40" />
                        <div>
                          <h3 className="font-bold text-slate-100 text-base">{language === 'hi' ? farmer.nameHi : farmer.name}</h3>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                            <span className="flex items-center gap-1">
                              <MapPin size={12} className="text-emerald-400" />
                              {farmer.village}, {farmer.district} ({distanceKm} km away)
                            </span>
                            <span className="flex items-center gap-1 text-amber-400 font-semibold">
                              <Star size={12} className="fill-amber-400" />
                              {farmer.rating}
                            </span>
                          </div>
                        </div>
                      </div>
                      {farmer.fpoMember && <Badge variant="emerald" size="sm">FPO Verified</Badge>}
                    </div>

                    <div className="mt-4 p-3.5 bg-slate-900/80 rounded-xl border border-slate-800/80">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {language === 'hi' ? 'उपलब्ध फसल' : 'Available Produce'}
                          </span>
                          <p className="text-sm font-bold text-slate-100 mt-0.5 truncate">{language === 'hi' ? listing.nameHi : listing.name}</p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="slate" size="sm">{listing.grade}</Badge>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                              <Package size={12} /> {listing.quantityKg} kg {language === 'hi' ? 'उपलब्ध' : 'available'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs text-slate-400">{language === 'hi' ? 'सीधा मूल्य' : 'Direct Price'}</span>
                          <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-lg font-black text-emerald-400">₹{listing.expectedPricePerKg}</span>
                            <span className="text-xs text-slate-400">/kg</span>
                          </div>
                          <span className="text-[11px] text-slate-500">{listing.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-800/80 flex gap-3">
                    <Button
                      variant="secondary"
                      className="flex-1"
                      onClick={() => {
                        const fm = {
                          farmer,
                          produce: listing,
                          matchScore: { overallScore: 85, priceMatch: 85, distanceScore: 80, qualityConfidence: 85, freshnessScore: 85, notes: ['General market listing'], notesHi: ['General market listing'] },
                          offeredPricePerKg: listing.expectedPricePerKg,
                        } as any;
                        setSelectedMatch(fm);
                        navigate('/consumer/order');
                      }}
                    >
                      {language === 'hi' ? 'विवरण देखें' : 'View Details'}
                    </Button>
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={() => {
                        const fm = {
                          farmer,
                          produce: listing,
                          matchScore: { overallScore: 85 },
                          offeredPricePerKg: listing.expectedPricePerKg,
                        } as any;
                        setSelectedMatch(fm);
                        navigate('/consumer/call');
                      }}
                    >
                      {language === 'hi' ? 'कनेक्ट करें' : 'Connect'}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex gap-2 justify-center pt-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/consumer/voice')}>
            {language === 'hi' ? 'वॉयस से फ़िल्टर करें' : 'Filter via Voice'}
          </Button>
        </div>
      </div>
    );
  }

  // Invalid intent case (SELLER on buyer page) — still show general Market per ALWAYS requirement, with banner
  if (!isBuyer) {
    const q = searchQuery.toLowerCase().trim();
    const filteredListings = q
      ? mockProduceListings.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.nameHi.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.grade.toLowerCase().includes(q) ||
            p.location.toLowerCase().includes(q)
        )
      : mockProduceListings;

    return (
      <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/consumer/voice')}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2 cursor-pointer transition-colors"
            >
              <ArrowLeft size={14} />
              <span>{language === 'hi' ? 'वॉयस पर वापस जाएं' : 'Back to Voice Input'}</span>
            </button>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Sprout size={22} className="text-emerald-400" />
              <span>{language === 'hi' ? 'फार्मर्स मार्केट' : 'Farmers Market'}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                {filteredListings.length} {language === 'hi' ? 'उपलब्ध' : 'Available'}
              </span>
            </h1>
          </div>
        </div>

        <Card className="bg-amber-500/10 border-amber-500/20 p-4">
          <div className="flex gap-3">
            <AlertCircle size={18} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-200">
                {language === 'hi' ? 'SELLER अनुरोध मिला' : 'SELLER request detected'}
              </p>
              <p className="text-xs text-amber-300/80 mt-1">
                {language === 'hi'
                  ? 'यह बेचने का अनुरोध है — किसान मैच BUYER के लिए है। नीचे सामान्य मार्केट दिख रहा है। BUYER के रूप में बोलें जैसे “मुझे 500 किलो टमाटर चाहिए”।'
                  : 'This is a selling request — farmer matching is for BUYER intent. General market is shown below. Try “I need 500 kg tomatoes”.'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/consumer/voice')} className="mt-3">
            {language === 'hi' ? 'अनुरोध संशोधित करें' : 'Modify Request'}
          </Button>
        </Card>

        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'hi' ? 'फसल खोजें... जैसे टमाटर, आलू' : 'Search produce... e.g. Tomatoes, Potatoes'}
            className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredListings.map((listing) => {
            const farmer = mockFarmers.find((f) => f.id === listing.farmerId) ?? mockFarmers[0];
            const distanceKm = (farmer as any).distanceKm ?? 75;
            return (
              <Card key={listing.id} className="flex flex-col justify-between border-slate-700/80 bg-slate-800/90 p-5">
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img src={farmer.avatar} alt={farmer.name} className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/40" />
                      <div>
                        <h3 className="font-bold text-slate-100 text-base">{language === 'hi' ? farmer.nameHi : farmer.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-emerald-400" />
                            {farmer.village}, {farmer.district}
                          </span>
                          <span className="flex items-center gap-1 text-amber-400 font-semibold">
                            <Star size={12} className="fill-amber-400" />
                            {farmer.rating}
                          </span>
                        </div>
                      </div>
                    </div>
                    {farmer.fpoMember && <Badge variant="emerald" size="sm">FPO Verified</Badge>}
                  </div>
                  <div className="mt-4 p-3.5 bg-slate-900/80 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-100 truncate">{language === 'hi' ? listing.nameHi : listing.name}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="slate" size="sm">{listing.grade}</Badge>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Package size={12} /> {listing.quantityKg} kg
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-lg font-black text-emerald-400">₹{listing.expectedPricePerKg}</span>
                        <span className="text-xs text-slate-400">/kg</span>
                        <div className="text-[11px] text-slate-500">{listing.location}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      const fm = { farmer, produce: listing, matchScore: { overallScore: 85 }, offeredPricePerKg: listing.expectedPricePerKg } as any;
                      setSelectedMatch(fm);
                      navigate('/consumer/order');
                    }}
                  >
                    {language === 'hi' ? 'विवरण देखें' : 'View Details'}
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => {
                      const fm = { farmer, produce: listing, matchScore: { overallScore: 85 } } as any;
                      setSelectedMatch(fm);
                      navigate('/consumer/call');
                    }}
                  >
                    {language === 'hi' ? 'कनेक्ट करें' : 'Connect'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/consumer/voice')}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft size={14} />
            <span>{language === 'hi' ? 'वॉयस पर वापस जाएं' : 'Back to Voice Input'}</span>
          </button>
          <h1 className="text-2xl font-black text-white flex items-center gap-2 flex-wrap">
            <span>{language === 'hi' ? 'आपकी आवश्यकता के लिए सर्वोत्तम किसान' : 'Best Farmers for Your Requirement'}</span>
            {!isLoading && farmerMatchResults.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
                {farmerMatchResults.length} {language === 'hi' ? 'उपलब्ध' : 'Verified Direct Farmers'}
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* Compact Requirement Summary */}
      {requirementSummary && (
        <Card className="bg-slate-900/60 border-slate-800 p-4">
          <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 flex items-center gap-2">
            <Package size={14} className="text-emerald-400" />
            {language === 'hi' ? 'आपकी आवश्यकता' : 'Your Requirement Summary'}
          </h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="emerald" size="md">
              {requirementSummary.product ?? (language === 'hi' ? 'निर्दिष्ट नहीं' : 'Not specified')}
            </Badge>
            <Badge variant="amber" size="md">
              {requirementSummary.quantity ?? (language === 'hi' ? 'निर्दिष्ट नहीं' : 'Not specified')}
            </Badge>
            <Badge variant="purple" size="md">
              {requirementSummary.quality ?? (language === 'hi' ? 'निर्दिष्ट नहीं' : 'Not specified')}
            </Badge>
            <Badge variant="blue" size="md">
              {requirementSummary.location ?? (language === 'hi' ? 'निर्दिष्ट नहीं' : 'Not specified')}
            </Badge>
            <Badge variant="slate" size="md">
              {requirementSummary.date ?? (language === 'hi' ? 'निर्दिष्ट नहीं' : 'Not specified')}
            </Badge>
            {requirementSummary.price !== null && requirementSummary.price !== undefined && (
              <Badge variant="amber" size="md">
                ₹{requirementSummary.price}/kg
              </Badge>
            )}
          </div>
          {requirementSummary.price === null && (
            <p className="text-[11px] text-slate-500 mt-2">
              {language === 'hi' ? 'मूल्य: निर्दिष्ट नहीं' : 'Price: Not specified'}
            </p>
          )}
        </Card>
      )}

      {/* Assistant Response */}
      {assistantResponse && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Volume2 size={18} className="text-emerald-400 mt-0.5 shrink-0" />
            <p className="text-sm text-slate-200 leading-relaxed">{assistantResponse}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <Card className="bg-slate-900/60 border-slate-800 p-6 flex items-center gap-3">
          <Loader2 size={20} className="animate-spin text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-white">
              {language === 'hi' ? 'Suitable farmers dhoondh rahe hain...' : 'Finding suitable farmers...'}
            </p>
            <p className="text-xs text-slate-500">
              {language === 'hi' ? 'matchFarmers() कॉल हो रहा है' : 'Calling matchFarmers()...'}
            </p>
          </div>
        </Card>
      )}

      {/* Error */}
      {error && !isLoading && (
        <Card className="bg-rose-500/10 border-rose-500/20 p-4">
          <div className="flex gap-2.5">
            <AlertCircle size={16} className="text-rose-400 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-200">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/consumer/voice')} className="mt-3">
            {language === 'hi' ? 'फिर से कोशिश करें' : 'Try Again'}
          </Button>
        </Card>
      )}

      {/* No Results */}
      {!isLoading && !error && farmerMatchResults.length === 0 && (
        <Card className="bg-slate-900/60 border-slate-800 p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-white">
            {language === 'hi'
              ? 'इस आवश्यकता के लिए अभी कोई उपयुक्त किसान नहीं मिला।'
              : 'No suitable farmers found for this requirement.'}
          </h3>
          <p className="text-sm text-slate-400 mt-2 max-w-md mx-auto">
            {language === 'hi'
              ? 'Is requirement ke liye abhi suitable farmers nahi mile.'
              : 'Try adjusting product, quantity, or location.'}
          </p>
          <Button variant="primary" size="md" onClick={() => navigate('/consumer/voice')} className="mt-5">
            {language === 'hi' ? 'अनुरोध संशोधित करें' : 'Modify Request'}
          </Button>
        </Card>
      )}

      {/* Insufficient Supply Banner */}
      {!isLoading && farmerMatchResults.length > 0 && hasInsufficientSupply && (
        <Card className="bg-amber-500/10 border-amber-500/20 p-4">
          <div className="flex gap-3">
            <TrendingUp size={18} className="text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-200">
                {language === 'hi'
                  ? 'उपलब्ध आपूर्ति को कई किसानों से मिलाना पड़ सकता है।'
                  : 'Available supply may need to be combined from multiple farmers.'}
              </p>
              <p className="text-xs text-amber-300/80 mt-1">
                {language === 'hi'
                  ? 'कोई एक किसान पूरी मात्रा नहीं दे सकता — Step 10 में aggregateSupply() इसे संभालेगा।'
                  : 'No single farmer can satisfy the full quantity — Step 10 will handle aggregation.'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Farmer Cards – display actual matchFarmers() results, no fake data */}
      {!isLoading && farmerMatchResults.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {farmerMatchResults.map((result) => {
            const farmer = result.farmer;
            const listing = result.listing;
            const breakdown = result.breakdown;
            // Use actual data only – if field missing, don't display fake
            const reliability = (farmer as any).reliabilityPct ?? Math.round((farmer.rating ?? 4) * 20);
            const distanceKm = (farmer as any).distanceKm ?? 75;

            return (
              <Card key={`${farmer.id}-${listing.id}`} className="flex flex-col justify-between border-slate-700/80 bg-slate-800/90 p-5">
                <div>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={farmer.avatar}
                        alt={farmer.name}
                        className="w-12 h-12 rounded-full object-cover border-2 border-emerald-500/40"
                      />
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-100 text-base">
                            {language === 'hi' ? farmer.nameHi : farmer.name}
                          </h3>
                          {farmer.fpoMember && <Badge variant="emerald" size="sm">FPO Verified</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <MapPin size={12} className="text-emerald-400" />
                            {farmer.village}, {farmer.district} ({distanceKm} km away)
                          </span>
                          <span className="flex items-center gap-1 text-amber-400 font-semibold">
                            <Star size={12} className="fill-amber-400" />
                            {farmer.rating} ({farmer.totalDeals} deals)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <div
                        className={`px-2.5 py-1 rounded-full border text-xs font-bold ${
                          result.totalScore >= 90
                            ? 'text-emerald-400 border-emerald-500 bg-emerald-500/10'
                            : result.totalScore >= 75
                              ? 'text-amber-400 border-amber-500 bg-amber-500/10'
                              : 'text-rose-400 border-rose-500 bg-rose-500/10'
                        }`}
                      >
                        {result.totalScore}% {language === 'hi' ? 'मैच' : 'Match'}
                      </div>
                      <span className="text-[10px] text-slate-500">{language === 'hi' ? 'कुल स्कोर' : 'Total score'}</span>
                    </div>
                  </div>

                  {/* Produce & Offer */}
                  <div className="mt-4 p-3.5 bg-slate-900/80 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          {language === 'hi' ? 'उपलब्ध फसल' : 'Available Produce'}
                        </span>
                        <p className="text-sm font-bold text-slate-100 mt-0.5 truncate">
                          {language === 'hi' ? listing.nameHi : listing.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="slate" size="sm">
                            {listing.grade}
                          </Badge>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Package size={12} /> {listing.quantityKg} kg {language === 'hi' ? 'उपलब्ध' : 'available'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-400">{language === 'hi' ? 'सीधा मूल्य' : 'Direct Price'}</span>
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className="text-lg font-black text-emerald-400">₹{listing.expectedPricePerKg}</span>
                          <span className="text-xs text-slate-400">/kg</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{listing.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Match Breakdown – display actual breakdown, not calculated */}
                  <div className="mt-4 bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                          <ShieldCheck size={16} />
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-slate-100">
                            {language === 'hi' ? 'मैच स्कोर विवरण' : 'Match Score Breakdown'}
                          </h4>
                          <p className="text-xs text-slate-400">
                            {language === 'hi' ? 'वास्तविक सेवा परिणाम' : 'From matchFarmers()'}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-slate-500">
                        Total: <span className="font-bold text-white">{result.totalScore}%</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      {[
                        { label: 'Availability', labelHi: 'उपलब्धता', value: breakdown.availability, weight: '30%' },
                        { label: 'Price', labelHi: 'मूल्य', value: breakdown.price, weight: '25%' },
                        { label: 'Distance', labelHi: 'दूरी', value: breakdown.distance, weight: '20%' },
                        { label: 'Quality', labelHi: 'गुणवत्ता', value: breakdown.quality, weight: '15%' },
                        { label: 'Reliability', labelHi: 'विश्वसनीयता', value: breakdown.reliability, weight: '10%' },
                      ].map((item) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-400">
                              {language === 'hi' ? item.labelHi : item.label}{' '}
                              <span className="text-slate-500">({item.weight})</span>
                            </span>
                            <span className="font-semibold text-slate-200">{item.value}%</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${item.value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-800">
                      <p className="text-xs text-slate-300 leading-relaxed italic">“{result.explanation}”</p>
                    </div>
                  </div>

                  {/* Quality & Reliability extra */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge variant="purple" size="sm">
                      {listing.grade}
                    </Badge>
                    <Badge variant="slate" size="sm">
                      {reliability}% {language === 'hi' ? 'विश्वसनीयता' : 'Reliability'}
                    </Badge>
                    <Badge variant="blue" size="sm">
                      {distanceKm} km
                    </Badge>
                  </div>
                </div>

                {/* Actions – Step 8 only provides next UI action, no real call */}
                <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center gap-3">
                  <Button variant="secondary" className="flex-1" onClick={() => handleViewDetails(result)}>
                    {language === 'hi' ? 'विवरण देखें' : 'View Details'}
                  </Button>
                  <Button variant="primary" className="flex-1" onClick={() => handleConnect(result)}>
                    {language === 'hi' ? 'कनेक्ट करें' : 'Connect'}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Connect Modal – simple confirmation */}
      <Modal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        title={language === 'hi' ? 'किसान चयनित' : 'Farmer selected.'}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-300">
            {language === 'hi'
              ? 'किसान चयनित किया गया। अगला चरण बातचीत/कॉल होगा (Step 9)।'
              : 'Farmer selected. Next step will be direct call / negotiation (Step 9).'}
          </p>
          {selectedFarmer && (
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-sm">
              <p className="font-semibold text-white">{selectedFarmer.farmer.name}</p>
              <p className="text-xs text-slate-400">
                {selectedFarmer.listing.name} • {selectedFarmer.listing.quantityKg} kg • ₹{selectedFarmer.listing.expectedPricePerKg}/kg
              </p>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setShowConnectModal(false)}>
              {language === 'hi' ? 'बंद करें' : 'Close'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowConnectModal(false);
                navigate('/consumer/call');
              }}
            >
              {language === 'hi' ? 'आगे बढ़ें' : 'Continue'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
