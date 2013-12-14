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

                var newRules = _.filter(updatedRules, function (r) {
                    return r.new;
                });

                chromeAPI.runtime.sendMessage({msg: "rulesUpdated", rules: newRules});
                chromeAPI.runtime.sendMessage({msg: "refreshList"});
            }
        }
    });
}