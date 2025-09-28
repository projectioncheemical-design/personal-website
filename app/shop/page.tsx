"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ShoppingCart, Leaf, Sprout, Droplets, Sun, Wind } from "lucide-react";

type Product = {
  id: string;
  name: string;
  capacity: string;
  price: number | string;
  category?: string;
  images?: { url: string; blurDataUrl?: string }[];
};

const CATEGORY_ICONS: Record<string, JSX.Element> = {
  'نباتات': <Leaf className="w-4 h-4 text-green-600" />,
  'بذور': <Sprout className="w-4 h-4 text-green-500" />,
  'أسمدة': <Droplets className="w-4 h-4 text-blue-500" />,
  'معدات': <Sun className="w-4 h-4 text-yellow-500" />,
  'أخرى': <Wind className="w-4 h-4 text-gray-500" />
};

const getCategoryIcon = (category: string = 'أخرى') => {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS['أخرى'];
};

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('الكل');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setProducts(data.products || []);
      } catch (e: any) {
        setError(e.message || "فشل تحميل المنتجات");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function addToCart(p: Product, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("cart") : null;
      const cart = raw ? JSON.parse(raw) as any[] : [];
      const idx = cart.findIndex((i) => i.id === p.id);
      if (idx >= 0) {
        cart[idx].qty += 1;
      } else {
        cart.push({ 
          id: p.id, 
          name: p.name, 
          price: Number(p.price), 
          category: p.category,
          image: p.images?.[0]?.url || null, 
          qty: 1 
        });
      }
      window.localStorage.setItem("cart", JSON.stringify(cart));
      
      // Show success notification
      const notification = document.createElement('div');
      notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in';
      notification.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        <span>تمت الإضافة إلى العربة</span>
      `;
      document.body.appendChild(notification);
      setTimeout(() => {
        notification.remove();
      }, 3000);
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  }

  const categories = ['الكل', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filteredProducts = activeCategory === 'الكل' 
    ? products 
    : products.filter(p => p.category === activeCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">متجر المنتجات الزراعية</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">اكتشف أفضل المنتجات الزراعية بجودة عالية</p>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap justify-center gap-2 mb-8 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              activeCategory === category
                ? 'bg-green-600 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {category !== 'الكل' && getCategoryIcon(category)}
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 overflow-hidden animate-pulse">
              <div className="w-full h-48 bg-gray-200 dark:bg-gray-700" />
              <div className="p-4">
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
                <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <div className="text-red-500 text-lg mb-2">حدث خطأ</div>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-400 dark:text-gray-500 text-5xl mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">لا توجد منتجات متاحة</h3>
          <p className="mt-1 text-gray-500 dark:text-gray-400">لم يتم العثور على منتجات في هذه الفئة.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <a 
              key={product.id} 
              href={`/products/${product.id}`}
              className="group block bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 dark:border-gray-700 hover:-translate-y-1"
            >
              <div className="relative h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                {product.images?.[0]?.url ? (
                  <Image
                    src={product.images[0].url}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={false}
                    placeholder={product.images[0].blurDataUrl ? "blur" : undefined}
                    blurDataURL={product.images[0].blurDataUrl}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-700 dark:to-gray-800">
                    <Leaf className="w-12 h-12 text-green-300 dark:text-green-700" />
                  </div>
                )}
                {product.category && (
                  <div className="absolute top-3 right-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                    {getCategoryIcon(product.category)}
                    {product.category}
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2" title={product.name}>
                    {product.name}
                  </h3>
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <span>السعة: {product.capacity}</span>
                </div>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {Number(product.price).toLocaleString(undefined, {style:"currency", currency:"EGP"})}
                  </span>
                  <button 
                    onClick={(e) => addToCart(product, e)}
                    className="p-2 bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 rounded-full hover:bg-green-200 dark:hover:bg-green-800 transition-colors"
                    aria-label="أضف إلى العربة"
                  >
                    <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
