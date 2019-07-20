var ss = {
    readRule: function (ruleId, callback) {
        chromeAPI.sync.get(ruleId, function (rule) {
            callback(storageUtils.toSyncRule(rule[ruleId]));
        });
    },

    readRules: function (callback) {
        storageUtils.readRuleKeys(function (ruleKeys) {
            if (ruleKeys.length == 0) {
                callback([]);
            } else {
                chromeAPI.sync.get(ruleKeys, function (rules) {
                    var exRules = storageUtils.rulesJsonToArray(ruleKeys, rules);
                    var syncRules = _.map(exRules, function (exRule) {
                        return storageUtils.toSyncRule(exRule);
                    });

                    callback(syncRules);
                });
            }
        });
    },

    saveRules: function (rules) {
        var callback = arguments.length > 1 ? arguments[1] : c.emptyCallback;

        this.readRules(function (exRules) {
            var newRules = [];
            _.each(rules, function (rule) {
                newRules.push(storageUtils.toSyncRule(rule));
            });

            //Do not store rules if they were not changed
            newRules = _.filter(newRules, function (newRule) {
                var exRule = _.find(exRules, function (exRule) {
                    return exRule.id == newRule.id;
                });

                return !_.isEqual(exRule, newRule);
            });

            if (newRules.length > 0) {
                chromeAPI.sync.set(storageUtils.rulesArrayToJson(newRules), function () {
                    callback();
                });
            } else {
                callback();
            }
        });
    },

    saveRule: function (rule) {
        var callback = arguments.length > 1 ? arguments[1] : c.emptyCallback;

        var newRule = storageUtils.toSyncRule(rule);

        newRule.title = c.shortenStr(newRule.title, validation.TITLE_MAX_LENGTH);

        this.readRule(newRule.id, function (exRule) {
            if (_.isEqual(newRule, exRule)) {
                callback();
            } else {
                var newRuleJson = {};
                newRuleJson[newRule.id] = newRule;
                chromeAPI.sync.set(newRuleJson, function () {
                    callback();
                });
            }
        });
    },

    deleteRule: function (ruleId) {
        var callback = arguments.length > 1 ? arguments[1] : c.emptyCallback;

        chromeAPI.sync.remove(ruleId, function () {
            callback();
        });
    }

};