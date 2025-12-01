// Offscreen document for HTML parsing in Manifest V3
// This document has DOM access and can parse HTML with CSS selectors

console.log('[Offscreen] Offscreen document loaded and ready');

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    console.log('[Offscreen] Received message:', message.type, 'from:', sender.id);

    if (message.type === 'PARSE_HTML') {
        const requestId = Date.now() + '-' + Math.random().toString(36).substring(7);
        console.log('[Offscreen] Request %s: Starting HTML parse with selector: %s', requestId, message.selector);
        console.log('[Offscreen] Request %s: HTML length: %s bytes', requestId, message.html ? message.html.length : 0);

        try {
            // Use jQuery to parse HTML (same as popup context)
            // This supports jQuery selectors like :eq(), :first, etc.
            console.log('[Offscreen] Request %s: Parsing HTML with jQuery', requestId);
            const $html = $(message.html);
            const foundData = $html.find(message.selector);

            console.log('[Offscreen] Request %s: jQuery find returned %s elements', requestId, foundData.length);

            if (foundData.length != 0) {
                const result = foundData.first().text().trim();
                console.log('[Offscreen] Request %s: Element found, result: %s', requestId, result ? result.substring(0, 50) + '...' : '(empty text)');
                sendResponse({ result: result });
            } else {
                console.warn('[Offscreen] Request %s: No element found for selector: %s', requestId, message.selector);
                sendResponse({ result: '' });
            }
        } catch (error) {
            console.error('[Offscreen] Request %s: Error parsing HTML:', requestId, error);
            sendResponse({ result: '' });
        }

        // Return true to indicate async response
        return true;
    }
    // Always return false if not handling this message
    return false;
});
