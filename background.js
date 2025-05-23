// Service worker for background processes
chrome.runtime.onInstalled.addListener(function() {
  // Set default settings when the extension is first installed
  chrome.storage.sync.get({
    bufferTime: 10,
    enableNotifications: true,
    autoDismissNotifications: false,
    notificationColor: '#000000',
    notificationOpacity: 75,
    autoEnable: true,
    skipAds: false,
    onlyOnLongVideos: false
  }, function(items) {
    // Only set defaults if they don't exist
    if (items === undefined) {
      chrome.storage.sync.set({
        bufferTime: 30,
        enableNotifications: true,
        autoDismissNotifications: false,
        notificationColor: '#000000',
        notificationOpacity: 75,
        autoEnable: true,
        skipAds: false,
        onlyOnLongVideos: false
      });
    }
  });
  
  // Optional: Show a welcome page on install
  chrome.tabs.create({
    url: 'welcome.html'
  });
});