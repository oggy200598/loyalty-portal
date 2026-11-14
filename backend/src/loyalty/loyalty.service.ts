import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { pointCharts } from '../common/dashboard-charts';
import { Prisma } from '../../generated/prisma/client';
import { enrollMember } from './enroll-member';
import { LoyaltyCacheService } from './loyalty-cache.service';
import { PrismaService } from '../database/prisma.service';
import { EarningPolicy } from './earning-policy';
import { LoyaltyLedgerService, loyaltyJson } from './loyalty-ledger.service';
import {
  CreateAdjustmentDto,
  CreateComplaintDto,
  CreateRewardDto,
  CreateRuleDto,
  DecideAdjustmentDto,
  LoyaltyPageDto,
  ResolveComplaintDto,
  UpdateRewardDto,
  UpdateRuleDto,
} from './loyalty.dto';

function versionOf(value: unknown) {
  return createHash('sha256')
    .update(JSON.stringify(loyaltyJson(value)))
    .digest('hex');
}

function dateRange(query: LoyaltyPageDto) {
  const gte = query.from ? new Date(query.from) : undefined;
  const lte = query.to ? new Date(query.to) : undefined;
  if (gte && lte && gte > lte)
    throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc');
  return gte || lte ? { gte, lte } : undefined;
}

@Injectable()
export class LoyaltyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LoyaltyLedgerService,
    @Optional() private readonly cache?: LoyaltyCacheService,
  ) {}

  async enroll(userId: string) {
    await this.prisma.$transaction((tx) => enrollMember(tx, userId));
    return this.summary(userId);
  }

  async summary(userId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const { version, policy } = await this.ledger.rule(tx, now);
        const enrolled = await tx.loyalty_members.findUnique({
          where: { user_id: userId },
        });
        if (!enrolled)
          return {
            member: null,
            rule: {
              id: version.id,
              name: version.name,
              effectiveAt: version.effective_at,
              config: policy.config,
            },
          };
        const member = await this.ledger.lock(tx, userId, policy, now);
        const lots = await tx.loyalty_point_lots.findMany({
          where: {
            member_id: userId,
            remaining: { gt: 0 },
            expires_at: { gt: now },
          },
          orderBy: [{ expires_at: 'asc' }, { id: 'asc' }],
          take: 20,
        });
        const nextTier = policy.config.tiers.find((tier) =>
          member.qualifying_spend.lt(tier.minimumSpend),
        );
        return {
          member: {
            ...member,
            availablePoints: Math.max(member.balance, 0),
            pointsDebt: Math.max(-member.balance, 0),
            tier: policy.tierFor(member.qualifying_spend),
            nextTier: nextTier ?? null,
            cycleEndsAt: new Date(
              member.cycle_started_at.getTime() +
                policy.config.tierPeriodDays * 86400000,
            ),
            expiringLots: lots,
          },
          rule: {
            id: version.id,
            name: version.name,
            effectiveAt: version.effective_at,
            config: policy.config,
          },
        };
      },
      { timeout: 15000 },
    );
  }

  async charts(memberId?: string) {
    const points = await pointCharts(this.prisma, memberId);
    if (memberId) return points;
    const memberWhere = { users: { status: { not: 'DELETED' } } };
    const [tiers, complaints, totalRedemptions] = await Promise.all([
      this.prisma.loyalty_members.groupBy({
        by: ['tier_code'],
        where: memberWhere,
        _count: { _all: true },
      }),
      this.prisma.loyalty_complaints.groupBy({
        by: ['status'],
        where: { member: memberWhere },
        _count: { _all: true },
      }),
      this.prisma.loyalty_redemptions.count({ where: { member: memberWhere } }),
    ]);
    return {
      ...points,
      totalMembers: tiers.reduce((sum, row) => sum + row._count._all, 0),
      totalRedemptions,
      tiers: tiers.map((row) => ({
        label: row.tier_code,
        count: row._count._all,
      })),
      complaints: complaints.map((row) => ({
        label: row.status,
        count: row._count._all,
      })),
    };
  }

  async transactions(memberId: string, query: LoyaltyPageDto) {
    const where: Prisma.loyalty_point_transactionsWhereInput = {
      member_id: memberId,
      kind: query.kind,
      created_at: dateRange(query),
      ...(query.q ? { description: { contains: query.q } } : {}),
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.loyalty_point_transactions.count({ where }),
      this.prisma.loyalty_point_transactions.findMany({
        where,
        include: { lot: true, rule: { select: { id: true, name: true } } },
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return {
      data,
      pagination: {
        ...query,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async rewards(admin = false, query?: LoyaltyPageDto) {
    const version = admin ? null : await this.cache?.generation();
    if (version != null) {
      const cached = await this.cache?.read(version);
      if (cached) return cached;
    }
    const rows = await this.prisma.loyalty_rewards.findMany({
      where: admin
        ? {
            ...(query?.q ? { name: { contains: query.q } } : {}),
            ...(query?.status ? { active: query.status === 'ACTIVE' } : {}),
          }
        : { active: true },
      orderBy: { id: 'desc' },
      take: 100,
    });
    if (version != null) await this.cache?.write(version, rows);
    return admin
      ? rows.map((row) => ({ ...row, version: versionOf(row) }))
      : rows;
  }

  async redeem(memberId: string, rewardId: bigint, key: string) {
    const committed = await this.prisma.$transaction(
      async (tx) => {
        const now = new Date();
        const { policy } = await this.ledger.rule(tx, now);
        const member = await this.ledger.lock(tx, memberId, policy, now);
        const previous = await tx.loyalty_redemptions.findUnique({
          where: {
            member_id_request_key: { member_id: memberId, request_key: key },
          },
        });
        if (previous) {
          if (previous.reward_id !== rewardId)
            throw new ConflictException(
              'Mã yêu cầu đã dùng cho phần thưởng khác',
            );
          return previous;
        }
        await tx.$queryRaw`SELECT id FROM loyalty_rewards WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${rewardId}`;
        const reward = await tx.loyalty_rewards.findUnique({
          where: { id: rewardId },
        });
        if (!reward || !reward.active || reward.stock < 1)
          throw new BadRequestException('Phần thưởng không còn khả dụng');
        if (member.qualifying_spend.lt(reward.minimum_tier_spend))
          throw new BadRequestException(
            'Chưa đạt điều kiện hạng để đổi phần thưởng',
          );
        if (member.balance < reward.points_cost)
          throw new BadRequestException('Không đủ điểm khả dụng');
        const code = `LOY-${randomUUID().replaceAll('-', '').toUpperCase()}`;
        const expiresAt = new Date(
          now.getTime() + reward.voucher_days * 86400000,
        );
        const coupon = await tx.coupons.create({
          data: {
            code,
            name: reward.name,
            discount_type: 'FIXED',
            discount_value: reward.discount_value,
            min_order_value: reward.min_order_value,
            usage_limit: 1,
            start_at: now,
            end_at: expiresAt,
            loyalty_owner_id: memberId,
          },
        });
        const redemption = await tx.loyalty_redemptions.create({
          data: {
            member_id: memberId,
            reward_id: rewardId,
            coupon_id: coupon.id,
            coupon_code: code,
            points_spent: reward.points_cost,
            request_key: key,
            expires_at: expiresAt,
          },
        });
        await tx.loyalty_rewards.update({
          where: { id: rewardId },
          data: { stock: { decrement: 1 } },
        });
        const entry = await this.ledger.post(
          tx,
          {
            memberId,
            kind: 'REDEEM',
            points: -reward.points_cost,
            sourceKey: `redeem:${redemption.id}`,
            description: `Đổi thưởng: ${reward.name}`,
            now,
          },
          policy,
        );
        await this.ledger.audit(
          tx,
          memberId,
          'REWARD_REDEEMED',
          'REDEMPTION',
          redemption.id,
          null,
          { rewardId, points: entry.points, couponId: coupon.id },
        );
        return redemption;
      },
      { timeout: 15000 },
    );
    await this.cache?.invalidate();
    return committed;
  }

  async redemptions(memberId: string, query: LoyaltyPageDto) {
    const where = { member_id: memberId };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.loyalty_redemptions.count({ where }),
      this.prisma.loyalty_redemptions.findMany({
        where,
        include: { reward: { select: { name: true } } },
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    const coupons = await this.prisma.coupons.findMany({
      where: { id: { in: data.map((r) => r.coupon_id) } },
      select: { id: true, used_count: true, status: true },
    });
    return {
      data: data.map((row) => ({
        ...row,
        coupon: coupons.find((coupon) => coupon.id === row.coupon_id),
      })),
      pagination: {
        ...query,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async createComplaint(memberId: string, dto: CreateComplaintDto) {
    return this.prisma.$transaction(async (tx) => {
      if (
        !(await tx.loyalty_members.findUnique({ where: { user_id: memberId } }))
      )
        throw new BadRequestException('Vui lòng tham gia chương trình trước');
      if (
        dto.orderId &&
        !(await tx.orders.findFirst({
          where: { id: BigInt(dto.orderId), buyer_id: memberId },
          select: { id: true },
        }))
      )
        throw new NotFoundException('Không tìm thấy đơn hàng của bạn');
      const result = await tx.loyalty_complaints.create({
        data: {
          member_id: memberId,
          order_id: dto.orderId ? BigInt(dto.orderId) : null,
          type: dto.type,
          message: dto.message.trim(),
        },
      });
      await this.ledger.audit(
        tx,
        memberId,
        'COMPLAINT_CREATED',
        'COMPLAINT',
        result.id,
        null,
        { type: dto.type, orderId: dto.orderId },
      );
      return result;
    });
  }

  async complaints(query: LoyaltyPageDto, memberId?: string) {
    const where: Prisma.loyalty_complaintsWhereInput = {
      ...(memberId ? { member_id: memberId } : {}),
      status: query.status,
      created_at: dateRange(query),
      ...(query.q ? { message: { contains: query.q } } : {}),
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.loyalty_complaints.count({ where }),
      this.prisma.loyalty_complaints.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return {
      data,
      pagination: {
        ...query,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async resolveComplaint(id: bigint, actor: string, dto: ResolveComplaintDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM loyalty_complaints WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${id}`;
      const before = await tx.loyalty_complaints.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Không tìm thấy khiếu nại');
      if (
        before.updated_at.getTime() !==
        new Date(dto.expectedUpdatedAt).getTime()
      )
        throw new ConflictException(
          'Khiếu nại đã được cập nhật. Hãy tải lại trước khi xử lý.',
        );
      const changed = await tx.loyalty_complaints.updateMany({
        where: { id, status: { in: ['OPEN', 'IN_REVIEW'] } },
        data: {
          status: dto.status,
          response: dto.response.trim(),
          handled_by: actor,
          updated_at: new Date(
            Math.max(Date.now(), before.updated_at.getTime() + 1),
          ),
        },
      });
      if (!changed.count) throw new ConflictException('Khiếu nại đã đóng');
      const result = await tx.loyalty_complaints.findUniqueOrThrow({
        where: { id },
      });
      await this.ledger.audit(
        tx,
        actor,
        'COMPLAINT_UPDATED',
        'COMPLAINT',
        id,
        before,
        result,
      );
      return result;
    });
  }

  async rules() {
    const rows = await this.prisma.loyalty_rule_versions.findMany({
      orderBy: { id: 'desc' },
      take: 100,
    });
    return rows.map((row) => ({ ...row, version: versionOf(row) }));
  }

  private effectiveTime(value?: string) {
    const now = Date.now();
    const time = value ? new Date(value).getTime() : now;
    if (!Number.isFinite(time) || time < now - 60000)
      throw new BadRequestException('Không được áp dụng chính sách hồi tố');
    return new Date(Math.max(time, now));
  }

  async createRule(actor: string, dto: CreateRuleDto) {
    try {
      new EarningPolicy(dto.config);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    return this.prisma.$transaction(async (tx) => {
      const now = new Date();
      const draft = dto.status === 'DRAFT';
      const effective = draft ? null : this.effectiveTime(dto.effectiveAt);
      if (effective) {
        await tx.$queryRaw`SELECT id FROM loyalty_rule_versions WITH (UPDLOCK, HOLDLOCK) WHERE effective_at = ${effective}`;
        if (
          await tx.loyalty_rule_versions.findFirst({
            where: { effective_at: effective },
          })
        )
          throw new ConflictException(
            'Đã có chính sách tại thời điểm hiệu lực này',
          );
      }
      const result = await tx.loyalty_rule_versions.create({
        data: {
          name: dto.name.trim(),
          config: JSON.stringify(loyaltyJson(dto.config)),
          created_by: actor,
          status: draft ? 'DRAFT' : 'PUBLISHED',
          effective_at: effective,
          published_by: draft ? null : actor,
          published_at: draft ? null : now,
        },
      });
      await this.ledger.audit(
        tx,
        actor,
        draft ? 'RULE_DRAFT_CREATED' : 'RULE_PUBLISHED',
        'RULE',
        result.id,
        null,
        result,
      );
      return result;
    });
  }

  async updateRule(id: bigint, actor: string, dto: UpdateRuleDto) {
    try {
      new EarningPolicy(dto.config);
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM loyalty_rule_versions WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${id}`;
      const before = await tx.loyalty_rule_versions.findUnique({
        where: { id },
      });
      if (!before) throw new NotFoundException('Không tìm thấy phiên bản');
      if (before.status !== 'DRAFT')
        throw new ConflictException(
          'Chỉ được sửa bản nháp; hãy sao chép phiên bản đã công bố',
        );
      if (versionOf(before) !== dto.expectedVersion)
        throw new ConflictException('Bản nháp đã thay đổi. Hãy tải lại.');
      const result = await tx.loyalty_rule_versions.update({
        where: { id },
        data: {
          name: dto.name.trim(),
          config: JSON.stringify(loyaltyJson(dto.config)),
        },
      });
      await this.ledger.audit(
        tx,
        actor,
        'RULE_DRAFT_UPDATED',
        'RULE',
        id,
        before,
        result,
      );
      return { ...result, version: versionOf(result) };
    });
  }

  async submitRule(id: bigint, actor: string) {
    return this.publishRule(id, actor, new Date().toISOString());
  }

  async publishRule(
    id: bigint,
    actor: string,
    effectiveAt: string,
    expectedVersion?: string,
  ) {
    const now = new Date();
    if (new Date(effectiveAt).getTime() < now.getTime() - 60000)
      throw new BadRequestException('Không được áp dụng chính sách hồi tố');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM loyalty_rule_versions WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${id}`;
      const before = await tx.loyalty_rule_versions.findUnique({
        where: { id },
      });
      if (!before) throw new NotFoundException('Không tìm thấy phiên bản');
      if (expectedVersion && versionOf(before) !== expectedVersion)
        throw new ConflictException('Phiên bản đã thay đổi. Hãy tải lại.');
      new EarningPolicy(before.config);
      const effective = this.effectiveTime(effectiveAt);
      await tx.$queryRaw`SELECT id FROM loyalty_rule_versions WITH (UPDLOCK, HOLDLOCK) WHERE effective_at = ${effective}`;
      if (
        await tx.loyalty_rule_versions.findFirst({
          where: { effective_at: effective, id: { not: id } },
        })
      )
        throw new ConflictException(
          'Đã có chính sách tại thời điểm hiệu lực này',
        );
      const changed = await tx.loyalty_rule_versions.updateMany({
        where: { id, status: { in: ['DRAFT', 'SUBMITTED'] } },
        data: {
          status: 'PUBLISHED',
          effective_at: effective,
          published_by: actor,
          published_at: now,
        },
      });
      if (!changed.count)
        throw new ConflictException('Chỉ áp dụng bản nháp chưa được công bố');
      const result = await tx.loyalty_rule_versions.findUniqueOrThrow({
        where: { id },
      });
      await this.ledger.audit(
        tx,
        actor,
        'RULE_PUBLISHED',
        'RULE',
        id,
        before,
        result,
      );
      return result;
    });
  }

  async createReward(actor: string, dto: CreateRewardDto) {
    const committed = await this.prisma.$transaction(async (tx) => {
      const result = await tx.loyalty_rewards.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim(),
          points_cost: dto.pointsCost,
          discount_value: dto.discountValue,
          min_order_value: dto.minOrderValue,
          stock: dto.stock,
          minimum_tier_spend: dto.minimumTierSpend,
          voucher_days: dto.voucherDays,
          created_by: actor,
        },
      });
      await this.ledger.audit(
        tx,
        actor,
        'REWARD_CREATED',
        'REWARD',
        result.id,
        null,
        result,
      );
      return result;
    });
    await this.cache?.invalidate();
    return committed;
  }

  async updateReward(id: bigint, actor: string, dto: UpdateRewardDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM loyalty_rewards WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${id}`;
      const before = await tx.loyalty_rewards.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Không tìm thấy phần thưởng');
      if (versionOf(before) !== dto.expectedVersion)
        throw new ConflictException(
          'Phần thưởng hoặc tồn kho đã thay đổi. Hãy tải lại.',
        );
      const after = await tx.loyalty_rewards.update({
        where: { id },
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim(),
          points_cost: dto.pointsCost,
          discount_value: dto.discountValue,
          min_order_value: dto.minOrderValue,
          stock: dto.stock,
          minimum_tier_spend: dto.minimumTierSpend,
          voucher_days: dto.voucherDays,
        },
      });
      await this.ledger.audit(
        tx,
        actor,
        'REWARD_UPDATED',
        'REWARD',
        id,
        before,
        after,
      );
      return after;
    });
    await this.cache?.invalidate();
    return result;
  }

  async rewardDetails(id: bigint) {
    const reward = await this.prisma.loyalty_rewards.findUnique({
      where: { id },
    });
    if (!reward) throw new NotFoundException('Không tìm thấy phần thưởng');
    return { ...reward, version: versionOf(reward) };
  }

  async rewardStatus(
    id: bigint,
    actor: string,
    active: boolean,
    expectedVersion: string,
  ) {
    const committed = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM loyalty_rewards WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${id}`;
      const before = await tx.loyalty_rewards.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Không tìm thấy phần thưởng');
      if (versionOf(before) !== expectedVersion)
        throw new ConflictException('Phần thưởng đã thay đổi. Hãy tải lại.');
      const result = await tx.loyalty_rewards.update({
        where: { id },
        data: { active },
      });
      await this.ledger.audit(
        tx,
        actor,
        'REWARD_STATUS_CHANGED',
        'REWARD',
        id,
        before,
        result,
      );
      return result;
    });
    await this.cache?.invalidate();
    return committed;
  }

  async createAdjustment(actor: string, dto: CreateAdjustmentDto) {
    if (dto.points === 0)
      throw new BadRequestException('Điểm điều chỉnh phải khác 0');
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM loyalty_adjustments WITH (UPDLOCK, HOLDLOCK) WHERE request_key = ${dto.idempotencyKey}`;
        const previous = await tx.loyalty_adjustments.findFirst({
          where: { request_key: dto.idempotencyKey },
        });
        if (previous) {
          if (
            previous.requested_by !== actor ||
            previous.member_id !== dto.memberId ||
            previous.points !== dto.points ||
            previous.reason !== dto.reason.trim() ||
            previous.complaint_id !==
              (dto.complaintId ? BigInt(dto.complaintId) : null)
          )
            throw new ConflictException('Mã yêu cầu đã dùng cho nội dung khác');
          return previous;
        }
        if (
          !(await tx.loyalty_members.findUnique({
            where: { user_id: dto.memberId },
          }))
        )
          throw new NotFoundException('Khách hàng chưa tham gia chương trình');
        if (
          dto.complaintId &&
          !(await tx.loyalty_complaints.findFirst({
            where: { id: BigInt(dto.complaintId), member_id: dto.memberId },
          }))
        )
          throw new BadRequestException('Khiếu nại không thuộc thành viên');
        let result = await tx.loyalty_adjustments.create({
          data: {
            request_key: dto.idempotencyKey,
            member_id: dto.memberId,
            complaint_id: dto.complaintId ? BigInt(dto.complaintId) : null,
            points: dto.points,
            reason: dto.reason.trim(),
            requested_by: actor,
          },
        });
        await this.ledger.audit(
          tx,
          actor,
          'ADJUSTMENT_REQUESTED',
          'ADJUSTMENT',
          result.id,
          null,
          result,
        );
        if (dto.applyImmediately !== false) {
          const { version, policy } = await this.ledger.rule(tx);
          await this.ledger.lock(tx, dto.memberId, policy);
          await this.ledger.post(
            tx,
            {
              memberId: dto.memberId,
              kind: 'ADJUSTMENT',
              points: dto.points,
              sourceKey: `adjustment:${result.id}`,
              description: dto.reason.slice(0, 500),
              ruleId: version.id,
            },
            policy,
          );
          const before = result;
          result = await tx.loyalty_adjustments.update({
            where: { id: result.id },
            data: {
              status: 'APPROVED',
              decided_by: actor,
              decision_note:
                'Quản trị viên xác nhận áp dụng ngay: ' + dto.reason.trim(),
              decided_at: new Date(),
            },
          });
          await this.ledger.audit(
            tx,
            actor,
            'ADJUSTMENT_APPROVED',
            'ADJUSTMENT',
            result.id,
            before,
            result,
          );
        }
        return result;
      },
      { timeout: 15000 },
    );
  }

  async decideAdjustment(id: bigint, actor: string, dto: DecideAdjustmentDto) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT id FROM loyalty_adjustments WITH (UPDLOCK, HOLDLOCK, ROWLOCK) WHERE id = ${id}`;
        const before = await tx.loyalty_adjustments.findUnique({
          where: { id },
        });
        if (!before)
          throw new NotFoundException('Không tìm thấy yêu cầu điều chỉnh');
        if (before.status !== 'PENDING')
          throw new ConflictException('Yêu cầu đã được xử lý');
        if (dto.decision === 'APPROVED') {
          const { version, policy } = await this.ledger.rule(tx);
          await this.ledger.lock(tx, before.member_id, policy);
          await this.ledger.post(
            tx,
            {
              memberId: before.member_id,
              kind: 'ADJUSTMENT',
              points: before.points,
              sourceKey: `adjustment:${id}`,
              description: before.reason.slice(0, 500),
              ruleId: version.id,
            },
            policy,
          );
        }
        const result = await tx.loyalty_adjustments.update({
          where: { id },
          data: {
            status: dto.decision,
            decided_by: actor,
            decision_note: dto.note.trim(),
            decided_at: new Date(),
          },
        });
        await this.ledger.audit(
          tx,
          actor,
          `ADJUSTMENT_${dto.decision}`,
          'ADJUSTMENT',
          id,
          before,
          result,
        );
        return result;
      },
      { timeout: 15000 },
    );
  }

  async adjustments(query: LoyaltyPageDto) {
    const where: Prisma.loyalty_adjustmentsWhereInput = {
      status: query.status,
      created_at: dateRange(query),
      ...(query.q ? { reason: { contains: query.q } } : {}),
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.loyalty_adjustments.count({ where }),
      this.prisma.loyalty_adjustments.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async members(query: LoyaltyPageDto) {
    const where: Prisma.loyalty_membersWhereInput = {
      tier_code: query.tier,
      users: {
        status: query.status,
        ...(query.q
          ? {
              OR: [
                { full_name: { contains: query.q } },
                { email: { contains: query.q } },
                { phone: { contains: query.q } },
              ],
            }
          : {}),
      },
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.loyalty_members.count({ where }),
      this.prisma.loyalty_members.findMany({
        where,
        include: {
          users: {
            select: { full_name: true, email: true, phone: true, status: true },
          },
        },
        orderBy: [{ joined_at: 'desc' }, { user_id: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    return {
      data,
      pagination: {
        ...query,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async auditLogs(query: LoyaltyPageDto) {
    const where: Prisma.audit_logsWhereInput = {
      entity_type: { startsWith: 'LOYALTY_' },
      user_id: query.actorId,
      created_at: dateRange(query),
      ...(query.q
        ? {
            OR: [
              { action: { contains: query.q } },
              { entity_type: { contains: query.q } },
              { users: { full_name: { contains: query.q } } },
              { users: { email: { contains: query.q } } },
            ],
          }
        : {}),
    };
    const [total, data] = await this.prisma.$transaction([
      this.prisma.audit_logs.count({ where }),
      this.prisma.audit_logs.findMany({
        where,
        include: { users: { select: { full_name: true, email: true } } },
        orderBy: { id: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
    ]);
    const actorFields = [
      'member_id',
      'memberId',
      'user_id',
      'requested_by',
      'decided_by',
      'handled_by',
      'created_by',
      'published_by',
    ];
    const relatedIds = new Set<string>();
    for (const row of data) {
      for (const raw of [row.old_data, row.new_data]) {
        if (!raw) continue;
        try {
          const object = JSON.parse(raw) as Record<string, unknown> | null;
          if (!object || typeof object !== 'object') continue;
          for (const key of actorFields) {
            const value = object[key];
            if (
              typeof value === 'string' &&
              /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)
            )
              relatedIds.add(value);
          }
        } catch {
          /* Legacy text is displayed as a note by the UI. */
        }
      }
    }
    const [actors, relatedUsers] = await Promise.all([
      this.prisma.users.findMany({
        where: {
          audit_logs: { some: { entity_type: { startsWith: 'LOYALTY_' } } },
        },
        select: { id: true, full_name: true, email: true },
        orderBy: [{ full_name: 'asc' }, { email: 'asc' }],
      }),
      this.prisma.users.findMany({
        where: { id: { in: [...relatedIds] } },
        select: { id: true, full_name: true, email: true },
      }),
    ]);
    return {
      data,
      actors,
      relatedUsers: Object.fromEntries(
        relatedUsers.map((person) => [
          person.id,
          { name: person.full_name, email: person.email },
        ]),
      ),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async expireDue() {
    const now = new Date();
    const { policy } = await this.ledger.rule(this.prisma, now);
    const cycleCutoff = new Date(
      now.getTime() - policy.config.tierPeriodDays * 86400000,
    );
    const due = await this.prisma.$queryRaw<{ member_id: string }[]>`
      SELECT TOP (100) m.user_id AS member_id FROM loyalty_members m
      WHERE m.cycle_started_at <= ${cycleCutoff} OR EXISTS (
        SELECT 1 FROM loyalty_point_lots l WHERE l.member_id = m.user_id
        AND l.remaining > 0 AND l.expires_at <= ${now}
      ) ORDER BY m.user_id`;
    for (const item of due)
      await this.prisma.$transaction(
        async (tx) => {
          await this.ledger.lock(tx, item.member_id, policy, now);
        },
        { timeout: 15000 },
      );
    return { membersProcessed: due.length };
  }
}
