var storage = chrome.storage.local;
var alarms = chrome.alarms;
var runtime = chrome.runtime;
var tabs = chrome.tabs;

var NOT_AVAILABLE = "Not available";
var NO_HISTORY = "No history available";

var HISTORY_MAX = 5;