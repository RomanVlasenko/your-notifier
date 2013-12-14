chromeAPI.menu.removeAll();
chromeAPI.menu.create({id: "openDialog", contexts: ["page", "selection", "link"], title: "Watch this item"});

chromeAPI.menu.onClicked.addListener(function (e) {
    if (e.menuItemId == "openDialog") {

        chromeAPI.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chromeAPI.tabs.sendMessage(tabs[0].id, {method: "createRule"}, function (response) {

            });
        });
    }
});

chromeAPI.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.method == "testRule") {

            common.checkUrl(request.rule, function (val) {
                if (isEmpty(val)) {
                    sendResponse({value: ""});
                } else {
                    sendResponse({value: val});
                }
            });
            return true;
        }
        return false;
    });

chromeAPI.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.method == "saveRule") {

            var newRule = request.rule;
            newRule.id = String(new Date().getTime());

            persistence.readRules(function (rules) {

                newRule.index = rules.length;

                persistence.saveRule(newRule, function () {
                    checkAndUpdate(newRule);
                })
            });
        }
    });