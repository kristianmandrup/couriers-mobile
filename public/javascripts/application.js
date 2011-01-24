/**
 * TIRAMIZOO global and namespace utility function
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
TIRAMIZOO.log = function () {
    console.log.apply(console, arguments);
};

/**
 * Global event bus
 */
TIRAMIZOO.namespace("events");
TIRAMIZOO.events = (function (app, $) {
    function add(event, callback) {
        $(app.events).bind(event, callback);
    }

    function remove(event, callback) {
        $(app.events).unbind(event, callback);
    }

    function dispatch(event, data) {
        $(app.events).trigger(event, data);
    }

    return {
        add: add,
        remove: remove,
        dispatch: dispatch
    }
}(TIRAMIZOO, $));

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
        $.ajax({
            type: "GET",
            url: "/" + options.action + ".json" + paramsStr,
            dataType: "json",
            contentType: "application/json",
            processData: false,
            success: function(data) {
                options.callback(data)
            }
        });
    }

    function postJSON(options) {
        if (options.loader || !options.hasOwnProperty("loader")) {
            $.mobile.pageLoading();
        }
        $.ajax({
            type: "POST",
            url: "/" + options.action + ".json",
            dataType: "json",
            contentType: "application/json",
            processData: false,
            data: JSON.stringify(options.params),
            success: function(data) {
                options.callback(data)
            }
        });
    }

    $("html").ajaxComplete(function() {
        $.mobile.pageLoading(true);
    });

    return {
        getJSON: getJSON,
        postJSON :postJSON
    };
}(jQuery));

/**
 * Object for publish/subscribe behaviour
 */
TIRAMIZOO.namespace("pubsub");
TIRAMIZOO.pubsub = (function (app, pubSubService) {
    function publish(options) {
        pubSubService.publish({
            channel: options.channel,
            message: {action:options.action, data:options.data},
            callback: options.callback || onPublished})
    }

    function onPublished(info) {
        app.log(info);
    }

    function subscribe(options) {
        pubSubService.subscribe({
            channel: options.channel,
            callback: function(message) {
                app.log("onPubSubMessage", message);
                if (message.action == options.action) {
                    options.callback(message.data);
                }
            },
            error:options.error || onError});
    }

    function onError(e) {
        app.log(e);
    }

    return  {
        publish: publish,
        subscribe: subscribe
    }
}(TIRAMIZOO, PUBNUB));

/**
 * Courier
 */
TIRAMIZOO.namespace("courier");
TIRAMIZOO.courier = (function (app, $) {
    var AVAILABLE = "available",
    NOT_AVAILABLE = "not_available",
    BIKING = "biking",
    DRIVING = "driving",
    ajax = app.ajax,
    workState,
    id,
    travelMode = BIKING,
    currentPosition;

    function getID() {
        return id;
    }

    function setID(newID) {
        id = newID;
    }

    function setState(newWorkState, callback) {
        ajax.postJSON({
            action: "courier/state",
            params: {work_state: newWorkState},
            callback: function(data) {
                workState = data.work_state;
                callback(workState);
            }
        });
    }

    function setAvailable(callback) {
        setState(AVAILABLE, callback);
    }

    function setNotAvailable(callback) {
        setState(NOT_AVAILABLE, callback);
    }

    function toggleWorkState(callback) {
        if (isAvailable()) {
            setNotAvailable(callback);
        } else {
            setAvailable(callback);
        }
    }

    function isAvailable() {
        return workState == AVAILABLE;
    }

    function setPosition(position) {
        ajax.postJSON({
            action:"courier/location",
            params: {position:{latitude: position.latitude, longitude: position.longitude}},
            callback: function(data) {
                currentPosition = position;
                app.log("posted location");
            },
            loader: false
        });
    }


    function getPosition() {
        return currentPosition;
    }

    function getNearbyCouriers(bounds, callback) {
        ajax.getJSON({
            action: "location/nearby_couriers",
            params: {
                ne_latitude: bounds.northEast.latitude,
                ne_longitude: bounds.northEast.longitude,
                sw_latitude: bounds.southWest.latitude,
                sw_longitude: bounds.southWest.longitude
            },
            callback: function(nearbyCouriers) {
                callback(nearbyCouriers);
            }
        });
    }

    function getTravelMode() {
        return travelMode;
    }

    return {
        getID: getID,
        setID: setID,
        isAvailable: isAvailable,
        setAvailable: setAvailable,
        setNotAvailable: setNotAvailable,
        getTravelMode: getTravelMode,
        toggleWorkState: toggleWorkState,
        setPosition: setPosition,
        getPosition: getPosition,
        getNearbyCouriers: getNearbyCouriers
    };
}(TIRAMIZOO, $));

/**
 * Notifications
 */
TIRAMIZOO.namespace("notifications");
TIRAMIZOO.notifications = (function (app, $) {

    function showDelivery(title, message) {
        $.jGrowl(message, {
            header: title,
            sticky: true,
            closeTemplate: ""
        });
    }

    function hideDelivery() {
        $("div.jGrowl").jGrowl("shutdown");
    }
    
    $.jGrowl.defaults.position = "center";
    $.jGrowl.defaults.closer = false;

    return {
        showDelivery: showDelivery,
        hideDelivery: hideDelivery
    };

}(TIRAMIZOO, $));

/**
 * Delivery workflow
 */
TIRAMIZOO.namespace("workflow");
TIRAMIZOO.workflow = (function (app, $) {
    var events = app.events,
    ajax = app.ajax,
    notifications = app.notifications,
    courier = app.courier,
    currentDelivery;

    function newDelivery(newDelivery) {
        app.log("newDelivery", newDelivery);
        currentDelivery = newDelivery;
        notifications.showDelivery("New Delivery", "From "
                + newDelivery.pickup.location.address.street
                + " to " + newDelivery.dropoff.location.address.street
                + " (" + newDelivery.pickup.notes + ")");
        events.dispatch("newDelivery", newDelivery);
    }

    function setDeliveryState(state, callback) {
        ajax.postJSON({
            action:"courier/deliveries/" + currentDelivery.id + "/state",
            params: {state: state, position: courier.getPosition()},
            callback: function(data) {
                callback(data);
            }
        });
    }

    function acceptDelivery(callback) {
        setDeliveryState("accepted", callback);
    }

    function declineDelivery(callback) {
        notifications.hideDelivery();
        setDeliveryState("ready", callback);
    }

    function arrivedAtPickUp(callback) {
        setDeliveryState("arrived_at_pickup", callback);
    }

    function arrivedAtDropOff(callback) {
        setDeliveryState("arrived_at_dropoff", callback);
    }

    function bill() {
        notifications.hideDelivery();
        $.mobile.changePage("/billings/edit");
    }

    function cancel(callback) {
        notifications.hideDelivery();
        setDeliveryState("cancelled", callback);
    }

    return {
        newDelivery: newDelivery,
        acceptDelivery: acceptDelivery,
        declineDelivery: declineDelivery,
        arrivedAtPickUp: arrivedAtPickUp,
        arrivedAtDropOff: arrivedAtDropOff,
        bill: bill
    }

}(TIRAMIZOO, jQuery));

/**
 * Main function and initialization
 */
TIRAMIZOO.main = (function (app, $) {
    var pubsub = app.pubsub,
    workflow = app.workflow,
    courier = app.courier,
    test = tiramizooTest(app, $);

    function mobileInit() {
        //config $.mobile
    }

    function onNewDelivery(newDelivery) {
        workflow.newDelivery(newDelivery);
    }

    $(document).bind("mobileinit", mobileInit);

    function init(options) {
        courier.setID(options.courierID);
        pubsub.subscribe({channel:"delivery-channel-" + courier.getID(), action:"new_delivery", callback:onNewDelivery});
        setTimeout(test.newDelivery, 3000);
    }

    return {
        init: init
    }

}(TIRAMIZOO, jQuery));

/*
$('.button').click(function() {
    var menuItem = $(this).parent();
    var panel = menuItem.find('.panel');
    if (menuItem.hasClass("expanded")) {
        menuItem.removeClass('expanded').addClass('collapsed');
        panel.slideUp();
    }
    else if (menuItem.hasClass("collapsed")) {
        menuItem.removeClass('collapsed').addClass('expanded');
        panel.slideDown();
    }
});
*/