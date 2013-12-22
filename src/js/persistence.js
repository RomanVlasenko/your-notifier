var persistence;
{
    var initialState = {page: "popup"};
    var initialRules = [];

    persistence = {

        //State operations

        readState: function (result) {
            chromeAPI.storage.get("state", function (data) {
                if (data && data.state) {
                    result(data.state);
                } else {
                    chromeAPI.storage.set({"state": initialState}, function () {
                        result(initialState);
                    });
                }
            });
        },

        saveState: function (state) {
            var callback;
            if (arguments && arguments.length > 1) {
                callback = arguments[1];
            } else {
                callback = function () {
                };
            }

            chromeAPI.storage.set({"state": state}, function () {
                callback();
            });
        },

        //Rules operations

        readRules: function (callbackHandler) {
            readRules(callbackHandler);
        },

        findRule: function (ruleId, callbackHandler) {
            readRules(function (rules) {
                var rule = _.find(rules, function (r) {
                    return r.id == ruleId;
                });
                callbackHandler(rule);
            });
        },

        saveRules: function (newRules) {
            var callbackHandler;
            if (arguments.length > 1) {
                callbackHandler = arguments[1];
            } else {
                callbackHandler = function () {
                };
            }

            readRules(function (exRules) {
                exRules = _.reject(exRules, function (exRule) {
                    return _.any(newRules, function (newRule) {
                        return exRule.id == newRule.id;
                    });
                });

                exRules = exRules.concat(newRules);

                saveRules(exRules, callbackHandler);
                console.log(exRules);

            });

        },

        saveRule: function (rule) {
            var callbackHandler;
            if (arguments.length > 1) {
                callbackHandler = arguments[1];
            } else {
                callbackHandler = function () {
                };
            }

            rule.title = common.shortenStr(rule.title, validation.VALUE_MAX_LENGTH);
            rule.value = common.shortenStr(rule.value, validation.VALUE_MAX_LENGTH);

            readRules(function (rules) {
                var rulesArr = _.reject(rules, function (r) {
                    return r.id == rule.id;
                });

                rulesArr.push(rule);

                saveRules(rulesArr, function () {
                    callbackHandler();
                });
            });
        },

        incVersion: function (obj) {
            increaseVersion(obj);
        },

        deleteRule: function (ruleId) {
            var callback;
            if (arguments && arguments.length > 1) {
                callback = arguments[1];
            }

            chromeAPI.storage.get("rules", function (data) {
                var rules = data.rules;
                var rule = _.find(rules, function (r) {
                    return r.id == ruleId;
                });

                rule.deleted = true;

                chromeAPI.storage.set({"rules": rules}, function () {
                    if (callback) {
                        callback();
                    }
                });
            });
        }
    };

    function readRules(callbackHandler) {
        chromeAPI.storage.get("rules", function (data) {
            if (data && data.rules) {
                var rules = _.reject(data.rules, function (r) {
                    return r.deleted == true;
                });
                callbackHandler(rules);
            } else {
                chromeAPI.storage.set({"rules": initialRules}, function () {
                    callbackHandler(initialRules);
                });
            }
        });
    }

    function saveRules(rules, callbackHandler) {
        chromeAPI.storage.set({"rules": rules}, function () {
            callbackHandler();
        });
    }

    function increaseVersion(obj) {
        if (obj.ver) {
            obj.ver = obj.ver + 1;
        } else {
            obj.ver = 0;
        }
        return obj;
    }
}