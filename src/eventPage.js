var alarms = chrome.alarms;
var runtime = chrome.runtime;

alarms.create("CheckRulesSchedule", {periodInMinutes: 1});

alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name = 'CheckRulesSchedule') {
        runtime.sendMessage({msg: "timeToCheck"});
    }
});