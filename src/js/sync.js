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
                            var rule = {};
                            rule[key] = {id: key, deleted: true};
                            rules.push(rule);
                        }
                    });

                    if (!rules) {
                        rules = {};
                    }

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
                        existsInRemoteStorage(function (existsInRemoteStorage) {
                            if (existsInRemoteStorage) {
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
            console.log({"newRulesFromLocal": newRulesFromLocal});

            var newRulesFromSync = getRulesDiff(localRules, mergedRules);
            console.log({"newRulesFromSync": newRulesFromSync});

            sync.saveRules(newRulesFromLocal);
            persistence.saveRules(newRulesFromSync);
        }
    }

    function getRulesDiff(array, fullArray) {
        //Return rules that need to be synched diffArray -> array
        return _.filter(fullArray, function (newRule) {
            var exRule = _.find(array, function (exRule) {
                return newRule.id == exRule.id;
            });

            console.log("!exRule " + Boolean(!exRule));
            console.log("newRule.deleted && !exRule.deleted " + Boolean(newRule.deleted && !exRule.deleted));
            console.log("newRule.ver > exRule.ver " + Boolean(newRule.ver && exRule.ver && newRule.ver > exRule.ver));

            return !exRule || newRule.deleted && !exRule.deleted ||
                   newRule.ver && exRule.ver && newRule.ver > exRule.ver;
        });
    }

    function readRuleKeys(callbackHandler) {
        chromeAPI.sync.get("ruleKeys", function (data) {
            var ruleKeys = data.ruleKeys;
            callbackHandler(ruleKeys);
        });
    }

    function existsInRemoteStorage(ruleId, callbackHandler) {
        readRuleKeys(function (keys) {
            var keyExists = _.any(keys, function (k) {
                return k == ruleId;
            });

            if (keyExists) {
                sync.findRule(ruleId, function (rule) {
                    callbackHandler(!_.isUndefined(rule));
                });
            } else {
                callbackHandler(false);
            }
        });
    }

    function merge(exRules, newRules) {
        var allRules = _.groupBy(exRules.concat(newRules), "id");

        return _.reduce(allRules, function (ruleMemo, rule) {

            var ruleToSave;

            if (ruleMemo.deleted || rule.deleted) {
                ruleToSave = ruleMemo.deleted ? ruleMemo : rule;
            } else {
                ruleToSave = ruleMemo.ver > rule.ver ? ruleMemo : rule;
            }

            return ruleToSave;
        }, {ver: -1});
    }

//    function merge(exRules, newRules) {
//        return _.map(_.groupBy(exRules.concat(newRules), "id"), function (rulesToMerge, id) {
//            return _.reduce(rulesToMerge, function (ruleMemo, rule) {
//
//                var ruleToSave;
//
//                if (ruleMemo.deleted || rule.deleted) {
//                    ruleToSave = ruleMemo.deleted ? ruleMemo : rule;
//                } else {
//                    ruleToSave = ruleMemo.ver > rule.ver ? ruleMemo : rule;
//                }
//
//                return ruleToSave;
//            }, {ver: -1});
//        });
//    }
}
