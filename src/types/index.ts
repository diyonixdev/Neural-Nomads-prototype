export type EntityId = string;
export type ISODateString = string;
export type ISODateTimeString = string;
export type CurrencyCode = string;

export type UserRole = 'consumer' | 'farmer';
export type Language = 'en' | 'hi';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface Address {
  line1?: string;
  village?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  formattedAddress: string;
  coordinates?: GeoPoint;
}

export interface ContactDetails {
  phone?: string;
  alternatePhone?: string;
  email?: string;
  preferredLanguage?: Language;
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type ProduceCategory = 'vegetables' | 'fruits' | 'grains' | 'pulses' | 'spices';
export type ProduceGrade = 'Grade A' | 'Grade B' | 'Organic Premium';
export type RequirementStatus = 'draft' | 'open' | 'matched' | 'fulfilled' | 'cancelled' | 'expired';
export type OrderStatus = 'negotiating' | 'confirmed' | 'stored' | 'dispatched' | 'in_transit' | 'delivered' | 'cancelled';
export type ShipmentStatus = 'scheduled' | 'loading' | 'in_transit' | 'delayed' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'escrowed' | 'paid' | 'failed' | 'refunded';

export interface FPO {
  id: EntityId;
  name: string;
  nameHi?: string;
  registrationNumber?: string;
  verificationStatus: VerificationStatus;
  contact: ContactDetails;
  address: Address;
  memberFarmerIds: EntityId[];
  primaryCrops: string[];
  storageFacilityIds?: EntityId[];
  vehicleIds?: EntityId[];
  rating?: number;
  createdAt?: ISODateTimeString;
  updatedAt?: ISODateTimeString;
}

export interface Farmer {
  id: EntityId;
  name: string;
  nameHi: string;
  phone: string;
  village: string;
  district: string;
  state: string;
  rating: number;
  totalDeals: number;
  fpoMember?: boolean;
  fpoName?: string;
  avatar: string;
  primaryCrops: string[];
  distanceKm?: number;
  contact?: ContactDetails;
  address?: Address;
  fpoId?: EntityId;
  landAreaAcres?: number;
  certifications?: string[];
  verificationStatus?: VerificationStatus;
  produceIds?: EntityId[];
  createdAt?: ISODateTimeString;
  updatedAt?: ISODateTimeString;
}

export type BuyerType =
  | 'Restaurant Chain'
  | 'Retail Supermarket'
  | 'Society Co-op'
  | 'Food Processor'
  | 'Direct Consumer';

export interface Buyer {
  id: EntityId;
  name: string;
  nameHi: string;
  type: BuyerType;
  location: string;
  requiredProduce: string;
  requiredQuantityKg: number;
  budgetPerKg: number;
  verified: boolean;
  avatar: string;
  contact?: ContactDetails;
  address?: Address;
  verificationStatus?: VerificationStatus;
  requirementIds?: EntityId[];
  preferredPaymentTerms?: string;
  rating?: number;
  createdAt?: ISODateTimeString;
  updatedAt?: ISODateTimeString;
}

export interface Produce {
  id: EntityId;
  name: string;
  nameHi: string;
  category: ProduceCategory;
  grade: ProduceGrade;
  quantityKg: number;
  expectedPricePerKg: number;
  mandiPricePerKg: number;
  harvestDate?: ISODateString;
  location: string;
  state: string;
  image?: string;
  farmerId?: EntityId;
  fpoId?: EntityId;
  availableFrom?: ISODateTimeString;
  availableUntil?: ISODateTimeString;
  shelfLifeDays?: number;
  moisturePct?: number;
  brixScore?: number;
  pesticideResidueStatus?: 'unknown' | 'clear' | 'flagged';
  certifications?: string[];
  storageRequirements?: {
    temperatureCMin?: number;
    temperatureCMax?: number;
    humidityPctMin?: number;
    humidityPctMax?: number;
    coldChainRequired: boolean;
  };
  createdAt?: ISODateTimeString;
  updatedAt?: ISODateTimeString;
}

export interface BuyerRequirement {
  id: EntityId;
  buyerId: EntityId;
  produceName: string;
  category: ProduceCategory;
  grade?: ProduceGrade;
  quantityKg: number;
  budgetPerKg: number;
  deliveryLocation: Address;
  neededBy: ISODateTimeString;
  status: RequirementStatus;
  qualityPreferences?: string[];
  coldChainRequired?: boolean;
  maxDistanceKm?: number;
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'seasonal';
    occurrences?: number;
  };
  createdAt?: ISODateTimeString;
  updatedAt?: ISODateTimeString;
}

export interface MatchScore {
  overallScore: number;
  priceMatch: number;
  distanceScore: number;
  qualityConfidence: number;
  freshnessScore: number;
  notes: string[];
  notesHi: string[];
  farmerId?: EntityId;
  buyerId?: EntityId;
  produceId?: EntityId;
  requirementId?: EntityId;
  logisticsScore?: number;
  storageFitScore?: number;
  confidence?: number;
  modelVersion?: string;
  calculatedAt?: ISODateTimeString;
}

export interface RouteStop {
  id: EntityId;
  title: string;
  titleHi: string;
  location: string;
  timestamp: string;
  status: 'completed' | 'current' | 'upcoming';
  description: string;
  coordinates?: GeoPoint;
}

export interface Route {
  id?: EntityId;
  totalDistanceKm: number;
  estimatedTransitTime: string;
  fuelSavedPct: number;
  carbonEmissionKg: number;
  stops: RouteStop[];
  waypoints: Array<GeoPoint & { label: string }>;
  origin?: Address;
  destination?: Address;
  optimizedFor?: 'cost' | 'time' | 'freshness' | 'emissions';
  tollCost?: number;
  vehicleId?: EntityId;
  createdAt?: ISODateTimeString;
}

export interface StorageFacility {
  id: EntityId;
  name: string;
  facilityType: 'Solar Micro-Cold Room' | 'Cooperative CA Storage' | 'Hermetic Silo' | 'Standard Cold Hub';
  capacityKg: number;
  availableKg: number;
  location: string;
  distanceKm: number;
  temperatureRange: string;
  humidityRange: string;
  dailyRatePerKg: number;
  solarPowered: boolean;
  iotMonitored: boolean;
  address?: Address;
  operatorId?: EntityId;
  supportedCategories?: ProduceCategory[];
  temperatureCMin?: number;
  temperatureCMax?: number;
  humidityPctMin?: number;
  humidityPctMax?: number;
  bookingIds?: EntityId[];
  createdAt?: ISODateTimeString;
  updatedAt?: ISODateTimeString;
}

export interface Vehicle {
  id: EntityId;
  vehicleType: 'EV Reefer Mini-Truck' | 'Chilled 3-Wheeler' | 'Shared FPO Agri-Van' | 'Heavy Multi-Axle EV';
  capacityKg: number;
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  currentLocation: string;
  costEstimate: number;
  co2SavedKg: number;
  coldChainReady: boolean;
  etaMins: number;
  currentCoordinates?: GeoPoint;
  ownerId?: EntityId;
  availabilityStatus?: 'available' | 'assigned' | 'in_transit' | 'maintenance';
  supportedTemperatureRange?: string;
  createdAt?: ISODateTimeString;
  updatedAt?: ISODateTimeString;
}

export interface OrderTimelineItem {
  id: EntityId;
  stepNumber: number;
  title: string;
  titleHi: string;
  description: string;
  descriptionHi: string;
  status: 'pending' | 'in_progress' | 'completed';
  timestamp?: string;
  iconName: string;
}

export interface ImpactMetrics {
  intermediaryFeeEliminated: number;
  farmerEarningsIncreasePct: number;
  consumerPriceDiscountPct: number;
  foodWasteReducedKg: number;
  carbonReductionKg: number;
  daysTransitSaved: number;
}

export interface Order {
  id: EntityId;
  farmerId?: EntityId;
  buyerId?: EntityId;
  produceId?: EntityId;
  requirementId?: EntityId;
  farmer?: Farmer;
  buyer?: Buyer;
  produce?: Produce;
  quantityKg: number;
  agreedPricePerKg: number;
  totalAmount: number;
  currency?: CurrencyCode;
  mandiBenchmarkTotal?: number;
  retailBenchmarkTotal?: number;
  storageFacilityId?: EntityId;
  storageAllocated?: StorageFacility;
  vehicleId?: EntityId;
  logisticsAllocated?: Vehicle;
  shipmentId?: EntityId;
  route?: Route;
  matchScore?: MatchScore;
  currentStatus: OrderStatus;
  paymentStatus?: PaymentStatus;
  timeline?: OrderTimelineItem[];
  impact?: ImpactMetrics;
  createdAt?: ISODateTimeString;
  updatedAt?: ISODateTimeString;
}

export interface ActiveOrder extends Order {
  farmer: Farmer;
  buyer: Buyer;
  produce: Produce;
  mandiBenchmarkTotal: number;
  retailBenchmarkTotal: number;
  storageAllocated?: StorageFacility;
  logisticsAllocated?: Vehicle;
  route?: Route;
  timeline: OrderTimelineItem[];
  impact: ImpactMetrics;
}

export interface Shipment {
  id: EntityId;
  orderId: EntityId;
  vehicleId: EntityId;
  routeId?: EntityId;
  storageFacilityId?: EntityId;
  pickupLocation: Address;
  dropoffLocation: Address;
  status: ShipmentStatus;
  scheduledPickupAt: ISODateTimeString;
  estimatedDeliveryAt: ISODateTimeString;
  actualPickupAt?: ISODateTimeString;
  actualDeliveryAt?: ISODateTimeString;
  quantityKg: number;
  temperatureReadings?: Array<{
    recordedAt: ISODateTimeString;
    temperatureC: number;
    humidityPct?: number;
  }>;
  trackingEvents?: Array<{
    id: EntityId;
    timestamp: ISODateTimeString;
    status: ShipmentStatus;
    location?: string;
    note?: string;
  }>;
  proofOfDeliveryUrl?: string;
  createdAt?: ISODateTimeString;
  updatedAt?: ISODateTimeString;
}

export interface DemandForecast {
  id: EntityId;
  produceName: string;
  category: ProduceCategory;
  location: Address;
  forecastWindow: {
    startDate: ISODateString;
    endDate: ISODateString;
  };
  predictedDemandKg: number;
  expectedPricePerKg: number;
  confidence: number;
  demandDrivers: string[];
  buyerSegment?: BuyerType;
  modelVersion?: string;
  generatedAt: ISODateTimeString;
}

export interface VoiceIntent {
  id: EntityId;
  role: UserRole;
  language: Language;
  transcript: string;
  normalizedText?: string;
  intent:
    | 'create_listing'
    | 'find_buyers'
    | 'create_requirement'
    | 'negotiate_price'
    | 'book_storage'
    | 'book_vehicle'
    | 'track_order'
    | 'unknown';
  confidence: number;
  entities: {
    produceName?: string;
    quantityKg?: number;
    pricePerKg?: number;
    location?: string;
    neededBy?: ISODateTimeString;
    orderId?: EntityId;
  };
  followUpPrompt?: string;
  createdAt: ISODateTimeString;
}

export interface NegotiationSuggestion {
  id: EntityId;
  orderId?: EntityId;
  farmerId?: EntityId;
  buyerId?: EntityId;
  produceId?: EntityId;
  requirementId?: EntityId;
  currentOfferPerKg: number;
  suggestedPricePerKg: number;
  floorPricePerKg?: number;
  ceilingPricePerKg?: number;
  expectedFarmerGainPct?: number;
  expectedBuyerSavingsPct?: number;
  rationale: string[];
  rationaleHi?: string[];
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  modelVersion?: string;
  generatedAt: ISODateTimeString;
}

export interface FarmerMatch {
  farmer: Farmer;
  produce: Produce;
  matchScore: MatchScore;
  offeredPricePerKg: number;
  estimatedSavingsPct: number;
  directGainPct: number;
  transitHours: number;
}

export type ProduceItem = Produce;
export type MatchScoreDetails = MatchScore;
export type ColdStorageUnit = StorageFacility;
export type LogisticsVehicle = Vehicle;
export type RouteOptimization = Route;
