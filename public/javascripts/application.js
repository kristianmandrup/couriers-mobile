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

        showGrowl({
            title: title,
            message: message,
            sticky: true
        });
        showAcceptanceTimeout();
    }

    function hideNewDelivery() {
        hideAcceptanceTimeout();
        hideGrowl();
    }

    function showAcceptanceTimeout() {
        showGrowl({
            title: "",
            message: "",
            sticky: true,
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

        showGrowl({
            title: title,
            message: message,
            sticky: true
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

        showGrowl({
            title: title,
            message: message,
            sticky: true
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

        showGrowl({
            title: title,
            message: message,
            sticky: true
        });
    }

    function showStatus(newStatus) {
        showGrowl({
            title: "Info",
            message: newStatus.message,
            sticky: false
        });
    }

    function hideAll() {
        hideAcceptanceTimeout();
        hideGrowl();
    }

    function showGrowl(options) {
        hideGrowl();

        var growlOptions = {
            header: options.title,
            closeTemplate: "",
            sticky: options.sticky
        };
        if (!options.sticky) {
            growlOptions.life = 10000;
        }
        if (options.afterOpen) {
            growlOptions.afterOpen = options.afterOpen;
        }
        growlOptions.beforeOpen = function() {
            if (!$.mobile.activePage.hasClass("page-index")) {
                $("div.jGrowl").css("top", $('div[data-role="header"]').height() + "px");
            } else {
                $("div.jGrowl").css("top", "0");
            }
        };
        $.jGrowl(options.message, growlOptions);
    }

    function hideGrowl() {
        $("div.jGrowl").jGrowl("close");
    }
    
    $.jGrowl.defaults.position = "center";
    $.jGrowl.defaults.closer = false;

    return {
        showNewDelivery: showNewDelivery,
        hideAcceptanceTimeout: hideAcceptanceTimeout,
        showPickUp: showPickUp,
        showDropOff: showDropOff,
        showBilling: showBilling,
        showStatus: showStatus,
        hideAll: hideAll
    };

}(TIRAMIZOO, $));

/**
 * Delivery workflow (refactor to real state machine later?)
 */
TIRAMIZOO.namespace("workflow");
TIRAMIZOO.workflow = (function (app, $) {
    var codes = app.codes,
    events = app.events,
    ajax = app.ajax,
    notifications = app.notifications,
    courier = app.courier,
    currentDelivery;

    function setCurrentState() {
        if (currentDelivery) {
            setState(currentDelivery.state);
        }
    }

    function setState(state, data) {
        switch (state) {
            case "accepted":
                deliveryAccepted(data);
                break;
            case "declined":
                deliveryDeclined(data);
                break;
            case "arrived_at_pickup":
                arrivedAtPickUp(data);
                break;
            case "arrived_at_dropoff":
                arrivedAtDropOff(data);
                break;
            case "cancelled":
                deliveryCancelled(data);
                break;
        }
    }

    function setRemoteState(state, callback) {
        ajax.postJSON({
            action:"courier/deliveries/" + currentDelivery.id + "/state",
            params: {state: state, position: courier.getPosition()},
            callback: function(data) {
                callback(data);
            }
        });
    }

    function declineDelivery() {
        setRemoteState("declined", function(data) {
            deliveryDeclined(data);
        });
    }

    function deliveryDeclined(data) {
        notifications.hideAll();
        events.dispatch("deliveryDeclined");
    }

    function setArrivedAtPickUp() {
        setRemoteState("arrived_at_pickup", function(dropOffData) {
            arrivedAtPickUp(dropOffData);
        });
    }

    function arrivedAtPickUp(dropOffData) {
        notifications.showDropOff(dropOffData);
        events.dispatch("arrivedAtPickUp");
    }

    function setArrivedAtDropOff() {
        setRemoteState("arrived_at_dropoff", function(billingData) {
            notifications.showBilling(billingData);
            events.dispatch("arrivedAtDropOff");
        });
    }

    function bill() {
        notifications.hideAll();
        $.mobile.changePage("/billings/edit");
        currentDelivery = null;
    }

    function cancelled(callback) {
        notifications.hideAll();
        setRemoteState("cancelled", function() {
            callback();
        });
    }

    function cancel() {
        
    }

    function getState() {
        
    }

    function setRemoteState(state, callback) {
        ajax.postJSON({
            action:"courier/deliveries/" + currentDelivery.id + "/state",
            params: {state: state, position: courier.getPosition()},
            callback: function(data) {
                callback(data);
            }
        });
    }

    function setDefaultState() {
        
    }

    return {
        setCurrentState: setCurrentState,
        newDelivery: newDelivery,
        acceptDelivery: acceptDelivery,
        declineDelivery: declineDelivery,
        setArrivedAtPickUp: setArrivedAtPickUp,
        setArrivedAtDropOff: setArrivedAtDropOff,
        bill: bill,
        cancel: cancel,
        setRemoteState: setRemoteState,
        setDefaultState: setDefaultState
    }

}(TIRAMIZOO, jQuery));

/**
 * Workflow States
 */
TIRAMIZOO.namespace("workflow.state");
TIRAMIZOO.workflow.state = function (app, $) {
    var notifications = app.notifications,
    workflow = app.workflow;

    function init() { }
    function acceptDelivery() { }
    function declineDelivery() { }
    function arrivedAtPickUp() { }
    function arrivedAtDropOff() { }
    function bill() { }

    function cancel() {
        notifications.hideAll();
        setRemoteState("cancelled", function() {
            workflow.setDefaultState();
        });
    }

    return {
        init: init,
        acceptDelivery: acceptDelivery,
        declineDelivery: declineDelivery,
        arrivedAtPickUp: arrivedAtPickUp,
        arrivedAtDropOff: arrivedAtDropOff,
        bill: bill,
        cancel: cancel
    }

};

TIRAMIZOO.namespace("workflow.defaultState");
TIRAMIZOO.workflow.defaultState = function (app, $) {
    var events = app.events,
    notifications = app.notifications;

    function init(data) {
        notifications.hideAll();
        events.dispatch("defaultState");
    }

    return {
        
    }
    
};

TIRAMIZOO.namespace("workflow.newDeliveryState");
TIRAMIZOO.workflow.newDeliveryState = function (app, $) {
    var events = app.events,
    notifications = app.notifications,
    workflow = app.workflow;

    function init(deliveryData) {
        if (!$.mobile.activePage.hasClass("page-index")) {
            window.location.href = "";
        }
        notifications.showNewDelivery(deliveryData);
        events.dispatch("newDelivery");
    }

    function acceptDelivery() {
        notifications.hideAcceptanceTimeout();
        workflow.setRemoteState("accepted", function (pickUpData) {
            workflow.setState("accepted", pickUpData);
        });
    }

    function declineDelivery() {
        setRemoteState("declined", function(data) {
            workflow.setDefaultState();
        });
    }

    return {
        acceptDelivery: acceptDelivery,
        declineDelivery: declineDelivery
    }
    
};

TIRAMIZOO.namespace("workflow.acceptedState");
TIRAMIZOO.workflow.acceptedState = function (app, $) {
    var codes = app.codes,
    events = app.events,
    notifications = app.notifications;

    function init(pickUpData) {
        if (pickUpData.status.code == codes.OK) {
            notifications.showPickUp(pickUpData);
            events.dispatch("deliveryAccepted");
        } else {
            notifications.showStatus(pickUpData.status);
            events.dispatch("deliveryNotAccepted");
        }
    }

    function arrivedAtPickUp() {
        
    }

};

/**
 * Main function and initialization
 */
TIRAMIZOO.main = (function (app, $) {
    var pubsub = app.pubsub,
    workflow = app.workflow,
    courier = app.courier,
    test = tiramizooTest(app, $);

    function mobileInit() {
        //$.mobile.ajaxLinksEnabled = false;
        //$.mobile.ajaxFormsEnabled = false;
    }

    $(document).bind("mobileinit", mobileInit);

    function init(options) {
        courier.setID(options.courierID);
        pubsub.subscribe({channel:"delivery-channel-" + courier.getID(), action:"new_delivery", callback:onNewDelivery});
        //workflow.setState(options.currentState);
        setTimeout(test.newDelivery, 5000);
    }

    $("div").live('pageshow',function(event, ui) {
        console.log("activePage", $.mobile.activePage);
        if ($.mobile.activePage.hasClass("page-index")) {
            workflow.setCurrentState();
        }
    });

    $("html").delegate("a", "click", function(ev) {
        $("div.ui-loader").css("top", "100px");
    });

    function onNewDelivery(newDelivery) {
        workflow.setState("new_delivery", newDelivery);
    }

    return {
        init: init
    }

}(TIRAMIZOO, jQuery));