// Offscreen document for HTML parsing in Manifest V3
// This document has DOM access and can parse HTML with CSS selectors

console.log('[Offscreen] Offscreen document loaded and ready');

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log('[Offscreen] Received message:', message.type);

    if (message.type === 'PARSE_HTML') {
        try {
            // Use DOMParser to parse HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(message.html, 'text/html');

            // Find element using CSS selector
            const element = doc.querySelector(message.selector);

            const result = element ? element.textContent.trim() : '';
            console.log('[Offscreen] Parsed result:', result ? result.substring(0, 50) + '...' : '(empty)');

            sendResponse({ result: result });
        } catch (error) {
            console.error('[Offscreen] Error parsing HTML:', error);
            sendResponse({ result: '' });
        }

        // Return true to indicate async response
        return true;
    }
    // Always return false if not handling this message
    return false;
});
