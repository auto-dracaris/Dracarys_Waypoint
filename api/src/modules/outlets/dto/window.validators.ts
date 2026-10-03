import {
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

export const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

// HH:MM strings compare correctly as text. The open time's property name is
// passed as the constraint, e.g. `@Validate(ClosesAfterOpens, ['windowOpenTime'])`.
@ValidatorConstraint({ name: 'closesAfterOpens', async: false })
export class ClosesAfterOpens implements ValidatorConstraintInterface {
  validate(
    close: string,
    { object, constraints }: ValidationArguments,
  ): boolean {
    const [openKey] = constraints as [string];
    return close > (object as Record<string, string>)[openKey];
  }
  defaultMessage(): string {
    return 'The window must end after it starts';
  }
}
