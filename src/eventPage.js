chrome.alarms.create("CheckRulesSchedule", {periodInMinutes: 1});

chrome.alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name = 'CheckRulesSchedule') {
        chrome.runtime.sendMessage({msg: "timeToCheck"}, function (response) {
        });
    }
});