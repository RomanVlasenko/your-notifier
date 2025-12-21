// Storage operation queue to prevent race conditions
var storageQueue = {
    _queue: Promise.resolve(),
    _syncListenerPaused: false,

    // Queue a storage operation to run sequentially
    enqueue: function(operation) {
        var self = this;
        this._queue = this._queue
            .then(function() {
                return operation();
            })
            .catch(function(err) {
                console.error('[StorageQueue] Operation failed:', err);
                throw err;
            });
        return this._queue;
    },

    // Pause sync listener during batch operations
    pauseSyncListener: function() {
        this._syncListenerPaused = true;
    },

    resumeSyncListener: function() {
        this._syncListenerPaused = false;
    },

    isSyncListenerPaused: function() {
        return this._syncListenerPaused;
    }
};

var ruleStorage = {

    readRule: function (ruleId) {
        return storageQueue.enqueue(function() {
            return Promise.all([ss.readRule(ruleId), sl.readRule(ruleId)])
                .then(function (results) {
                    var syncRule = results[0];
                    var localRule = results[1];
                    return Object.assign({}, syncRule, localRule);
                });
        });
    },

    saveRule: function (rule) {
        return storageQueue.enqueue(function() {
            storageQueue.pauseSyncListener();
            return Promise.all([sl.saveRule(rule), ss.saveRule(rule)])
                .then(function () {
                    return storageUtils.updateRuleKeys([rule.id]);
                })
                .then(function(result) {
                    storageQueue.resumeSyncListener();
                    return result;
                })
                .catch(function(err) {
                    storageQueue.resumeSyncListener();
                    throw err;
                });
        });
    },

    updateRule: function (rule) {
        var self = this;
        return storageQueue.enqueue(function() {
            return Promise.all([ss.readRule(rule.id), sl.readRule(rule.id)])
                .then(function (results) {
                    var exRule = Object.assign({}, results[0], results[1]);
                    if (!_.isUndefined(exRule) && !_.isEmpty(exRule)) {
                        storageQueue.pauseSyncListener();
                        return Promise.all([sl.saveRule(rule), ss.saveRule(rule)])
                            .then(function(result) {
                                storageQueue.resumeSyncListener();
                                return result;
                            })
                            .catch(function(err) {
                                storageQueue.resumeSyncListener();
                                throw err;
                            });
                    }
                    return Promise.resolve();
                });
        });
    },

    saveRules: function (rules) {
        return storageQueue.enqueue(function() {
            var keys = _.map(rules, function (rule) {
                return rule.id;
            });

            storageQueue.pauseSyncListener();
            return Promise.all([sl.saveRules(rules), ss.saveRules(rules)])
                .then(function () {
                    return storageUtils.updateRuleKeys(keys);
                })
                .then(function(result) {
                    storageQueue.resumeSyncListener();
                    return result;
                })
                .catch(function(err) {
                    storageQueue.resumeSyncListener();
                    throw err;
                });
        });
    },

    deleteRule: function (ruleId) {
        return storageQueue.enqueue(function() {
            storageQueue.pauseSyncListener();
            return ss.deleteRule(ruleId)
                .then(function(result) {
                    storageQueue.resumeSyncListener();
                    return result;
                })
                .catch(function(err) {
                    storageQueue.resumeSyncListener();
                    throw err;
                });
        });
    },

    readRules: function () {
        return storageQueue.enqueue(function() {
            return ss.readRules().then(function (syncRules) {
                if (syncRules.length === 0) {
                    return [];
                }
                return sl.readRules().then(function (localRules) {
                    var rules = [];
                    var pairs = _.groupBy(syncRules.concat(localRules), "id");

                    _.each(pairs, function (pair) {
                        var mergedRule = _.reduce(pair, function (ruleMemo, rule) {
                            return Object.assign(ruleMemo, rule);
                        }, {});
                        rules.push(mergedRule);
                    });

                    return rules;
                });
            });
        });
    }
};

// Sync rules between chrome instances when changes occur in sync storage
chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace !== "sync") {
        return;
    }

    // Skip if sync listener is paused (we're in the middle of a local operation)
    if (storageQueue.isSyncListenerPaused()) {
        console.log("[SyncListener] Paused, ignoring sync changes from local operation");
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
            console.log("Rule '%s' was deleted from another instance", key);

            // Queue the delete operation to prevent race conditions
            storageQueue.enqueue(function() {
                var ruleKey = key; // Capture key in closure
                return storageUtils.deleteRuleKey(ruleKey)
                    .then(function () {
                        return sl.deleteRule(ruleKey);
                    })
                    .then(function () {
                        chromeAPI.runtime.sendMessage({msg: "refreshList"}, function() {
                            if (chrome.runtime.lastError) {
                                // Ignore - popup may not be open
                            }
                        });
                    });
            });
        } else if (_.isUndefined(storageChange.oldValue)) {
            // Rule was added on another instance - initialize local storage
            console.log("Rule '%s' was added from another instance", key);

            var syncRule = storageChange.newValue;
            // Queue the add operation
            storageQueue.enqueue(function() {
                var ruleKey = key;
                var rule = syncRule;
                return sl.readRule(ruleKey).then(function(localRule) {
                    if (_.isUndefined(localRule) || _.isEmpty(localRule)) {
                        // Initialize local storage with defaults for new synced rule
                        return sl.saveRule({
                            id: rule.id,
                            index: Date.now(),
                            value: "",
                            history: [],
                            lastUpdated: null,
                            attempts: 0,
                            new: false,
                            notify: true,
                            notified: false
                        }).then(function() {
                            chromeAPI.runtime.sendMessage({msg: "refreshList"}, function() {
                                if (chrome.runtime.lastError) {
                                    // Ignore - popup may not be open
                                }
                            });
                        });
                    }
                });
            });
        } else {
            // Rule was modified on another instance - just refresh UI
            console.log("Rule '%s' was modified from another instance", key);

            chromeAPI.runtime.sendMessage({msg: "refreshList"}, function() {
                if (chrome.runtime.lastError) {
                    // Ignore - popup may not be open
                }
            });
        }
    }
});

// Export to YON namespace
YON.storageQueue = storageQueue;
YON.ruleStorage = ruleStorage;
