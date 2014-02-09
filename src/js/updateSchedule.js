chromeAPI.alarms.create("CheckRulesSchedule", {periodInMinutes: 1});
chromeAPI.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name == 'CheckRulesSchedule') {
        c.isNetworkAvailable({success: function () {
            performScheduledChecking();
        }});
    }
});

function performScheduledChecking() {

    ruleStorage.readRules(function (rules) {

        if (rules.length == 0) {
            return;
        }

        //Grouping rules by base URI to make pauses between requests to prevent sites from flooding
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
                chromeAPI.runtime.sendMessage({msg: "rulesUpdated", rules: [rule]});
                chromeAPI.runtime.sendMessage({msg: "refreshList"});
            }
        }

        function getUpdateInterval(rule) {
            if (rule.value == NOT_AVAILABLE || !rule.updateFrequency) {
                return updates.UPDATE_INTERVAL;
            }
            return rule.updateFrequency * 60000;
        }
    });
}