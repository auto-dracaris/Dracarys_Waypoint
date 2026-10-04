import {
  IsInt,
  IsOptional,
  Min,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class ResolveIssueDto {
  // What was done about it; the reporter can read this.
  @IsNotEmpty({ message: 'resolutionNote is required' })
  @IsString({ message: 'resolutionNote must be a string' })
  @MaxLength(500, { message: 'resolutionNote must be at most 500 characters' })
  resolutionNote: string;

  // Optional explicit approval. Omitting both fields keeps note-only resolution.
  @IsOptional()
  @IsInt()
  @Min(0)
  expectedCases?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  planVersion?: number;
}
