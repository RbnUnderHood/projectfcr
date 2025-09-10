// Smoke-test: app loads and core UI is visible
import { defineConfig } from '@playwright/test';
export default defineConfig({
use: { baseURL: 'http://localhost:5173/projectfcr/
' },
webServer: {
command: 'npx http-server projectfcr -p 5173 -c-1',
url: 'http://localhost:5173/projectfcr/index.html
',
reuseExistingServer: true,
timeout: 30000
}
});