var SYNC_RULES_PERIOD = 1; //Period of synchronization in minutes

var sync;
{
    sync = {
        init: function (callbackHandler) {
            chromeAPI.sync.get("ruleKeys", function (data) {
                if (!data || !data.ruleKeys) {
                    chromeAPI.sync.set({"ruleKeys": []}, function () {
                        callbackHandler();
                    });
                }
                callbackHandler();
            });
        },

        readRules: function (callbackHandler) {

            readRuleKeys(function (ruleKeys) {

                chromeAPI.sync.get(ruleKeys, function (rules) {
                    _.each(ruleKeys, function (key) {
                        var deleted = !_.any(rules, function (r) {
                            return r.id == key;
                        });

                        //Adding fake rule with state 'deleted' to keep common approach
                        if (deleted) {
                            var ruleObj = {};
                            ruleObj[key] = {id: key, deleted: true};
                            $.extend(rules, ruleObj);
                        }
                    });

                    //Converting rules collection JSON -> array
                    var rulesArr = [];
                    _.each(ruleKeys, function (key) {
                        rulesArr.push(rules[key]);
                    });
                    callbackHandler(rulesArr);
                });
            });
        },

        findRule: function (ruleId, callbackHandler) {
            chromeAPI.sync.get(ruleId, function (data) {
                callbackHandler(data[ruleId]);
            });
        },

        saveRules: function (rules) {
            var rulesCollection = {};

            readRuleKeys(function (ruleKeys) {
                _.each(rules, function (rule) {
                    if (rule.deleted) {
                        existsInSyncStorage(rule.id, function (exists) {
                            if (exists) {
                                chromeAPI.sync.remove(rule.id);
                            }
                        });
                    } else {
                        var ruleObj = {};
                        ruleObj[rule.id] = rule;
                        $.extend(rulesCollection, ruleObj);

                        ruleKeys.push(rule.id);
                    }
                });

                chromeAPI.sync.set(rulesCollection, function () {
                    chromeAPI.sync.set({"ruleKeys": _.uniq(ruleKeys)});
                });
            });
        }
    };

    sync.init(function () {
        chromeAPI.alarms.create("syncSchedule", {periodInMinutes: SYNC_RULES_PERIOD});
        chromeAPI.alarms.onAlarm.addListener(function (alarm) {
            if (alarm.name == 'syncSchedule') {

                sync.readRules(function (remoteRules) {
                    persistence.readRulesAll(function (localRules) {
                        synchronizeRules(localRules, remoteRules);
                    });
                });
            }
        });
    });

    function synchronizeRules(localRules, remoteRules) {

        var mergedRules = merge(localRules, remoteRules);

        if (mergedRules.length > 0) {
            var newRulesFromLocal = getRulesDiff(remoteRules, mergedRules);
            var newRulesFromSync = getRulesDiff(localRules, mergedRules);

            sync.saveRules(newRulesFromLocal);
            persistence.saveRules(newRulesFromSync);

        }
    }

    function getRulesDiff(array, fullArray) {
        //Return rules that need to be synched (diffArray -> array)
        return _.filter(fullArray, function (newRule) {
            var exRule = _.find(array, function (exRule) {
                return newRule.id == exRule.id;
            });

            return !exRule && !newRule.deleted || newRule.deleted && !exRule.deleted ||
                   newRule.ver > exRule.ver;
        });
    }

    function readRuleKeys(callbackHandler) {
        chromeAPI.sync.get("ruleKeys", function (data) {
            var ruleKeys = data.ruleKeys;
            callbackHandler(ruleKeys);
        });
    }

    function existsInSyncStorage(ruleId, callbackHandler) {
        readRuleKeys(function (keys) {
            var keyExists = _.any(keys, function (k) {
                return k == ruleId;
            });

            if (keyExists) {
                sync.findRule(ruleId, function (rule) {
                    callbackHandler(!(_.isUndefined(rule)));
                });
            } else {
                callbackHandler(false);
            }
        });
    }

    function merge(exRules, newRules) {
        var mergedRules = [];

        var rulePairs = _.groupBy(exRules.concat(newRules), "id");

        _.each(rulePairs, function (pair) {
            var singleRule = _.reduce(pair, function (ruleMemo, rule) {

                var ruleToSave;

                if (ruleMemo.deleted || rule.deleted) {
                    ruleToSave = ruleMemo.deleted ? ruleMemo : rule;
                } else {
                    ruleToSave = ruleMemo.ver > rule.ver ? ruleMemo : rule;
                }

                return ruleToSave;
            }, {ver: -1});

            mergedRules.push(singleRule);
        });

        return mergedRules;
    }
}
