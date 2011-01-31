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
 * Notifications
 */
TIRAMIZOO.namespace("notifications");
TIRAMIZOO.notifications = (function (app, $) {
    $.jGrowl.defaults.position = "center";
    $.jGrowl.defaults.closer = false;

    function show(options) {
        hide();

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

    function hide() {
        $("div.jGrowl").jGrowl("close");
    }

    function hideAll() {
        hide();
    }

    function status(newStatus) {
        show({
            title: "Info",
            message: newStatus.message,
            sticky: false
        });
    }

    return {
        show: show,
        status: status,
        hide: hide,
        hideAll: hideAll
    };

}(TIRAMIZOO, $));

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
            action: "couriers/" + id + "/state",
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
        currentPosition = position;
        ajax.postJSON({
            action:"couriers/" + id + "/location",
            params: {position:{latitude: position.latitude, longitude: position.longitude}},
            callback: function(data) {
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
 * Functions for Geolocation API
 */
TIRAMIZOO.namespace("geolocation");
TIRAMIZOO.geolocation = (function (app, $) {
    var courier = app.courier,
    events = app.events,
    geolocation,
    geolocationOptions = {
        enableHighAccuracy: false,
        maximumAge: 30000,
        timeout: 30000},
    geolocationID;

    function init() {
        geolocation = navigator.geolocation;
        app.log(geolocation ? "hasGeolocation" : "noGeolocation");
        if (geolocation) {
            if (geolocationID) {
                geolocation.clearWatch(geolocationID);
            }
            getCurrentPosition();
            geolocationID = geolocation.watchPosition(geolocationChanged, geolocationError, geolocationOptions);
        } else {
            geolocationError({code:"general"});
        }
    }

    function getCurrentPosition() {
        geolocation.getCurrentPosition(geolocationSuccess, geolocationError, geolocationOptions);
    }

    function geolocationSuccess(geoPosition) {
        app.log("geolocationSuccess");
        updateGeoPosition(geoPosition);
    }

    function geolocationChanged(geoPosition) {
        app.log("geolocationChanged");
        updateGeoPosition(geoPosition);
    }

    function geolocationError(error) {
        switch (error.code) {
            case error.PERMISSION_DENIED:
                app.log("geolocationError: PERMISSION_DENIED");
                break;
            case error.POSITION_UNAVAILABLE:
                app.log("geolocationError: POSITION_UNAVAILABLE");
                getCurrentPosition();
                break;
            case error.TIMEOUT:
                app.log("geolocationError: TIMEOUT");
                getCurrentPosition();
                break;
            default:
                app.log("geolocationError: OTHER");
                break;
        }
    }

    function updateGeoPosition(geoPosition) {
        var position = {
            latitude: geoPosition.coords.latitude,
            longitude: geoPosition.coords.longitude};
        courier.setPosition(position);
        events.dispatch("geolocationUpdated", position);
    }

    return {
        init: init
    }

}(TIRAMIZOO, jQuery));

/**
 * Main function and initialization
 */
TIRAMIZOO.main = (function (app, $) {
    var courier = app.courier,
    events = app.events,
    geolocation = app.geolocation,
    pubsub = app.pubsub;

    $(document).bind("mobileinit", mobileInit);

    function mobileInit() {
        // temporary hack until jquery team fixes page min-height css
        $('div[data-role="page"]').live("pagecreate", function(event, ui) {
            $(this).attr("style", "");
        });
    }

    function init(options) {
        var courierInfo = options.courierInfo;
        courier.init({
                id: courierInfo.id,
                travelMode: courierInfo.travel_mode});
        pubsub.subscribe({channel:"delivery-" + courier.getID(), action:"delivery_offer", callback:onDeliveryOffer});
        geolocation.init();
        setTimeout(tiramizooTest(app, $).deliveryOffer, 10000);
    }

    function onDeliveryOffer(deliveryOffer) {
        if (!$.mobile.activePage.hasClass("page-index")) {
            window.location.href = "#";
        }
        events.dispatch("deliveryOffer", deliveryOffer);
    }

    function gotoPage(page) {
        $.mobile.changePage(page);
    }

    return {
        init: init,
        gotoPage: gotoPage
    }

}(TIRAMIZOO, jQuery));