import { TrendingDown, Truck, Clock, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';
import { PlatformDot, getPlatformName } from './PlatformBadge';

interface Offer {
  platform_id: string;
  platform_name: string;
  platform_name_bn: string;
  logo: string;
  color: string;
  url: string;
  price_bdt: number;
  delivery_time: string;
  delivery_fee: number;
  nearest_shop?: {
    name: string;
    distance_km: number;
    area: string;
  } | null;
}

interface PriceComparisonProps {
  offers: Offer[];
  isCompact?: boolean;
}

export const PriceComparison = ({ offers, isCompact = false }: PriceComparisonProps) => {
  if (!offers || offers.length === 0) return null;

  const sorted = [...offers].sort((a, b) => a.price_bdt - b.price_bdt);
  const minPrice = sorted[0].price_bdt;
  const maxPrice = sorted[sorted.length - 1].price_bdt;
  const priceRange = maxPrice - minPrice || 1;
  const savings = maxPrice - minPrice;

  if (isCompact) {
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {sorted.slice(0, 3).map((offer) => {
          const isBest = offer.price_bdt === minPrice;
          return (
            <motion.a
              key={offer.platform_id}
              href={offer.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.6rem] font-bold border transition-shadow hover:shadow-sm"
              style={{
                borderColor: isBest ? offer.color + '60' : offer.color + '25',
                backgroundColor: isBest ? offer.color + '12' : offer.color + '06',
                color: isBest ? offer.color : offer.color + 'BB',
              }}
            >
              <PlatformDot platformId={offer.platform_id} size={14} />
              <span className={isBest ? 'underline underline-offset-2 decoration-2' : ''}>
                ৳{offer.price_bdt}
              </span>
              {isBest && <TrendingDown size={9} className="text-green-600" />}
            </motion.a>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {savings > 0 && (
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-[0.65rem] font-bn font-bold text-green-600 flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-lg w-fit"
        >
          <TrendingDown size={12} />
          <span>Save up to ৳{savings} by comparing prices</span>
        </motion.div>
      )}
      <div className="space-y-1.5">
        {sorted.map((offer, idx) => {
          const isBest = offer.price_bdt === minPrice;
          const pct = ((offer.price_bdt - minPrice) / priceRange) * 100;
          return (
            <motion.a
              key={offer.platform_id}
              href={offer.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.01, x: 2 }}
              className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all hover:shadow-md ${
                isBest
                  ? 'bg-green-50/60 border-green-200 ring-1 ring-green-100'
                  : 'bg-white border-ink/5 hover:border-ink/10'
              }`}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="shrink-0">
                  <PlatformDot platformId={offer.platform_id} size={32} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[0.72rem] font-bold text-ink leading-tight">
                      {offer.platform_name}
                    </span>
                    {isBest && (
                      <span className="text-[0.5rem] font-black text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                        Best
                      </span>
                    )}
                  </div>
                  <div className="text-[0.6rem] text-ink-muted flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="flex items-center gap-0.5">
                      <Clock size={9} />
                      {offer.delivery_time}
                    </span>
                    {offer.nearest_shop && (
                      <span className="flex items-center gap-0.5">
                        <MapPin size={9} />
                        {offer.nearest_shop.distance_km.toFixed(1)}km
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <Truck size={9} />
                      {offer.delivery_fee > 0 ? `৳${offer.delivery_fee}` : 'Free'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                <div className={`text-sm font-black ${isBest ? 'text-green-600' : 'text-ink'}`}>
                  ৳{offer.price_bdt}
                </div>
                {/* Price bar visual */}
                <div className="w-16 h-1 bg-ink/5 rounded-full mt-1 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${100 - pct}%` }}
                    transition={{ duration: 0.6, delay: idx * 0.08 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: isBest ? '#22c55e' : offer.color }}
                  />
                </div>
              </div>
            </motion.a>
          );
        })}
      </div>
    </div>
  );
};
