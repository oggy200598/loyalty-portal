import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { EarningPolicy } from './earning-policy';
import type { LoyaltyTx } from './loyalty-ledger.service';

/** Join the account's existing identity; never reset an existing member. */
export async function enrollMember(tx: LoyaltyTx, userId: string) {
  const users = await tx.$queryRaw<{ id: string }[]>`
    SELECT id FROM users WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${userId}`;
  if (!users.length) throw new NotFoundException('Không tìm thấy tài khoản.');
  const existing = await tx.loyalty_members.findUnique({
    where: { user_id: userId },
  });
  if (existing) return existing;
  const version = await tx.loyalty_rule_versions.findFirst({
    where: { status: 'PUBLISHED', effective_at: { lte: new Date() } },
    orderBy: [{ effective_at: 'desc' }, { id: 'desc' }],
  });
  if (!version)
    throw new ServiceUnavailableException(
      'Chưa có chính sách khách hàng thân thiết đang hiệu lực.',
    );
  const policy = new EarningPolicy(version.config);
  const member = await tx.loyalty_members.create({
    data: { user_id: userId, tier_code: policy.config.tiers[0].code },
  });
  await tx.audit_logs.create({
    data: {
      user_id: userId,
      action: 'MEMBER_ENROLLED',
      entity_type: 'LOYALTY_MEMBER',
      new_data: JSON.stringify({ memberId: userId }),
    },
  });
  return member;
}
