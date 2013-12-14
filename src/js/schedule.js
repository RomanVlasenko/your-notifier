chromeAPI.alarms.create("CheckRulesSchedule", {periodInMinutes: 1});
chromeAPI.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name = 'CheckRulesSchedule') {
        common.isNetworkAvailable({success: function () {
            performScheduledChecking();
        }});
    }
});

function performScheduledChecking() {
    persistence.readRules(function (rules) {
        _.each(rules, function (rule) {
            checkAndUpdate(rule, onRuleUpdated);
        });

        var updatedRules = [];

        function onRuleUpdated(rule) {

            updatedRules.push(rule);

            if (updatedRules.length == rules.length) {
                showPopupBadge(updatedRules);
            }
        }
    });
}

function showPopupBadge(rules) {
    var newValuesCount = 0;

    _.each(rules, function (r) {
        if (r.new == true) {
            newValuesCount = newValuesCount + 1;
        }
    });

    if (newValuesCount > 0) {
        chromeAPI.browser.setBadgeBackgroundColor({color: "#428bca"});
        chromeAPI.browser.setBadgeText({text: String(newValuesCount)});
        chromeAPI.browser.setTitle({title: newValuesCount + " items updated"});
        chromeAPI.runtime.sendMessage({msg: "refreshList"});
    }
}