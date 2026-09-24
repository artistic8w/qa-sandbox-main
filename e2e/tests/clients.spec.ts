import { test, expect } from '../fixtures/index';
import { mockBrregFound } from '../fixtures/brreg-mock';
import { ClientFormPage } from '../pages/client-form.page';
import { ClientListPage } from '../pages/client-list.page';

const NEW_ORG_NUMBER = '900000006';
const COMPANY_NAME = 'PLAYWRIGHT TESTFIRMA AS';

test.describe('Client creation', () => {
  test('creates a client via organization-number lookup and it appears in the list', async ({ page, loginAs }) => {
    await loginAs('admin'); // only admins can create clients

    await mockBrregFound(page, NEW_ORG_NUMBER, {
      navn: COMPANY_NAME,
      adresse: ['Testveien 1'],
      postnummer: '0150',
      poststed: 'OSLO',
    });

    const form = new ClientFormPage(page);
    await form.gotoNew();
    await form.lookupOrgNumber(NEW_ORG_NUMBER);

    // Lookup should populate Name from the mocked response — no manual typing.
    await expect(form.nameInput).toHaveValue(COMPANY_NAME);
    await expect(form.lookupMessage).toHaveCount(0);

    await form.save();

    const list = new ClientListPage(page);
    await expect(page).toHaveURL(/\/clients$/);

    await list.search(COMPANY_NAME);
    await expect(list.rowByName(COMPANY_NAME)).toBeVisible();
    await expect(list.rowByName(COMPANY_NAME)).toContainText(NEW_ORG_NUMBER);
  });
});