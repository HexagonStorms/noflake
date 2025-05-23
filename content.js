// Global variables
let bufferTime = 10; // Default 10 seconds
let enableNotifications = true;
let autoDismissNotifications = false; // Default is persistent notifications
let notificationColor = '#000000'; // Default notification color
let notificationOpacity = 75; // Default opacity (as a percentage)
let autoEnable = true;
let skipAds = false;
let onlyOnLongVideos = false;
let pauseEnabledMessage = 'Pause enabled'; // Default message when pause is allowed
let pauseLockedMessage = 'Pause locked'; // Default message when pause is locked
let playStartTime = 0;
let bufferActive = false;
let notificationElement = null;
let lastVideoId = null;
let activeNotificationTimeout = null; // To track active notification timeout

// Function to convert hex color and opacity to rgba
function hexToRgba(hex, opacity) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  // Convert opacity from percentage to decimal
  const alpha = opacity / 100;
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Load settings when script initializes
chrome.storage.sync.get({
  bufferTime: 30,
  enableNotifications: true,
  autoDismissNotifications: false,
  notificationColor: '#000000',
  notificationOpacity: 75,
  autoEnable: true,
  skipAds: false,
  onlyOnLongVideos: false,
  pauseEnabledMessage: 'Pause enabled',
  pauseLockedMessage: 'Pause locked'
}, function(items) {
  bufferTime = items.bufferTime;
  enableNotifications = items.enableNotifications;
  autoDismissNotifications = items.autoDismissNotifications;
  notificationColor = items.notificationColor;
  notificationOpacity = items.notificationOpacity;
  autoEnable = items.autoEnable;
  skipAds = items.skipAds;
  onlyOnLongVideos = items.onlyOnLongVideos;
  pauseEnabledMessage = items.pauseEnabledMessage;
  pauseLockedMessage = items.pauseLockedMessage;
  
  // Initialize after settings are loaded
  initialize();
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'settingsUpdated') {
    // Store previous buffer time for comparison
    const prevBufferTime = bufferTime;

    // Update all settings
    bufferTime = request.settings.bufferTime;
    enableNotifications = request.settings.enableNotifications;
    autoDismissNotifications = request.settings.autoDismissNotifications;
    notificationColor = request.settings.notificationColor;
    notificationOpacity = request.settings.notificationOpacity;
    autoEnable = request.settings.autoEnable;
    skipAds = request.settings.skipAds;
    onlyOnLongVideos = request.settings.onlyOnLongVideos;
    pauseEnabledMessage = request.settings.pauseEnabledMessage;
    pauseLockedMessage = request.settings.pauseLockedMessage;

    // Update notification style if it exists
    if (notificationElement) {
      notificationElement.style.backgroundColor = hexToRgba(notificationColor, notificationOpacity);
    }
    
    // If buffer time changed and a countdown is active, update it
    if (prevBufferTime !== bufferTime && countdownInterval) {
      // Recalculate remaining time based on new buffer setting
      const currentTime = Date.now() / 1000;
      const elapsedTime = currentTime - playStartTime;
      const newTimeRemaining = Math.max(0, Math.ceil(bufferTime - elapsedTime));
      
      // If new time is ≤ 0, complete the buffer
      if (newTimeRemaining <= 0 && bufferActive) {
        stopCountdown();
        stopBufferCountdown();
        bufferActive = false;
        if (enableNotifications) {
          showNotification(pauseEnabledMessage, 'rgba(76, 175, 80, 0.85)');
        }
      }
      // Otherwise restart the countdown with the new time
      else if (bufferActive) {
        // If this was triggered by pause attempt, use the pause countdown
        if (countdownInterval) {
          startCountdown(newTimeRemaining);
        }
        // Otherwise update the continuous buffer countdown
        else {
          startBufferCountdown(bufferTime);
        }
      }
    }
    
    // Show notification about updated settings
    if (enableNotifications) {
      showNotification('Settings updated');
    }
    
    // If notifications are disabled, clean up
    if (!enableNotifications) {
      stopCountdown();
      if (notificationElement) {
        notificationElement.style.display = 'none';
      }
    }
    
    // If auto-enable was turned off, reset the buffer state
    if (!autoEnable) {
      resetBufferState();
    }
  }
});

function initialize() {
  // Set up mutation observer to detect page changes
  const observer = new MutationObserver(function(mutations) {
    // Check if we're on a YouTube watch page
    if (window.location.href.includes('youtube.com/watch')) {
      const videoId = new URLSearchParams(window.location.search).get('v');
      
      // If this is a new video, reset the buffer state
      if (videoId !== lastVideoId) {
        lastVideoId = videoId;
        resetBufferState();
        setupVideoListeners();
      }
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  
  // Initial setup if we're already on a watch page
  if (window.location.href.includes('youtube.com/watch')) {
    lastVideoId = new URLSearchParams(window.location.search).get('v');
    setupVideoListeners();
  }
}

// Timer to check buffer status even when not pausing
let bufferCheckInterval = null;

function setupVideoListeners() {
  // Find the video element (may need to wait for it to load)
  const setupInterval = setInterval(() => {
    const video = document.querySelector('video');
    if (video) {
      clearInterval(setupInterval);
      
      // Check if we should enable the extension for this video
      if (onlyOnLongVideos) {
        // Get video duration
        if (video.duration < 300) { // Less than 5 minutes
          return; // Don't apply buffer to short videos
        }
      }
      
      // Remove any existing listeners to prevent duplicates
      video.removeEventListener('play', handleVideoPlay);
      video.removeEventListener('pause', handleVideoPause);
      
      // Add event listeners for play and pause
      video.addEventListener('play', handleVideoPlay);
      video.addEventListener('pause', handleVideoPause);
      
      // Create notification element if it doesn't exist
      createNotificationElement();
      
      // Handle video container resizing to keep notification positioned correctly
      setupVideoResizeHandler();
      
      // Set up continuous buffer check
      setupBufferCheck();
      
      if (enableNotifications && autoEnable) {
        showNotification('PauseLock enabled');
      }
    }
  }, 500);
}

// Set up interval to check buffer status continuously
function setupBufferCheck() {
  // Clear any existing interval
  if (bufferCheckInterval) {
    clearInterval(bufferCheckInterval);
  }
  
  // Check every second if buffer is complete even without pause attempts
  bufferCheckInterval = setInterval(() => {
    if (bufferActive) {
      const currentTime = Date.now() / 1000;
      const elapsedTime = currentTime - playStartTime;
      
      // Skip if in an ad with skipAds enabled
      if (skipAds && isAdPlaying()) {
        return;
      }
      
      // If buffer time has been reached, update state
      if (elapsedTime >= bufferTime) {
        bufferActive = false;

        // Only show notification if not already showing completion message
        if (enableNotifications &&
            (!notificationElement ||
             !notificationElement.textContent !== pauseEnabledMessage)) {
          showNotification(pauseEnabledMessage, 'rgba(76, 175, 80, 0.85)');
        }

        // Stop any running countdowns
        stopCountdown();
        stopBufferCountdown();
      }
    }
  }, 1000);
}

function setupVideoResizeHandler() {
  // This handles YouTube's dynamic resizing of the video container
  const videoObserver = new MutationObserver(() => {
    // If notification exists and video container exists, reattach notification
    if (notificationElement && notificationElement.parentElement !== document.querySelector('.html5-video-container')) {
      const videoContainer = document.querySelector('.html5-video-container') || document.querySelector('.html5-main-video');
      if (videoContainer && videoContainer !== notificationElement.parentElement) {
        // Store current position before reattaching
        let currentPosition = {
          top: notificationElement.style.top,
          left: notificationElement.style.left,
          transform: notificationElement.style.transform
        };
        
        // Reattach notification
        videoContainer.style.position = 'relative';
        videoContainer.appendChild(notificationElement);
        
        // Restore position
        notificationElement.style.top = currentPosition.top;
        notificationElement.style.left = currentPosition.left;
        notificationElement.style.transform = currentPosition.transform;
      }
    }
  });
  
  // Observe the player container for changes
  const playerContainer = document.querySelector('#movie_player') || document.querySelector('.html5-video-player');
  if (playerContainer) {
    videoObserver.observe(playerContainer, { 
      childList: true, 
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }
}

function handleVideoPlay() {
  const video = document.querySelector('video');
  
  // Only start buffer if autoEnable is on or if we manually enabled it
  if (autoEnable) {
    // Skip if we're in an ad and skipAds is enabled
    if (skipAds && isAdPlaying()) {
      return;
    }
    
    // Stop any existing countdown before starting a new one
    stopCountdown();
    
    // Start the buffer timer
    playStartTime = Date.now() / 1000; // Current time in seconds
    bufferActive = true;
    
    if (enableNotifications) {
      // Start a continuous countdown display
      startBufferCountdown(bufferTime);
    }
  }
}

// Variables to track notification state
let lastPauseAttemptTime = 0;
let countdownInterval = null;
let bufferCountdownInterval = null; // For the continuous buffer countdown
let countdownElement = null;

function handleVideoPause() {
  const video = document.querySelector('video');
  const currentTime = Date.now() / 1000;
  
  // If buffer is active, check if enough time has passed
  if (bufferActive) {
    const elapsedTime = currentTime - playStartTime;
    
    // Skip check if we're in an ad and skipAds is enabled
    if (skipAds && isAdPlaying()) {
      return;
    }
    
    // If not enough time has passed, resume playback
    if (elapsedTime < bufferTime) {
      const timeRemaining = Math.ceil(bufferTime - elapsedTime);
      
      // Prevent pause by immediately playing again
      setTimeout(() => {
        video.play();
      }, 10);
      
      // Only show notification if more than 1 second has passed since last attempt
      // This prevents notification spam when user repeatedly tries to pause
      if (enableNotifications && (currentTime - lastPauseAttemptTime > 1)) {
        // Start or update countdown
        startCountdown(timeRemaining);
        lastPauseAttemptTime = currentTime;
      }
      
      return;
    }
    
    // If we've passed the buffer time, allow the pause and stop all countdowns
    bufferActive = false;
    stopCountdown();
    stopBufferCountdown();

    if (enableNotifications) {
      showNotification(pauseEnabledMessage, 'rgba(76, 175, 80, 0.85)');
    }
  }
}

// Function to start countdown timer for notification
function startCountdown(seconds) {
  // Stop any existing countdown
  stopCountdown();
  
  // Create a special countdown notification with a span for the seconds
  if (!notificationElement) {
    createNotificationElement();
  }
  
  // Make sure notification is created and connected to DOM
  if (!notificationElement || !notificationElement.isConnected) {
    notificationElement = null;
    createNotificationElement();
    if (!notificationElement) return;
  }
  
  // Create the notification with a span for the countdown - Apple-style minimal text
  notificationElement.innerHTML = `Pause in: <span id="noflake-countdown">${seconds}</span>`;
  notificationElement.style.backgroundColor = hexToRgba('#FF4444', notificationOpacity);
  notificationElement.style.display = 'block';
  
  // Get countdown span element
  const countdownSpan = notificationElement.querySelector('#noflake-countdown');
  
  // Start new countdown
  countdownInterval = setInterval(() => {
    seconds--;
    
    if (seconds <= 0) {
      // Buffer time reached during countdown, show success message
      stopCountdown();
      bufferActive = false;
      showNotification(pauseEnabledMessage, 'rgba(76, 175, 80, 0.85)');
    } else if (countdownSpan) {
      // Update just the span element with the new seconds value
      countdownSpan.textContent = seconds;
    }
  }, 1000);
}

// Function to stop active countdown
function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

// Function to display a continuously updating countdown for the buffer time
function startBufferCountdown(totalSeconds) {
  // Clear any existing buffer countdown
  stopBufferCountdown();

  // Create notification element if needed
  if (!notificationElement) {
    createNotificationElement();
  }

  // Make sure notification is connected to DOM
  if (!notificationElement || !notificationElement.isConnected) {
    notificationElement = null;
    createNotificationElement();
    if (!notificationElement) return;
  }

  // Initial display of countdown
  notificationElement.innerHTML = `${pauseLockedMessage}: <span id="buffer-countdown">${totalSeconds}</span>s`;
  notificationElement.style.backgroundColor = hexToRgba('#FF4444', notificationOpacity);
  notificationElement.style.display = 'block';

  // Get the span element for updating
  const countdownSpan = notificationElement.querySelector('#buffer-countdown');
  let secondsRemaining = totalSeconds;

  // Update the countdown every second
  bufferCountdownInterval = setInterval(() => {
    // Calculate remaining time based on actual elapsed time
    const currentTime = Date.now() / 1000;
    const elapsedTime = currentTime - playStartTime;
    secondsRemaining = Math.max(0, Math.ceil(totalSeconds - elapsedTime));

    if (secondsRemaining <= 0 || !bufferActive) {
      // Buffer time completed
      stopBufferCountdown();
      if (bufferActive) {
        bufferActive = false;
        showNotification(pauseEnabledMessage, 'rgba(76, 175, 80, 0.85)');
      }
    } else if (countdownSpan) {
      // Update the displayed seconds
      countdownSpan.textContent = secondsRemaining;
    }
  }, 1000);
}

// Function to stop the buffer countdown
function stopBufferCountdown() {
  if (bufferCountdownInterval) {
    clearInterval(bufferCountdownInterval);
    bufferCountdownInterval = null;
  }
}

function resetBufferState() {
  playStartTime = 0;
  bufferActive = false;
  stopCountdown();
  stopBufferCountdown();

  // Clear buffer check interval
  if (bufferCheckInterval) {
    clearInterval(bufferCheckInterval);
    bufferCheckInterval = null;
  }
  
  // Clear any visible notifications
  if (notificationElement && notificationElement.style.display === 'block') {
    notificationElement.style.display = 'none';
  }
}

function isAdPlaying() {
  // Check if an ad is currently playing (look for ad indicators in the DOM)
  return document.querySelector('.ad-showing') !== null;
}

function createNotificationElement() {
  if (notificationElement) return;
  
  notificationElement = document.createElement('div');
  notificationElement.style.position = 'absolute';
  notificationElement.style.top = '15px'; // Default top position
  notificationElement.style.left = '50%';
  notificationElement.style.transform = 'translateX(-50%)';
  notificationElement.style.backgroundColor = hexToRgba(notificationColor, notificationOpacity);
  notificationElement.style.color = 'white';
  notificationElement.style.padding = '8px 16px';
  notificationElement.style.borderRadius = '20px'; // More rounded, Apple-style
  notificationElement.style.zIndex = '9999';
  notificationElement.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  notificationElement.style.fontWeight = '500'; // Medium weight instead of bold
  notificationElement.style.fontSize = '14px';
  notificationElement.style.letterSpacing = '0.2px'; // Slight letter spacing for readability
  notificationElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; // Softer shadow
  notificationElement.style.display = 'none';
  notificationElement.style.pointerEvents = 'auto'; // Allow interaction for dismiss button
  notificationElement.style.textAlign = 'center';
  notificationElement.style.minWidth = '100px';
  
  // Create a small CSS style for the close button and drag functionality
  const style = document.createElement('style');
  style.textContent = `
    .noflake-dismiss {
      display: inline-block;
      font-size: 16px;
      line-height: 16px;
      margin-left: 8px;
      vertical-align: middle;
      opacity: 0.7;
      cursor: pointer;
    }
    .noflake-dismiss:hover {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
  
  // Find the video container instead of adding to body
  const videoContainer = document.querySelector('.html5-video-container') || document.querySelector('.html5-main-video');
  if (videoContainer) {
    videoContainer.style.position = 'relative'; // Ensure position relative for absolute positioning
    videoContainer.appendChild(notificationElement);
  } else {
    document.body.appendChild(notificationElement);
  }
  
  }


function showNotification(message, color = null) {
  if (!notificationElement || !enableNotifications) return;
  
  // Check if notification is already showing the same message
  if (notificationElement.textContent === message && notificationElement.style.display === 'block') {
    return; // Don't show duplicate notifications
  }
  
  // Check if notification container is still attached to DOM
  if (!notificationElement.isConnected) {
    // Re-create the notification element if it was removed
    notificationElement = null;
    createNotificationElement();
    if (!notificationElement) return;
  }
  
  // Clear any existing timeout to prevent race conditions
  if (activeNotificationTimeout) {
    clearTimeout(activeNotificationTimeout);
    activeNotificationTimeout = null;
  }
  
  // Add dismiss button if not a pause countdown notification
  let dismissButton = '';
  if (message !== pauseEnabledMessage && !message.includes('Pause in:') && !message.includes(pauseLockedMessage) && !bufferCountdownInterval) {
    dismissButton = '<span class="noflake-dismiss">×</span>';
    notificationElement.innerHTML = message + dismissButton;
    
    // Add event listener to dismiss button
    const dismissEl = notificationElement.querySelector('.noflake-dismiss');
    if (dismissEl) {
      dismissEl.addEventListener('click', () => {
        notificationElement.style.display = 'none';
      });
    }
  } else {
    notificationElement.textContent = message;
  }
  
  // Determine notification color
  // For status notifications: use user's custom color
  // For warning/error/success: use predefined colors but with user's opacity
  if (color === null) {
    // Use default user color with opacity
    notificationElement.style.backgroundColor = hexToRgba(notificationColor, notificationOpacity);
  } else if (color === 'rgba(255, 68, 68, 0.85)') {
    // Error notification (red) - but use user opacity
    notificationElement.style.backgroundColor = hexToRgba('#FF4444', notificationOpacity);
  } else if (color === 'rgba(76, 175, 80, 0.85)') {
    // Success notification (green) - but use user opacity
    notificationElement.style.backgroundColor = hexToRgba('#4CAF50', notificationOpacity);
  } else {
    // If a specific color was passed, use it with user's opacity
    try {
      // Try to extract RGB values from the passed color
      const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
      if (rgbMatch) {
        const r = parseInt(rgbMatch[1]);
        const g = parseInt(rgbMatch[2]);
        const b = parseInt(rgbMatch[3]);
        notificationElement.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${notificationOpacity/100})`;
      } else {
        // If not RGB format, use as is
        notificationElement.style.backgroundColor = color;
      }
    } catch (e) {
      // Fallback to user's color if parsing fails
      notificationElement.style.backgroundColor = hexToRgba(notificationColor, notificationOpacity);
    }
  }
  
  notificationElement.style.display = 'block';
  
  // Auto-dismiss logic: Only auto-dismiss if setting is enabled or if it's an info notification
  const isBufferNotification = message.includes('Cannot pause yet') || 
                              message.includes('Video started') || 
                              message.includes('Buffer complete');
                              
  // Keep buffer-related notifications visible when auto-dismiss is off
  // But always auto-dismiss status notifications like "settings updated"
  if (autoDismissNotifications || (!isBufferNotification && !message.includes('active on this video'))) {
    activeNotificationTimeout = setTimeout(() => {
      // Only hide if it's still showing this message
      if (notificationElement && 
          (notificationElement.textContent === message || 
           notificationElement.innerHTML.startsWith(message))) {
        notificationElement.style.display = 'none';
      }
      activeNotificationTimeout = null;
    }, 3000);
  }
}