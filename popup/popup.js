document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById("resultList");
  const lastCheckInfo = document.getElementById("lastCheckInfo");

  // Display last check time
  const storedCheck = await chrome.storage.local.get('ph_last_check');
  const lastCheckTimestamp = storedCheck.ph_last_check || 0;
  updateLastCheckDisplay(lastCheckInfo, lastCheckTimestamp);

  chrome.storage.local.get(null, (data) => {
    const results = Object.keys(data)
      .filter(key => key.startsWith('ph_hash_'))
      .filter(key => data[key]?.updated)
      .map(key => ({
        url: key.replace('ph_hash_', ''),
      }));

    console.log("Last updated URLs:", results);

    results.forEach(item => {
      createListItem(item, list);
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
    createListItem(item, list);
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
  updateLastCheckDisplay(lastCheckInfo, lastCheckTimestamp);
});

function updateLastCheckDisplay(element, timestamp) {
  if (timestamp > 0) {
    const diff = Date.now() - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    let timeStr = "";
    if (days > 0) timeStr += `${days} day${days > 1 ? 's' : ''} `;
    timeStr += `${hours} hour${hours > 1 ? 's' : ''}`;
    
    element.textContent = ` (${timeStr} ago)`;
  } else {
    element.textContent = ` (Never checked)`;
  }
}

function getModelName(url) {
  try {
    const parts = url.split('/model/');
    if (parts.length > 1) {
      return parts[1].split('/')[0];
    }
  } catch (e) {
    console.error("Error parsing model name:", e);
  }
  return url;
}

function createListItem(item, list) {
  const li = document.createElement("li");
  const a = document.createElement("a");
  const modelName = getModelName(item.url);

  a.href = item.url;
  a.textContent = modelName;
  a.target = "_blank";
  a.className = "model-link";

  li.appendChild(a);
  
  // Add rating block
  createRatingBlock(item.url, li);

  // Add delete button
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "×";
  deleteBtn.title = "Delete bookmark";
  deleteBtn.style.marginLeft = "20px";
  deleteBtn.style.cursor = "pointer";
  deleteBtn.style.background = "none";
  deleteBtn.style.border = "none";
  deleteBtn.style.color = "#999";
  deleteBtn.style.fontSize = "16px";
  deleteBtn.onclick = async () => {
    if (confirm(`Are you sure you want to delete bookmark for ${modelName}?`)) {
      await deleteBookmark(item.url);
      li.remove();
    }
  };
  li.appendChild(deleteBtn);

  list.appendChild(li);
}

async function deleteBookmark(url) {
  try {
    const bookmarks = await chrome.bookmarks.search({ url });
    for (const bookmark of bookmarks) {
      await chrome.bookmarks.remove(bookmark.id);
    }
    console.log(`Deleted bookmark: ${url}`);
    
    // Also remove from local storage
    await chrome.storage.local.remove([`ph_hash_${url}`, `ph_rating_${url}`]);
    
  } catch (err) {
    console.error(`Error deleting bookmark ${url}:`, err);
  }
}

async function createRatingBlock(url, parent) {
  const ratingKey = `ph_rating_${url}`;
  
  // Fetch initial data
  const stored = await chrome.storage.local.get(ratingKey);
  let history = stored[ratingKey]?.history || [];

  const container = document.createElement("div");
  Object.assign(container.style, {
    display: "flex",
    alignItems: "center",
    fontSize: "14px",
    flexShrink: "0"
  });

  const starsContainer = document.createElement("div");
  starsContainer.style.cursor = "pointer";
  
  const avgDisplay = document.createElement("span");
  avgDisplay.style.marginLeft = "10px";
  avgDisplay.style.color = "#666";
  avgDisplay.style.fontSize = "12px";

  // Function to render stars and text
  const render = (currentHistory) => {
    starsContainer.innerHTML = ""; // Clear existing stars
    
    // Calculate average
    const avg = currentHistory.length > 0
      ? (currentHistory.reduce((a, b) => a + b, 0) / currentHistory.length)
      : 0;

    // Render 5 stars
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("span");
      star.textContent = "★";
      star.style.color = i <= Math.round(avg) ? "#FFD700" : "#ccc"; // Gold or Gray
      star.style.marginRight = "2px";
      star.title = `Rate ${i} star${i > 1 ? 's' : ''}`;
      
      // Click handler
      star.onclick = async (e) => {
        e.preventDefault(); // Prevent link click if bubbled (though it's outside 'a')
        
        // Add new rating
        const newHistory = [...currentHistory, i];
        await chrome.storage.local.set({ [ratingKey]: { history: newHistory } });
        
        // Re-render
        render(newHistory);
      };

      starsContainer.appendChild(star);
    }

    avgDisplay.textContent = currentHistory.length > 0
      ? `Avg: ${avg.toFixed(1)} (${currentHistory.length})`
      : "No ratings yet";
  };

  // Initial render
  render(history);

  container.appendChild(starsContainer);
  container.appendChild(avgDisplay);
  parent.appendChild(container);
}

function showCelebration() {
  const gif = document.createElement("img");
  gif.src = "../images/party-popper.gif";
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