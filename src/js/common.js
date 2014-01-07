//Constants
var NOT_AVAILABLE = "Not available";
var NO_HISTORY = "No history available";

var HISTORY_MAX = 5;

var updates = {
    UPDATE_INTERVAL: 60000,
    REQUEST_PER_URL_INTERVAL: 10000
};

var monthNames = [ "January", "February", "March", "April", "May", "June",
                   "July", "August", "September", "October", "November", "December" ];

var validation = {
    TITLE_MAX_LENGTH: 100,
    VALUE_MAX_LENGTH: 35,
    URL_MAX_LENGTH: 300,
    SELECTOR_MAX_LENGTH: 500
};

var chromeAPI = {
    sync: chrome.storage.sync,
    storage: chrome.storage.local,
    alarms: chrome.alarms,
    runtime: chrome.runtime,
    tabs: chrome.tabs,
    browser: chrome.browserAction,
    notifications: chrome.notifications,
    menu: chrome.contextMenus,
    extension: chrome.extension,
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

        $.ajax({url: "http://google.com",
                   success: function () {
                       callbackHandler.success();
                   },
                   error: function () {
                       callbackHandler.error();
                   }});
    },

    checkUrl: function (rule, callbackHandler) {
        $.ajax({url: rule.url,
                   success: function (srcHtml) {
                       var foundData = $(srcHtml).find(rule.selector);
                       if (foundData.length != 0) {
                           var newVal = foundData.first().text().trim();
                           callbackHandler(newVal);
                       } else {
                           callbackHandler("");
                       }

                   },
                   error: function () {
                       callbackHandler("");
                   }});
    },

    getFavicon: function (url) {
        return url.replace(/^((http|https):\/\/[^\/]+).*$/, '$1') + '/favicon.ico';
    },

    formatDate: function (d) {
        var day = d.getUTCDate();
        var month = d.getUTCMonth() + 1;
        var year = d.getFullYear();

        var h = d.getHours();
        var m = d.getMinutes();

        return h + ":" + twoDigits(m) + " (" + day + " " + monthNames[month - 1].substr(0, 3) + " " + year + ")";
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

