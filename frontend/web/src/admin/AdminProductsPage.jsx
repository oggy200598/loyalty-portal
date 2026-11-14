import { useEffect, useState } from 'react';
import { AdminTable } from './AdminTable';
import { AdminEditor, AdminFilters } from './AdminEditor';
import { useAdminList } from './adminData';
import { LoyaltyPager } from '../loyalty/LoyaltyUI';
import { api, mediaUrl } from '../common/api';
import { formatCurrency } from '../common/format';

const STATUSES = [['ACTIVE', 'Đang bán'], ['OUT_OF_STOCK', 'Hết hàng'], ['HIDDEN', 'Đã ẩn'], ['DELETED', 'Đã xóa']];
const emptyProduct = () => ({ name: '', description: '', shopId: '', categoryId: '', price: '', stockQuantity: 0, status: 'ACTIVE', imageUrl: '', variants: [] });
const formFrom = (row) => ({ id: row.id, name: row.name, description: row.description || '', shopId: String(row.shop_id), categoryId: String(row.category_id ?? ''), price: String(row.price), stockQuantity: row.stock_quantity, status: row.status, imageUrl: row.product_images.find((image) => image.is_primary)?.image_url || '', expectedUpdatedAt: row.updated_at, expectedStockQuantity: row.stock_quantity, variants: row.product_variants.map((v) => ({ id: String(v.id), name: v.variant_name, price: String(v.price), stockQuantity: v.stock_quantity, expectedStockQuantity: v.stock_quantity })) });

export default function AdminProductsPage() {
  const list = useAdminList(api.getAdminProducts);
  const [options, setOptions] = useState({ shops: [], categories: [] });
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => { let active = true; api.getAdminCatalogOptions().then((value) => { if (active) setOptions(value); }).catch((err) => { if (active) setError(err.message); }); return () => { active = false; }; }, []);
  async function open(product) {
    setError(''); setNotice(''); setBusy(true);
    try { setOptions(await api.getAdminCatalogOptions()); setForm(product ? formFrom(await api.getAdminProduct(product.id)) : emptyProduct()); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function save() {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const variants = form.variants.map(({ id, price, stockQuantity, expectedStockQuantity }) => ({ id, price: Number(price), stockQuantity: Number(stockQuantity), expectedStockQuantity }));
      const payload = { name: form.name.trim(), description: form.description.trim(), shopId: form.shopId, categoryId: form.categoryId || null, price: Number(form.price), stockQuantity: variants.length ? variants.reduce((sum, v) => sum + v.stockQuantity, 0) : Number(form.stockQuantity), status: form.status, imageUrl: form.imageUrl.trim() };
      if (form.id) await api.updateAdminProduct(form.id, { ...payload, expectedUpdatedAt: form.expectedUpdatedAt, expectedStockQuantity: form.expectedStockQuantity, variants });
      else await api.createAdminProduct(payload);
      setForm(null); setNotice('Đã lưu sản phẩm. Trang mua hàng sẽ dùng dữ liệu mới.'); list.refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <>
    {notice && <div className="alert alert-success" role="status">{notice}</div>}
    {error && !form && <div className="alert alert-danger" role="alert">{error}</div>}
    {form && <ProductEditor value={form} onChange={setForm} options={options} busy={busy} error={error} onSave={save} onClose={() => { setForm(null); setError(''); }} />}
    <AdminTable title="Sản phẩm" columns={['Sản phẩm', 'Cửa hàng', 'Giá niêm yết', 'Tồn kho', 'Trạng thái', 'Thao tác']} rows={list.rows} loading={list.loading} error={list.error}
      toolbar={<AdminFilters onSearch={list.search} onRefresh={list.refresh} loading={list.loading || busy} statuses={STATUSES} placeholder="Tìm tên sản phẩm..."><button type="button" className="btn btn-primary" disabled={busy} onClick={() => void open(null)}>Thêm sản phẩm</button></AdminFilters>}
      renderRow={(product) => <tr key={String(product.id)}><td><strong>{product.name}</strong><small>{product.categories?.name || 'Chưa có danh mục'}{product.product_variants.length > 0 && ` · ${product.product_variants.length} phân loại`}</small></td><td>{product.shops?.name || '—'}</td><td>{formatCurrency(Number(product.price))}</td><td>{product.stock_quantity}</td><td>{STATUSES.find(([value]) => value === product.status)?.[1] || product.status}</td><td><button className="btn btn-sm btn-outline-secondary" disabled={busy || product.status === 'DELETED'} onClick={() => void open(product)}>Chỉnh sửa</button></td></tr>} />
    <LoyaltyPager pagination={list.pagination} onPage={list.changePage} />
  </>;
}

function ProductEditor({ value, onChange, options, busy, error, onSave, onClose }) {
  const set = (key, entry) => onChange({ ...value, [key]: entry });
  const variant = (index, key, entry) => onChange({ ...value, variants: value.variants.map((row, i) => i === index ? { ...row, [key]: entry } : row) });
  return <AdminEditor title={value.id ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm'} busy={busy} error={error} onSubmit={onSave} onClose={onClose}>
    <label className="col-12">Tên sản phẩm<input className="form-control mt-1" name="name" required maxLength={255} value={value.name} onChange={(e) => set('name', e.target.value)} autoFocus /></label>
    <label className="col-md-6">Cửa hàng<select className="form-select mt-1" name="shopId" required disabled={Boolean(value.id)} value={value.shopId} onChange={(e) => set('shopId', e.target.value)}><option value="">Chọn cửa hàng</option>{options.shops.filter((shop) => shop.status === 'ACTIVE' || String(shop.id) === value.shopId).map((shop) => <option key={shop.id} value={String(shop.id)}>{shop.name}</option>)}</select></label>
    <label className="col-md-6">Danh mục<select className="form-select mt-1" name="categoryId" value={value.categoryId} onChange={(e) => set('categoryId', e.target.value)}><option value="">Không có danh mục</option>{options.categories.map((category) => <option key={category.id} value={String(category.id)}>{category.name}{category.status === 'INACTIVE' ? ' (Đang ẩn)' : ''}</option>)}</select></label>
    <label className="col-md-4">Giá niêm yết (đ)<input className="form-control mt-1" name="price" type="number" min="0" max="1000000000000" step="0.01" required value={value.price} onChange={(e) => set('price', e.target.value)} /></label>
    <label className="col-md-4">Tồn kho<input className="form-control mt-1" name="stockQuantity" type="number" min="0" max="1000000000" step="1" required readOnly={value.variants.length > 0} value={value.variants.length ? value.variants.reduce((sum, v) => sum + Number(v.stockQuantity || 0), 0) : value.stockQuantity} onChange={(e) => set('stockQuantity', e.target.value)} /></label>
    <label className="col-md-4">Hiển thị<select className="form-select mt-1" name="status" value={value.status} onChange={(e) => set('status', e.target.value)}><option value="ACTIVE">Đang bán</option><option value="OUT_OF_STOCK">Hết hàng</option><option value="HIDDEN">Ẩn sản phẩm</option></select></label>
    <label className="col-12">Ảnh đại diện<input className="form-control mt-1" name="imageUrl" type="text" maxLength={2000} placeholder="https://... hoặc /media/products/..." value={value.imageUrl} onChange={(e) => set('imageUrl', e.target.value)} /><span className="text-muted d-block mt-1">Đường dẫn ảnh trong dự án hoặc ảnh công khai. Để trống để bỏ ảnh đại diện.</span>{value.imageUrl && <img src={mediaUrl(value.imageUrl)} alt="Ảnh đại diện sản phẩm" className="border rounded mt-2" style={{ width: 112, height: 112, objectFit: 'contain', background: '#fff' }} />}</label>
    <label className="col-12">Mô tả<textarea className="form-control mt-1" name="description" rows={3} maxLength={10000} value={value.description} onChange={(e) => set('description', e.target.value)} /></label>
    {value.variants.length > 0 && <div className="col-12"><h3 className="h6 mt-2">Giá bán và tồn kho theo phân loại</h3><p className="small text-muted">Giá mua hàng lấy từ phân loại khách chọn. Tổng tồn kho được tính tự động.</p><div className="table-responsive"><table className="table"><thead><tr><th>Phân loại</th><th>Giá bán (đ)</th><th>Tồn kho</th></tr></thead><tbody>{value.variants.map((row, index) => <tr key={row.id}><td>{row.name}</td><td><input className="form-control" aria-label={`Giá ${row.name}`} type="number" min="0" max="1000000000000" step="0.01" required value={row.price} onChange={(e) => variant(index, 'price', e.target.value)} /></td><td><input className="form-control" aria-label={`Tồn kho ${row.name}`} type="number" min="0" max="1000000000" step="1" required value={row.stockQuantity} onChange={(e) => variant(index, 'stockQuantity', e.target.value)} /></td></tr>)}</tbody></table></div></div>}
  </AdminEditor>;
}
