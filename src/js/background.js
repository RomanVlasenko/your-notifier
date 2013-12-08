menu.removeAll();
menu.create({id: "createItem", title: "Create item"});

menu.onClicked.addListener(function (e) {
    if (e.menuItemId == "createItem") {

        chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {method: "getSelector"}, function (data) {
                var url = tabs[0].url;
                var selector = data.selector;



                console.log(url + "\n" + selector);
            });
        });
    }
});