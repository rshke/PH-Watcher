document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById("resultList");

  chrome.storage.local.get(null, (data) => {
    const results = Object.keys(data)
      .filter(key => key.startsWith('ph_hash_'))
      .filter(key => data[key]?.updated)
      .map(key => ({
        url: key.replace('ph_hash_', ''),
      }));

    console.log("Last updated URLs:", results);

    results.forEach(item => {
      const li = document.createElement("li");
      const a = document.createElement("a");

      a.href = item.url;
      a.textContent = `Updated: ${item.url}`;
      a.target = "_blank";

      li.appendChild(a);
      list.appendChild(li);
    });

    if (results.length > 0) {
      showCelebration();
    }
  });
});

document.getElementById("checkBtn").addEventListener("click", async () => {
  const list = document.getElementById("resultList");
  list.innerHTML = "Checking...";

  const response = await chrome.runtime.sendMessage({ action: "checkPornhubPages" });

  list.innerHTML = "";
  let updatedCount = 0;

  response.forEach(item => {
    if (!item.changed) return;

    updatedCount++;

    const li = document.createElement("li");
    const a = document.createElement("a");

    a.href = item.url;
    a.textContent = `Updated: ${item.url}`;
    a.target = "_blank"; // 在新标签页打开

    li.appendChild(a);
    list.appendChild(li);
  });

  if (updatedCount === 0) {
    const li = document.createElement("li");
    li.textContent = "No updates found.";
    list.appendChild(li);
  }

  if (updatedCount > 0) {
    showCelebration();
  }
});

function showCelebration() {
  const gif = document.createElement("img");
  gif.src = "images/party-popper.gif";
  Object.assign(gif.style, {
    position: "fixed",
    top: "20%",
    left: "50%",
    transform: "translateX(-50%)",
    width: "250px",
    zIndex: "9999",
    pointerEvents: "none"
  });

  document.body.appendChild(gif);

  setTimeout(() => gif.remove(), 4000); // 2秒后移除，确保动画播放完
}
