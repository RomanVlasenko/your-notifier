var NOTIFICATION_AUTOCLOSE_TIME = 10000;

chromeAPI.browser.setBadgeBackgroundColor({color: "#428bca"});

chromeAPI.runtime.onMessage.addListener(
    function (request) {
        if (request.msg == "rulesUpdated") {
            var updatedRules = request.rules;

            updateBadge();

            showPopupNotifications(_.filter(updatedRules, function (rule) {
                return rule.showNotifications && !rule.notificationShown;
            }));
        } else if (request.msg == "resetUpdates") {
            persistence.readRules(function (rules) {
                _.each(rules, function (r) {
                    r.new = false;
                    chromeAPI.notifications.clear(r.id, function () {
                    });
                });

                persistence.saveRules(rules, function () {
                    showBadge("", "Your notifier");
                });
            });
        }
    });

function updateBadge() {
    persistence.readRules(function (rules) {
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
            iconUrl: common.getFavicon(rule.url)
        };

        chromeAPI.notifications.create(rule.id, opt, function () {
            rule.notificationShown = true;
            persistence.saveRule(rule);

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