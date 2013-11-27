var STATE = 'state';
var EDIT_MODE = 'edit';
var NORMAL_MODE = 'popup';

chrome.runtime.onSuspend.addListener(function () {
    alert("close");
});

$(document).ready(function () {

    restoreState();

    $('#title, #url, #selector').change(function (e) {
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
        setRule(state.data.rule);
        openRuleEditor();
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