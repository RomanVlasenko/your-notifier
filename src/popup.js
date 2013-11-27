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
    var ruleControlHtml = "<div class='row rule-control'>"
                              + "<div id='title' class='col-xs-8'></div>"
                              + "<div id='value' class='col-xs-1'></div>"
                              + "<div id='buttons' class='col-xs-3'></div>"
        + "</div>";

    var buttonsHtml = "<div class='btn-group'>"
                          + "<button id='edit' type='button' class='btn btn-default'>Edit</button>"
                          + "<button id='delete' type='button' class='btn btn-default'>X</button>"
        + "</div>";

    var buttonsDiv = $(buttonsHtml);
    buttonsDiv.find("#edit").bind("click", function (e) {
        onEditClick(e);
    });

    buttonsDiv.find("#delete").bind("click", function (e) {
        onDeleteClick(e);
    });

    var ruleControlDiv = $(ruleControlHtml);
    ruleControlDiv.attr("id", rule.id);
    ruleControlDiv.find("#title").html(rule.title);
    ruleControlDiv.find("#value").html(rule.value);
    ruleControlDiv.find("#buttons").append(buttonsDiv);

    return ruleControlDiv;
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