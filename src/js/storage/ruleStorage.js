var ruleStorage = {

    readRule: function (ruleId, callback) {
        ss.readRule(ruleId, function (syncRule) {
            sl.readRule(ruleId, function (localRule) {
                callback(Object.assign({}, syncRule, localRule));
            });
        });
    },

    saveRule: function (rule, callback) {
        sl.saveRule(rule, function () {
            ss.saveRule(rule, function () {
                storageUtils.updateRuleKeys([rule.id], function () {
                    callback();
                });
            });
        });
    },

    updateRule: function (rule, callback) {
        this.readRule(rule.id, function (exRule) {
            if (!_.isUndefined(exRule)) {
                sl.saveRule(rule, function () {
                    ss.saveRule(rule, function () {
                        callback();
                    });
                });
            }
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
            callback();
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
                            return Object.assign(ruleMemo, rule);
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

//Sync rules between chrome instances when changes occur in sync storage
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace !== "sync") {
        return;
    }

    for (var key in changes) {
        var storageChange = changes[key];

        // Skip ruleKeys - it's an index, not a rule
        if (key === "ruleKeys") {
            continue;
        }

        if (_.isUndefined(storageChange.newValue)) {
            // Rule was deleted on another instance
            console.log("Rule '%s' was deleted", key);

            storageUtils.deleteRuleKey(key, function () {
                sl.deleteRule(key, function () {
                    chromeAPI.runtime.sendMessage({msg: "refreshList"}, function() {
                        if (chrome.runtime.lastError) {
                            // Ignore - popup may not be open
                        }
                    });
                });
            });
        } else if (_.isUndefined(storageChange.oldValue)) {
            // Rule was added on another instance - initialize local storage
            console.log("Rule '%s' was added from sync", key);

            var syncRule = storageChange.newValue;
            sl.readRule(key, function(localRule) {
                if (_.isUndefined(localRule) || _.isEmpty(localRule)) {
                    // Initialize local storage with defaults for new synced rule
                    sl.saveRule({
                        id: syncRule.id,
                        index: Date.now(),
                        value: "",
                        history: [],
                        lastUpdated: null,
                        attempts: 0,
                        new: false,
                        notify: true,
                        notified: false
                    }, function() {
                        chromeAPI.runtime.sendMessage({msg: "refreshList"}, function() {
                            if (chrome.runtime.lastError) {
                                // Ignore - popup may not be open
                            }
                        });
                    });
                }
            });
        } else {
            // Rule was modified on another instance - just refresh UI
            console.log("Rule '%s' was modified from sync", key);

            chromeAPI.runtime.sendMessage({msg: "refreshList"}, function() {
                if (chrome.runtime.lastError) {
                    // Ignore - popup may not be open
                }
            });
        }
    }
});