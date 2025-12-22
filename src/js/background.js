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
var OFFSCREEN_DOCUMENT_TIMEOUT = 10000; // 10 second timeout for offscreen document creation

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
        return;
    }

    if (offscreenDocumentCreating) {
        // Wait for in-progress creation with timeout
        try {
            await Promise.race([
                offscreenDocumentCreating,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Timeout waiting for offscreen document')), OFFSCREEN_DOCUMENT_TIMEOUT)
                )
            ]);
        } catch (error) {
            console.error('[Background] Error waiting for offscreen document:', error.message);
            offscreenDocumentCreating = null;
            // Try creating again
            return setupOffscreenDocument();
        }
    } else {
        console.log('[Background] Creating offscreen document');
        try {
            offscreenDocumentCreating = chrome.offscreen.createDocument({
                url: 'offscreen.html',
                reasons: ['DOM_PARSER'],
                justification: 'Parse HTML from monitored URLs using CSS selectors'
            });
            await offscreenDocumentCreating;
            console.log('[Background] Offscreen document created');

            // Wait a bit for the offscreen document to fully load
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error('[Background] Error creating offscreen document:', error.message);
            throw error;
        } finally {
            // Always reset the promise, even on error
            offscreenDocumentCreating = null;
        }
    }
}

// Initialize badge
chromeAPI.browser.setBadgeBackgroundColor({color: "#428bca"});

// Context menu setup (from eventPage.js)
chromeAPI.menu.removeAll(function() {
    if (chrome.runtime.lastError) {
        console.error('[Background] Error removing menus:', chrome.runtime.lastError.message);
    }
    console.log('[Background] Creating context menu');
    chromeAPI.menu.create({id: "openDialog", contexts: ["page", "selection", "link"], title: chrome.i18n.getMessage('contextMenuWatchItem')}, function() {
        if (chrome.runtime.lastError) {
            console.error('[Background] Error creating menu:', chrome.runtime.lastError.message);
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
                        // Expected if content script not loaded on this page (e.g., chrome:// URLs)
                        console.warn('[Background] Cannot send to content script:', chrome.runtime.lastError.message);
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
        newRule.lastUpdated = new Date().getTime();

        setupOffscreenDocument()
            .then(function () {
                return ruleStorage.saveRule(newRule);
            })
            .then(function () {
                checkAndUpdate(newRule, function () {
                    chromeAPI.runtime.sendMessage({msg: "rulesUpdated", rules: [newRule]}, function() {
                        if (chrome.runtime.lastError) {
                            // Ignore - popup may not be open
                        }
                    });
                });
            });
    }
    return false;
});

// Phase 4: Test notification handler
chromeAPI.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.method == "testNotification") {
        testNotificationSystem().then(result => {
            sendResponse(result);
        });
        return true; // Keep channel open for async response
    }
    return false;
});

// Check rule immediately handler
chromeAPI.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.method == "checkRuleNow") {
        console.log('[Background] checkRuleNow for rule:', request.ruleId);

        // Send immediate response so popup doesn't hang waiting
        sendResponse({ received: true });

        // Then do the actual work asynchronously
        setupOffscreenDocument()
            .then(function () {
                console.log('[Background] Offscreen doc ready, reading rule:', request.ruleId);
                return ruleStorage.readRule(request.ruleId);
            })
            .then(function (rule) {
                if (!rule) {
                    console.error('[Background] Rule not found:', request.ruleId);
                    return Promise.resolve();
                }

                console.log('[Background] Starting check for rule:', request.ruleId);
                return new Promise(function(resolve) {
                    checkAndUpdate(rule, function (updatedRule) {
                        console.log('[Background] Check completed for rule:', request.ruleId);

                        // Only NOW update lastUpdated timestamp - after check completes
                        updatedRule.lastUpdated = new Date().getTime();
                        console.log('[Background] Updated lastUpdated to:', updatedRule.lastUpdated);

                        ruleStorage.saveRule(updatedRule).then(function () {
                            console.log('[Background] Updated rule saved');

                            // Notify if value changed
                            if (updatedRule.new) {
                                notifications.onRuleUpdated(updatedRule);
                            }

                            resolve();
                        });
                    });
                });
            })
            .catch(function(err) {
                console.error('[Background] Error in checkRuleNow:', err);
            });
        return true; // Keep channel open for async response
    }
    return false;
});

async function testNotificationSystem() {
    console.log('[Background] Testing notification system...');

    const hasPermission = await checkNotificationPermission();
    console.log('[Background] Permission check result:', hasPermission);

    if (!hasPermission) {
        console.warn('[Background] Permission denied - returning error');
        return {
            success: false,
            error: 'Notification permission denied. Check Brave settings at brave://settings/content/notifications'
        };
    }

    try {
        const testId = 'test-notification-' + Date.now();
        console.log('[Background] Creating test notification with ID:', testId);

        await new Promise((resolve, reject) => {
            const iconUrl = chrome.runtime.getURL('img/icon48x48.png');
            console.log('[Background] Using icon URL:', iconUrl);

            chromeAPI.notifications.create(testId, {
                type: "basic",
                title: "Your Notifier - Test",
                message: chrome.i18n.getMessage('notificationTestSuccess'),
                iconUrl: iconUrl,
                priority: 2,
                requireInteraction: false,
                silent: false
            }, function (notificationId) {
                if (chrome.runtime.lastError) {
                    console.error('[Background] Chrome runtime error:', chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    console.log('[Background] Notification created successfully with ID:', notificationId);
                    // Auto-close after 5 seconds
                    setTimeout(() => {
                        console.log('[Background] Auto-closing notification:', testId);
                        chromeAPI.notifications.clear(testId, function() {
                            // Clear callback - no action needed
                        });
                    }, 5000);
                    resolve(notificationId);
                }
            });
        });

        console.log('[Background] Test notification completed successfully');
        return {
            success: true,
            message: chrome.i18n.getMessage('notificationSent'),
            helpLink: true
        };
    } catch (error) {
        console.error('[Background] Test notification failed:', error);
        return { success: false, error: error.message };
    }
}

// Notification handling (from notification.js)
chromeAPI.runtime.onMessage.addListener(function (request) {
    if (request.msg == "resetUpdates") {
        ruleStorage.readRules().then(function (rules) {
            _.each(rules, function (r) {
                r.new = false;
                chromeAPI.notifications.clear(r.id, function() {
                    // Clear callback - no action needed
                });
            });

            ruleStorage.saveRules(rules).then(function () {
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
            showPopupNotifications([rule]).catch(err => {
                console.error('[Background] Notification error:', err);
            });
        }
    }
}

function updateBadge() {
    ruleStorage.readRules().then(function (rules) {
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

// Check notification permission before creating notifications
async function checkNotificationPermission() {
    return new Promise((resolve) => {
        chromeAPI.notifications.getPermissionLevel((level) => {
            console.log('[Background] Notification permission level:', level);
            // level can be: "granted", "denied", or undefined (before user choice)
            resolve(level === 'granted');
        });
    });
}

// Create a single notification (Promise-based for better error handling)
function createNotification(rule) {
    return new Promise((resolve, reject) => {
        console.log('[Background] Creating notification for rule:', rule.id, rule.title);

        const opt = {
            type: "basic",
            title: rule.title,
            message: chrome.i18n.getMessage('notificationNow') + ' ' + rule.value,
            // Phase 2 & 3: Use local icon for reliability, add required properties
            iconUrl: chrome.runtime.getURL('img/icon48x48.png'),
            priority: 2,  // Add priority (0=min, 2=max)
            requireInteraction: false,  // Auto-dismiss allowed
            silent: false  // Allow sound
        };

        chromeAPI.notifications.create(rule.id, opt, function (notificationId) {
            if (chrome.runtime.lastError) {
                console.error('[Background] Error creating notification:', chrome.runtime.lastError.message);
                reject(chrome.runtime.lastError);
                return;
            }

            console.log('[Background] Notification created:', notificationId);
            rule.notified = true;
            ruleStorage.updateRule(rule, c.emptyCallback);

            setTimeout(function () {
                closeNotification(rule.id);
            }, NOTIFICATION_AUTOCLOSE_TIME);

            resolve(notificationId);
        });
    });
}

async function showPopupNotifications(rules) {
    if (!rules || rules.length == 0) {
        return;
    }

    // Phase 1: Check permission first
    const hasPermission = await checkNotificationPermission();
    if (!hasPermission) {
        console.warn('[Background] Notification permission not granted');
        // Store error state for UI to display
        chromeAPI.storage.set({
            notificationError: 'Notification permission denied. Please check Chrome settings.'
        });
        return;
    }

    console.log('[Background] Showing popup notifications for', rules.length, 'rules');

    // Process each rule with async/await for better error handling
    for (const rule of rules) {
        try {
            await createNotification(rule);
        } catch (error) {
            console.error('[Background] Error creating notification for rule:', rule.id, error);
            // Continue processing other notifications even if one fails
        }
    }
}

function closeNotification(notificationId) {
    chromeAPI.notifications.clear(notificationId, function() {
        // Clear callback - no action needed
    });
}

chromeAPI.notifications.onClicked.addListener(function (notificationId) {
    ruleStorage.readRule(notificationId).then(function (rule) {
        chromeAPI.tabs.create({url: rule.url});
        chromeAPI.notifications.clear(notificationId, function () {
            rule.new = false;
            ruleStorage.updateRule(rule).then(function () {
                updateBadge();
            });
        });
    });
});

// Update scheduling (from updateSchedule.js)
// CRITICAL: In Manifest V3, event listeners MUST be registered synchronously at module load time
// Register the alarm listener FIRST, before any async operations
chromeAPI.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name == 'CheckRulesSchedule') {
        console.log('[Background] Alarm fired, checking network');
        c.isNetworkAvailable({
            success: function () {
                // Start the check and log any errors
                // The returned promise will keep the service worker alive during checks
                performScheduledChecking().catch(function(err) {
                    console.error('[Background] Error during scheduled checking:', err);
                });
            },
            error: function () {
                console.log('[Background] Network not available, skipping check');
            }
        });
    }
});

// Then create/check the alarm
chromeAPI.alarms.get("CheckRulesSchedule", function(alarm) {
    if (!alarm) {
        console.log('[Background] Creating CheckRulesSchedule alarm');
        chromeAPI.alarms.create("CheckRulesSchedule", {periodInMinutes: 0.5});
    } else {
        console.log('[Background] CheckRulesSchedule alarm already exists');
    }
});

function performScheduledChecking() {
    // CRITICAL: Must return the promise so alarm listener can wait for completion
    return ruleStorage.readRules().then(function (rules) {
        if (rules.length == 0) {
            return Promise.resolve();
        }

        // Ensure offscreen document is available before checking rules
        return setupOffscreenDocument().then(function () {
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
                                ruleStorage.readRule(rule.id).then(function (r) {
                                    checkAndUpdate(r, function (updatedRule) {
                                        // Update lastUpdated AFTER check completes
                                        updatedRule.lastUpdated = new Date().getTime();
                                        ruleStorage.saveRule(updatedRule).then(function () {
                                            onRuleUpdated(updatedRule);
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
