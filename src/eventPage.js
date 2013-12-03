alarms.create("CheckRulesSchedule", {periodInMinutes: 1});

alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name = 'CheckRulesSchedule') {
        performScheduledChecking();

//        chrome.browserAction.setBadgeText({text: "2"});
//        chrome.browserAction.setBadgeBackgroundColor({color: "#428bca"});
    }
});

function performScheduledChecking() {
    storage.get('rules', function (data) {
        var rules = data.rules;
        _.each(rules, function (rule) {
            checkAndUpdate(rule);
        });
    });
}