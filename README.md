# PauseLock - YouTube Timer

## Overview
PauseLock is a Chrome extension that adds a customizable timer to YouTube videos, preventing users from pausing for a specified period after starting playback. This extension helps viewers commit to watching content without constantly stopping and starting videos.

**Originally inspired by feedback from YouTube watchers and content creators**

## Features
- **Customizable Timer**: Set how long (in seconds) a viewer must watch before being allowed to pause
- **Visual Notifications**: On-screen messages show buffer status and remaining time
- **Customizable Messages**: Personalize the notification text for when pause is locked and enabled
- **Ad Handling**: Option to exclude ad time from buffer calculations
- **Video Length Filtering**: Option to only apply the buffer to videos longer than 5 minutes
- **Auto-Enable**: Automatically enable the buffer on all YouTube videos or control manually

## Installation
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked" and select the extension directory
5. The PauseLock icon should appear in your Chrome toolbar

## Developer Instructions

### Testing Changes
When making continuous edits to the extension during development:

1. Make your code changes (editing HTML, JS, or CSS files)
2. Go to `chrome://extensions/`
3. Find the PauseLock extension and click the refresh icon (↻)
4. No need to uninstall and reinstall - the refresh updates the extension with your changes

If the refresh icon doesn't appear to apply your changes:
- Check if you modified the manifest.json file (requires a full reload)
- Make sure you saved all your edited files
- Try opening a new YouTube page to see the changes

### Debugging
1. Go to `chrome://extensions/` and click on "background page" under PauseLock to access the DevTools for the background script
2. On YouTube pages, right-click and select "Inspect" then navigate to the "Console" tab to see extension logs
3. Add `console.log()` statements to debug specific code paths

### Common Issues
- **Changes not appearing**: Make sure to refresh the extension and reload YouTube pages
- **Storage not updating**: Check the Chrome DevTools console for errors during storage operations
- **Content script not running**: Verify the manifest.json content_scripts section includes the correct URL patterns
- **Permissions issues**: Make sure all required permissions are properly listed in manifest.json

## Usage
1. Click the PauseLock icon in your Chrome toolbar to open the settings popup
2. Set your desired timer duration (in seconds)
3. Configure other options as desired:
   - Toggle notifications on/off
   - Customize notification messages for when pause is locked or enabled
   - Adjust notification color and opacity
   - Enable/disable auto-activation
   - Choose whether to count ad time in the buffer
   - Set whether to only activate on longer videos
4. Save your settings
5. Visit YouTube and start watching videos with your new pause timer!

## For Content Creators
PauseLock is perfect for podcast creators, educators, and other content creators who want their audience to engage more deeply with their content. Some potential use cases:

- Podcast episodes where hosts address controversial topics (prevents knee-jerk reactions)
- Educational content where concepts build on each other
- Long-form storytelling where the payoff requires commitment
- Live streams or premieres where community engagement matters

## Potential Future Enhancements
Some easy quality-of-life features that could be added to this extension:

1. **Channel-Specific Settings**: Apply different buffer times to different YouTube channels
2. **Watch History Integration**: Track completion rates for videos
3. **Custom Notification Styles**: Allow users to customize the appearance of notifications
4. **Scheduled Buffer Times**: Different buffer settings based on time of day
5. **Keyboard Shortcut Override**: Prevent keyboard shortcuts from pausing during buffer
6. **Playlist Mode**: Special settings for playlists to encourage binge-watching
7. **Community Features**: Share your watching commitment with others
8. **Focus Mode**: Block comments and other distractions during buffer time

## Privacy

PauseLock does not collect, store, or transmit any user data. All settings are stored locally in your browser, and no information is shared with any third parties.

For complete details, see our [Privacy Policy](PRIVACY.md).

## License
MIT License - Feel free to modify and use this extension for your needs!

## Acknowledgments
Special thanks to all the viewers and content creators who provided feedback that inspired this tool!

## Reporting Issues

Found a bug or have a feature request? Please submit an issue on GitHub:

1. Go to [https://github.com/HexagonStorms/PauseLock/issues](https://github.com/HexagonStorms/PauseLock/issues)
2. Click "New Issue"
3. Provide details about your bug or feature request:
   - For bugs: describe what happened, what you expected, and steps to reproduce
   - For feature requests: describe the feature and why it would be valuable
   - Include your browser version and operating system
4. Submit the issue

## TODO List

- Publish to Chrome Store
- Add screenshots
- Add promo banner