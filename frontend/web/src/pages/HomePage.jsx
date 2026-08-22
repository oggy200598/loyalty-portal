import { useEffect, useState } from 'react';
import { api } from '../services/api';
import Header from '../components/home/Header';
import Hero from '../components/home/Hero';
import CategorySection from '../components/home/CategorySection';
import ProductSection from '../components/home/ProductSection';
import Footer from '../components/home/Footer';

function HomePage() {
  const [products, setProducts] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [riskOverview, setRiskOverview] = useState(null);
  const [latestRisk, setLatestRisk] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [state, setState] = useState({
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setState({ loading: true, error: null });

        const [
          productData,
          statisticsData,
          riskOverviewData,
          latestRiskData,
          recommendationData,
        ] = await Promise.all([
          api.getProducts(36),
          api.getStatisticsOverview(),
          api.getRiskOverview(),
          api.getLatestRisk(),
          api.getLatestRecommendation(),
        ]);

        if (!active) return;

        setProducts(Array.isArray(productData) ? productData : []);
        setStatistics(statisticsData ?? null);
        setRiskOverview(riskOverviewData ?? null);
        setLatestRisk(latestRiskData ?? null);
        setRecommendations(
          Array.isArray(recommendationData)
            ? recommendationData
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
      <Header />
      <Hero risk={latestRisk} />
      <main className="page-main">
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

      <Footer />
    </div>
  );
}

export default HomePage;