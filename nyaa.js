// ==MiruExtension==
// @name         Nyaa
// @version      v1.0.0
// @author       LetMeGetAByte
// @lang         all
// @license      MIT
// @icon         https://nyaa.si/static/favicon.png
// @package      hayase.extension.nyaa
// @type         bangumi
// @webSite      https://nyaa.si
// @description  An extension that scrapes Nyaa.si for torrents.
// ==/MiruExtension==

export default class extends Extension {
  async req(url) {
    return this.request({
      url: url,
      method: "GET",
    });
  }

  // Helper to parse Nyaa HTML
  async parseNyaa(html) {
    const results = [];
    // Nyaa uses specific table row classes
    const rowRegex = /<tr class="default">([\s\S]*?)<\/tr>|<tr class="success">([\s\S]*?)<\/tr>|<tr class="danger">([\s\S]*?)<\/tr>/g;
    
    // Regex breakdown:
    // 1. ID & Title
    // 2. Magnet Link
    // 3. File Size
    // 4. Seeders (green text)
    const linkTitleRegex = /<a href="\/view\/(\d+)" title="([^"]+)">/;
    const magnetRegex = /href="(magnet:\?xt=urn:btih:[^"]+)"/;
    const sizeRegex = /<td class="text-center">(\d+(\.\d+)?\s[GiM]iB)<\/td>/;
    const seedsRegex = /<td class="text-center" style="color: green;">(\d+)<\/td>/;
    
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      const rowContent = match[0];
      
      const titleMatch = rowContent.match(linkTitleRegex);
      const magnetMatch = rowContent.match(magnetRegex);
      const sizeMatch = rowContent.match(sizeRegex);
      const seedsMatch = rowContent.match(seedsRegex);

      if (titleMatch && magnetMatch) {
        const id = titleMatch[1];
        const title = titleMatch[2];
        const magnet = magnetMatch[1];
        const size = sizeMatch ? sizeMatch[1] : "??";
        const seeds = seedsMatch ? seedsMatch[1] : "0";

        // Filter out items with 0 seeds to keep the list clean
        if (parseInt(seeds) > 0) {
            results.push({
            title: `[${seeds} S] [${size}] ${title}`,
            url: `https://nyaa.si/view/${id}`,
            cover: "https://nyaa.si/static/img/avatar/default.png",
            update: `${size} • ${seeds} Seeds`,
            magnet: magnet // Custom field to pass to detail/watch
            });
        }
      }
    }
    return results;
  }

  // 1. Latest Updates (Home Screen)
  async latest(page) {
    // Page logic for Nyaa is ?p=1, ?p=2
    const res = await this.req(`/`);
    return await this.parseNyaa(res);
  }

  // 2. Search Functionality
  async search(kw, page) {
    const res = await this.req(`/?f=0&c=0_0&q=${encodeURIComponent(kw)}&p=${page}`);
    return await this.parseNyaa(res);
  }

  // 3. Detail View
  // Since we already scraped the magnet in the list, we can just display it.
  // However, we usually need to fetch the page to be "proper", or we can mock it.
  async detail(url) {
    const res = await this.req(url);
    
    const titleRegex = /<h3 class="panel-title">([\s\S]*?)<\/h3>/;
    const titleMatch = res.match(titleRegex);
    const title = titleMatch ? titleMatch[1].trim() : "Unknown Title";

    const magnetRegex = /href="(magnet:\?xt=urn:btih:[^"]+)"/;
    const magnetMatch = res.match(magnetRegex);
    const magnet = magnetMatch ? magnetMatch[1] : "";

    return {
      title: title,
      cover: "https://nyaa.si/static/img/avatar/default.png",
      desc: "Stream via Torrentio Extension",
      episodes: [
        {
          title: "Stream Magnet",
          url: magnet, 
        },
      ],
    };
  }

  // 4. Watch Functionality
  // Passes the magnet link to Hayase's torrent engine
  async watch(url) {
    return {
      type: "torrent",
      url: url,
    };
  }
}