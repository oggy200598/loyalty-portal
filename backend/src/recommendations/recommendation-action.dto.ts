import { IsString, IsOptional, IsIn } from 'class-validator';

const DECISIONS = [
  'IGNORED',
  'CANCELLED',
  'REQUIRE_PREPAYMENT',
  'BLOCKED_BUYER',
  'CONTACTED_BUYER',
] as const;

export class CreateRecommendationActionDto {
  @IsIn(DECISIONS)
  decision: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export { DECISIONS };
