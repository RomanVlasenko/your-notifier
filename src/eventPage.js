var alarms = chrome.alarms;
var runtime = chrome.runtime;
var storage = chrome.storage.local;

var NOT_AVAILABLE = "Not available";

alarms.create("CheckRulesSchedule", {periodInMinutes: 1});

alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name = 'CheckRulesSchedule') {
        performScheduledChecking(function () {
//            runtime.sendMessage({msg: "refreshList"});
        });
    }
});

function performScheduledChecking(onCheckComplete) {
    var somethingChanged = false;
    var rulesChecked = [];

    storage.get('rules', function (data) {
        var rules = data.rules;

        _.each(rules, function (rule) {

            $.ajax({url: rule.url,
                       success: function (srcHtml) {
                           var newVal;

                           var foundData = $(srcHtml).find(rule.selector)
                           if (foundData) {
                               newVal = foundData.text().trim();
                           }

                           if (newVal && newVal != rule.value) {
                               rule.value = newVal;

                               if (!rule.history) {
                                   rule.history = [];
                               }
                               rule.history.unshift({"value": rule.value, "date": new Date().getTime()});

                               somethingChanged = true;
                           }

                           rulesChecked.push(rule);
                           if (rulesChecked.length == rules.length && somethingChanged) {
                               storage.set({'rules': rules}, function () {
                                   onCheckComplete();
                               });
                           }
                       },
                       error: function () {
                           rule.value = NOT_AVAILABLE;
                           rulesChecked.push(rule);
                           if (rulesChecked.length == rules.length && somethingChanged) {
                               onCheckComplete();
                           }
                       }});
        });
    });
}
