import { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, LayoutAnimation, Platform, UIManager
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ShoppingCart, MapPin, ChevronDown, ChevronUp, X, Plus, Minus,
  Filter, TrendingDown, Store, Check
} from 'lucide-react-native';
import { colors, fonts, spacing, radius } from '../../lib/theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
    price_bdt: number;
    delivery_time: string;
    nearest_shop?: { name: string; distance_km: number; area: string } | null;
  }[];
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
  data: Record<string, any>;
  isBn?: boolean;
}

const CART_KEY = '@pushti_grocery_cart';

async function loadCart(): Promise<CartItem[]> {
  try {
    const raw = await AsyncStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveCart(cart: CartItem[]) {
  try {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    /* ignore */
  }
}

export const GroceryCard = ({ data, isBn = true }: GroceryCardProps) => {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  useEffect(() => {
    loadCart().then(setCart);
  }, []);

  const items = (data.items as GroceryItem[]) || [];
  const nearby_shops = (data.nearby_shops as any[]) || [];
  const total_items = (data.total_items as number) || 0;
  const potential_savings_bdt = (data.potential_savings_bdt as number) || 0;

  if (!data || total_items === 0) return null;

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
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const toggleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedItem((prev) => (prev === id ? null : id));
  };

  const toggleCart = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowCart((s) => !s);
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, { backgroundColor: colors.accent + '18' }]}>
            <ShoppingCart size={14} color={colors.accent} />
          </View>
          <View>
            <Text style={styles.headerTitle}>
              {isBn ? 'কেনাকাটার সাজেশন' : 'Grocery Suggestions'}
            </Text>
            <Text style={styles.headerSub}>
              {isBn
                ? `${total_items}টি আইটেম পাওয়া গেছে • সর্বনিম্ন দামে কিনুন`
                : `${total_items} items found • Buy at best price`}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {potential_savings_bdt > 0 && (
            <View style={styles.savingsBadge}>
              <TrendingDown size={10} color={colors.success} />
              <Text style={styles.savingsText}>
                {isBn ? 'সেভ করুন' : 'Save'} ৳{potential_savings_bdt}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.cartBtn} onPress={toggleCart} activeOpacity={0.7}>
            <Store size={14} color={colors.textSecondary} />
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Cart Drawer */}
      {showCart && (
        <View style={styles.cartDrawer}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>
              {isBn ? 'আমার শপিং লিস্ট' : 'My Shopping List'}
            </Text>
            <Text style={styles.cartTotal}>
              {isBn ? 'মোট:' : 'Total:'} ৳{cartTotal}
            </Text>
          </View>
          {cart.length === 0 ? (
            <Text style={styles.cartEmpty}>
              {isBn ? 'কোনো আইটেম যোগ করা হয়নি' : 'No items added yet'}
            </Text>
          ) : (
            <View>
              {cart.map((c) => (
                <View key={c.item_id} style={styles.cartRow}>
                  <Text style={styles.cartEmoji}>{c.image}</Text>
                  <Text style={styles.cartName} numberOfLines={1}>
                    {isBn ? c.name_bn : c.name_en}
                  </Text>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(c.item_id, -1)} activeOpacity={0.7}>
                      <Minus size={10} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{c.quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(c.item_id, 1)} activeOpacity={0.7}>
                      <Plus size={10} color={colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => removeFromCart(c.item_id)} style={{ padding: 4 }}>
                    <X size={12} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Platform Filter */}
      {allPlatforms.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <Filter size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}>
              {isBn ? 'সব' : 'All'}
            </Text>
          </TouchableOpacity>
          {allPlatforms.map((pid) => {
            const offer = items.flatMap((i) => i.offers).find((o) => o.platform_id === pid);
            return (
              <TouchableOpacity
                key={pid}
                style={[styles.filterChip, activeFilter === pid && styles.filterChipActive]}
                onPress={() => setActiveFilter(pid)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, activeFilter === pid && styles.filterChipTextActive]}>
                  {isBn ? offer?.platform_name_bn || pid : offer?.platform_name || pid}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Items */}
      <View>
        {filteredItems.map((item) => {
          const isExpanded = expandedItem === item.item_id;
          const inCart = cart.find((c) => c.item_id === item.item_id);
          const wasJustAdded = justAdded === item.item_id;
          const bestOffer = item.offers[0];

          return (
            <View key={item.item_id} style={styles.itemRow}>
              <TouchableOpacity
                style={styles.itemHeader}
                onPress={() => toggleExpand(item.item_id)}
                activeOpacity={0.7}
              >
                <View style={styles.itemLeft}>
                  <Text style={styles.itemEmoji}>{item.image}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {isBn ? item.name_bn : item.name_en}
                    </Text>
                    <Text style={styles.itemUnit}>{item.unit}</Text>
                  </View>
                </View>
                <View style={styles.itemRight}>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceText}>৳{item.best_price_bdt}</Text>
                    <Text style={styles.priceSub} numberOfLines={1}>
                      {isBn ? bestOffer?.platform_name_bn : bestOffer?.platform_name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.addBtn,
                      wasJustAdded && styles.addBtnSuccess,
                      inCart && styles.addBtnActive,
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      addToCart(item);
                    }}
                    activeOpacity={0.7}
                  >
                    {wasJustAdded ? (
                      <Check size={12} color={colors.white} />
                    ) : (
                      <Plus size={12} color={inCart ? colors.white : colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                  {isExpanded ? (
                    <ChevronUp size={14} color={colors.textSecondary} />
                  ) : (
                    <ChevronDown size={14} color={colors.textSecondary} />
                  )}
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.itemExpanded}>
                  {item.offers.map((offer, idx) => (
                    <View key={idx} style={styles.offerRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.offerPlatform}>
                          {isBn ? offer.platform_name_bn : offer.platform_name}
                        </Text>
                        <Text style={styles.offerMeta}>
                          {offer.delivery_time}
                          {offer.nearest_shop
                            ? ` • ${offer.nearest_shop.distance_km.toFixed(1)}km • ${offer.nearest_shop.area}`
                            : ''}
                        </Text>
                      </View>
                      <Text style={styles.offerPrice}>৳{offer.price_bdt}</Text>
                    </View>
                  ))}

                  {inCart ? (
                    <View style={styles.expandedCartRow}>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.item_id, -1)}>
                        <Minus size={12} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <Text style={styles.qtyText}>{inCart.quantity}</Text>
                      <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.item_id, 1)}>
                        <Plus size={12} color={colors.textSecondary} />
                      </TouchableOpacity>
                      <Text style={styles.subtotalText}>
                        ৳{inCart.quantity * inCart.best_price_bdt}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.addCartBtn}
                      onPress={() => addToCart(item)}
                      activeOpacity={0.8}
                    >
                      <ShoppingCart size={12} color={colors.white} />
                      <Text style={styles.addCartBtnText}>
                        {isBn ? 'কার্টে যোগ করুন' : 'Add to Cart'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Nearby shops */}
      {nearby_shops.length > 0 && (
        <View style={styles.shopsFooter}>
          <MapPin size={13} color={colors.accent} />
          <Text style={styles.shopsText}>
            {isBn
              ? `কাছাকাছি দোকান (${nearby_shops.length}টি)`
              : `${nearby_shops.length} nearby shops`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSolid,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSolid,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 13,
    color: colors.textPrimary,
  },
  headerSub: {
    fontFamily: fonts.bn,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E8F5E9',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  savingsText: {
    fontFamily: fonts.bodyBold,
    fontSize: 9,
    color: colors.success,
  },
  cartBtn: {
    position: 'relative',
    padding: 6,
    backgroundColor: '#FFFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSolid,
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  cartBadgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 8,
    color: colors.white,
  },

  // Cart drawer
  cartDrawer: {
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSolid,
    padding: 12,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartTitle: {
    fontFamily: fonts.bnBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  cartTotal: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.accent,
  },
  cartEmpty: {
    fontFamily: fonts.bn,
    fontSize: 11,
    color: colors.textSecondary,
  },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.borderSolid,
  },
  cartEmoji: {
    fontSize: 14,
  },
  cartName: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.textPrimary,
    flex: 1,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qtyBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: colors.borderSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textPrimary,
    minWidth: 16,
    textAlign: 'center',
  },

  // Filter
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: colors.borderSolid,
  },
  filterChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  filterChipText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },

  // Items
  itemRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSolid,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  itemEmoji: {
    fontSize: 20,
  },
  itemName: {
    fontFamily: fonts.bnBold,
    fontSize: 12,
    color: colors.textPrimary,
  },
  itemUnit: {
    fontFamily: fonts.bn,
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priceTag: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.primary,
  },
  priceSub: {
    fontFamily: fonts.bn,
    fontSize: 9,
    color: colors.textSecondary,
    maxWidth: 70,
  },
  addBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFDF5',
    borderWidth: 1,
    borderColor: colors.borderSolid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  addBtnSuccess: {
    backgroundColor: colors.success,
    borderColor: colors.success,
    transform: [{ scale: 1.1 }],
  },

  // Expanded
  itemExpanded: {
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFDF5',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.borderSolid,
  },
  offerPlatform: {
    fontFamily: fonts.bnBold,
    fontSize: 10,
    color: colors.textPrimary,
  },
  offerMeta: {
    fontFamily: fonts.bn,
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 1,
  },
  offerPrice: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.primary,
  },
  expandedCartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  subtotalText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  addCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 7,
    marginTop: 6,
  },
  addCartBtnText: {
    fontFamily: fonts.bnBold,
    fontSize: 11,
    color: colors.white,
  },

  // Shops footer
  shopsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderSolid,
  },
  shopsText: {
    fontFamily: fonts.bn,
    fontSize: 10,
    color: colors.accent,
  },
});
