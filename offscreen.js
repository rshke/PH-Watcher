chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("recieve video id passing task...")
    if (message.action === "parseHtml" && message.html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(message.html, "text/html");

        const ul = doc.querySelector("ul#mostRecentVideosSection");
        const firstLi = ul?.querySelector("li");
        const liId = firstLi?.getAttribute("data-video-id");

        sendResponse({ videoIds: liId ? [liId] : [] });
        return true;
    }
});
