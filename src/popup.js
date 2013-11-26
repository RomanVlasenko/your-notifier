$(document).ready(function () {
    initExtension();
    refreshList();
});

//Initializing storage structure when app starts first time
function initExtension() {
    chrome.storage.sync.get('rules', function (data) {
        var rules = data.rules;
        if (!(rules instanceof Array)) {
            chrome.storage.sync.set({'counter': 0});
            rules = [];

            chrome.storage.sync.set({'rules': rules}, function () {
                chrome.storage.sync.get('counter', function (data) {
                    chrome.storage.sync.set({'counter': data.counter});
                });
            });
        }
    });
}

function refreshList() {
    var existingRules = $('#existing_rules').empty();
    chrome.storage.sync.get('rules', function (data) {
        var rules = data.rules;
        $.each(rules, function (index, rule) {
            var control = createRuleControlDOM(rule);
            existingRules.append(control);
        });

    });
}

function createRuleControlDOM(rule) {
    var ruleControlHtml = "<div class='rule-control' id='" + rule.id + "'>" +
                          rule.title + "=" + rule.value + " [<a href='#' class='edit'>Edit</a>] "
        + "[<a href='#' class='delete'>X</a>]</div>";

    var ruleControlDOM = $(ruleControlHtml);

    ruleControlDOM.find(".edit").bind("click", function (e) {
        onEditClick(e);
    });

    ruleControlDOM.find(".delete").bind("click", function (e) {
        onDeleteClick(e);
    });

    return ruleControlDOM;
}

function onDeleteClick(e) {
    var ruleId = $(e.target).closest('.rule-control').attr('id');

    chrome.storage.sync.get('rules', function (data) {
        var rules = data.rules;
        rules = _.reject(rules, function (r) {
            return r.id == ruleId
        });
        chrome.storage.sync.set({'rules': rules});

        refreshList();
    });
}

function onEditClick(e) {
    var ruleId = $(e.target).closest('.rule-control').attr('id');

    chrome.storage.sync.get('rules', function (data) {
        var rules = data.rules;
        var editableRule = _.find(rules, function (r) {
            return r.id == ruleId
        });

        setRule(editableRule);
        openRuleEditor();
    });
}