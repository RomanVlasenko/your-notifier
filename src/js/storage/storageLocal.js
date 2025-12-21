var sl = {

    //State operations
    readState: function () {
        return new Promise(function (resolve) {
            chromeAPI.storage.get("state", function (data) {
                if (data && data.state) {
                    resolve(data.state);
                } else {
                    var initialState = {page: "popup"};
                    chromeAPI.storage.set({"state": initialState}, function () {
                        resolve(initialState);
                    });
                }
            });
        });
    },

    saveState: function (state) {
        return new Promise(function (resolve) {
            chromeAPI.storage.set({"state": state}, function () {
                resolve();
            });
        });
    },

    //Rules operations

    readRules: function () {
        return storageUtils.readRuleKeys().then(function (ruleKeys) {
            if (ruleKeys.length == 0) {
                return [];
            }
            return new Promise(function (resolve) {
                chromeAPI.storage.get(ruleKeys, function (rules) {
                    resolve(storageUtils.rulesJsonToArray(ruleKeys, rules));
                });
            });
        });
    },

    readRule: function (ruleId) {
        return new Promise(function (resolve) {
            chromeAPI.storage.get(ruleId, function (rule) {
                if (_.isUndefined(rule[ruleId])) {
                    var ruleMock = {};
                    ruleMock.id = ruleId;
                    resolve(ruleMock);
                } else {
                    resolve(rule[ruleId]);
                }
            });
        });
    },

    saveRules: function (rules) {
        var newRules = [];
        _.each(rules, function (rule) {
            newRules.push(storageUtils.toLocalRule(rule));
        });

        return new Promise(function (resolve) {
            chromeAPI.storage.set(storageUtils.rulesArrayToJson(rules), function () {
                resolve();
            });
        });
    },

    saveRule: function (rule) {
        var newRule = storageUtils.toLocalRule(rule);
        newRule.value = c.shortenStr(newRule.value, validation.VALUE_MAX_LENGTH);

        var newRuleJson = {};
        newRuleJson[newRule.id] = newRule;

        return new Promise(function (resolve) {
            chromeAPI.storage.set(newRuleJson, function () {
                resolve();
            });
        });
    },

    deleteRule: function (ruleId) {
        return new Promise(function (resolve) {
            chromeAPI.storage.remove(ruleId, function () {
                resolve();
            });
        });
    }
};

// Export to YON namespace
YON.storageLocal = sl;
