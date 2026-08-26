import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
function CategorySection() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function loadCategories() {
      try {
        setLoading(true);
        setError(null);

        const data = await api.getCategories();

        if (!active) return;

        setCategories(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!active) return;

        setError(
          err instanceof Error
            ? err.message
            : 'Không thể tải danh mục'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <style>{`
        .rm-category-section {
          margin-top: 20px;
          background: #fff;
          border-radius: 8px;
          border: 1px solid #f1f5f9;
          box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
          overflow: hidden;
        }

        .rm-category-title {
          padding: 18px 20px 14px;
          border-bottom: 1px solid #f1f5f9;

          font-size: 18px;
          font-weight: 700;
          color: #333;
        }

        .rm-category-grid {
          display: grid;
          grid-template-columns: repeat(8, minmax(0, 1fr));
        }

        .rm-category-item {
          min-height: 120px;
          padding: 18px 10px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          text-align: center;
          text-decoration: none;

          color: #333;

          border-right: 1px solid #f5f5f5;
          border-bottom: 1px solid #f5f5f5;

          transition:
            color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .rm-category-item:hover {
          color: #ee4d2d;
          background: #fffaf8;
          transform: translateY(-2px);
        }

        .rm-category-icon {
          width: 58px;
          height: 58px;

          margin-bottom: 10px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          background: #fff3ef;
          color: #ee4d2d;

          font-size: 24px;
        }

        .rm-category-name {
          max-width: 120px;

          font-size: 13px;
          line-height: 1.35;
          font-weight: 500;
        }

        .rm-category-count {
          margin-top: 4px;

          font-size: 11px;
          color: #9ca3af;
        }

        .rm-category-state {
          padding: 28px 20px;
          text-align: center;
          color: #6b7280;
        }

        .rm-category-error {
          color: #dc2626;
        }

        @media (max-width: 1100px) {
          .rm-category-grid {
            grid-template-columns: repeat(6, minmax(0, 1fr));
          }
        }

        @media (max-width: 800px) {
          .rm-category-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 500px) {
          .rm-category-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .rm-category-item {
            min-height: 105px;
            padding: 14px 6px;
          }

          .rm-category-icon {
            width: 48px;
            height: 48px;
            font-size: 20px;
          }

          .rm-category-name {
            font-size: 12px;
          }
        }
      `}</style>

      <section className="rm-category-section" id="categories">
        <div className="rm-category-title">
          Danh mục
        </div>

        {loading && (
          <div className="rm-category-state">
            Đang tải danh mục...
          </div>
        )}

        {!loading && error && (
          <div className="rm-category-state rm-category-error">
            {error}
          </div>
        )}

        {!loading && !error && categories.length === 0 && (
          <div className="rm-category-state">
            Chưa có danh mục
          </div>
        )}

        {!loading && !error && categories.length > 0 && (
          <div className="rm-category-grid">
            {categories.map((category, index) => (
              <Link
                key={category.id}
                to={`/categories/${category.id}`}
                className="rm-category-item"
              >
                <div className="rm-category-icon">
                  <i
                    className={`bi ${
                     [
                      'bi-phone',                // Điện tử
                      'bi-bag',                  // Gia dụng
                      'bi-laptop',               // Laptop
                      'bi-house',                // Nhà bếp
                      'bi-tools',                // Phụ kiện
                      'bi-stars',                // Vệ sinh nhà cửa
                      'bi-three-dots',           // Khác
                    ][index % 7]
                    }`}
                  />
                </div>

                <div className="rm-category-name">
                  {category.name}
                </div>

                {category.productCount != null && (
                  <div className="rm-category-count">
                    {category.productCount} sản phẩm
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default CategorySection;