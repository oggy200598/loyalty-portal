function formatCurrency(value) {
  if (value === null || value === undefined) return '---';

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatSold(value) {
  const sold = Number(value ?? 0);

  if (sold >= 1_000_000) {
    return `${(sold / 1_000_000).toFixed(1).replace('.0', '')}tr+`;
  }

  if (sold >= 1000) {
    return `${Math.floor(sold / 1000)}k+`;
  }

  return sold;
}

function ProductSection({ products, loading, error }) {
  return (
    <>
      <style>{`
        /* =========================================
           PRODUCT SECTION - SHOPEE STYLE
        ========================================= */

        .rm-product-section {
          margin-top: 18px;
          padding: 0;
          border-radius: 8px;
          overflow: hidden;
          background: #fff;
          border: 1px solid #f1f1f1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, .04);
        }

        .rm-product-header {
          min-height: 58px;
          padding: 0 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          background: #fff;
          border-bottom: 1px solid #eeeeee;
        }

        .rm-product-header-left {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .rm-product-title {
          margin: 0;
          color: #ee4d2d;
          font-size: 17px;
          font-weight: 500;
          text-transform: uppercase;
        }

        .rm-product-subtitle {
          margin: 0;
          color: #757575;
          font-size: 13px;
        }

        .rm-product-view-all {
          color: #ee4d2d;
          text-decoration: none;
          font-size: 14px;
          white-space: nowrap;
        }

        .rm-product-view-all:hover {
          color: #d63f21;
        }

        .rm-product-body {
          padding: 10px;
          background: #f5f5f5;
        }

        .rm-product-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 10px;
        }

        /* =========================================
           CARD
        ========================================= */

        .rm-product-card {
          position: relative;
          min-width: 0;
          overflow: hidden;
          background: #fff;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          transition:
            transform .15s ease,
            box-shadow .15s ease,
            border-color .15s ease;
        }

        .rm-product-card:hover {
          z-index: 5;
          transform: translateY(-1px);
          border-color: #ee4d2d;
          box-shadow: 0 5px 14px rgba(0, 0, 0, .12);
        }

        /* =========================================
           IMAGE
        ========================================= */

        .rm-product-image-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 1 / 1;
          overflow: hidden;
          background: #fff;
        }

        .rm-product-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          transition: transform .25s ease;
        }

        .rm-product-card:hover .rm-product-image {
          transform: scale(1.03);
        }

        .rm-product-placeholder {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          color: #999;
          background: #f7f7f7;
          font-size: 13px;
        }

        /* =========================================
           DISCOUNT BADGE
        ========================================= */

        .rm-discount-badge {
          position: absolute;
          top: 0;
          right: 0;
          z-index: 3;

          min-width: 42px;
          padding: 3px 5px;

          background: #fff3ef;
          color: #ee4d2d;

          font-size: 12px;
          font-weight: 500;
          line-height: 1.25;
          text-align: center;

          border-bottom-left-radius: 4px;
        }

        /* =========================================
           BODY
        ========================================= */

        .rm-product-content {
          min-height: 152px;
          padding: 8px;

          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .rm-product-name {
          min-height: 40px;
          margin: 0;

          color: #333;
          font-size: 14px;
          line-height: 1.4;
          font-weight: 400;

          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* =========================================
           PROMOTION TAG
        ========================================= */

        .rm-product-tag-row {
          min-height: 20px;
          margin-top: 6px;

          display: flex;
          align-items: center;
          gap: 4px;
          overflow: hidden;
        }

        .rm-product-tag {
          max-width: 100%;
          padding: 2px 5px;

          color: #ee4d2d;
          background: #fff;

          border: 1px solid #ee4d2d;
          border-radius: 2px;

          font-size: 10px;
          line-height: 1.2;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rm-product-tag.hot {
          color: #fff;
          border-color: #ee4d2d;
          background: #ee4d2d;
        }

        /* =========================================
           PRICE + SOLD
        ========================================= */

        .rm-product-bottom {
          margin-top: 12px;

          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
        }

        .rm-product-price {
          min-width: 0;

          color: #ee4d2d;
          font-size: 17px;
          font-weight: 500;
          line-height: 1.2;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .rm-product-sold {
          flex-shrink: 0;

          color: #666;
          font-size: 12px;
          line-height: 1.2;
          white-space: nowrap;
        }

        /* =========================================
           SHOP
        ========================================= */

        .rm-product-shop {
          margin-top: 5px;

          color: #888;
          font-size: 11px;

          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* =========================================
           BADGE MALL
        ========================================= */

        .rm-product-mall {
          position: absolute;
          top: 8px;
          left: 0;
          z-index: 4;

          padding: 3px 6px;

          color: #fff;
          background: #d0011b;

          font-size: 10px;
          font-weight: 600;

          border-radius: 0 3px 3px 0;
        }

        /* =========================================
           LOADING / ERROR
        ========================================= */

        .rm-product-state {
          padding: 36px 20px;
          text-align: center;
          color: #888;
          font-size: 14px;
          background: #fff;
        }

        .rm-product-state.error {
          color: #d9534f;
        }

        /* =========================================
           RESPONSIVE
        ========================================= */

        @media (max-width: 1200px) {
          .rm-product-grid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }
        }

        @media (max-width: 992px) {
          .rm-product-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (max-width: 768px) {
          .rm-product-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 7px;
          }

          .rm-product-header {
            padding: 0 12px;
          }

          .rm-product-subtitle {
            display: none;
          }

          .rm-product-content {
            min-height: 140px;
            padding: 7px;
          }

          .rm-product-name {
            font-size: 13px;
          }

          .rm-product-price {
            font-size: 15px;
          }
        }

        @media (max-width: 500px) {
          .rm-product-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .rm-product-header-left {
            gap: 0;
          }
        }
      `}</style>

      <section className="rm-product-section" id="products">
        {/* HEADER */}
        <div className="rm-product-header">
          <div className="rm-product-header-left">
            <h2 className="rm-product-title">
              GỢI Ý HÔM NAY
            </h2>
          </div>

          <a
            href="#products"
            className="rm-product-view-all"
          >
            Xem tất cả →
          </a>
        </div>

        {/* LOADING */}
        {loading ? (
          <div className="rm-product-state">
            Đang tải sản phẩm...
          </div>
        ) : null}

        {/* ERROR */}
        {error ? (
          <div className="rm-product-state error">
            {error}
          </div>
        ) : null}

        {/* EMPTY */}
        {!loading &&
        !error &&
        (!products || products.length === 0) ? (
          <div className="rm-product-state">
            Chưa có sản phẩm
          </div>
        ) : null}

        {/* PRODUCTS */}
        {!loading &&
        !error &&
        products?.length > 0 ? (
          <div className="rm-product-body">
            <div className="rm-product-grid">
              {products.map((product) => {
                const image =
                  product.images?.find(
                    (item) => item.isPrimary,
                  )?.imageUrl ??
                  product.images?.[0]?.imageUrl ??
                  '';

                const sold = Number(
                  product.soldQuantity ?? 0,
                );

                const variantCount =
                  product.variants?.length ?? 0;

                const isHot = sold >= 100;

                const discount =
                  product.discountPercent !== null &&
                  product.discountPercent !== undefined
                    ? product.discountPercent
                    : null;

                return (
                  <article
                    className="rm-product-card"
                    key={product.id}
                  >
                    {/* MALL */}
                    {product.shop?.name
                      ?.toLowerCase()
                      .includes('official') ? (
                      <div className="rm-product-mall">
                        Mall
                      </div>
                    ) : null}

                    {/* IMAGE */}
                    <div className="rm-product-image-wrap">
                      {image ? (
                        <img
                          src={image}
                          alt={product.name}
                          className="rm-product-image"
                          loading="lazy"
                        />
                      ) : (
                        <div className="rm-product-placeholder">
                          Chưa có ảnh
                        </div>
                      )}

                      {discount !== null ? (
                        <div className="rm-discount-badge">
                          -{discount}%
                        </div>
                      ) : null}
                    </div>

                    {/* BODY */}
                    <div className="rm-product-content">
                      <div>
                        <h3
                          className="rm-product-name"
                          title={product.name}
                        >
                          {product.name}
                        </h3>

                        <div className="rm-product-tag-row">
                          {isHot ? (
                            <span className="rm-product-tag hot">
                              Đang bán chạy
                            </span>
                          ) : variantCount > 0 ? (
                            <span className="rm-product-tag">
                              Nhiều phiên bản
                            </span>
                          ) : null}
                        </div>

                        <div
                          className="rm-product-shop"
                          title={product.shop?.name}
                        >
                          {product.shop?.name ??
                            'Cửa hàng'}
                        </div>
                      </div>

                      <div className="rm-product-bottom">
                        <span className="rm-product-price">
                          {formatCurrency(product.price)}
                        </span>

                        <span className="rm-product-sold">
                          {formatSold(sold)} đã bán
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}

export default ProductSection;