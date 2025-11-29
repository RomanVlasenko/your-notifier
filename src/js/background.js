// Background service worker for Manifest V3
// Merges functionality from eventPage.js, notification.js, and updateSchedule.js

// Import external libraries using importScripts (non-module service workers)
// Note: Since manifest specifies "type": "module", we can use import statements
// However, for compatibility with existing scripts, we'll use dynamic imports

// Load dependencies
importScripts(
    '../lib/underscore-min.js',
    'common.js',
    'urlChecker.js',
    'storage/storageLocal.js',
    'storage/storageSync.js',
    'storage/ruleStorage.js',
    'storage/storageUtils.js'
);

var NOTIFICATION_AUTOCLOSE_TIME = 10000;

// Offscreen document management
let offscreenDocumentCreating = null;

async function hasOffscreenDocument() {
    if ('getContexts' in chrome.runtime) {
        const contexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT'],
            documentUrls: [chrome.runtime.getURL('offscreen.html')]
        });
        return contexts.length > 0;
    }
    return false;
}

async function setupOffscreenDocument() {
    if (await hasOffscreenDocument()) {
        console.log('[Background] Offscreen document already exists');
        return;
    }

    if (offscreenDocumentCreating) {
        console.log('[Background] Waiting for offscreen document creation to complete');
        await offscreenDocumentCreating;
    } else {
        console.log('[Background] Creating offscreen document');
        offscreenDocumentCreating = chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['DOM_PARSER'],
            justification: 'Parse HTML from monitored URLs using CSS selectors'
        });
        await offscreenDocumentCreating;
        offscreenDocumentCreating = null;
        console.log('[Background] Offscreen document created');

        // Wait a bit for the offscreen document to fully load
        await new Promise(resolve => setTimeout(resolve, 100));
        console.log('[Background] Offscreen document should be ready now');
    }
}

// Initialize badge
chromeAPI.browser.setBadgeBackgroundColor({color: "#428bca"});

// Context menu setup (from eventPage.js)
chromeAPI.menu.removeAll(function() {
    if (chrome.runtime.lastError) {
        console.log('[Background] Error removing menus:', chrome.runtime.lastError.message);
    }
    console.log('[Background] Creating context menu');
    chromeAPI.menu.create({id: "openDialog", contexts: ["page", "selection", "link"], title: "Watch this item"}, function() {
        if (chrome.runtime.lastError) {
            console.log('[Background] Error creating menu:', chrome.runtime.lastError.message);
        } else {
            console.log('[Background] Context menu created successfully');
        }
    });
});

chromeAPI.menu.onClicked.addListener(function (e) {
    if (e.menuItemId == "openDialog") {
        chromeAPI.tabs.query({active: true, currentWindow: true}, function (tabs) {
            if (tabs && tabs.length > 0) {
                chromeAPI.tabs.sendMessage(tabs[0].id, {method: "createRule"}, function (response) {
                    if (chrome.runtime.lastError) {
                        console.log('[Background] Error sending to content script:', chrome.runtime.lastError.message);
                    }
                });
            }
        });
    }
});

// Message listeners (from eventPage.js)
chromeAPI.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.method == "testRule") {
        setupOffscreenDocument().then(function () {
            c.checkUrl(request.rule, function (val) {
                if (isEmpty(val)) {
                    sendResponse({value: ""});
                } else {
                    sendResponse({value: val});
                }
            });
        });
        return true;
    }
    return false;
});

chromeAPI.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.method == "saveRule") {
        var newRule = request.rule;
        newRule.id = String(new Date().getTime());
        newRule.index = -1;
        newRule.notify = true;

        setupOffscreenDocument().then(function () {
            ruleStorage.saveRule(newRule, function () {
                checkAndUpdate(newRule, function () {
                    chromeAPI.runtime.sendMessage({msg: "rulesUpdated", rules: [newRule]}, function() {
                        if (chrome.runtime.lastError) {
                            // Ignore - popup may not be open
                        }
                    });
                });
            });
        });
    }
    return false;
});

// Notification handling (from notification.js)
chromeAPI.runtime.onMessage.addListener(function (request) {
    if (request.msg == "resetUpdates") {
        ruleStorage.readRules(function (rules) {
            _.each(rules, function (r) {
                r.new = false;
                chromeAPI.notifications.clear(r.id, function () {});
            });

            ruleStorage.saveRules(rules, function () {
                showBadge("", "Your notifier");
            });
        });
    }
    return false;
});

var notifications = {
    onRuleUpdated: function onRuleUpdated(rule) {
        updateBadge();

        if (rule.notify && !rule.notified) {
            showPopupNotifications([rule]);
        }
    }
}

function updateBadge() {
    ruleStorage.readRules(function (rules) {
        var newRulesCount = _.filter(rules, function (rule) {
            return rule.new;
        }).length;

        if (newRulesCount == 0) {
            showBadge("", "Your notifier");
        } else {
            showBadge("" + newRulesCount, newRulesCount + " items updated");
        }
    });
}

function showBadge(text, title) {
    chromeAPI.browser.setBadgeText({text: text});
    chromeAPI.browser.setTitle({title: title});
}

function showPopupNotifications(rules) {
    if (!rules || rules.length == 0) {
        return;
    }

    console.log('[Background] Showing popup notifications for', rules.length, 'rules');

    _.each(rules, function (rule) {
        console.log('[Background] Creating notification for rule:', rule.id, rule.title);

        var opt = {
            type: "basic",
            title: rule.title,
            message: "Now: " + rule.value,
            iconUrl: rule.url ? c.getFavicon(rule.url) : chrome.runtime.getURL('img/icon48.png')
        };

        chromeAPI.notifications.create(rule.id, opt, function (notificationId) {
            if (chrome.runtime.lastError) {
                console.error('[Background] Error creating notification:', chrome.runtime.lastError.message);
                return;
            }

            console.log('[Background] Notification created:', notificationId);
            rule.notified = true;
            ruleStorage.updateRule(rule, c.emptyCallback);

            setTimeout(function () {
                closeNotification(rule.id);
            }, NOTIFICATION_AUTOCLOSE_TIME);
        });
    });
}

function closeNotification(notificationId) {
    chromeAPI.notifications.clear(notificationId, function () {
    });
}

chromeAPI.notifications.onClicked.addListener(function (notificationId) {
    ruleStorage.readRule(notificationId, function (rule) {
        chromeAPI.tabs.create({url: rule.url});
        chromeAPI.notifications.clear(notificationId, function () {
            rule.new = false;
            ruleStorage.updateRule(rule, function () {
                updateBadge();
            });
        });
    });
});

// Update scheduling (from updateSchedule.js)
// Check if alarm already exists before creating
chromeAPI.alarms.get("CheckRulesSchedule", function(alarm) {
    if (!alarm) {
        console.log('[Background] Creating CheckRulesSchedule alarm');
        chromeAPI.alarms.create("CheckRulesSchedule", {periodInMinutes: 1});
    } else {
        console.log('[Background] CheckRulesSchedule alarm already exists');
    }
});

chromeAPI.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name == 'CheckRulesSchedule') {
        console.log('[Background] Alarm fired, checking network');
        c.isNetworkAvailable({
            success: function () {
                performScheduledChecking();
            },
            error: function () {
                console.log('[Background] Network not available, skipping check');
            }
        });
    }
});

function performScheduledChecking() {
    ruleStorage.readRules(function (rules) {
        if (rules.length == 0) {
            return;
        }

        // Ensure offscreen document is available before checking rules
        setupOffscreenDocument().then(function () {
            // Grouping rules by base URI to make pauses between requests to prevent sites from flooding
            var ruleSets = _.groupBy(rules, function (rule) {
                return c.baseUrl(rule.url);
            });

            console.log("Perform scheduled checking on %s rules in %s sets", rules.length, _.size(ruleSets));

            _.each(ruleSets, function (ruleSet) {
                for (var i = 0; i < ruleSet.length; i = i + 1) {
                    setTimeout((function (rule) {
                        return function () {
                            rule.lastUpdated = rule.lastUpdated ? rule.lastUpdated : 0;

                            console.log("Rule '%s' was updated %s ms ago", rule.id, new Date().getTime() - rule.lastUpdated)

                            if (rule.lastUpdated < new Date().getTime() - getUpdateInterval(rule)) {
                                ruleStorage.readRule(rule.id, function (r) {
                                    r.lastUpdated = new Date().getTime();
                                    ruleStorage.saveRule(r, function () {
                                        checkAndUpdate(r, function (rule) {
                                            onRuleUpdated(rule);
                                        });
                                    });
                                });
                            } else {
                                console.log("Rule '%s' is up to date", rule.id);
                            }
                        };
                    })(ruleSet[i]), i * updates.REQUEST_PER_URL_INTERVAL);
                }
            });

            function onRuleUpdated(rule) {
                console.log("Rule '%s' updated in %s ms", rule.id, new Date().getTime() - rule.lastUpdated);

                if (rule.new) {
                    notifications.onRuleUpdated(rule);

                    chromeAPI.runtime.sendMessage({msg: "rulesUpdated", rules: [rule]}, function() {
                        if (chrome.runtime.lastError) {
                            // Ignore - popup may not be open
                        }
                    });
                    chromeAPI.runtime.sendMessage({msg: "refreshList"}, function() {
                        if (chrome.runtime.lastError) {
                            // Ignore - popup may not be open
                        }
                    });
                }
            }

            function getUpdateInterval(rule) {
                if (rule.value == NOT_AVAILABLE || !rule.updateFrequency) {
                    return updates.UPDATE_INTERVAL;
                }
                return rule.updateFrequency * 60000;
            }
        });
    });
}

// Service worker install/activate events
self.addEventListener('install', function (event) {
    console.log('Service worker installing...');
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', function (event) {
    console.log('Service worker activating...');
    event.waitUntil(
        clients.claim()
            .then(() => {
                console.log('Clients claimed successfully');
            })
            .catch((error) => {
                console.error('Activation error:', error);
            })
    );
});
