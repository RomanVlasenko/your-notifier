var storage = chrome.storage.local;
var alarms = chrome.alarms;
var runtime = chrome.runtime;
var tabs = chrome.tabs;
var browser = chrome.browserAction;

//Constants
var NOT_AVAILABLE = "Not available";
var NO_HISTORY = "No history available";

var HISTORY_MAX = 5;

function isEmpty(str) {
    return !str || str.trim().length == 0;
}

//Date/Time formatting
var monthNames = [ "January", "February", "March", "April", "May", "June",
                   "July", "August", "September", "October", "November", "December" ];

function formatDate(d) {
    var day = d.getUTCDay();
    var month = d.getUTCMonth();
    var year = d.getFullYear();

    var h = d.getHours();
    var m = d.getMinutes();

    return h + ":" + twoDigits(m) + " (" + day + " " + monthNames[month - 1].substr(0, 3) + " " + year + ")";
}

function twoDigits(d) {
    if (String(d).length < 2) {
        d = "0" + d;
    }
    return d;
}