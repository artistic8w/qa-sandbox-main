import { mergeTests } from '@playwright/test';
import { test as authTest } from './auth';
import { test as networkTest } from './network';

export const test = mergeTests(authTest, networkTest);
export { expect } from '@playwright/test';
export { CREDENTIALS } from './auth';