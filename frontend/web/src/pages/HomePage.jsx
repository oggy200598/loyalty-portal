import { useEffect, useState } from 'react';
import { api } from '../services/api';

import Hero from '../components/home/Hero';
import CategorySection from '../components/home/CategorySection';
import ProductSection from '../components/home/ProductSection';

function HomePage() {
  const [products, setProducts] = useState([]);
  const [latestRisk, setLatestRisk] = useState(null);

  const [state, setState] = useState({
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setState({
          loading: true,
          error: null,
        });

        const [productData] = await Promise.all([
          api.getProducts(36),
        ]);

        if (!active) return;

        setProducts(
          Array.isArray(productData)
            ? productData
            : [],
        );

        setState({
          loading: false,
          error: null,
        });
      } catch (error) {
        if (!active) return;

        setState({
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : 'Không thể tải dữ liệu',
        });
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-shell">
      <Hero risk={latestRisk} />

      <main
        className="page-main"
        style={{
          width: 'min(1200px, calc(100% - 32px))',
          margin: '0 auto',
        }}
      >
        <CategorySection
          products={products}
          loading={state.loading}
          error={state.error}
        />

        <ProductSection
          products={products}
          loading={state.loading}
          error={state.error}
        />
      </main>
    </div>
  );
}

export default HomePage;
