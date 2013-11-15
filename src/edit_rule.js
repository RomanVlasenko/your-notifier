$(document).ready(function () {

    $('#create').click(function () {
        var editRuleDiv = $('#edit-rule-div');
        if (editRuleDiv.is(':hidden')) {
            editRuleDiv.slideDown('slow');
            $('#create').text("Close");
            persistStateEdit();
        } else {
            editRuleDiv.hide();
            $('#create').text("Create rule");
            persistStatePopup();
        }
    });

    $('#save').click(function () {
        saveRule();
        $('#edit-rule-div').hide();
        $('#create').text("Create rule");

        $('#title').val('');
        $('#url').val('');
        $('#selector').val('');
    });
});

function saveRule() {
    var rule = getRule();

    chrome.storage.sync.get('counter', function (data) {
        rule.id = data.counter;
    });

    chrome.storage.sync.get('rules', function (data) {
        var rules = data.rules;
        if (rules instanceof Array) {
            rules.push(rule);
        } else {
            chrome.storage.sync.set({'counter': 0});
            rules = [];
        }

        //Save rules and increment counter
        chrome.storage.sync.set({'rules': rules}, function () {
            chrome.storage.sync.get('counter', function (data) {
                chrome.storage.sync.set({'counter': data.counter + 1});
            });
            refreshList();
        });
    });
}

function getRule() {
    var rule = {
        title: $('#title').val(),
        url: $('#url').val(),
        selector: $('#selector').val()
    };
    return rule;
}

function setRule(rule) {
    $('#title').val(rule.title);
    $('#url').val(rule.url);
    $('#selector').val(rule.selector);
}
