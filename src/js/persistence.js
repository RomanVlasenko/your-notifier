var initialState = {page: "popup"};
var initialRules = {rules: []};

var persistence = {

    readState: function (result) {
        storage.get("state", function (data) {
            if (data.state) {
                result(data.state);
            } else {
                storage.set({"state": initialState}, function () {
                    result(initialState);
                });
            }
        });
    },

    saveState: function (state) {
        var callback;
        if (arguments && arguments.length > 1) {
            callback = arguments[1];
        }

        storage.set({"state": state}, function () {
            if (callback) {
                callback();
            }
        });
    },

    loadRules: function (result) {
        storage.get("rules", function (data) {
            if (data.rules) {
                result(data.rules);
            } else {
                storage.set({"rules": initialRules}, function () {
                    result(initialRules);
                });
            }
        });
    }
};