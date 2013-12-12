menu.removeAll();
menu.create({id: "createItem", contexts: ["page", "selection", "link"], title: "Watch this item"});

menu.onClicked.addListener(function (e) {
    if (e.menuItemId == "createItem") {

        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {method: "createRule"}, function (response) {

            });
        });
    }
});

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.method == "saveRule") {

            storage.get("rules", function (data) {
                var rules = data.rules;
                var newRule = request.rule;

                newRule.id = String(new Date().getTime());
                newRule.index = rules.length;

                rules.push(newRule);

                storage.set({"rules": rules}, function () {
                    checkAndUpdate(newRule, function () {

                    });
                    sendResponse({});
                });
            });
        }
    });