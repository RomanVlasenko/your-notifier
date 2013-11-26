chrome.alarms.create("CheckRulesSchedule", {periodInMinutes: 1});

chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name = 'CheckRulesSchedule') {
        chrome.storage.sync.get('rules', function (data) {
            var rules = data.rules;

            $.each(rules, function (index, rule) {
                check(rule);
            });

        });
    }
});