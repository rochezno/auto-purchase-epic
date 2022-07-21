import { Browser, devices, Page } from "puppeteer";

const puppeteer = require('puppeteer');
import {CSS_QUERIES_EPIC} from './css_queries_epic';

const EPIC_STORE_URL = 'https://store.epicgames.com/es-ES/';
const screenshot_path = 'screenshots/'
const browser_args = {
  headless: false,
  pipe: true, 
  args: [
    '--incognito',
    '--disable-dev-shm-usage',
    '--start-maximized'
  ],
};

const emulatedDevices = [
  {
    name: 'Desktop 1920x1080',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.75 Safari/537.36',
    viewport: {
      width: 1920,
      height: 1080
    }
  },
  {
    name: 'Desktop 1024x768',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.75 Safari/537.36',
    viewport: {
      width: 1024,
      height: 768
    }
  },
  devices['iPad'],
  devices['iPad landscape']
];

(async () => {
  const browser = await launchBrowser();
  const mainPage = await gotoEpic(browser);
  await login(mainPage);
  //await browser.close();
})();

// Browser
async function launchBrowser() : Promise<Browser> {
  return await puppeteer.launch(browser_args);
}

async function gotoEpic(browser: Browser) : Promise<Page> {
  const page = await browser.newPage();
  page.emulate(emulatedDevices[0]);
  await page.goto(EPIC_STORE_URL);
  await page.screenshot({path: screenshot_path + 'epic_store.png'});

  return page;
}


// Login

async function login(page : Page) : Promise<void> {
  await page.click(CSS_QUERIES_EPIC.LOGIN_BUTTON_CSS);
  
  await page.waitForSelector(CSS_QUERIES_EPIC.EPIC_LOGIN_CSS);
  await page.click(CSS_QUERIES_EPIC.EPIC_LOGIN_CSS);

  await page.waitForSelector(CSS_QUERIES_EPIC.EMAIL_LOGIN_CSS);
  await page.$eval(CSS_QUERIES_EPIC.EMAIL_LOGIN_CSS, el => el.value = '');
  await page.$eval(CSS_QUERIES_EPIC.PASS_LOGIN_CSS, el => el.value = '');
  
  await page.click(CSS_QUERIES_EPIC.SIGNIN_BUTTON_CSS);
}