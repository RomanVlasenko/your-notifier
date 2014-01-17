var NOTIFICATION_AUTOCLOSE_TIME = 10000;

chromeAPI.browser.setBadgeBackgroundColor({color: "#428bca"});

chromeAPI.runtime.onMessage.addListener(
    function (request) {
        if (request.msg == "rulesUpdated") {
            var updatedRules = request.rules;

            updateBadge();

            showPopupNotifications(_.filter(updatedRules, function (rule) {
                return rule.notify && !rule.notified;
            }));
        } else if (request.msg == "resetUpdates") {
            ruleStorage.readRules(function (rules) {
                _.each(rules, function (r) {
                    r.new = false;
                    chromeAPI.notifications.clear(r.id, function () {
                    });
                });

                ruleStorage.saveRules(rules, function () {
                    showBadge("", "Your notifier");
                });
            });
        }
    });

function updateBadge() {
    ruleStorage.readRules(function (rules) {
        var newRulesCount = _.filter(rules,function (rule) {
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
    if (rules == 0) {
        return;
    }

    _.each(rules, function (rule) {
        var opt = {
            type: "basic",
            title: rule.title,
            message: "Now: " + rule.value,
            iconUrl: c.getFavicon(rule.url)
        };

        chromeAPI.notifications.create(rule.id, opt, function () {
            rule.notified = true;
            ruleStorage.updateRule(rule);

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