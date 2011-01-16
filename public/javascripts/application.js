/**
 * Declare TIRAMIZOO global and namespace utility function
 * Used to create namespaces for the module pattern
 */
var TIRAMIZOO = TIRAMIZOO || {};
TIRAMIZOO.namespace = function (namespaceStr) {
    var parts = namespaceStr.split("."),
    parent = TIRAMIZOO,
    i;

    if (parts[0] === "TIRAMIZOO") {
        parts = parts.slice(1);
    }

    for (i = 0; i < parts.length; i += 1) {
        if (typeof parent[parts[i]] === "undefined") {
            parent[parts[i]] = {};
        }
        parent = parent[parts[i]];
    }
    return parent;
};

/**
 * Controller with utility function for the map
 */
TIRAMIZOO.namespace("map.controller");
TIRAMIZOO.map.controller = (function () {
    return {
        showDelivery: function () {
            console.log("showDelivery");
        }
    };
}());

/**
 * Main function and initialization
 */
TIRAMIZOO.main = (function (app) {
    var mapController = app.map.controller,

    onPageCreate = function() {

    },
    onPushReceived = function (message) {
        mapController.showDelivery();
        console.log(message);
    },
    onPushError = function (e) {
        console.log(e);
    },
    init = function() {
        // subscribe to real-time push notification from PubNub
        // PUBNUB.subscribe({channel:"tiramizoo-courier-channel", callback:onPushReceived, error:onPushError});
    };

    $(document).bind("mobileinit", init);

}(TIRAMIZOO));