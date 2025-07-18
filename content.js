chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "parseHtml" && message.html) {
    console.log("Received HTML for parsing...");
    const parser = new DOMParser();
    const doc = parser.parseFromString(message.html, "text/html");
    console.log("Parsing HTML content...", doc.title);

    const ul = doc.querySelector("ul#mostRecentVideosSection");
    console.log("Parsed most recent videos:", ul);
    const firstLi = ul?.querySelector("li");
    console.log("First list item:", firstLi);
    const liId = firstLi?.getAttribute("data-video-id");

    sendResponse({ videoIds: liId ? [liId] : [] });
    return true;
  }
});
