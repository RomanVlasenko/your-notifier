var STATE = 'state';
var EDIT_MODE = 'edit';
var NORMAL_MODE = 'popup';

var storage = chrome.storage.local;

$(document).ready(function () {
    restoreState();

    $("#title, #url, #selector").on("input", function () {
        persistStateEdit();
    });

});

function restoreState() {
    browser.setBadgeText({text: ""});

    storage.get(STATE, function (data) {
        var state = data.state;
        if (state) {
            if (state.page == EDIT_MODE) {
                restoreEdit();
            }
        }
    });
}

function restoreEdit() {
    storage.get(STATE, function (data) {
        var state = data.state;
        var rule = state.data.rule;

        //Don't open editor if all fields are empty
        if (!(!rule.title && !rule.url && !rule.selector)) {
            setRule(rule);
            openRuleEditor();
        }
    });
}

//These functions should be executed on popup close event
function persistStatePopup() {
    var state = {
        page: NORMAL_MODE
    };
    storage.set({'state': state});
}

function persistStateEdit() {
    var state = {
        page: EDIT_MODE,
        data: {
            rule: getRule()
        }
    };
    storage.set({'state': state});
}