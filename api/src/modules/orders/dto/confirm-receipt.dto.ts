import { IsInt, Min } from 'class-validator';

export class ConfirmReceiptDto {
  // The cases the store accepts; at most what the driver recorded handing over.
  @IsInt({ message: 'receivedUnits must be a whole number' })
  @Min(0, { message: 'receivedUnits cannot be negative' })
  receivedUnits: number;
}
