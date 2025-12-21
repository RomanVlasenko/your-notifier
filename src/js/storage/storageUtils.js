var storageUtils = {

    readRuleKeys: function () {
        return new Promise(function (resolve) {
            chromeAPI.sync.get("ruleKeys", function (data) {
                var ruleKeys = data.ruleKeys;
                if (_.isUndefined(ruleKeys)) {
                    resolve([]);
                } else {
                    resolve(ruleKeys);
                }
            });
        });
    },

    updateRuleKeys: function (keys) {
        var self = this;
        return this.readRuleKeys().then(function (exKeys) {
            var newKeys = _.uniq(exKeys.concat(keys));
            return new Promise(function (resolve) {
                chromeAPI.storage.set({"ruleKeys": newKeys}, function () {
                    chromeAPI.sync.set({"ruleKeys": newKeys}, function () {
                        resolve();
                    });
                });
            });
        });
    },

    deleteRuleKey: function (ruleKey) {
        var self = this;
        return this.readRuleKeys().then(function (exKeys) {
            var newKeys = _.reject(exKeys, function (key) {
                return key == ruleKey;
            });
            return new Promise(function (resolve) {
                chromeAPI.storage.set({"ruleKeys": newKeys}, function () {
                    chromeAPI.sync.set({"ruleKeys": newKeys}, function () {
                        resolve();
                    });
                });
            });
        });
    },

    toLocalRule: function (rule) {
        if (rule) {
            var localRule = {};

            localRule.id = rule.id;
            localRule.index = rule.index;
            localRule.value = rule.value;
            localRule.history = rule.history;
            localRule.lastUpdated = rule.lastUpdated;
            localRule.attempts = rule.attempts;
            localRule.new = rule.new;
            localRule.notify = rule.notify;
            localRule.notified = rule.notified;

            return localRule;
        }
        return rule;
    },

    toSyncRule: function (rule) {
        if (rule) {
            var syncRule = {};

            syncRule.id = rule.id;
            syncRule.selector = rule.selector;
            syncRule.title = rule.title;
            syncRule.url = rule.url;
            syncRule.updateFrequency = rule.updateFrequency;

            return syncRule;
        }
        return rule;
    },

    rulesJsonToArray: function (ruleKeys, rulesJSON) {
        var rulesArr = [];
        _.each(ruleKeys, function (key) {
            if (_.isUndefined(rulesJSON[key])) {
                var ruleMock = {};
                ruleMock.id = key;
                rulesArr.push(ruleMock);
            } else {
                rulesArr.push(rulesJSON[key]);
            }
        });
        return rulesArr;
    },

    rulesArrayToJson: function (rulesArray) {
        var rulesJSON = {};

        _.each(rulesArray, function (rule) {
            var ruleJson = {};
            ruleJson[rule.id] = rule;
            Object.assign(rulesJSON, ruleJson);
        });

        return rulesJSON;
    }
};

// Export to YON namespace
YON.storageUtils = storageUtils;
