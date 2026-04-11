process.env.PLAYWRIGHT_BROWSERS_PATH = '0';

const { chromium } = await import('playwright');

const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5174';
const debug = process.env.PW_DEBUG === '1';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on('pageerror', (error) => {
    console.error('[pageerror]', error.message);
});

page.on('console', (message) => {
    if (message.type() === 'error') {
        console.error('[console:error]', message.text());
    }
});

const clickStepNext = async () => {
    await page.locator('button:visible').filter({ hasText: '下一步' }).last().click();
};

const logStepState = async (label) => {
    if (!debug) {
        return;
    }

    const visibleButtons = await page.locator('button:visible').evaluateAll((elements) =>
        elements.map((element) => element.textContent?.trim()).filter(Boolean),
    );
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((elements) =>
        elements.map((element) => element.textContent?.trim()).filter(Boolean),
    );
    console.log(`[${label}] headings=`, headings);
    console.log(`[${label}] buttons=`, visibleButtons);
};

try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: '本地游玩' }).click();

    await page.getByRole('heading', { name: '游戏设定' }).waitFor({ timeout: 15000 });
    await logStepState('setup');
    await clickStepNext();
    await logStepState('after-step-0');

    const factionControlCheckboxes = page.locator('input[type="checkbox"]');
    if (await factionControlCheckboxes.count() >= 2) {
        const secondFactionCheckbox = factionControlCheckboxes.nth(1);
        if (!(await secondFactionCheckbox.isChecked())) {
            await secondFactionCheckbox.check();
        }
    }

    await clickStepNext();
    await page.getByText('没有需要配置AI服务的势力。').waitFor({ timeout: 10000 });
    await logStepState('after-step-1');
    await clickStepNext();
    await logStepState('after-step-2');
    await page.getByText('配置总览').waitFor({ timeout: 10000 });
    await page.locator('button:visible').filter({ hasText: '保存配置并开始' }).click();

    await page.locator('canvas').first().waitFor({ timeout: 15000 });
    await page.getByText('COMMAND CENTER').waitFor({ timeout: 15000 });

    const canvasCount = await page.locator('canvas').count();
    console.log(`Playwright smoke passed. Canvas count: ${canvasCount}`);
} finally {
    await browser.close();
}
