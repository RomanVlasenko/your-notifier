$(document).ready(function () {
    initExtension();
    refreshRuleControls();
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

function refreshRuleControls() {
    var oldRuleList = $('#existing-rules');
    var refreshedRuleList = oldRuleList.clone().empty();

    chrome.storage.sync.get('rules', function (data) {
        var rules = data.rules;
        if (rules.length > 0) {
            $.each(rules, function (index, rule) {
                var control = createRuleControlDOM(rule);
                refreshedRuleList.append(control);
            });
        } else {
            refreshedRuleList.html("<h5 class='text-center'>You don't have any rules yet.</h5>");
        }

        oldRuleList.replaceWith(refreshedRuleList);
    });
}

function createRuleControlDOM(rule) {
    var ruleControlHtml = "<div class='row rule-control'>"
                              + "<div id='title' class='col-xs-7'></div>"
                              + "<div id='value' class='col-xs-3'></div>"
                              + "<div id='buttons' class='col-xs-2'></div>"
        + "</div>";

    var buttonsHtml = "<div class='btn-group btn-group-sm'>"
                          + "<button id='edit' type='button' class='btn btn-default'><span class='glyphicon glyphicon-pencil'></span></button>"
                          + "<button id='delete' type='button' class='btn btn-default'><span class='glyphicon glyphicon-remove'></span></button>"
        + "</div>";

    var ruleControlDiv = $(ruleControlHtml);
    var buttonsDiv = $(buttonsHtml);

    ruleControlDiv.attr("id", rule.id);
    ruleControlDiv.find("#title").html("<a id='url' href=''#' title='" + rule.title + "'>" + rule.title + "</a>");
    ruleControlDiv.find("#value").html("<span title='" + rule.value + "'>" + rule.value + "</span>");
    ruleControlDiv.find("#buttons").append(buttonsDiv);

    buttonsDiv.find("#edit").bind("click", function (e) {
        onEditClick(e);
    });

    buttonsDiv.find("#delete").bind("click", function (e) {
        onDeleteClick(e);
    });

    buttonsDiv.find("#edit").bind("click", function (e) {
        onEditClick(e);
    });

    ruleControlDiv.find("a#url").bind("click", function (e) {
        chrome.tabs.create({url: rule.url});
    });

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

        refreshRuleControls();
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