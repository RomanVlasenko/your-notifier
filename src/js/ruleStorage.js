var ruleStorage = {

    saveRule: function (rule, callback) {
        sl.saveRule(rule, function () {
            ss.saveRule(rule, function () {
                storageUtils.updateRuleKeys([rule.id], function () {
                    callback();
                });
            });
        });
    },

    saveRules: function (rules, callback) {
        var localRules = [];
        var syncRules = [];
        var keys = [];

        _.each(rules, function (rule) {
            localRules.push(rule);
            syncRules.push(rule);
            keys.push(rule.id);
        });

        sl.saveRules(localRules, function () {
            ss.saveRules(syncRules, function () {
                storageUtils.updateRuleKeys(keys, function () {
                    callback();
                });
            });
        });
    },

    deleteRule: function (ruleId, callback) {
        ss.deleteRule(ruleId, function () {
            sl.deleteRule(ruleId, function () {
                storageUtils.deleteRuleKey(ruleId, function () {
                    callback();
                });
            });
        });
    },

    readRule: function (ruleId, callback) {
        ss.readRule(ruleId, function (syncRule) {
            sl.readRule(ruleId, function (localRule) {
                callback($.extend(syncRule, localRule));
            });
        });
    },

    readRules: function (callback) {

        var rules = [];

        ss.readRules(function (syncRules) {
            if (syncRules.length > 0) {
                sl.readRules(function (localRules) {

                    var pairs = _.groupBy(syncRules.concat(localRules), "id");

                    _.each(pairs, function (pair) {
                        var mergedRule = _.reduce(pair, function (ruleMemo, rule) {
                            return $.extend(ruleMemo, rule);
                        }, {});

                        rules.push(mergedRule);
                    });

                    callback(rules);
                });
            } else {
                callback(rules);
            }
        });
    }
};

//Remove rule with the same key from local storage (case when rule was removed on another instance of chrome)
chrome.storage.onChanged.addListener(function (changes, namespace) {
    for (var key in changes) {
        var storageChange = changes[key];

        if (namespace == "sync") {
            if (_.isUndefined(storageChange.newValue)) {
                console.log("Rule '%s' was deleted remotely", key);

                storageUtils.deleteRuleKey(key, function () {
                    sl.deleteRule(key, function () {
                        chromeAPI.runtime.sendMessage({msg: "refreshList"});
                    });
                });
            }
        }
    }
});