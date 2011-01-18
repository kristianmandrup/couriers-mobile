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
 * Object to encapsulate publish/subscribe behaviour
 */
TIRAMIZOO.namespace("pubsub");
TIRAMIZOO.pubsub = (function (pubSubService) {
    publish = function(options) {
        pubSubService.publish({
            channel: options.channel,
            message: JSON.stringify({action:options.action, data:options.data}),
            callback: options.callback || onPublished})
    },

    onPublished = function(info) {
        console.log(info);
    },

    subscribe = function(options) {
        pubSubService.subscribe({
            channel: options.channel,
            callback: function(message) {
                var messageObj = JSON.parse(message);
                if (messageObj.action == options.action) {
                    options.callback(messageObj.data);
                }
            },
            error:options.error || onError});
    },

    onError = function (e) {
        console.log(e);
        // info[0] == 1 for success
        // info[0] == 0 for failure

        // info[1] == "D" for "Demo Success" or
        // info[1] == "S" for "Success with Valid Key" or
        // info[1] == "Error..." with reason of failure.

        // if the response is an error, do not re-publish.
        // the failed publish will not re-send.
    };

    return  {
        publish: publish,
        subscribe: subscribe
    }
}(PUBNUB));

/**
 * Main function and initialization
 */
TIRAMIZOO.main = (function (app, $) {
    var pubsub = app.pubsub,

    onNewDelivery = function(data) {
        console.log("new delivery");
        console.dir(data);
    },
    
    init = function() {
        pubsub.subscribe({channel:"tiramizoo-courier-delivery", action:"new_delivery", callback:onNewDelivery});
    };
    
    $(document).bind("mobileinit", init);
}(TIRAMIZOO, jQuery));