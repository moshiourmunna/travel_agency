import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on('console', m => console.log('console', m.text())); p.on('pageerror', e => console.log('err', e.message));
await p.goto('file:///workspace/musafir/site/en/login.html');
await p.fill('#lg-ph', '1711234567'); await p.click('[data-show="#otp-2"]'); await p.waitForTimeout(300);
console.log(await p.isVisible('#otp-2'), await p.evaluate(() => [document.querySelector('#otp-2').hidden, document.querySelector('#lg-ph').closest('.field').className, document.querySelector('[data-toast], .toast')?.textContent]));
await b.close();
