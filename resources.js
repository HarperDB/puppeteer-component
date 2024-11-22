import puppeteer from "puppeteer";
import { brotliCompress, constants } from "node:zlib";
const {PageCache} = databases.test;

const USER_AGENT_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/114.0.5735.99 Mobile/15E148 Safari/604.1';
const BROTLI_QUALITY = 6;

if(server.workerIndex === 0) {
  //TODO implement scheduled site scraper.  Vision for this is to utilize all available threads of the instance and distribute the proerendering in batches across threads via ITC / internal subscriptions
}


export class  pagecache extends PageCache {
  allowRead () { return true }
  static parsePath(path, request, query) {
    return query?.get?.('url');
  }
}

class cacheSource extends Resource {
  async get(query) {
    let url = this.getId();
    let html = await fetchPage(url);
    //brotli compress the data
    const compressed = await compressBrotli(html, BROTLI_QUALITY);
    return {content: compressed};
  }
}

let browser;
async function fetchPage(url) {
  if(!browser) {
    browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  }

  const page = await browser.newPage();
  try {
//set UA
    await page.setUserAgent(USER_AGENT_MOBILE);
// enable request interception
    await page.setRequestInterception(true);
    // block non-essential third-party scripts
    page.on('request', (request) => {
      const url = request.url();

      // specify patterns for scripts you want to block
      if (
        url.includes('analytics') ||
        url.includes('ads') ||
        url.includes('social')
      ) {
        // block the request
        request.abort();
      } else {
        // allow the request
        request.continue();
      }
    });


    await page.goto(url); //NOTE we may need to implement the "waitUntil" option depending on the use case (the default is "load")
    return await page.content();
  } finally {
    await page.close();
  }
}

async function compressBrotli(data, brQuality) {
  return new Promise(function(resolve, reject) {
    brotliCompress(data, {params: {[constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT, [constants.BROTLI_PARAM_QUALITY]: brQuality}}, function(err, response) {
      if (err) {
        reject(err);
      } else {
        resolve(response);
      }
    });
  });
}

pagecache.sourcedFrom(cacheSource);
