chromeAPI.browser.setBadgeBackgroundColor({color: "#428bca"});

chromeAPI.runtime.onMessage.addListener(
    function (request) {
        if (request.msg == "rulesUpdated") {
            var updatedRules = request.rules;

            if (updatedRules.length == 0) {
                showBadge("", "Your notifier");
            } else {
                showBadge("" + updatedRules.length, updatedRules.length + " items updated");
            }

            showPopupNotifications(_.filter(updatedRules, function (rule) {
                return rule.showNotifications && !rule.notificationShown;
            }));
        }
    });

function showBadge(text, title) {
    chromeAPI.browser.setBadgeText({text: text});
    chromeAPI.browser.setTitle({title: title});
}

function showPopupNotifications(rules) {
    if (rules == 0) {
        return;
    }

    var opt;
    if (rules.length == 1) {
        opt = {
            type: "basic",
            title: rules[0].title,
            message: "Now: " + rules[0].value,
            iconUrl: common.getFavicon(rules[0].url)
        };
    } else {

        var items = [];
        _.each(rules, function (rule) {
            items.push({ title: rule.title, message: "Now: " + rule.value});
        });

        opt = {
            type: "list",
            title: "Hey, look! Something changed...",
            message: rules.length + " values have been changed",
            iconUrl: common.getFavicon(rule.url),
            items: items
        };
    }

    chromeAPI.notifications.create(String(_.uniqueId()), opt, function () {
    });

    _.each(rules, function (rule) {
        rule.notificationShown = true;
        persistence.saveRule(rule);
    });
}
