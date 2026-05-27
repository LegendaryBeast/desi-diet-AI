import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  MapPin,
  ChevronDown,
  ChevronUp,
  X,
  Plus,
  Minus,
  Filter,
  ExternalLink,
  TrendingDown,
  Store,
  Check,
} from 'lucide-react';
import { PriceComparison } from './PriceComparison';
import { MiniMap } from './MiniMap';
import { PlatformBadge, getPlatformColor, getPlatformEmoji } from './PlatformBadge';

interface GroceryItem {
  item_id: string;
  name_bn: string;
  name_en: string;
  unit: string;
  image: string;
  best_price_bdt: number;
  best_platform_id: string;
  offers: {
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
  }[];
}

interface NearbyShop {
  id: string;
  platform: string;
  name: string;
  lat: number;
  lng: number;
  area: string;
  city: string;
  distance_km: number;
}

interface CartItem {
  item_id: string;
  name_bn: string;
  name_en: string;
  image: string;
  unit: string;
  quantity: number;
  best_platform_id: string;
  best_price_bdt: number;
}

interface GroceryCardProps {
  data: Record<string, unknown>;
  userLat?: number;
  userLng?: number;
  onClose?: () => void;
  isBn?: boolean;
}

const LS_CART_KEY = 'desidiet_grocery_cart';

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(LS_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(cart: CartItem[]) {
  try {
    localStorage.setItem(LS_CART_KEY, JSON.stringify(cart));
  } catch {
    /* ignore */
  }
}

export const GroceryCard = ({ data, userLat, userLng, onClose, isBn = true }: GroceryCardProps) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>(loadCart);
  const [showCart, setShowCart] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const lat = userLat ?? 23.8103;
  const lng = userLng ?? 90.4125;

  const items = (data.items as GroceryItem[]) || [];
  const nearby_shops = (data.nearby_shops as NearbyShop[]) || [];
  const total_items = (data.total_items as number) || 0;
  const potential_savings_bdt = (data.potential_savings_bdt as number) || 0;

  if (!data || total_items === 0) return null;

  // Extract unique platforms for filter
  const allPlatforms = Array.from(
    new Set(items.flatMap((it) => it.offers.map((o) => o.platform_id)))
  );

  const filteredItems =
    activeFilter === 'all'
      ? items
      : items.filter((it) => it.offers.some((o) => o.platform_id === activeFilter));

  const addToCart = useCallback((item: GroceryItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item_id === item.item_id);
      let next: CartItem[];
      if (existing) {
        next = prev.map((c) =>
          c.item_id === item.item_id ? { ...c, quantity: c.quantity + 1 } : c
        );
      } else {
        next = [
          ...prev,
          {
            item_id: item.item_id,
            name_bn: item.name_bn,
            name_en: item.name_en,
            image: item.image,
            unit: item.unit,
            quantity: 1,
            best_platform_id: item.best_platform_id,
            best_price_bdt: item.best_price_bdt,
          },
        ];
      }
      saveCart(next);
      return next;
    });
    setJustAdded(item.item_id);
    setTimeout(() => setJustAdded((id) => (id === item.item_id ? null : id)), 1200);
  }, []);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      const next = prev.filter((c) => c.item_id !== itemId);
      saveCart(next);
      return next;
    });
  }, []);

  const updateQty = useCallback((itemId: string, delta: number) => {
    setCart((prev) => {
      const next = prev
        .map((c) =>
          c.item_id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c
        )
        .filter((c) => c.quantity > 0);
      saveCart(next);
      return next;
    });
  }, []);

  const cartTotal = cart.reduce((sum, c) => sum + c.quantity * c.best_price_bdt, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 24 }}
      className="mt-3 bg-white border border-ink/5 rounded-2xl shadow-sm overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-accent/5 to-transparent border-b border-ink/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-accent/10 rounded-lg flex items-center justify-center text-accent">
            <ShoppingCart size={14} />
          </div>
          <div>
            <div className="text-[0.75rem] font-bold text-ink font-bn leading-tight">
              {isBn ? 'কেনাকাটার সাজেশন' : 'Grocery Suggestions'}
            </div>
            <div className="text-[0.6rem] text-ink-muted font-bn">
              {isBn
                ? `${total_items}টি আইটেম পাওয়া গেছে • সর্বনিম্ন দামে কিনুন`
                : `${total_items} items found • Buy at best price`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {potential_savings_bdt > 0 && (
            <span className="text-[0.6rem] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingDown size={10} />
              {isBn ? 'সেভ করুন' : 'Save'} ৳{potential_savings_bdt}
            </span>
          )}
          {/* Cart toggle */}
          <button
            onClick={() => setShowCart((s) => !s)}
            className="relative p-1.5 bg-cream rounded-lg hover:bg-accent hover:text-white transition-colors"
            title={isBn ? 'শপিং লিস্ট' : 'Shopping List'}
          >
            <Store size={14} />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[0.55rem] font-black rounded-full flex items-center justify-center px-1">
                {cart.reduce((s, c) => s + c.quantity, 0)}
              </span>
            )}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-ink-muted hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Shopping List Drawer */}
      <AnimatePresence>
        {showCart && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-b border-ink/5 bg-amber-50/40"
          >
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[0.7rem] font-bold text-ink font-bn">
                  {isBn ? 'আমার শপিং লিস্ট' : 'My Shopping List'}
                </span>
                <span className="text-[0.65rem] font-black text-accent">
                  {isBn ? 'মোট:' : 'Total:'} ৳{cartTotal}
                </span>
              </div>
              {cart.length === 0 ? (
                <p className="text-[0.6rem] text-ink-muted font-bn">
                  {isBn ? 'কোনো আইটেম যোগ করা হয়নি' : 'No items added yet'}
                </p>
              ) : (
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {cart.map((c) => (
                    <div
                      key={c.item_id}
                      className="flex items-center gap-2 bg-white rounded-lg px-2 py-1.5 border border-ink/5"
                    >
                      <span className="text-base">{c.image}</span>
                      <span className="flex-1 text-[0.65rem] font-bold text-ink font-bn truncate">
                        {isBn ? c.name_bn : c.name_en}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQty(c.item_id, -1)}
                          className="w-5 h-5 rounded bg-cream flex items-center justify-center hover:bg-accent hover:text-white transition-colors"
                        >
                          <Minus size={10} />
                        </button>
                        <span className="text-[0.65rem] font-black w-4 text-center">
                          {c.quantity}
                        </span>
                        <button
                          onClick={() => updateQty(c.item_id, 1)}
                          className="w-5 h-5 rounded bg-cream flex items-center justify-center hover:bg-accent hover:text-white transition-colors"
                        >
                          <Plus size={10} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(c.item_id)}
                        className="text-ink-muted hover:text-red-500 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Platform Filter Tabs */}
      {allPlatforms.length > 1 && (
        <div className="px-4 pt-2.5 pb-0 flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
          <Filter size={12} className="text-ink-muted shrink-0" />
          <button
            onClick={() => setActiveFilter('all')}
            className={`text-[0.6rem] font-bold px-2.5 py-1 rounded-full transition-all whitespace-nowrap ${
              activeFilter === 'all'
                ? 'bg-accent text-white shadow-sm'
                : 'bg-cream text-ink-muted hover:bg-ink/5'
            }`}
          >
            {isBn ? 'সব' : 'All'}
          </button>
          {allPlatforms.map((pid) => (
            <button key={pid} onClick={() => setActiveFilter(pid)}>
              <PlatformBadge
                platformId={pid}
                size="sm"
                showName
                isBn={isBn}
                className={activeFilter === pid ? 'ring-2 ring-offset-1' : 'opacity-70 hover:opacity-100'}
              />
            </button>
          ))}
        </div>
      )}

      {/* Items list */}
      <div className="divide-y divide-ink/5">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item, idx) => {
            const isExpanded = expandedItem === item.item_id;
            const inCart = cart.find((c) => c.item_id === item.item_id);
            const wasJustAdded = justAdded === item.item_id;
            return (
              <motion.div
                key={item.item_id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ delay: idx * 0.04, duration: 0.2 }}
                className="px-4 py-2.5"
              >
                <button
                  onClick={() => setExpandedItem(isExpanded ? null : item.item_id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <span className="text-xl">{item.image}</span>
                    <div className="min-w-0">
                      <div className="text-[0.72rem] font-bold text-ink font-bn leading-tight">
                        {isBn ? item.name_bn : item.name_en}
                      </div>
                      <div className="text-[0.6rem] text-ink-muted">{item.unit}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <PriceComparison offers={item.offers} isCompact />
                    {/* Add-to-cart quick button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(item);
                      }}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                        wasJustAdded
                          ? 'bg-green-500 text-white scale-110'
                          : inCart
                          ? 'bg-accent text-white'
                          : 'bg-cream text-ink-muted hover:bg-accent hover:text-white'
                      }`}
                      title={isBn ? 'কার্টে যোগ করুন' : 'Add to cart'}
                    >
                      {wasJustAdded ? (
                        <Check size={12} />
                      ) : (
                        <Plus size={12} />
                      )}
                    </button>
                    {isExpanded ? (
                      <ChevronUp size={14} className="text-ink-muted" />
                    ) : (
                      <ChevronDown size={14} className="text-ink-muted" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 pb-1">
                        <PriceComparison offers={item.offers} />
                      </div>
                      {/* Quick action row */}
                      <div className="flex items-center gap-2 mt-2 pb-1">
                        {inCart ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => updateQty(item.item_id, -1)}
                              className="w-6 h-6 rounded-lg bg-cream flex items-center justify-center hover:bg-accent hover:text-white transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-[0.7rem] font-black w-5 text-center">
                              {inCart.quantity}
                            </span>
                            <button
                              onClick={() => updateQty(item.item_id, 1)}
                              className="w-6 h-6 rounded-lg bg-cream flex items-center justify-center hover:bg-accent hover:text-white transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                            <span className="text-[0.6rem] text-ink-muted ml-1">
                              ৳{inCart.quantity * inCart.best_price_bdt}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white text-[0.65rem] font-bold rounded-lg hover:bg-ink transition-colors"
                          >
                            <ShoppingCart size={12} />
                            {isBn ? 'কার্টে যোগ করুন' : 'Add to Cart'}
                          </button>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Map toggle */}
      {nearby_shops.length > 0 && (
        <div className="px-4 py-2.5 border-t border-ink/5">
          <button
            onClick={() => setShowMap(!showMap)}
            className="flex items-center gap-1.5 text-[0.7rem] font-bold text-accent font-bn hover:underline"
          >
            <MapPin size={13} />
            {showMap
              ? isBn
                ? 'ম্যাপ লুকান'
                : 'Hide Map'
              : isBn
              ? 'কাছাকাছি দোকান দেখুন (' + nearby_shops.length + 'টি)'
              : 'See Nearby Shops (' + nearby_shops.length + ')'}
            {showMap ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          <AnimatePresence>
            {showMap && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="pt-2.5 pb-1">
                  <MiniMap
                    userLat={lat}
                    userLng={lng}
                    shops={nearby_shops}
                    height="180px"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {Array.from(new Set(nearby_shops.map((s) => s.platform))).map((platform) => {
                      const count = nearby_shops.filter((s) => s.platform === platform).length;
                      return (
                        <PlatformBadge
                          key={platform}
                          platformId={platform}
                          size="sm"
                          showName
                          isBn={isBn}
                          className="cursor-default"
                        />
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
};
