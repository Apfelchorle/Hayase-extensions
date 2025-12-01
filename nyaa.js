// Nyaa.si Torrent Resolver
// Adapted to match Seadex/AnimeTosho structure

export default new class {
  baseUrl = "https://nyaa.si";

  // Helper to parse file size string (e.g. "1.5 GiB") into bytes
  parseSize(str) {
    const units = {
      'KiB': 1024,
      'MiB': 1024 ** 2,
      'GiB': 1024 ** 3,
      'TiB': 1024 ** 4
    };
    const match = str.match(/(\d+(\.\d+)?)\s([KMG]iB)/);
    if (!match) return 0;
    return parseFloat(match[1]) * (units[match[3]] || 1);
  }

  // Extract InfoHash from magnet link
  getHash(magnet) {
    const match = magnet.match(/xt=urn:btih:([a-zA-Z0-9]+)/);
    return match ? match[1].toLowerCase() : null;
  }

  // Main search logic
  async search(query) {
    try {
      // Fetch Nyaa search results, sorted by seeders descending
      const res = await fetch(`${this.baseUrl}/?f=0&c=0_0&q=${encodeURIComponent(query)}&s=seeders&o=desc`);
      if (!res.ok) return [];
      const html = await res.text();

      const results = [];
      
      // Nyaa row regex
      const rowRegex = /<tr class="default">([\s\S]*?)<\/tr>|<tr class="success">([\s\S]*?)<\/tr>|<tr class="danger">([\s\S]*?)<\/tr>/g;
      
      // Field extractors
      const linkTitleRegex = /<a href="\/view\/\d+" title="([^"]+)">/;
      const magnetRegex = /href="(magnet:\?xt=urn:btih:[^"]+)"/;
      const sizeRegex = /<td class="text-center">(\d+(\.\d+)?\s[GiM]iB)<\/td>/;
      const seedsRegex = /<td class="text-center" style="color: green;">(\d+)<\/td>/;
      const leechRegex = /<td class="text-center" style="color: red;">(\d+)<\/td>/;
      const dateRegex = /data-timestamp="(\d+)"/;

      let match;
      while ((match = rowRegex.exec(html)) !== null) {
        const rowContent = match[0];
        const titleMatch = rowContent.match(linkTitleRegex);
        const magnetMatch = rowContent.match(magnetRegex);
        const sizeMatch = rowContent.match(sizeRegex);
        const seedsMatch = rowContent.match(seedsRegex);
        const leechMatch = rowContent.match(leechRegex);
        const dateMatch = rowContent.match(dateRegex);

        if (titleMatch && magnetMatch) {
          const magnet = magnetMatch[1];
          const hash = this.getHash(magnet);
          if (!hash) continue; // Skip if invalid magnet

          results.push({
            hash: hash,
            link: magnet,
            title: titleMatch[1],
            size: sizeMatch ? this.parseSize(sizeMatch[1]) : 0,
            date: dateMatch ? new Date(parseInt(dateMatch[1]) * 1000) : new Date(),
            seeders: seedsMatch ? parseInt(seedsMatch[1]) : 0,
            leechers: leechMatch ? parseInt(leechMatch[1]) : 0,
            downloads: 0,
            // Flags for Hayase
            accuracy: "high", 
            type: "torrent"
          });
        }
      }
      return results;

    } catch (e) {
      console.error("Nyaa search failed:", e);
      return [];
    }
  }

  // Required Method: single
  // Called when resolving a specific anime episode or movie
  async single({ anilistId, titles, episodeCount }) {
    if (!titles || !titles.length) return [];

    // Use the first available title to search (usually the main one)
    // You could iterate through `titles` if the first one yields no results, 
    // but for now we just use the primary title.
    const query = titles[0];
    return await this.search(query);
  }

  // Map batch and movie to the same search logic
  batch = this.single;
  movie = this.single;

  // Required Method: test
  async test() {
    try {
      const res = await fetch(this.baseUrl);
      return res.ok;
    } catch (e) {
      return false;
    }
  }
}