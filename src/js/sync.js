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
                            rule[key] = {deleted: true};
                            rules.push(rule);
                        }
                    });

                    callbackHandler(rules);
                });
            });
        },

        findRule: function (ruleId, callbackHandler) {
            chromeAPI.sync.get(ruleId, function (data) {
                callbackHandler(data[ruleId]);
            });
        },

        saveRules: function (rules) {
            var rulesJSON = {};
            var ruleKeys = [];
            _.each(rules, function (rule) {
                if (rule.deleted) {
                    existsInRemoteStorage(function (existsInRemoteStorage) {
                        if (existsInRemoteStorage) {
                            chromeAPI.sync.remove(rule.id);
                        }
                    });
                } else {
                    var ruleJSON = {};
                    ruleJSON[rule.id] = rule;
                    $.extend(rulesJSON, ruleJSON);

                    ruleKeys.push(rule.id);
                }
            });

            chromeAPI.sync.set(rulesJSON, function () {
                saveRuleKeys(ruleKeys);
            });
        }
    };

    sync.init(function () {
        chromeAPI.alarms.create("syncSchedule", {periodInMinutes: SYNC_RULES_PERIOD});
        chromeAPI.alarms.onAlarm.addListener(function (alarm) {
            if (alarm.name == 'syncSchedule') {

                sync.readRules(function (remoteRules) {
                    persistence.readRules(function (localRules) {
                        synchronizeRules(localRules, remoteRules);
                    });
                });
            }
        });
    });

    function synchronizeRules(localRules, remoteRules) {
        //New rules came from storage.sync
        var newRemoteRules = getRulesDiff(remoteRules, localRules);
        console.log({"newRemoteRules": newRemoteRules});

        //New rules in storage.local
        var newLocalRules = getRulesDiff(localRules, remoteRules);
        console.log({"newLocalRules": newLocalRules});

        persistence.saveRules(newRemoteRules);
        sync.saveRules(newLocalRules);
    }

    function getRulesDiff(array, diffArray) {
        //Return rules from array which:
        // - do not exist in diffArray
        // - whose version is higher than version from diffArray
        // - who was deleted
        return _.filter(array, function (r) {
            var rCmp = _.find(diffArray, function (rCmp) {
                return rCmp.id == r.id;
            });

            return !rCmp || rCmp.deleted || rCmp.ver < r.ver;
        });
    }

    function saveRuleKeys(ruleKeys) {
        chromeAPI.sync.get("ruleKeys", function (data) {
            var exRuleKeys = data.ruleKeys;
            exRuleKeys = exRuleKeys.concat(ruleKeys);
            exRuleKeys = _.uniq(exRuleKeys);

            chromeAPI.sync.set({"ruleKeys": exRuleKeys});
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
}
