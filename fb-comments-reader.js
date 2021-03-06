// Credit https://github.com/nquocnghia/fb-post-capture
const fs = require('fs');
const puppeteer = require('puppeteer');
const devices = require('puppeteer/DeviceDescriptors');
const argv = require('minimist')(process.argv.slice(2));
const authenticator = require('authenticator');
const MY_DEVICE = devices['iPhone 6'];

const requiredError = (arg) => {
    console.log(`Error: ${arg} is required`);
    process.exit(1);
}

// args
const email = argv.fbEmail || process.env.FB_EMAIL || requiredError('email');
console.log(`email ${email}`);
const password = argv.fbPassword || process.env.FB_PASSWORD || requiredError('password');
const url = argv.fbPostUrl || process.env.FB_POST_URL || requiredError('post URL');

const twoFAKey = argv.fb2fa || process.env.FB_2FA;

(async () => {

    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();

    await page.emulate(MY_DEVICE);

    if (fs.existsSync('./cookies')) {
        console.log('Import saved cookies');

        const cookies = JSON.parse(fs.readFileSync('./cookies', 'utf-8'));
        await page.setCookie(...cookies);
    }

    // home page
    await page.goto('https://m.facebook.com/', {
        waitUntil: 'networkidle2'
    });

    // login detected
    if (await page.$('input[name=email]') !== null) {
        console.log('Login form detected. Logging in...');

        const emailInput = await page.$('input[name=email]');
        await emailInput.type(email);

        const passwordInput = await page.$('input[name=pass]');
        await passwordInput.type(password);

        const loginInput = await page.$('button[name=login]');
        await loginInput.click();

        await page.waitForNavigation({
            waitUntil: 'load'
        });

        if (await page.$('input[name=email]') !== null) { // login failed
            return Promise.reject('Error: login failed');
        }

        // 2FA check
        const input2FA = await page.$('input#approvals_code');
        if (input2FA) {
            console.log('2FA form detected. Generating TOTP...');
            if (!twoFAKey) {
                return Promise.reject('Error: 2FA code is required');
            }

            // TODO handle 2FA with authenticator.generateToken
            //authenticator.generateToken(twofakey)
            await input2FA.type(twoFAKey);
            await page.click('button[type=submit]');
            await page.waitForNavigation({
                waitUntil: 'load'
            });

            if (await page.$('input#approvals_code')) { // 2FA failed
                return Promise.reject('Error: 2FA failed');
            }

            await page.click('input[type=radio][value="dont_save"]');
            await page.click('button[type=submit]');
            await page.waitForNavigation({
                waitUntil: 'load'
            });

            // review login
            const checkpointBtn = await page.$('button#checkpointSubmitButton-actual-button');
            if (checkpointBtn !== null) {
                await checkpointBtn.click();
                await page.waitForNavigation({
                    waitUntil: 'load'
                });
                await page.click('button#checkpointSubmitButton-actual-button');
                await page.waitForNavigation({
                    waitUntil: 'load'
                });

                await page.click('input[type=radio][value="dont_save"]');
                await page.click('button[type=submit]');
                await page.waitForNavigation({
                    waitUntil: 'load'
                });
            }
        }
    }

    // if somehow the newsfeed is not shown...
    if (await page.$('#MComposer') === null) {
        return Promise.reject('Newsfeed not found!');
    }

    console.log('Write cookies to file...');
    fs.writeFileSync('./cookies', JSON.stringify(await page.cookies()), 'utf-8');

    // navigate to url
    console.log(`Navigate to ${url}`);
    await page.goto(url, {
        waitUntil: 'networkidle2'
    });

    if (await page.$('#m_story_permalink_view') === null) {
        return Promise.reject('It should be the permalink of a post');
    }

    // Expand all comments and their replies
    console.log('Expand all comments and their replies');

    for (let selector of ['div[id^=see_] a', '._rzh div[id^=comment_replies_more] a']) {
        let link;
        while ((link = await page.$(selector)) !== null) {
            const heightBefore = await page.evaluate(() => document.body.clientHeight);

            await link.click();
            await page.waitFor(5000);
            const heightAfter = await page.evaluate(() => document.body.clientHeight);

            // walk around for the infinite loop caused by an infinite pagination of facebook
            if (heightAfter === heightBefore) {
                link.evaluate(() => this.remove());
            }
        }
    }

    const commentHandlers = await page.$x('//div[@data-sigil="comment"]')
    var commentsHtmlContent = [];
    for (var index = 0; index < commentHandlers.length; index++) {
        const htmlContent = await page.evaluate(el => el.innerHTML, commentHandlers[index]);
        commentsHtmlContent.push(htmlContent);
    }

    const commentsFile = './comments.txt';
    try {
        if (fs.existsSync(commentsFile)) {
            fs.unlinkSync(commentsFile);
        }
    } catch (error) {
        console.log(error);
    }

    for (var index = 0; index < commentsHtmlContent.length; index++) {
        try {
            fs.appendFileSync(
                commentsFile,
                `${commentsHtmlContent[index]}\n`
            );
        }
        catch (error) {

            console.log(error);
        }
    }

    browser.close();
})().catch(error => {
    console.log(error);
    process.exit(1);
});