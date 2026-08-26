/**
 * Mock services cho các phần backend CHƯA có API.
 * Tách riêng khỏi component theo yêu cầu kỹ thuật.
 * Khi backend có API thật, thay implementation tại đây.
 */

/* ================= FLASH SALE (mock) ================= */

export function getFlashSaleWindows() {
  const now = new Date();

  const current = {
    id: 'fs-current',
    label: 'Đang diễn ra',
    startHour: now.getHours(),
    endHour: now.getHours() + 1,
  };

  const upcoming = [1, 2, 3].map((offset) => ({
    id: `fs-upcoming-${offset}`,
    label: 'Sắp diễn ra',
    startHour: (now.getHours() + offset) % 24,
    endHour: (now.getHours() + offset + 1) % 24,
  }));

  return { current, upcoming };
}

export async function getFlashSaleProducts(limit = 12) {
  const { api } = await import('./api');

  const products = await api.getProducts(limit);

  return products.map((product, index) => {
    const originalPrice = Number(product.price ?? 0);
    const percent =
      product.discountPercent ??
      10 + ((index * 7) % 40);

    const salePrice = Math.round(
      originalPrice * (1 - percent / 100),
    );

    const totalStock = 100 + ((index * 37) % 200);
    const soldInSale = Math.round(
      totalStock *
        (0.2 + ((index * 13) % 70) / 100),
    );

    return {
      ...product,
      originalPrice,
      salePrice,
      discountPercent: percent,
      totalStock,
      soldInSale,
      progressPercent: Math.min(
        100,
        Math.round((soldInSale / totalStock) * 100),
      ),
      outOfStock: soldInSale >= totalStock,
    };
  });
}

/* ================= NOTIFICATIONS (mock) ================= */

export function getNotifications() {
  return [
    {
      id: 'n1',
      group: 'order',
      title: 'Đơn hàng #RM10234 đã được xác nhận',
      body: 'Người bán đang chuẩn bị hàng của bạn.',
      createdAt: new Date(
        Date.now() - 3600_000,
      ).toISOString(),
      read: false,
    },
    {
      id: 'n2',
      group: 'voucher',
      title: 'Bạn có voucher mới',
      body: 'Giảm 20% cho đơn từ 200.000₫ — hết hạn sau 3 ngày.',
      createdAt: new Date(
        Date.now() - 7200_000,
      ).toISOString(),
      read: false,
    },
    {
      id: 'n3',
      group: 'promotion',
      title: 'Flash Sale mỗi giờ',
      body: 'Hàng ngàn sản phẩm giảm đến 50%.',
      createdAt: new Date(
        Date.now() - 86_400_000,
      ).toISOString(),
      read: true,
    },
    {
      id: 'n4',
      group: 'ai',
      title: 'RiskMind AI gợi ý cho bạn',
      body: 'Có sản phẩm mới phù hợp với lịch sử mua của bạn.',
      createdAt: new Date(
        Date.now() - 172_800_000,
      ).toISOString(),
      read: true,
    },
  ];
}

/* ================= SELLER DASHBOARD (mock) ================= */

export function getSellerStats() {
  return {
    revenue: 184_500_000,
    orders: 1240,
    products: 86,
    customers: 932,
    completionRate: 96.4,
    riskScore: 18,
    alerts: [
      {
        id: 'a1',
        level: 'warning',
        message:
          'Đơn hàng #RM10442 có dấu hiệu bất thường về địa chỉ.',
      },
      {
        id: 'a2',
        level: 'info',
        message:
          'Tồn kho "Áo thun nam cao cấp" còn dưới 10 sản phẩm.',
      },
    ],
    revenueByDay: [
      8.2, 9.1, 7.6, 10.4, 11.2, 9.8, 12.5,
    ],
    ordersByDay: [52, 61, 48, 70, 74, 66, 81],
    topProducts: [
      { name: 'Áo thun nam cao cấp', sold: 320 },
      { name: 'Tai nghe không dây Pro', sold: 284 },
      { name: 'Nồi chiên không dầu 5L', sold: 198 },
      { name: 'Son kem lì HQ', sold: 176 },
    ],
    riskDistribution: [
      { label: 'Thấp', value: 72 },
      { label: 'Trung bình', value: 21 },
      { label: 'Cao', value: 7 },
    ],
  };
}

export function getSellerProducts() {
  return [
    {
      id: 'p1',
      name: 'Áo thun nam cao cấp',
      price: 189000,
      stock: 8,
      active: true,
      sold: 320,
    },
    {
      id: 'p2',
      name: 'Tai nghe không dây Pro',
      price: 1290000,
      stock: 45,
      active: true,
      sold: 284,
    },
    {
      id: 'p3',
      name: 'Nồi chiên không dầu 5L',
      price: 2450000,
      stock: 23,
      active: false,
      sold: 198,
    },
  ];
}

export function getSellerOrders() {
  const statuses = [
    'NEW',
    'CONFIRMED',
    'PROCESSING',
    'SHIPPING',
    'COMPLETED',
    'CANCELLED',
  ];

  return statuses.map((status, index) => ({
    id: `RM10${300 + index}`,
    customer: [
      'Nguyễn Văn A',
      'Trần Thị B',
      'Lê Văn C',
      'Phạm Thị D',
      'Hoàng Văn E',
      'Đỗ Thị F',
    ][index],
    total: 250000 + index * 180000,
    status,
    createdAt: new Date(
      Date.now() - index * 43_200_000,
    ).toISOString(),
  }));
}
