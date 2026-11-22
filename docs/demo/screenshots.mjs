// Captures the README screenshots from the dev server pointed at the demo cluster (see AGENTS.md).
// usage: SK8R_DEMO_TOKEN=... node docs/demo/screenshots.mjs [outDir=docs/images] [only,names]
import { chromium } from 'playwright';

const out = process.argv[2] || 'docs/images';
const only = process.argv[3]?.split(',');
const token = process.env.SK8R_DEMO_TOKEN;
if (!token) throw new Error('Set SK8R_DEMO_TOKEN (kubectl create token sk8r-demo -n sk8r)');
const BASE = 'http://localhost:5173';
const cluster = {
	id: 'demo',
	server: 'https://demo.localhost:16443',
	token,
	name: 'k3s-demo',
	skipTLSVerify: true
};

const browser = await chromium.launch();
const ctx = await browser.newContext({
	viewport: { width: 1440, height: 900 },
	deviceScaleFactor: 2,
	colorScheme: 'dark'
});
await ctx.addInitScript(
	([c, dark]) => {
		localStorage.setItem('k8s-custom-clusters', JSON.stringify([c]));
		localStorage.setItem('k8s-current-cluster-id', c.id);
		if (localStorage.getItem('darkMode') === null) localStorage.setItem('darkMode', dark);
		if (localStorage.getItem('sk8tes-learning-mode') === null)
			localStorage.setItem('sk8tes-learning-mode', 'false');
	},
	[cluster, 'true']
);
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('pageerror', e.message));
const shot = async (name) => {
	await page.screenshot({ path: `${out}/${name}.png` });
	console.info('saved', name);
};
const want = (n) => !only || only.includes(n);
const settle = (ms = 2500) => page.waitForTimeout(ms);

if (want('dashboard')) {
	await page.goto(BASE + '/');
	await settle(6000);
	await page.getByRole('button', { name: '30m' }).click();
	await page.getByRole('button', { name: '15m' }).click();
	await page.mouse.move(900, 880);
	await settle(5000);
	await shot('dashboard');
}

if (want('nodes')) {
	await page.goto(BASE + '/?resource=nodes');
	await settle(7000);
	await shot('nodes');
}

if (want('events')) {
	await page.goto(BASE + '/?resource=pods&namespace=shop');
	await settle(3000);
	await page.locator('[title="Show Events Stream"]').click();
	await settle(4000);
	await shot('events');
}

if (want('logs')) {
	await page.goto(BASE + '/?resource=pods&namespace=shop');
	await settle(3000);
	const row = page.locator('tr', { hasText: 'traffic-generator' });
	await row.locator('[title="View Logs"]').click();
	await settle(4000);
	await shot('logs');
}

if (want('terminal')) {
	await page.goto(BASE + '/?resource=pods&namespace=shop');
	await settle(3000);
	const row = page.locator('tr', { hasText: 'storefront' }).first();
	await row.locator('[title="Open Terminal"]').click();
	await settle(4000);
	await page.keyboard.type('cat /etc/os-release | head -3; ps aux\n', { delay: 20 });
	await settle(2000);
	await shot('terminal');
}

if (want('search')) {
	await page.goto(BASE + '/?resource=deployments&namespace=*');
	await settle(3000);
	await page.keyboard.press('Control+k');
	await page.getByPlaceholder('Search all resources...').fill('store');
	await settle(2500);
	await shot('search');
}

if (want('learning')) {
	await page.evaluate(() => localStorage.setItem('sk8tes-learning-mode', 'true'));
	await page.goto(BASE + '/?resource=pods&namespace=*');
	await settle(3000);
	await page.locator('[title^="Learn about"]').first().hover();
	await settle(1500);
	await shot('learning');
	await page.evaluate(() => localStorage.setItem('sk8tes-learning-mode', 'false'));
}

if (want('create')) {
	await page.goto(BASE + '/?resource=deployments&namespace=shop');
	await settle(3000);
	await page.locator('[title="Create Resource (Ctrl+N)"]').click();
	await settle(1000);
	await page.getByText('A deployment with replicas').click();
	await settle(1000);
	await page.getByText('Templates', { exact: true }).click();
	await settle(800);
	await shot('create');
}

if (want('light')) {
	await page.evaluate(() => localStorage.setItem('darkMode', 'false'));
	await page.goto(BASE + '/?resource=deployments&namespace=*');
	await settle(5000);
	await shot('light');
	await page.evaluate(() => localStorage.setItem('darkMode', 'true'));
}

await browser.close();
