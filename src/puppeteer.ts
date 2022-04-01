import {Browser, Page} from 'puppeteer';
import extra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

const launchOptions = {
  userDataDir: '.cache',
  // executablePath: 'c:/program files (x86)/google/chrome/application/chrome.exe',
  headless: false,
  defaultViewport: null,
  args: [
    '--disable-web-security',
    '--disable-features=IsolateOrigins', // ,site-per-process
    '--disable-site-isolation-trials',
  ],
};

extra.use(StealthPlugin());

class Puppet {
  static browser: Browser | undefined;

  static async newPage(): Promise<Page> {
    if (Puppet.browser) return Puppet.browser.newPage();

    Puppet.browser = await extra.launch(launchOptions);
    const [firstPage] = await Puppet.browser.pages();
    return firstPage;
  }
}

export default Puppet;