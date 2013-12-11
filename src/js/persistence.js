var initialState = {page: "popup"};
var initialRules = {rules: []};

var persistence = {

    //State operations

    readState: function (result) {
        storage.get("state", function (data) {
            if (data && data.state) {
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

    //Rules operations

    readRules: function (result) {
        storage.get("rules", function (data) {
            if (data && data.rules) {
                result(data.rules);
            } else {
                storage.set({"rules": initialRules}, function () {
                    result(initialRules);
                });
            }
        });
    },

    findRule: function (ruleId, result) {
        storage.get('rules', function (data) {
            result(_.find(data.rules, function (r) {
                return r.id == ruleId
            }));
        });
    },

    saveRules: function (rules) {
        var callback;
        if (arguments && arguments.length > 1) {
            callback = arguments[1];
        }

        storage.set({"rules": rules}, function () {
            if (callback) {
                callback();
            }
        });
    },

    deleteRule: function (ruleId) {
        var callback;
        if (arguments && arguments.length > 1) {
            callback = arguments[1];
        }

        storage.get("rules", function (data) {
            var rules = _.reject(data.rules, function (r) {
                return r.id == ruleId
            });
            storage.set({'rules': rules}, function () {
                if (callback) {
                    callback();
                }
            });
        });
    }
};