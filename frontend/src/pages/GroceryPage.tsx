import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart, Search, Store, MapPin, Plus, Minus, X,
  Loader2, AlertCircle, ShoppingBag, Navigation,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { groceryApi, type GrocerySearchItem } from '../lib/api';

interface CartItem extends GrocerySearchItem {
  quantity: number;
}

const DHAKA_LAT = 23.8103;
const DHAKA_LNG = 90.4125;

export const GroceryPage = () => {
  const { i18n } = useTranslation();
  const isBn = i18n.language === 'bn';

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<GrocerySearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [userLat, setUserLat] = useState(DHAKA_LAT);
  const [userLng, setUserLng] = useState(DHAKA_LNG);
  const [locating, setLocating] = useState(false);
  const [shops, setShops] = useState<{ name: string; area: string; distance_km: number; address?: string }[]>([]);
  const [shopsLoading, setShopsLoading] = useState(false);
  const [showShops, setShowShops] = useState(false);

  const loadCart = useCallback(() => {
    try {
      const rawCart = localStorage.getItem('desidiet_grocery_cart');
      if (rawCart) setCart(JSON.parse(rawCart));
      
      const loc = localStorage.getItem('desidiet_user_loc');
      if (loc) {
        const { lat, lng } = JSON.parse(loc);
        setUserLat(lat);
        setUserLng(lng);
      }
    } catch { /* ignore */ }
  }, []);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    try { localStorage.setItem('desidiet_grocery_cart', JSON.stringify(newCart)); } catch { /* ignore */ }
  };

  useEffect(() => { loadCart(); }, [loadCart]);

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => { 
        setUserLat(pos.coords.latitude); 
        setUserLng(pos.coords.longitude); 
        setLocating(false); 
        try { localStorage.setItem('desidiet_user_loc', JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude })); } catch {}
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  const fetchShops = async () => {
    setShopsLoading(true); setError(null); setShowShops(true);
    try {
      const res = await groceryApi.nearbyShops(userLat, userLng);
      setShops(res.shops || []);
    } catch {
      setError(isBn ? 'দোকান খুঁজতে সমস্যা হয়েছে' : 'Failed to find nearby shops');
    } finally {
      setShopsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true); setError(null); setShowShops(false);
    try {
      const res = await groceryApi.search(query.trim(), userLat, userLng);
      setItems(res.items || []);
    } catch {
      setError(isBn ? 'খুঁজতে সমস্যা হয়েছে' : 'Failed to find grocery items');
    } finally {
      setSearching(false);
    }
  };

  const addToCart = (item: GrocerySearchItem) => {
    const existing = cart.find(c => c.item_id === item.item_id);
    if (existing) {
      saveCart(cart.map(c => c.item_id === item.item_id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      saveCart([...cart, { ...item, quantity: 1 }]);
    }
  };

  const updateQty = (itemId: string, delta: number) =>
    saveCart(cart.map(c => c.item_id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c).filter(c => c.quantity > 0));

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const cartTotal = cart.reduce((s, c) => s + (c.best_price_bdt ?? 0) * c.quantity, 0);

  return (
    <DashboardLayout
      title={isBn ? 'গ্রোসারি তুলনা' : 'Grocery Comparison'}
      subtitle={isBn ? 'Grocery Compare — সেরা দামে কেনাকাটা' : 'Compare prices across local markets and shops'}
      headerActions={
        <button
          onClick={() => setShowCart(v => !v)}
          className="relative p-2 bg-cream rounded-xl text-ink-muted hover:bg-ink hover:text-cream transition-all"
          title={isBn ? 'কার্ট' : 'Cart'}
        >
          <ShoppingCart className="w-4 h-4" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent text-ink text-[0.55rem] font-bold rounded-full flex items-center justify-center">{cartCount}</span>
          )}
        </button>
      }
    >
      <div className="max-w-3xl mx-auto space-y-4 pb-10 relative">

        {/* Cart panel */}
        <AnimatePresence>
          {showCart && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCart(false)}
                className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm md:hidden"
              />
              <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute top-0 right-0 left-0 md:left-auto md:w-96 bg-white rounded-2xl border border-ink/5 shadow-2xl p-4 space-y-3 z-50"
              >
              <div className="flex items-center justify-between">
                <h3 className={`${isBn ? 'font-bn' : ''} font-bold text-sm text-ink flex items-center gap-2`}>
                  <ShoppingCart className="w-4 h-4 text-accent" /> {isBn ? 'আপনার কার্ট' : 'Your Cart'}
                </h3>
                <button onClick={() => setShowCart(false)}><X className="w-4 h-4 text-ink-muted" /></button>
              </div>
              {cart.length === 0 ? (
                <p className={`${isBn ? 'font-bn' : ''} text-xs text-ink-muted text-center py-4`}>
                  {isBn ? 'কার্ট খালি' : 'Your cart is empty'}
                </p>
              ) : (
                <>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {cart.map(c => (
                      <div key={c.item_id} className="flex items-center gap-3 p-2 bg-cream/30 rounded-xl">
                        <span className={`${isBn ? 'font-bn' : ''} font-bold text-xs text-ink flex-1`}>
                          {isBn ? (c.name_bn || c.name_en) : (c.name_en || c.name_bn)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(c.item_id, -1)} className="w-6 h-6 rounded-lg bg-ink/10 flex items-center justify-center hover:bg-ink hover:text-cream transition-all">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-xs w-4 text-center">{c.quantity}</span>
                          <button onClick={() => updateQty(c.item_id, 1)} className="w-6 h-6 rounded-lg bg-ink/10 flex items-center justify-center hover:bg-ink hover:text-cream transition-all">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="font-bold text-xs text-accent">৳{(c.best_price_bdt ?? 0) * c.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-ink/5 flex justify-between items-center">
                    <span className={`${isBn ? 'font-bn' : ''} font-bold text-sm text-ink`}>
                      {isBn ? 'মোট:' : 'Total:'}
                    </span>
                    <span className="font-bold text-base text-accent">৳{cartTotal}</span>
                  </div>
                </>
              )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div className={`flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 ${isBn ? 'font-bn' : ''} text-xs`}>
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Search bar + location */}
        <div className="bg-white rounded-2xl border border-ink/5 shadow-sm p-4 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={isBn ? 'খাবার খুঁজুন (যেমন: ভাত, ডাল, মাছ)...' : 'Search foods (e.g., rice, lentils, fish)...'}
              value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className={`flex-1 bg-cream/40 border border-ink/10 rounded-xl py-2.5 px-3 ${isBn ? 'font-bn' : ''} text-xs outline-none focus:border-accent/40`}
            />
            <button onClick={handleSearch} disabled={searching}
              className={`px-4 py-2.5 bg-ink text-cream rounded-xl ${isBn ? 'font-bn' : ''} font-bold text-xs flex items-center gap-1.5 hover:bg-accent transition-all disabled:opacity-60`}
            >
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              {isBn ? 'খুঁজুন' : 'Search'}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={getLocation} disabled={locating}
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-ink/10 rounded-xl ${isBn ? 'font-bn' : ''} text-[0.65rem] font-bold text-ink-muted hover:text-ink transition-all`}
            >
              {locating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
              {isBn ? 'আমার অবস্থান' : 'My Location'}
            </button>
            <button onClick={fetchShops}
              className={`flex items-center gap-1.5 px-3 py-1.5 bg-cream border border-ink/10 rounded-xl ${isBn ? 'font-bn' : ''} text-[0.65rem] font-bold text-ink-muted hover:text-ink transition-all`}
            >
              <Store className="w-3 h-3" /> {isBn ? 'কাছের দোকান' : 'Nearby Stores'}
            </button>
            <span className={`flex items-center gap-1 text-[0.62rem] text-ink-faint ${isBn ? 'font-bn' : ''} ml-auto`}>
              <MapPin className="w-3 h-3" />
              {userLat === DHAKA_LAT ? (isBn ? 'ঢাকা (ডিফল্ট)' : 'Dhaka (Default)') : (isBn ? 'আমার অবস্থান' : 'Current Location')}
            </span>
          </div>
        </div>

        {/* Nearby shops */}
        <AnimatePresence>
          {showShops && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-white rounded-2xl border border-ink/5 shadow-sm p-4"
            >
              <h3 className={`${isBn ? 'font-bn' : ''} font-bold text-xs text-ink mb-3 flex items-center gap-2`}>
                <Store className="w-3.5 h-3.5 text-accent" /> {isBn ? 'কাছের দোকান' : 'Nearby Stores'}
              </h3>
              {shopsLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-accent" /></div>
              ) : shops.length === 0 ? (
                <p className={`${isBn ? 'font-bn' : ''} text-xs text-ink-muted text-center py-4`}>
                  {isBn ? 'কোনো দোকান পাওয়া যায়নি' : 'No shops found nearby'}
                </p>
              ) : (
                <div className="space-y-2">
                  {shops.map((shop, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-cream/30 rounded-xl">
                      <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                        <Store className="w-4 h-4 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`${isBn ? 'font-bn' : ''} font-bold text-xs text-ink`}>{shop.name}</div>
                        <div className={`${isBn ? 'font-bn' : ''} text-[0.62rem] text-ink-muted`}>{shop.area}</div>
                      </div>
                      <span className="text-[0.62rem] font-bold text-ink-faint">{shop.distance_km?.toFixed(1)} km</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search Results */}
        {searching ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent" /></div>
        ) : items.length === 0 && !showShops ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-ink/5">
            <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-15 text-ink" />
            <p className={`${isBn ? 'font-bn' : ''} font-bold text-ink-muted text-sm`}>
              {isBn ? 'খাবার খুঁজতে সার্চ বার ব্যবহার করুন' : 'Search foods to compare prices'}
            </p>
            <p className={`${isBn ? 'font-bn' : ''} text-xs text-ink-faint mt-1`}>
              {isBn ? 'যেমন: ভাত, ডাল, মাছ, সবজি...' : 'e.g. rice, lentils, chicken, vegetables...'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item, i) => {
              const cartItem = cart.find(c => c.item_id === item.item_id);
              return (
                <motion.div key={item.item_id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="bg-white rounded-2xl border border-ink/5 shadow-sm p-4 hover:border-accent/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className={`${isBn ? 'font-bn' : ''} font-bold text-sm text-ink`}>
                        {isBn ? (item.name_bn || item.name_en) : (item.name_en || item.name_bn)}
                      </h4>
                      <span className="text-[0.62rem] text-ink-faint">{item.unit}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-accent">৳{item.best_price_bdt}</div>
                      <div className={`text-[0.55rem] text-ink-faint ${isBn ? 'font-bn' : ''} uppercase tracking-wide`}>
                        {isBn ? 'সেরা মূল্য' : 'Best Price'}
                      </div>
                    </div>
                  </div>

                  {/* Offers */}
                  {item.offers && item.offers.length > 0 && (
                    <div className="flex gap-2 flex-wrap mb-3">
                      {item.offers.map((o, j) => (
                        <div key={j} className="bg-cream/50 rounded-xl px-3 py-2 border border-ink/5 min-w-[80px]">
                          <div className={`font-bold text-[0.65rem] text-ink ${isBn ? 'font-bn' : ''}`}>
                            {isBn ? (o.platform_name_bn || o.platform_name) : (o.platform_name || o.platform_name_bn)}
                          </div>
                          <div className="font-bold text-xs text-accent">৳{o.price_bdt}</div>
                          {o.nearest_shop && (
                            <div className={`text-[0.55rem] text-ink-faint ${isBn ? 'font-bn' : ''} flex items-center gap-0.5 mt-0.5`}>
                              <Store className="w-2.5 h-2.5" />{o.nearest_shop.name}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {cartItem ? (
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.item_id, -1)} className="w-8 h-8 rounded-xl bg-cream border border-ink/10 flex items-center justify-center hover:bg-ink hover:text-cream transition-all">
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-bold text-sm flex-1 text-center">{cartItem.quantity}</span>
                      <button onClick={() => updateQty(item.item_id, 1)} className="w-8 h-8 rounded-xl bg-cream border border-ink/10 flex items-center justify-center hover:bg-ink hover:text-cream transition-all">
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(item)}
                      className={`w-full py-2 bg-ink text-cream rounded-xl ${isBn ? 'font-bn' : ''} font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-accent transition-all`}
                    >
                      <Plus className="w-3.5 h-3.5" /> {isBn ? 'কার্টে যোগ করুন' : 'Add to Cart'}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

