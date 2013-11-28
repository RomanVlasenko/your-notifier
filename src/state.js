var STATE = 'state';
var EDIT_MODE = 'edit';
var NORMAL_MODE = 'popup';

$(document).ready(function () {

    restoreState();

    $("#title, #url, #selector").on("input change keydown paste", function (e) {
        persistStateEdit();
    });

});

function restoreState() {
    chrome.storage.sync.get(STATE, function (data) {
        var state = data.state;
        if (state.page == EDIT_MODE) {
            restoreEdit();
        }
    });
}

function restoreEdit() {
    chrome.storage.sync.get(STATE, function (data) {
        var state = data.state;
        var rule = state.data.rule;

        //Don't open editor when all fields are empty
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
    chrome.storage.sync.set({'state': state});
}

function persistStateEdit() {
    var state = {
        page: EDIT_MODE,
        data: {
            rule: getRule()
        }
    };
    chrome.storage.sync.set({'state': state});
}