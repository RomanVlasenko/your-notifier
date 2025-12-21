var SYNC_QUOTA_BYTES = 102400; // 100KB sync storage limit
var SYNC_QUOTA_WARNING_THRESHOLD = 0.8; // Warn at 80% usage

var ss = {
    // Check storage quota and return usage info
    checkQuota: function () {
        return new Promise(function (resolve) {
            chromeAPI.sync.getBytesInUse(null, function (bytesInUse) {
                var usage = {
                    bytesInUse: bytesInUse,
                    quotaBytes: SYNC_QUOTA_BYTES,
                    percentUsed: (bytesInUse / SYNC_QUOTA_BYTES) * 100,
                    isNearLimit: bytesInUse > SYNC_QUOTA_BYTES * SYNC_QUOTA_WARNING_THRESHOLD
                };
                resolve(usage);
            });
        });
    },

    readRule: function (ruleId) {
        return new Promise(function (resolve) {
            chromeAPI.sync.get(ruleId, function (rule) {
                resolve(storageUtils.toSyncRule(rule[ruleId]));
            });
        });
    },

    readRules: function () {
        return storageUtils.readRuleKeys().then(function (ruleKeys) {
            if (ruleKeys.length == 0) {
                return [];
            }
            return new Promise(function (resolve) {
                chromeAPI.sync.get(ruleKeys, function (rules) {
                    var exRules = storageUtils.rulesJsonToArray(ruleKeys, rules);
                    var syncRules = _.map(exRules, function (exRule) {
                        return storageUtils.toSyncRule(exRule);
                    });
                    resolve(syncRules);
                });
            });
        });
    },

    saveRules: function (rules) {
        var self = this;
        return this.readRules().then(function (exRules) {
            var newRules = [];
            _.each(rules, function (rule) {
                newRules.push(storageUtils.toSyncRule(rule));
            });

            // Do not store rules if they were not changed
            newRules = _.filter(newRules, function (newRule) {
                var exRule = _.find(exRules, function (exRule) {
                    return exRule.id == newRule.id;
                });
                return !_.isEqual(exRule, newRule);
            });

            if (newRules.length > 0) {
                return new Promise(function (resolve) {
                    chromeAPI.sync.set(storageUtils.rulesArrayToJson(newRules), function () {
                        if (chrome.runtime.lastError) {
                            console.error('[StorageSync] Error saving rules:', chrome.runtime.lastError.message);
                        }
                        // Check quota after save and warn if approaching limit
                        self.checkQuota().then(function (usage) {
                            if (usage.isNearLimit) {
                                console.warn('[StorageSync] Sync storage at ' + usage.percentUsed.toFixed(1) + '% capacity (' + usage.bytesInUse + '/' + usage.quotaBytes + ' bytes)');
                            }
                        });
                        resolve();
                    });
                });
            }
            return Promise.resolve();
        });
    },

    saveRule: function (rule) {
        var self = this;
        var newRule = storageUtils.toSyncRule(rule);
        newRule.title = c.shortenStr(newRule.title, validation.TITLE_MAX_LENGTH);

        return this.readRule(newRule.id).then(function (exRule) {
            if (_.isEqual(newRule, exRule)) {
                return Promise.resolve();
            }
            var newRuleJson = {};
            newRuleJson[newRule.id] = newRule;
            return new Promise(function (resolve) {
                chromeAPI.sync.set(newRuleJson, function () {
                    if (chrome.runtime.lastError) {
                        console.error('[StorageSync] Error saving rule:', chrome.runtime.lastError.message);
                    }
                    // Check quota after save and warn if approaching limit
                    self.checkQuota().then(function (usage) {
                        if (usage.isNearLimit) {
                            console.warn('[StorageSync] Sync storage at ' + usage.percentUsed.toFixed(1) + '% capacity (' + usage.bytesInUse + '/' + usage.quotaBytes + ' bytes)');
                        }
                    });
                    resolve();
                });
            });
        });
    },

    deleteRule: function (ruleId) {
        return new Promise(function (resolve) {
            chromeAPI.sync.remove(ruleId, function () {
                resolve();
            });
        });
    }
};

// Export to YON namespace
YON.storageSync = ss;
