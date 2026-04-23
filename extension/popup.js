document.getElementById('openOpts').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
