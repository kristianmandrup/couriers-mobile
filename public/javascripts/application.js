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
 * Logging utility
 */
TIRAMIZOO.log = function (obj) {
    console.log(obj);
};

/**
 * Ajax helpers
 */
TIRAMIZOO.namespace("ajax");
TIRAMIZOO.ajax = (function ($) {
    function getJSON(options) {
        var paramsStr = "";
        if (options.loader || !options.hasOwnProperty("loader")) {
            $.mobile.pageLoading();
        }
        if (options.params) {
            paramsStr = "?" + $.param(options.params);
        }
        $.getJSON("/" + options.action + ".json" + paramsStr, options.callback);
    }

    function postJSON(options) {
        if (options.loader || !options.hasOwnProperty("loader")) {
            $.mobile.pageLoading();
        }
        $.post("/" + options.action + ".json", JSON.stringify(options.params), options.callback);
    }

    $('html').ajaxComplete(function() {
        $.mobile.pageLoading(true);
    });

    return {
        getJSON: getJSON,
        postJSON :postJSON
    };
}(jQuery));

/**
 * Object to encapsulate publish/subscribe behaviour
 */
TIRAMIZOO.namespace("pubsub");
TIRAMIZOO.pubsub = (function (pubSubService) {
    function publish(options) {
        pubSubService.publish({
            channel: options.channel,
            message: JSON.stringify({action:options.action, data:options.data}),
            callback: options.callback || onPublished})
    }

    function onPublished(info) {
        console.log(info);
    }

    function subscribe(options) {
        pubSubService.subscribe({
            channel: options.channel,
            callback: function(message) {
                var messageObj = JSON.parse(message);
                if (messageObj.action == options.action) {
                    options.callback(messageObj.data);
                }
            },
            error:options.error || onError});
    }

    function onError(e) {
        console.log(e);
        // info[0] == 1 for success
        // info[0] == 0 for failure

        // info[1] == "D" for "Demo Success" or
        // info[1] == "S" for "Success with Valid Key" or
        // info[1] == "Error..." with reason of failure.

        // if the response is an error, do not re-publish.
        // the failed publish will not re-send.
    }

    return  {
        publish: publish,
        subscribe: subscribe
    }
}(PUBNUB));

/**
 * Object to hold the courier state
 */
TIRAMIZOO.namespace("model");
TIRAMIZOO.model = (function ($) {
    return {
        courier: {
            AVAILABLE: "available",
            NOT_AVAILABLE: "not_available"
        },
        radar: {}
    };
}(jQuery));

/**
 * Main function and initialization
 */
TIRAMIZOO.main = (function (app, $) {
    var pubsub = app.pubsub;

    function onNewDelivery(data) {
        console.log("new delivery");
        console.dir(data);
    }

    function init() {
        //pubsub.subscribe({channel:"tiramizoo-courier-delivery", action:"new_delivery", callback:onNewDelivery});
    }
    
    $(document).bind("mobileinit", init);

}(TIRAMIZOO, jQuery));