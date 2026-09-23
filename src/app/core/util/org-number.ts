import { AbstractControl, ValidationErrors } from '@angular/forms';

// Norwegian organization number: 9 digits with a mod-11 control digit.
export function isValidOrgNumber(value: string): boolean {
  const digits = (value ?? '').replace(/\s/g, '');
  if (!/^\d{9}$/.test(digits)) {
    return false;
  }
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    sum += Number(digits[i]) * weights[i];
  }
  const remainder = sum % 11;
  const control = remainder === 0 ? 0 : 11 - remainder;
  if (control === 10) {
    return false;
  }
  return control === Number(digits[8]);
}

export function orgNumberValidator(control: AbstractControl): ValidationErrors | null {
  if (!control.value) {
    return null;
  }
  return isValidOrgNumber(control.value) ? null : { orgNumber: true };
}
