import events = require('events');
import puppeteer = require('puppeteer');
import winston = require('winston');

const DESKTOP_DEVICE = "Desktop";

/**
 * Browser that uses puppeteer with only one page at the same time.
 */
export class Browser {

  logger: winston.Logger;
  browser: puppeteer.Browser;
  page: puppeteer.Page;
  emitter: events.EventEmitter;
  device: puppeteer.Device;

  constructor(logger: winston.Logger, device: puppeteer.Device) {
    this.logger = logger;
    this.emitter = new events.EventEmitter();
    this.browser = await this.launchBrowser();
    this.page = null;
    this.device = device;
  }

  // //////////
  // BROWSER //
  // //////////

  async launchBrowser(): Promise<Browser> {
    const args = [
      '--incognito',
      '--disable-dev-shm-usage',
      // '--start-maximized'
    ];

    var jsonLaunch = JSON.stringify({ pipe: true, headless: true, args }, null, ' ');
    try {
      const stage = process.env.STAGE;
    
      if (stage === 'LOCAL') {
        args.push('--no-sandbox');
        jsonLaunch = JSON.stringify({ headless: true, args }, null, ' ');
      }
    } catch (err) {
      this.logger.error(err);
    }

    this.logger.info(`Launch puppeteer ${jsonLaunch}`);
    try {
      this.browser = await puppeteer.launch(JSON.parse(jsonLaunch));
    } catch (err) {
      this.logger.error(err);
    }
    this.page = await this.openSession(this.device);

    return this;
  }

  async openSession(device: puppeteer.Device): Promise<puppeteer.Page> {
    this.page = await this.browser.newPage();
    this.interceptRequests(this.page);
    this.interceptResponses(this.page);
    this.interceptConsole(this.page);


    this.logger.info(`Using device: ${JSON.stringify(device)}`);
    await this.page.emulate(device);
    
    return this.page;
  }

  closeSession(): void {
    this.page.close();
  }

  async closeSessionAndReopenAgain(): Promise<Browser> {
    this.close();
    return await this.launchBrowser();
  }

  async close(): Promise<void> {
    await this.browser.close();
    delete this.browser;
  }

  private interceptRequests(page: puppeteer.Page) {
    page.on('request', request => {
      this.logger.debug(`Sent ${request.method()} to ${request.url()}`);
    });
  }

  private interceptResponses(page: puppeteer.Page) {
    page.on('response', async response => {
      const text = await response.text();
      this.logger.debug(`Received from ${response.url()} - ${response.status()}`);
      this.emitter.emit(new URL(response.url()).pathname, response.status(), text);
    });
  }

  private interceptConsole(page: puppeteer.Page) {
    page.on('console', (msg) =>  {
      if (msg.type() !== 'log') {
        this.logger.info(`CONSOLE: ${msg.type()} - ${msg.text()}`);
      }

      this.emitter.emit('CONSOLE', msg);
    });
  }

  private async interceptWebSocket(page: puppeteer.Page, webSocketListener: WebSocketListener): Promise<void> {
    const cpd = await page.target().createCDPSession();
    cpd.send('Network.enable');

    // https://chromedevtools.github.io/devtools-protocol/tot/Network/
    cpd.on('Network.webSocketCreated', webSocketListener.onCreated);
    cpd.on('Network.webSocketClosed', webSocketListener.onClosed);
    cpd.on('Network.webSocketWillSendHandshakeRequest', webSocketListener.onSendingHanshake);
    cpd.on('Network.webSocketHandshakeResponseReceived', webSocketListener.onReceivedHandshake);
    cpd.on('Network.webSocketFrameReceived', webSocketListener.onMessageReceived);
    cpd.on('Network.webSocketFrameSent', webSocketListener.onMessageSent);
    cpd.on('Network.webSocketFrameError', webSocketListener.onError);
  }

  // //////////
  // METHODS //
  // //////////

  async loadURL(url: string, loadedWhen?: string): Promise<LoadUrlResponse> {
    return new Promise<LoadUrlResponse>((resolve, reject) => {
      this.page.goto(url, {timeout: 60000}).then((response: puppeteer.HTTPResponse) => {
        if (!response.ok()) {
          reject(new NotOkResponse(`URL: ${response.url()} status ${response.status()} txt ${response.text}`));
        } else {
          if (loadedWhen) {
            this.emitter.once(loadedWhen, (status, response) => {
              resolve({
                status,
                response
              });
            });
          } else {
            resolve({
              status: response.ok()
            });
          }
        }
      }).catch(err => {
        reject(err);
      });
    });
  }
}
