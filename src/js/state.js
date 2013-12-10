var EDIT_MODE = 'edit';
var NORMAL_MODE = 'popup';

$(document).ready(function () {
    $("#title, #url, #selector").on("input", function () {
        persistStateEdit();
    });

});

function restoreEdit() {
    persistence.readState(function (state) {
        var rule = state.rule;

        //Don't open editor if all fields are empty
        if (!(!rule.title && !rule.url && !rule.selector)) {
            setRule(rule);
            openRuleEditor();
        }
    });
}

function persistStatePopup() {
    persistence.saveState({page: NORMAL_MODE});
}

function persistStateEdit() {
    persistence.saveState({page: EDIT_MODE, rule: getRule()});
}