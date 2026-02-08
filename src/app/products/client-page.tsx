'use client';

import { useState, useMemo } from 'react';
import { Product, Dispensary } from '@/lib/types';
import { ProductCard } from '@/components/product-card';
import ProductFilters from '@/components/product-filters';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal, PackageX, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

interface ProductsClientPageProps {
    initialProducts: (Product & { dispensary: Dispensary })[];
}

export default function ProductsClientPage({ initialProducts }: ProductsClientPageProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredProducts, setFilteredProducts] = useState(initialProducts);

    const finalProducts = useMemo(() => {
        if (!searchQuery.trim()) return filteredProducts;

        const query = searchQuery.toLowerCase().trim();
        return filteredProducts.filter(p =>
            p.name.toLowerCase().includes(query) ||
            p.dispensary.name.toLowerCase().includes(query) ||
            p.type.toLowerCase().includes(query)
        );
    }, [filteredProducts, searchQuery]);

    return (
        <main className="flex-grow bg-slate-50/50">
            {/* Premium Hero Section */}


            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col lg:flex-row gap-12">
                    {/* Desktop Sidebar Filters */}
                    <aside className="hidden lg:block w-80 flex-shrink-0 animate-in fade-in slide-in-from-left-4 duration-700 delay-300">
                        <div className="sticky top-28">
                            <ProductFilters
                                products={initialProducts}
                                onFilterChange={setFilteredProducts}
                            />
                        </div>
                    </aside>

                    {/* Mobile Filters Trigger */}
                    <div className="lg:hidden flex items-center justify-between mb-6">
                        <p className="text-sm font-bold text-muted-foreground">
                            {finalProducts.length} PRODUCTS FOUND
                        </p>
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="outline" className="flex items-center gap-2 rounded-xl h-11 border-2">
                                    <SlidersHorizontal className="h-4 w-4" />
                                    Sort & Filter
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                                <SheetHeader>
                                    <SheetTitle>Filters</SheetTitle>
                                </SheetHeader>
                                <div className="mt-8">
                                    <ProductFilters
                                        products={initialProducts}
                                        onFilterChange={setFilteredProducts}
                                    />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </div>

                    {/* Product Grid */}
                    <div className="flex-grow">
                        <div className="hidden lg:flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-black">{finalProducts.length} Results</h2>
                                {searchQuery && (
                                    <Badge variant="secondary" className="px-3 py-1">
                                        Searching: {searchQuery}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {finalProducts.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
                                {finalProducts.map((product, index) => (
                                    <div key={product.id} className="animate-in fade-in slide-in-from-bottom-8 duration-700" style={{ animationDelay: `${(index % 6) * 100}ms` }}>
                                        <ProductCard
                                            product={product}
                                            dispensary={product.dispensary}
                                            showDispensary={true}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-3xl border border-dashed border-border/60">
                                <div className="bg-slate-50 p-8 rounded-full mb-8">
                                    <PackageX className="h-16 w-16 text-muted-foreground/40" />
                                </div>
                                <h3 className="text-3xl font-black mb-3">No matching items</h3>
                                <p className="text-muted-foreground max-w-sm mx-auto text-lg mb-8">
                                    We couldn't find any products matching your specific search or active filters.
                                </p>
                                <Button
                                    className="rounded-xl h-12 px-8 font-bold"
                                    onClick={() => {
                                        setSearchQuery('');
                                        setFilteredProducts(initialProducts);
                                    }}
                                >
                                    Clear all filters
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
