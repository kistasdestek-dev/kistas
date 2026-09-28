import { test as base, expect } from '@playwright/test';

// Third parties are isolated; all application requests and local assets remain real.
export const test = base.extend<{ isolateExternalRequests: void }>({
  isolateExternalRequests: [async ({ context, baseURL }, use) => {
    if (!baseURL) throw new Error('E2E baseURL is required');
    const origin = new URL(baseURL).origin;
    await context.route('**/*', async (route) => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      if (route.request().resourceType() === 'image') return route.fulfill({ status: 200, contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" />' });
      return route.abort('blockedbyclient');
    });
    await use();
  }, { auto: true }],
});
export { expect };
