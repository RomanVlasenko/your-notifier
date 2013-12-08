var selector;

$(document).ready(function () {
    $(document).mousedown(function (e) {
        if (e.button == 2) {
            selector = $(e.target).getSelector().join("\n");
            console.log(selector);
        }
    });

});

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.method == "getSelector") {
            sendResponse({selector: selector});
        }
        else {
            sendResponse({});
        }
    });