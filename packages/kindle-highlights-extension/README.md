# Kindle Highlights Extension

This Chrome extension automatically extracts and syncs your Kindle highlights from Amazon's Kindle notebook.

## How it works

1. The extension runs in the background, periodically fetching your Kindle highlights from Amazon.
2. It parses the HTML from Amazon's Kindle notebook to extract book information and annotations.
3. The extracted data is sent to an [API](/packages/api/README.md) for storage or further processing.
4. I can log in through the extension popup to authenticate and enable syncing.
5. The popup also displays sync status and Amazon authentication status.

## Todo
- TODO there's something up cause it just saved an empty array / miss some data occassionally
- TODO add persisted logging (so I know it actually is running)
- TODO update docs