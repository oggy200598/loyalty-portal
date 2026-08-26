import 'package:flutter/material.dart';

import '../../app/theme.dart';
import '../../models/product.dart';

/// Hàng coupon hiển thị trên Product Detail.
class CouponRow extends StatelessWidget {
  final List<Coupon> coupons;

  const CouponRow({super.key, required this.coupons});

  String _label(Coupon coupon) {
    if (coupon.isFreeShip) return 'FREESHIP';
    if (coupon.discountType == 'PERCENT') {
      return 'Giảm ${coupon.discountValue}%';
    }
    return 'Giảm ${coupon.discountValue?.round() ?? 0}₫';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.symmetric(
        horizontal: 14,
        vertical: 10,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Ưu đãi',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: coupons.map((coupon) {
              final isShip = coupon.isFreeShip;

              return Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: isShip
                        ? const Color(0xFF02B2FA)
                        : AppColors.accent,
                  ),
                  borderRadius:
                      BorderRadius.circular(4),
                  color: isShip
                      ? const Color(0xFFF0FBFF)
                      : const Color(0xFFFFF5F2),
                ),
                child: Text(
                  _label(coupon),
                  style: TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: isShip
                        ? const Color(0xFF02B2FA)
                        : AppColors.accent,
                  ),
                ),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }
}
