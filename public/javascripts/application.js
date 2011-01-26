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
 * Constants for return codes
 */
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
    $("html").ajaxComplete(function() {
        $.mobile.pageLoading(true);
    });

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
    id,
    currentPosition,
    travelMode,
    workState;

    function init(info) {
        id = info.id;
        travelMode = info.travelMode;
    }

    function getID() {
        return id;
    }

    function getTravelMode() {
        return travelMode;
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

    return {
        init: init,
        getID: getID,
        getTravelMode: getTravelMode,
        setAvailable: setAvailable,
        setNotAvailable: setNotAvailable,
        toggleWorkState: toggleWorkState,
        isAvailable: isAvailable,
        getPosition: getPosition,
        setPosition: setPosition,
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

    $.jGrowl.defaults.position = "center";
    $.jGrowl.defaults.closer = false;

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
        growlOptions.afterOpen = options.afterOpen;
        $.jGrowl(options.message, growlOptions);
    }

    function hideGrowl() {
        $("div.jGrowl").jGrowl("close");
    }

    function hideAll() {
        hideAcceptanceTimeout();
        hideGrowl();
    }

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
                + contact.phone + " "
                + " (" + pickUpData.pickup.notes + ")";

        showGrowl({
            title: title,
            message: message,
            sticky: true
        });
    }

    function showDropOff(dropOffData) {
        var title = "Go To Dropoff",
        contact = dropOffData.dropoff.contact,
        message = dropOffData.dropoff.location.address.street
                + ", " + contact.name + ", "
                + contact.company_name + ", "
                + contact.phone + " "
                + " (" + dropOffData.dropoff.notes + ")";

        showGrowl({
            title: title,
            message: message,
            sticky: true
        });
    }

    function showBilling(billingData) {
        var title = "Go To Billing",
        contact = billingData.dropoff.contact,
        message = contact.name + ", "
                + contact.company_name + ", "
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
 * Workflow States
 */
TIRAMIZOO.namespace("workflow.state");
TIRAMIZOO.workflow.state = function (app, $) {
    var workflow = app.workflow;

    function init(data) { }
    function acceptDelivery() { }
    function declineDelivery() { }
    function arrivedAtPickUp() { }
    function arrivedAtDropOff() { }
    function bill() { }

    function cancel() {
        workflow.setRemoteDeliveryState("cancelled", function() {
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
        init: init
    }
};

TIRAMIZOO.namespace("workflow.newDeliveryState");
TIRAMIZOO.workflow.newDeliveryState = function (app, $) {
    var ajax = app.ajax,
    events = app.events,
    notifications = app.notifications,
    workflow = app.workflow;

    function init(deliveryData) {
        workflow.setCurrentDelivery(deliveryData);
        if (!$.mobile.activePage.hasClass("page-index")) {
            window.location.href = "#";
        }
        notifications.showNewDelivery(deliveryData);
        events.dispatch("newDelivery", deliveryData);
    }

    function acceptDelivery() {
        notifications.hideAcceptanceTimeout();
        setRemoteDeliveryOffer("accepted", function (pickUpData) {
            workflow.setState("accepted", pickUpData);
        });
    }

    function declineDelivery() {
        setRemoteDeliveryOffer("declined", function(data) {
            workflow.setDefaultState();
        });
    }

    function setRemoteDeliveryOffer(response, callback) {
        ajax.postJSON({
            action:"courier/delivery_offers/" + workflow.getCurrentDelivery().id + "/response",
            params: {response: response},
            callback: function(data) {
                callback(data);
            }
        });
    }

    return {
        init: init,
        acceptDelivery: acceptDelivery,
        declineDelivery: declineDelivery
    }
};

TIRAMIZOO.namespace("workflow.acceptedState");
TIRAMIZOO.workflow.acceptedState = function (app, $) {
    var codes = app.codes,
    events = app.events,
    notifications = app.notifications,
    workflow = app.workflow;

    function init(pickUpData) {
        if (pickUpData.status.code == codes.OK) {
            notifications.showPickUp(pickUpData);
            events.dispatch("deliveryAccepted", pickUpData);
        } else {
            notifications.showStatus(pickUpData.status);
            events.dispatch("deliveryNotAccepted", pickUpData);
        }
    }

    function arrivedAtPickUp() {
        workflow.setRemoteDeliveryState("arrived_at_pickup", function(dropOffData) {
            workflow.setState("arrived_at_pickup", dropOffData);
        });
    }

    return {
        init: init,
        arrivedAtPickUp: arrivedAtPickUp
    }
};

TIRAMIZOO.namespace("workflow.arrivedAtPickUpState");
TIRAMIZOO.workflow.arrivedAtPickUpState = function (app, $) {
    var events = app.events,
    notifications = app.notifications,
    workflow = app.workflow;

    function init(dropOffData) {
        notifications.showDropOff(dropOffData);
        events.dispatch("arrivedAtPickUp", dropOffData);
    }

    function arrivedAtDropOff() {
        workflow.setRemoteDeliveryState("arrived_at_dropoff", function(billingData) {
            workflow.setState("arrived_at_dropoff", billingData);
        });
    }

    return {
        init: init,
        arrivedAtDropOff: arrivedAtDropOff
    }
};

TIRAMIZOO.namespace("workflow.arrivedAtDropOffState");
TIRAMIZOO.workflow.arrivedAtDropOffState = function (app, $) {
    var events = app.events,
    notifications = app.notifications,
    workflow = app.workflow;

    function init(billingData) {
        //notifications.showBilling(billingData);
        //events.dispatch("arrivedAtDropOff", billingData);
        bill();
    }

    function bill() {
        workflow.setCurrentDelivery(null);
        notifications.hideAll();
        events.dispatch("billing");
        $.mobile.changePage("/billings/edit");
    }

    return {
        init: init,
        bill: bill
    }
};

/**
 * Delivery workflow (state machine)
 */
TIRAMIZOO.namespace("workflow");
TIRAMIZOO.workflow = (function (app, $) {
    var ajax = app.ajax,
    courier = app.courier,
    stateMapping = {
        new_delivery: "newDeliveryState",
        accepted: "acceptedState",
        arrived_at_pickup: "arrivedAtPickUpState",
        arrived_at_dropoff: "arrivedAtDropOffState",
        billed: "defaultState",
        cancelled: "defaultState"
    },
    workflow = app.workflow,
    currentDelivery,
    currentState;

    function init(info) {
        currentDelivery = info.currentDelivery;
        if (currentDelivery) {
            setState(currentDelivery.state, currentDeslivery);
        }
    }

    function setState(state, data) {
        var stateClassName = stateMapping[state] || "defaultState";
        currentState = $.extend(
                workflow.state(app, $),
                workflow[stateClassName](app, $));
        currentState.init(data);
    }

    function acceptDelivery() {
        currentState.acceptDelivery();
    }

    function declineDelivery() {
        currentState.declineDelivery();
    }

    function arrivedAtPickUp() {
        currentState.arrivedAtPickUp();
    }

    function arrivedAtDropOff() {
        currentState.arrivedAtDropOff();
    }

    function bill() {
        currentState.bill();
    }

    function cancel() {
        currentState.cancel();
    }

    function setDefaultState() {
        setState("default");
    }

    function setRemoteDeliveryState(state, callback) {
        ajax.postJSON({
            action:"courier/deliveries/" + currentDelivery.id + "/state",
            params: {state: state, position: courier.getPosition()},
            callback: function(data) {
                callback(data);
            }
        });
    }

    function getCurrentDelivery() {
        return currentDelivery;
    }

    function setCurrentDelivery(newCurrentDelivery) {
        currentDelivery = newCurrentDelivery;
    }

    return {
        init: init,
        getCurrentDelivery: getCurrentDelivery,
        setCurrentDelivery: setCurrentDelivery,
        setRemoteDeliveryState: setRemoteDeliveryState,
        setState: setState,
        setDefaultState: setDefaultState,
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
    var courier = app.courier,
    pubsub = app.pubsub,
    workflow = app.workflow,
    test = tiramizooTest(app, $);

    $(document).bind("mobileinit", mobileInit);

    $("html").delegate("a", "click", function(ev) {
        $("div.ui-loader").css("top", "100px");
    });

    function mobileInit() {
        //$.mobile.ajaxLinksEnabled = false;
        //$.mobile.ajaxFormsEnabled = false;
    }

    function init(options) {
        courier.init({
                id: options.courierInfo.id,
                travelMode: options.courierInfo.travel_mode});
        workflow.init({currentDelivery: options.courierInfo.currentDelivery});
        pubsub.subscribe({channel:"delivery-" + courier.getID(), action:"delivery_offer", callback:onNewDelivery});
        setTimeout(test.newDelivery, 10000);
    }

    function onNewDelivery(newDelivery) {
        console.log(newDelivery);
        workflow.setState("new_delivery", newDelivery);
    }

    return {
        init: init
    }

}(TIRAMIZOO, jQuery));