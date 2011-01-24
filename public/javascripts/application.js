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

TIRAMIZOO.codes = {
    OK: "OK",
    DELIVERY_TIMEOUT: "DELIVERY_TIMEOUT",
    DELIVERY_TAKEN: "DELIVERY_TAKEN"
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
    var SECONDS_TO_ACCEPT = 20,
    progressIntervalID,
    progressBar,
    progressBarMessage,
    progressStartTime,
    events = app.events;

    function showNewDelivery(deliveryData) {
        var title = "New Delivery",
        message = "From "
                + deliveryData.pickup.location.address.street
                + " to " + deliveryData.dropoff.location.address.street
                + " (" + deliveryData.pickup.notes + ")";

        $.jGrowl(message, {
            header: title,
            sticky: true,
            closeTemplate: ""
        });
        showAcceptanceTimeout();
    }

    function hideNewDelivery() {
        hideAcceptanceTimeout();
        hideGrowl();
    }

    function showAcceptanceTimeout() {
        $.jGrowl("", {
            sticky: true,
            closeTemplate: "",
            afterOpen: showAcceptanceProgress
        });
    }

    function showAcceptanceProgress() {
        var growlDiv = $(".jGrowl-notification:last-child"),
        progressContainer;

        growlDiv.addClass("jGrowl-progress");
        growlDiv.append('<div class="progress-bar"><div/><span/></div>');
        progressContainer = growlDiv.find(".progress-bar");
        progressBar = progressContainer.find("div");
        progressBarMessage = progressContainer.find("span");
        progressStartTime = new Date().getTime();
        progressIntervalID = setInterval(updateAcceptanceTimeout, 1000);
    }

    function updateAcceptanceTimeout() {
        var timePassed = new Date().getTime() - progressStartTime,
        percentPassed = timePassed / (SECONDS_TO_ACCEPT * 1000) * 100,
        timeLeft = SECONDS_TO_ACCEPT - Math.round(timePassed / 1000);
        progressBar.css("width", percentPassed + "%");
        progressBarMessage.text(timeLeft + " sec. left to accept delivery...");
        if (timeLeft <= 0) {
            hideNewDelivery();
            events.dispatch("deliveryNotAccepted");
        }
    }

    function hideAcceptanceTimeout() {
        if (progressIntervalID) {
            clearInterval(progressIntervalID);
            progressIntervalID = null;
            $(".progress-bar").remove();
        }
    }

    function showPickUp(pickUpData) {
        var title = "Go To Pickup",
        contact = pickUpData.pickup.contact,
        message = pickUpData.pickup.location.address.street
                + ", " + contact.name + ", "
                + contact.company_name + ", "
                + contact.email + ", "
                + contact.phone + " "
                + " (" + pickUpData.pickup.notes + ")";

        $.jGrowl(message, {
            header: title,
            sticky: true,
            closeTemplate: ""
        });
    }

    function hidePickUp() {
        hideGrowl();
    }

    function showDropOff(dropOffData) {
        var title = "Go To Dropoff",
        contact = dropOffData.dropoff.contact,
        message = dropOffData.dropoff.location.address.street
                + ", " + contact.name + ", "
                + contact.company_name + ", "
                + contact.email + ", "
                + contact.phone + " "
                + " (" + dropOffData.dropoff.notes + ")";

        $.jGrowl(message, {
            header: title,
            sticky: true,
            closeTemplate: ""
        });
    }

    function hideDropOff() {
        hideGrowl();
    }

    function showBilling(billingData) {
        var title = "Go To Billing",
        contact = billingData.dropoff.contact,
        message = contact.name + ", "
                + contact.company_name + ", "
                + contact.email + ", "
                + contact.phone + " "
                + " (" + billingData.dropoff.notes + ")";

        $.jGrowl(message, {
            header: title,
            sticky: true,
            closeTemplate: ""
        });
    }

    function showStatus(newStatus) {
        $.jGrowl(newStatus.message, {
            header: "Info",
            closeTemplate: "",
            life: 10000
        });
    }

    function hideAll() {
        hideAcceptanceTimeout();
        hideGrowl();
    }

    function hideGrowl() {
        $("div.jGrowl").jGrowl("close");
    }
    
    $.jGrowl.defaults.position = "center";
    $.jGrowl.defaults.closer = false;

    return {
        showNewDelivery: showNewDelivery,
        hideNewDelivery: hideNewDelivery,
        hideAcceptanceTimeout: hideAcceptanceTimeout,
        showPickUp: showPickUp,
        hidePickUp: hidePickUp,
        showDropOff: showDropOff,
        hideDropOff: hideDropOff,
        showBilling: showBilling,
        hideAll: hideAll,
        showStatus: showStatus
    };

}(TIRAMIZOO, $));

/**
 * Delivery workflow
 */
TIRAMIZOO.namespace("workflow");
TIRAMIZOO.workflow = (function (app, $) {
    var codes = app.codes,
    events = app.events,
    ajax = app.ajax,
    notifications = app.notifications,
    courier = app.courier,
    currentDelivery;

    function setDeliveryState(state, callback) {
        ajax.postJSON({
            action:"courier/deliveries/" + currentDelivery.id + "/state",
            params: {state: state, position: courier.getPosition()},
            callback: function(data) {
                callback(data);
            }
        });
    }

    function isSuccessful(data) {
        return data.status.code == codes.OK;
    }

    function newDelivery(deliveryData) {
        app.log("newDelivery", deliveryData);
        currentDelivery = deliveryData;
        notifications.showNewDelivery(deliveryData);
        events.dispatch("newDelivery", deliveryData);
        window.location.href = "";
    }

    function acceptDelivery(callback) {
        notifications.hideAcceptanceTimeout();
        setDeliveryState("accepted", function(pickUpData) {
            var success = isSuccessful(pickUpData);
            if (success) {
                notifications.hideNewDelivery();
                notifications.showPickUp(pickUpData);
            } else {
                notifications.showStatus(pickUpData.status);
            }
            callback(success);
        });
    }

    function declineDelivery(callback) {
        notifications.hideAll();
        setDeliveryState("declined", callback);
    }

    function arrivedAtPickUp(callback) {
        setDeliveryState("arrived_at_pickup", function(dropOffData) {
            if (isSuccessful(dropOffData)) {
                notifications.hidePickUp();
                notifications.showDropOff(dropOffData);
                callback();
            }
        })
    }

    function arrivedAtDropOff(callback) {
        setDeliveryState("arrived_at_dropoff", function(billingData) {
            if (isSuccessful(billingData)) {
                notifications.hideDropOff();
                notifications.showBilling(billingData);
                callback();
            }
        });
    }

    function bill() {
        notifications.hideAll();
        $.mobile.changePage("/billings/edit");
    }

    function cancel(callback) {
        notifications.hideAll();
        setDeliveryState("cancelled", function() {
            callback();
        });
    }

    return {
        newDelivery: newDelivery,
        acceptDelivery: acceptDelivery,
        declineDelivery: declineDelivery,
        arrivedAtPickUp: arrivedAtPickUp,
        arrivedAtDropOff: arrivedAtDropOff,
        bill: bill,
        cancel: cancel
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
        setTimeout(test.newDelivery, 5000);
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