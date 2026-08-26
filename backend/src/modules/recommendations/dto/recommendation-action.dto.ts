import { IsString, IsOptional, IsIn } from 'class-validator';

const DECISIONS = [
  'IGNORED',
  'CANCELLED',
  'REQUIRE_PREPAYMENT',
  'BLOCKED_BUYER',
  'CONTACTED_BUYER',
] as const;

export class CreateRecommendationActionDto {
  @IsIn(DECISIONS as unknown as string[])
  decision: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export { DECISIONS };
