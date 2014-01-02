var sl = {

    //State operations
    readState: function (callback) {
        chromeAPI.storage.get("state", function (data) {
            if (data && data.state) {
                callback(data.state);
            } else {
                var initialState = {page: "popup"};
                chromeAPI.storage.set({"state": initialState}, function () {
                    callback(initialState);
                });
            }
        });
    },

    saveState: function (state) {
        var callback = arguments.length > 1 ? arguments[1] : c.emptyCallback();

        chromeAPI.storage.set({"state": state}, function () {
            callback();
        });
    },

    //Rules operations

    readRules: function (callback) {
        storageUtils.readRuleKeys(function (ruleKeys) {
            if (ruleKeys.length == 0) {
                callback([]);
            } else {
                chromeAPI.storage.get(ruleKeys, function (rules) {
                    callback(storageUtils.rulesJsonToArray(ruleKeys, rules));
                });
            }
        });
    },

    readRule: function (ruleId, callback) {
        chromeAPI.storage.get(ruleId, function (rule) {
            callback(rule[ruleId]);
        });
    },

    saveRules: function (rules) {
        var callback = arguments.length > 1 ? arguments[1] : c.emptyCallback();

        var newRules = [];
        _.each(rules, function (rule) {
            newRules.push(storageUtils.toLocalRule(rule));
        });

        chromeAPI.storage.set(storageUtils.rulesArrayToJson(rules), function () {
            callback();
        });
    },

    saveRule: function (rule) {
        var callback = arguments.length > 1 ? arguments[1] : c.emptyCallback();

        var newRule = storageUtils.toLocalRule(rule);

        var newRuleJson = {};
        newRuleJson[newRule.id] = newRule;
        chromeAPI.storage.set(newRuleJson, function () {
            callback();
        });
    },

    deleteRule: function (ruleId) {
        var callback = arguments.length > 1 ? arguments[1] : c.emptyCallback();

        chromeAPI.storage.remove(ruleId, function () {
            chromeAPI.storage.remove(ruleId, function () {
                callback();
            });
        });
    }
};