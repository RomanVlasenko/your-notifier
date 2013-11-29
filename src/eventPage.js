var alarms = chrome.alarms;
var storage = chrome.storage.sync;

alarms.create("CheckRulesSchedule", {periodInMinutes: 1});

alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name = 'CheckRulesSchedule') {
        performScheduledChecking();
    }
});

function performScheduledChecking() {
    var somethingChanged = false;
    var rulesChecked = [];

    storage.get('rules', function (data) {
        var rules = data.rules;

        _.each(rules, function (rule) {
            $.get(rule.url, function (data) {
                var newVal = $(data).find(rule.selector).text().trim();

                if (newVal && newVal != rule.value) {
                    rule.value = newVal;
                    somethingChanged = true;
                }

                rulesChecked.push(rule);
                if (rulesChecked.length == rules.length && somethingChanged) {
                    sync(rulesChecked);
                }
            });
        });
    });
}

function sync(rules) {
    storage.set({'rules': rules}, function () {
        chrome.runtime.sendMessage({msg: "rulesUpdated"});
    });
}