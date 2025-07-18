document.getElementById("checkBtn").addEventListener("click", async () => {
  const list = document.getElementById("resultList");
  list.innerHTML = "Checking...";

  const response = await chrome.runtime.sendMessage({ action: "checkPornhubPages" });

  list.innerHTML = "";
  response.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.url} — ${item.changed ? "✅ Updated!" : "❌ No change"}`;
    list.appendChild(li);
  });
});

