import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from '../lib/translations';
import { colors, fonts } from '../lib/theme';
import {
  ShoppingCart,
  Search,
  ArrowLeft,
  Plus,
  Minus,
  X,
  Store,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { groceryApi } from '../lib/api';

const CART_KEY = 'desidiet_grocery_cart';

interface GroceryItem {
  item_id: string;
  name_bn: string;
  name_en: string;
  unit: string;
  image: string;
  best_price_bdt: number;
  best_platform_id: string;
  offers: Array<{
    platform_id: string;
    platform_name: string;
    platform_name_bn: string;
    price_bdt: number;
    delivery_time: string;
    nearest_shop?: {
      name: string;
      distance_km: number;
      area: string;
    } | null;
  }>;
}

interface CartItem {
  item_id: string;
  name_bn: string;
  name_en: string;
  unit: string;
  quantity: number;
  best_price_bdt: number;
  best_platform_id: string;
}

export default function GroceryScreen() {
  const router = useRouter();
  const { t, language } = useTranslation();
  const isBn = language === 'bn';

  const [query, setQuery] = useState('');
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Load cart from AsyncStorage
  useEffect(() => {
    const loadCart = async () => {
      try {
        const raw = await AsyncStorage.getItem(CART_KEY);
        if (raw) setCart(JSON.parse(raw));
      } catch { /* ignore */ }
    };
    loadCart();
  }, []);

  const saveCart = useCallback(async (newCart: CartItem[]) => {
    setCart(newCart);
    try {
      await AsyncStorage.setItem(CART_KEY, JSON.stringify(newCart));
    } catch { /* ignore */ }
  }, []);

  const searchGroceries = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await groceryApi.search(query.trim(), 23.8103, 90.4125);
      setItems(res.data?.items || []);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item: GroceryItem) => {
    const existing = cart.find((c) => c.item_id === item.item_id);
    if (existing) {
      saveCart(
        cart.map((c) =>
          c.item_id === item.item_id ? { ...c, quantity: c.quantity + 1 } : c
        )
      );
    } else {
      saveCart([
        ...cart,
        {
          item_id: item.item_id,
          name_bn: item.name_bn,
          name_en: item.name_en,
          unit: item.unit,
          quantity: 1,
          best_price_bdt: item.best_price_bdt,
          best_platform_id: item.best_platform_id,
        },
      ]);
    }
  };

  const updateQty = (itemId: string, delta: number) => {
    saveCart(
      cart
        .map((c) =>
          c.item_id === itemId ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.best_price_bdt * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isBn ? 'কেনাকাটা তুলনা' : 'Grocery Compare'}
        </Text>
        <TouchableOpacity onPress={() => setShowCart(!showCart)} style={styles.backBtn}>
          <ShoppingCart size={20} color={colors.textPrimary} />
          {cartCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <TextInput
          style={styles.searchInput}
          placeholder={isBn ? 'খাবার খুঁজুন (যেমন: ভাত, ডাল, মাছ)...' : 'Search foods (e.g. rice, dal, fish)...'}
          placeholderTextColor={colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={searchGroceries}
        />
        <TouchableOpacity onPress={searchGroceries} style={styles.searchBtn}>
          <Search size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Cart overlay */}
      {showCart && (
        <View style={styles.cartOverlay}>
          <View style={styles.cartHeader}>
            <Text style={styles.cartTitle}>{isBn ? 'আপনার কার্ট' : 'Your Cart'}</Text>
            <TouchableOpacity onPress={() => setShowCart(false)}>
              <X size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 300 }}>
            {cart.length === 0 ? (
              <Text style={styles.emptyCart}>{isBn ? 'কার্ট খালি' : 'Cart is empty'}</Text>
            ) : (
              cart.map((c) => (
                <View key={c.item_id} style={styles.cartRow}>
                  <Text style={styles.cartName}>{isBn ? c.name_bn : c.name_en}</Text>
                  <View style={styles.cartQty}>
                    <TouchableOpacity onPress={() => updateQty(c.item_id, -1)}>
                      <Minus size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.cartQtyText}>{c.quantity}</Text>
                    <TouchableOpacity onPress={() => updateQty(c.item_id, 1)}>
                      <Plus size={14} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.cartPrice}>৳{c.best_price_bdt * c.quantity}</Text>
                </View>
              ))
            )}
          </ScrollView>
          {cart.length > 0 && (
            <View style={styles.cartFooter}>
              <Text style={styles.cartTotal}>
                {isBn ? 'মোট:' : 'Total:'} ৳{cartTotal}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Results */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : items.length === 0 ? (
          <Text style={styles.emptyText}>
            {isBn ? 'খাবার খুঁজতে সার্চ বার ব্যবহার করুন' : 'Use the search bar to find foods'}
          </Text>
        ) : (
          items.map((item) => (
            <View key={item.item_id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardName}>{isBn ? item.name_bn : item.name_en}</Text>
                <Text style={styles.cardUnit}>{item.unit}</Text>
              </View>
              <Text style={styles.bestPrice}>
                {isBn ? 'সর্বনিম্ন মূল্য:' : 'Best price:'} ৳{item.best_price_bdt}
              </Text>
              <View style={styles.offersRow}>
                {item.offers.map((o) => (
                  <View key={o.platform_id} style={styles.offerChip}>
                    <Text style={styles.offerPlatform}>{o.platform_name_bn || o.platform_name}</Text>
                    <Text style={styles.offerPrice}>৳{o.price_bdt}</Text>
                    {o.nearest_shop && (
                      <Text style={styles.offerShop}>
                        <Store size={10} color={colors.textSecondary} /> {o.nearest_shop.name}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
                <Plus size={16} color="#fff" />
                <Text style={styles.addBtnText}>{isBn ? 'কার্টে যোগ করুন' : 'Add to Cart'}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    padding: 4,
    position: 'relative' as const,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    fontFamily: fonts.body,
  },
  badge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700' as const,
  },
  searchBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    fontFamily: fonts.body,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.textPrimary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  cartOverlay: {
    position: 'absolute' as const,
    top: 110,
    left: 16,
    right: 16,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    zIndex: 50,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cartHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 10,
  },
  cartTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    fontFamily: fonts.body,
  },
  cartRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cartName: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    fontFamily: fonts.body,
  },
  cartQty: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
  },
  cartQtyText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.textPrimary,
  },
  cartPrice: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: colors.primary,
    marginLeft: 12,
  },
  cartFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  cartTotal: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    textAlign: 'right' as const,
  },
  emptyCart: {
    textAlign: 'center' as const,
    color: colors.textSecondary,
    fontSize: 13,
    paddingVertical: 20,
    fontFamily: fonts.body,
  },
  emptyText: {
    textAlign: 'center' as const,
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 40,
    fontFamily: fonts.body,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  cardHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 6,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    fontFamily: fonts.body,
  },
  cardUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: fonts.body,
  },
  bestPrice: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.primary,
    marginBottom: 8,
    fontFamily: fonts.body,
  },
  offersRow: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginBottom: 12,
  },
  offerChip: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  offerPlatform: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: fonts.body,
  },
  offerPrice: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    fontFamily: fonts.body,
  },
  offerShop: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    fontFamily: fonts.body,
  },
  addBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 6,
    backgroundColor: colors.textPrimary,
    borderRadius: 12,
    paddingVertical: 10,
  },
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600' as const,
    fontFamily: fonts.body,
  },
};
