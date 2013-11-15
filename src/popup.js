$(document).ready(function () {
    refreshList();

    $('.delete').click(function (e) {
        onDeleteClick(e);
    });

    $('.edit').click(function (e) {
        onEditClick(e);
    });
});

function refreshList() {
    var existingRules = $('#existing_rules').empty();
    chrome.storage.sync.get('rules', function (data) {
        var rules = data.rules;
        $.each(rules, function (index, rule) {
            var control = $(ruleControl(rule));
            control.click(function (e) {
                onDeleteClick(e);
            });
            existingRules.append(control);
        });

    });
}

function ruleControl(rule) {
    return "<div class='rule-control' id='" + rule.id + "'>" +
           rule.title + "=" + rule.value + " [<a href='#' class='edit'>Edit</a>] "
        + "[<a href='#' class='delete'>X</a>]</div>";
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

}