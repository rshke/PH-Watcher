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
    const oldIds = stored[key]?.recent_video_id ?? [];

    const hasUpdate = JSON.stringify(newIds) !== JSON.stringify(oldIds);

    await chrome.storage.local.set({
      [key]: {
        recent_video_id: hasUpdate ? newIds : oldIds,
        updated: hasUpdate
      }
    });

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
  (async () => {
    if (message.action === "checkPornhubPages") {
      const storedCheck = await chrome.storage.local.get('ph_last_check');
      const lastCheck = storedCheck.ph_last_check || 0;
      const still_fresh = Date.now() - lastCheck < 24 * 60 * 60 * 1000;
      if (still_fresh) {
        console.log("Skipping check, last check was less than a day ago.");
        chrome.storage.local.get(null, (data) => {
          const results = Object.keys(data)
            .filter(key => key.startsWith('ph_hash_'))
            .filter(key => data[key]?.updated)
            .map(key => ({
              url: key.replace('ph_hash_', ''),
              changed: true,
              latest: data[key].recent_video_id
            }));
          sendResponse(results); // ✅ 只调用一次
        });
        return;
      }

      try {
        const urls = await getPornhubBookmarks();
        const results = [];

        for (const url of urls) {
          const result = await checkPornhubModelPage(url);
          results.push(result);
        }

        await chrome.storage.local.set({ ph_last_check: Date.now() });
        // console.log("Returning results:", results);
        sendResponse(results);
      } catch (err) {
        console.error("Error in background handler:", err);
        sendResponse({ error: true });
      }
    }
  })();
  return true; // ✅ 必须在外层 return true 以支持异步 sendResponse
});
