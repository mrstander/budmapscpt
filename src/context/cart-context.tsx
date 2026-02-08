
'use client';

import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { Product, Dispensary, CartItem } from '@/lib/types';
import { signOut as nextAuthSignOut } from 'next-auth/react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, dispensary: Dispensary, quantity?: number) => void;
  removeFromCart: (productId: string, weight?: string) => void;
  decrementItem: (productId: string, weight?: string) => void;
  clearCart: () => void;
  groupedByDispensary: { [key: string]: CartItem[] };
  itemCount: number;
  handleSignOut: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log("CartProvider mounting");
  const [cart, setCart] = useState<CartItem[]>([]);
  const router = useRouter();

  const addToCart = useCallback((product: Product, dispensary: Dispensary, quantity: number = 1) => {
    setCart(prevCart => {
      // Logic to define "same item": same product ID AND same weight (if applicable)
      // Since current usage might not pass weight yet, we'll assume product.weight if not handled elsewhere, 
      // but strictly speaking, we check if an item with same product.id and SAME weight exists.
      // For now, let's assume simple product matching or if the product has a specific selected weight.
      // The Type change adds 'weight' to CartItem, so we should check it.

      // NOTE: Simple implementation: finding item by product.id. 
      // Ideally we need the selected weight passed in addToCart if products have variants.
      // The interface says: addToCart(product, dispensary, quantity)
      // It doesn't take weight. We might need to infer it or update the interface later.
      // For now, let's match by product.id to get basic functionality working.
      // If we need to support weight variants properly, the interface needs to change.
      // However, to satisfy the CURRENT type error, we just need the implementation.

      const existingItemIndex = prevCart.findIndex(item => item.product.id === product.id);

      if (existingItemIndex > -1) {
        const newCart = [...prevCart];
        newCart[existingItemIndex].quantity += quantity;
        return newCart; // fixed: was returning implicit void in some paths if check failed, but fine here
      }

      return [...prevCart, { product, dispensary, quantity, price: product.price }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string, weight?: string) => {
    setCart(prevCart => prevCart.filter(item => {
      if (weight && item.weight) {
        return !(item.product.id === productId && item.weight === weight);
      }
      return item.product.id !== productId;
    }));
  }, []);

  const decrementItem = useCallback((productId: string, weight?: string) => {
    setCart(prevCart => {
      // Reduce implementation to handle removal if qty 1
      const newCart: CartItem[] = [];
      for (const item of prevCart) {
        if (item.product.id === productId && (!weight || item.weight === weight)) {
          if (item.quantity > 1) {
            newCart.push({ ...item, quantity: item.quantity - 1 });
          }
          // else drop it
        } else {
          newCart.push(item);
        }
      }
      return newCart;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      await nextAuthSignOut({ redirect: false });
      clearCart();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }, [clearCart, router]);

  const itemCount = useMemo(() => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  }, [cart]);

  const groupedByDispensary = useMemo(() => {
    return cart.reduce((acc, item) => {
      const dispensaryName = item.dispensary.name;
      if (!acc[dispensaryName]) {
        acc[dispensaryName] = [];
      }
      acc[dispensaryName].push(item);
      return acc;
    }, {} as { [key: string]: CartItem[] });
  }, [cart]);

  return (
    <CartContext.Provider value={{ cart, itemCount, addToCart, removeFromCart, decrementItem, clearCart, groupedByDispensary, handleSignOut }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    console.error("useCart failed - Context is undefined");
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
