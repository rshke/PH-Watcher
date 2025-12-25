document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById("resultList");
  const lastCheckInfo = document.getElementById("lastCheckInfo");

  // Display last check time
  const storedCheck = await chrome.storage.local.get('ph_last_check');
  const lastCheckTimestamp = storedCheck.ph_last_check || 0;
  if (lastCheckTimestamp > 0) {
    const lastCheckDate = new Date(lastCheckTimestamp);
    lastCheckInfo.textContent = ` (Last check: ${lastCheckDate.toLocaleDateString()} ${lastCheckDate.toLocaleTimeString()})`;
  } else {
    lastCheckInfo.textContent = ` (Never checked)`;
  }

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
  const lastCheckInfo = document.getElementById("lastCheckInfo");
  lastCheckInfo.textContent = " (Checking now...)";

  const response = await chrome.runtime.sendMessage({ action: "checkPornhubPages", force: true });

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

  // Update last check info after the check is complete
  const storedCheck = await chrome.storage.local.get('ph_last_check');
  const lastCheckTimestamp = storedCheck.ph_last_check || 0;
  if (lastCheckTimestamp > 0) {
    const lastCheckDate = new Date(lastCheckTimestamp);
    lastCheckInfo.textContent = ` (Last check: ${lastCheckDate.toLocaleDateString()} ${lastCheckDate.toLocaleTimeString()})`;
  } else {
    lastCheckInfo.textContent = ` (Never checked)`;
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
