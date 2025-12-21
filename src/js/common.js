// Your Notifier namespace - prevents global scope pollution
var YON = window.YON || {};

//Constants
var NOT_AVAILABLE = chrome.i18n.getMessage('statusNotAvailable');
var ERROR = chrome.i18n.getMessage('statusResourceUnreachable');
var ELEMENT_NOT_FOUND = chrome.i18n.getMessage('statusElementNotFound');
var NO_HISTORY = chrome.i18n.getMessage('statusNoHistory');

var HISTORY_MAX = 5;

var updates = {
    UPDATE_INTERVAL: 60000,
    REQUEST_PER_URL_INTERVAL: 10000,
    MAX_ATTEMPTS: 3
};

// Removed monthNames array - now using Intl.DateTimeFormat for locale-aware date formatting

var validation = {
    TITLE_MAX_LENGTH: 100,
    VALUE_MAX_LENGTH: 35,
    URL_MAX_LENGTH: 1000,
    SELECTOR_MAX_LENGTH: 500
};

var chromeAPI = {
    sync: chrome.storage.sync,
    storage: chrome.storage.local,
    alarms: chrome.alarms,
    runtime: chrome.runtime,
    tabs: chrome.tabs,
    browser: chrome.action,
    notifications: chrome.notifications,
    menu: chrome.contextMenus,
    management: chrome.management
};

var c = {

    emptyCallback: function () {
    },

    isNetworkAvailable: function (callbackHandler) {
        if (!callbackHandler.error) {
            callbackHandler.error = function () {
            };
        }

        fetch('https://www.google.com', { method: 'HEAD', mode: 'no-cors' })
            .then(function () {
                callbackHandler.success();
            })
            .catch(function () {
                callbackHandler.error();
            });
    },

    checkUrl: function (rule, callbackHandler) {
        fetch(rule.url, { credentials: 'include' })
            .then(function (response) { return response.text(); })
            .then(function (srcHtml) {
                // Send to offscreen document for parsing (if in service worker context)
                if (typeof document === 'undefined') {
                    chrome.runtime.sendMessage({
                        type: 'PARSE_HTML',
                        html: srcHtml,
                        selector: rule.selector
                    }, function (response) {
                        if (chrome.runtime.lastError) {
                            console.error('Error sending to offscreen document:', chrome.runtime.lastError.message);
                            callbackHandler("");
                            return;
                        }
                        callbackHandler(response && response.result ? response.result : "");
                    });
                } else {
                    // Popup/content script context - can use jQuery directly
                    var foundData = $(srcHtml).find(rule.selector);
                    if (foundData.length != 0) {
                        var newVal = foundData.first().text().trim();
                        callbackHandler(newVal);
                    } else {
                        callbackHandler("");
                    }
                }
            })
            .catch(function () {
                callbackHandler("");
            });
    },

    getFavicon: function (url) {
        // Extract domain from URL
        var domain = url.replace(/^https?:\/\/([^\/]+).*$/, '$1');
        // Use DuckDuckGo's favicon service for better reliability
        // Falls back to a default icon if the favicon doesn't exist
        return 'https://icons.duckduckgo.com/ip3/' + domain + '.ico';
    },

    formatDate: function (d) {
        // Use Intl.DateTimeFormat for locale-aware date formatting
        // Get locale from Chrome i18n API (e.g., 'uk', 'en', 'de') or fallback to browser language
        var locale = chrome.i18n.getUILanguage() || navigator.language;

        var timeFormatter = new Intl.DateTimeFormat(locale, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });

        var dateFormatter = new Intl.DateTimeFormat(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });

        return timeFormatter.format(d) + ' (' + dateFormatter.format(d) + ')';
    },

    shortenStr: function (str, maxLength) {
        if (str && str.length >= maxLength) {
            return str.substring(0, maxLength) + "...";
        }
        else {
            return str;
        }
    },

    baseUrl: function (url) {
        var baseUrl;

        if (isNotEmpty(url)) {
            var pathArray = url.split('/');

            if (pathArray.length >= 2) {
                var protocol = pathArray[0];
                var host = pathArray[2];
                baseUrl = protocol + '://' + host;
            }
        }
        return baseUrl;
    }
};

function isEmpty(str) {
    return !str || str.trim().length == 0;
}

function isNotEmpty(str) {
    return !isEmpty(str);
}

function twoDigits(d) {
    if (String(d).length < 2) {
        d = "0" + d;
    }
    return d;
}

// Localization helper function
function localizeElement(element) {
    // Localize text content
    element.querySelectorAll('[data-i18n]').forEach(function(el) {
        el.textContent = chrome.i18n.getMessage(el.dataset.i18n);
    });
    // Localize placeholders
    element.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
        el.placeholder = chrome.i18n.getMessage(el.dataset.i18nPlaceholder);
    });
}

// Export to YON namespace for better organization
YON.constants = {
    NOT_AVAILABLE: NOT_AVAILABLE,
    ERROR: ERROR,
    ELEMENT_NOT_FOUND: ELEMENT_NOT_FOUND,
    NO_HISTORY: NO_HISTORY,
    HISTORY_MAX: HISTORY_MAX
};
YON.updates = updates;
YON.validation = validation;
YON.chromeAPI = chromeAPI;
YON.utils = c;
YON.isEmpty = isEmpty;
YON.isNotEmpty = isNotEmpty;
YON.localizeElement = localizeElement;

