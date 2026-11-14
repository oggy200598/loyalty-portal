import { useCallback, useEffect, useState } from 'react';

export function useAdminData(fetcher) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    fetcher()
      .then((data) => {
        if (active) setRows(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rows, loading, error };
}

export function useAdminList(fetcher) {
  const [query, setQuery] = useState({ page: 1, q: '', status: '' });
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState({ data: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let changingPage = false;
    const filters = { ...(query.q ? { q: query.q } : {}), ...(query.status ? { status: query.status } : {}) };
    if (query.paymentStatus) filters.paymentStatus = query.paymentStatus;
    Promise.resolve().then(() => fetcher(query.page, filters)).then((data) => {
      if (active && data.pagination && query.page > Math.max(1, data.pagination.totalPages)) {
        changingPage = true;
        setQuery((value) => ({ ...value, page: Math.max(1, data.pagination.totalPages) }));
        return;
      }
      if (active) { setResult(data); setError(''); }
    }).catch((err) => { if (active) setError(err.message || 'Không tải được dữ liệu'); })
      .finally(() => { if (active && !changingPage) setLoading(false); });
    return () => { active = false; };
  }, [fetcher, query, revision]);
  const refresh = useCallback(() => { setLoading(true); setRevision((value) => value + 1); }, []);
  const search = (filters) => { setLoading(true); setQuery({ page: 1, ...filters }); };
  const changePage = (page) => { setLoading(true); setQuery((value) => ({ ...value, page })); };
  return { rows: result.data, pagination: result.pagination, loading, error, query, refresh, search, changePage };
}
