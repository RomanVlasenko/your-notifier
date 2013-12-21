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

            chromeAPI.sync.get("ruleKeys", function (data) {
                var keys = data.ruleKeys;

                chromeAPI.sync.get(keys, function (data) {
                    callbackHandler(data);
                });
            });
        }
    };

    sync.init(function () {
        chromeAPI.alarms.create("syncSchedule", {periodInMinutes: 1});
        chromeAPI.alarms.onAlarm.addListener(function (alarm) {
            if (alarm.name = 'syncSchedule') {

                sync.readRules(function (remoteRules) {
                    persistence.readRules(function (localRules) {
                        synchronizeRules(localRules, remoteRules);
                    });
                });
            }
        });
    });

    function synchronizeRules(localRules, remoteRules) {
        //Find new remote rules
        var saveToLocalStorage = getRulesDiff(remoteRules, localRules);

        //TODO Save new rules to local storage

        //Find new local rules
        var saveToRemoteStorage = getRulesDiff(localRules, remoteRules);

        //TODO Save new rules to remote storage
    }

    function getRulesDiff(array, diffArray) {
        return _.filter(array, function (r) {
            var rCmp = _.find(diffArray, function (rCmp) {
                return rCmp.id == r.id;
            });

            return !rCmp || rCmp.version < r.version;
        });
    }
}
