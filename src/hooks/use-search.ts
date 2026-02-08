'use client';

import { useState, useEffect, useCallback } from 'react';
import { searchGlobal } from '@/lib/actions/search-actions';
import type { Dispensary, Product } from '@/lib/types';

interface SearchResults {
    // @ts-ignore
    dispensaries: Dispensary[];
    // @ts-ignore
    products: Product[];
    isLoading: boolean;
    error: Error | null;
}

export function useSearch(searchTerm: string): SearchResults {
    const [dispensaries, setDispensaries] = useState<Dispensary[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const performSearch = useCallback(async (term: string) => {
        if (!term || term.length < 2) {
            setDispensaries([]);
            setProducts([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const results = await searchGlobal(term);
            // @ts-ignore
            setDispensaries(results.dispensaries);
            // @ts-ignore
            setProducts(results.products);
        } catch (err: any) {
            console.error("Search error:", err);
            setError(err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            performSearch(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, performSearch]);

    return { dispensaries, products, isLoading, error };
}

