import { useEffect, useState } from 'react';

/**
 * Hook tách riêng khỏi AdminTable.jsx để Vite Fast Refresh hoạt động:
 * AdminTable.jsx chỉ export component, hook được export từ module riêng.
 */
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
