$(document).ready(function () {

    restoreState();

    $('#title, #url, #selector').change(function (e) {
        persistStateEdit();
    });

});

function restoreState() {
    chrome.storage.sync.get('state', function (data) {
        var state = data.state;
        if (state.page == 'edit') {
            restoreEdit();
        } else if (state.page == 'popup') {
        }
    });
}

function restoreEdit() {
    chrome.storage.sync.get('state', function (data) {
        var state = data.state;
        setRule(state.data.rule);
        $('#edit-rule-div').hidden(false);
    });
}

function persistStatePopup() {
    var state = {
        page: 'popup'
    };
    chrome.storage.sync.set({'state': state});
}

function persistStateEdit() {
    var state = {
        page: 'edit',
        data: {
            rule: getRule()
        }
    };
    chrome.storage.sync.set({'state': state});
}