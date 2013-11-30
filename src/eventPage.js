var alarms = chrome.alarms;
var runtime = chrome.runtime;
var storage = chrome.storage.sync;

alarms.create("CheckRulesSchedule", {periodInMinutes: 1});

alarms.onAlarm.addListener(function (alarm) {
    if (alarm.name = 'CheckRulesSchedule') {
        performScheduledChecking(function () {
            runtime.sendMessage({msg: "refreshList"});
        });
    }
});

function performScheduledChecking(callback) {
    var somethingChanged = false;
    var rulesChecked = [];

    storage.get('rules', function (data) {
        var rules = data.rules;

        _.each(rules, function (rule) {

            $.ajax({url: rule.url,
                       success: function (srcHtml) {
                           var newVal = $(srcHtml).find(rule.selector).text().trim();

                           if (newVal && newVal != rule.value) {
                               rule.value = newVal;
                               somethingChanged = true;
                           }

                           rulesChecked.push(rule);
                           if (rulesChecked.length == rules.length && somethingChanged) {
                               storage.set({'rules': rules}, function () {
                                   callback();
                               });
                           }
                       },
                       error: function () {
                           rule.value = NOT_AVAILABLE;
                           rulesChecked.push(rule);
                           if (rulesChecked.length == rules.length && somethingChanged) {
                               callback();
                           }
                       }});
        });
    });
}
