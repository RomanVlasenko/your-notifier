alarms.create("CheckRulesSchedule", {periodInMinutes: 1});

alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name = 'CheckRulesSchedule') {
        isNetworkAvailable({success: function () {
            performScheduledChecking();
        }});
    }
});

function performScheduledChecking() {
    storage.get('rules', function (data) {
        var rules = data.rules;

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
        browser.setBadgeBackgroundColor({color: "#428bca"});
        browser.setBadgeText({text: String(newValuesCount)});
        browser.setTitle({title: newValuesCount + " items updated"});
        runtime.sendMessage({msg: "refreshList"});
    }
}