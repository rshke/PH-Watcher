async function ensureOffscreen() {
  const existing = await chrome.offscreen.hasDocument();
  if (!existing) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['DOM_PARSER'],
      justification: 'Parse HTML in a hidden environment'
    });
  }
}

async function extractVideoIds(htmlText) {
  await ensureOffscreen();

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "parseHtml", html: htmlText },
      (response) => {
        resolve(response?.videoIds || []);
      }
    );
  });
}

async function checkPornhubModelPage(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const html = await res.text();
    const newIds = await extractVideoIds(html);
    console.log(`Extracted video IDs from ${url}:`, newIds);

    const key = `ph_hash_${url}`;
    const stored = await chrome.storage.local.get(key);
    const oldIds = stored[key] || [];

    const hasUpdate = JSON.stringify(newIds) !== JSON.stringify(oldIds);

    if (hasUpdate) {
      await chrome.storage.local.set({ [key]: newIds });
    }

    return { url, changed: hasUpdate, latest: newIds };
  } catch (e) {
    console.error(`Error checking ${url}:`, e);
    return { url, changed: false, error: true };
  }
}

function getPornhubBookmarks() {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((tree) => {
      const urls = [];

      function collect(node) {
        if (node.url && node.url.includes("pornhub.com/model/")) {
          urls.push(node.url);
        }
        if (node.children) node.children.forEach(collect);
      }

      tree.forEach(collect);
      resolve(urls);
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "checkPornhubPages") {
    (async () => {
      try {
        const urls = await getPornhubBookmarks();
        const results = [];

        for (const url of urls) {
          const result = await checkPornhubModelPage(url);
          results.push(result);
        }

        console.log("Returning results:", results);
        sendResponse(results);
      } catch (err) {
        console.error("Error in background handler:", err);
        sendResponse({ error: true });
      }
    })();

    return true; // ✅ 必须在 if 外 return true
  }
});
