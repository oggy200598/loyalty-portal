import { valueLabel, formatCurrency } from '../common/format';
import { useEffect, useState } from 'react';
import { api } from '../common/api';

function SellerProductsPage() {
  const [products, setProducts] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .getSellerProducts()
      .then((data) => {
        if (active) setProducts(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Không thể tải sản phẩm');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const filtered = products.filter((product) =>
    (product.name ?? '').toLowerCase().includes(keyword.toLowerCase()),
  );

  return (
    <div>
      <div className="admin-page-heading"><div><h1>Sản phẩm</h1><p>Danh sách sản phẩm, giá bán và tồn kho của cửa hàng.</p></div></div>
      <div className="admin-list-toolbar">
        <input
          type="text"
          className="form-control form-control-sm"
          aria-label="Tìm sản phẩm"
          style={{ maxWidth: 240 }}
          placeholder="Tìm sản phẩm..."
          value={keyword}
          onChange={(event) =>
            setKeyword(event.target.value)
          }
        />

        <span className="small text-muted align-self-center">
          {filtered.length} / {products.length} sản phẩm
        </span>
      </div>

      {error && <div className="alert alert-danger py-2 small">{error}</div>}

      {loading ? (
        <div className="text-center text-muted py-5">Đang tải...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted py-5 bg-white rounded-3 border">
          Không có sản phẩm phù hợp
        </div>
      ) : (
        <div
          className="admin-table-surface"
        >
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle mb-0 small">
              <thead>
                <tr className="text-muted">
                  <th>Sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Giá</th>
                  <th>Tồn kho</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td className="fw-semibold">
                      {product.name}
                    </td>

                    <td>{product.category ?? '—'}</td>

                    <td>{formatCurrency(Number(product.price))}</td>

                    <td
                      className={
                        Number(product.stockQuantity) < 10
                          ? 'text-danger fw-semibold'
                          : ''
                      }
                    >
                      {product.stockQuantity}
                    </td>

                    <td>
                      <span
                        className={`badge rounded-pill ${
                          product.status === 'ACTIVE'
                            ? 'bg-success-subtle text-success'
                            : 'bg-secondary-subtle text-secondary'
                        }`}
                      >
                        {product.status === 'ACTIVE' ? 'Đang bán' : valueLabel(product.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default SellerProductsPage;
