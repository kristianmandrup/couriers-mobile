/**
 * Functions for controlling Google Maps
 */
TIRAMIZOO.namespace("map");
TIRAMIZOO.map = (function (app, $) {
    var courier = app.courier,
    events = app.events,
    geolocation = app.geolocation,
    g = google.maps,
    map,
    mapOptions = {
        zoom: 15,
        center: new g.LatLng(48.1359717, 11.572207),
        mapTypeId: g.MapTypeId.ROADMAP,
        mapTypeControl: false,
        navigationControl: true,
        navigationControlOptions: {
            style: g.NavigationControlStyle.ZOOM_PAN,
            position: g.ControlPosition.LEFT_CENTER
        },
        scaleControl: true,
        scaleControlOptions: {
            position: g.ControlPosition.LEFT_CENTER
        }
    },
    currentLocationMarker,
    nearbyCourierMarkers,
    directionsRenderer,
    currentRoute;

    function init() {
        map = new g.Map(document.getElementById("map-canvas"), mapOptions);
        currentLocationMarker = new g.Marker({map: map, position: mapOptions.center, title: "YOU!"});
        updatePosition({latitude: mapOptions.center.lat(), longitude: mapOptions.center.lng()});
        events.add("geolocationUpdated", getlocationUpdated);
    }

    function getlocationUpdated(event, position) {
        updatePosition(position);
    }

    function updatePosition(position) {
        var currentLocation = new g.LatLng(position.latitude, position.longitude);
        currentLocationMarker.setPosition(currentLocation);
        map.setCenter(currentLocation);
    }

    function showMyLocation() {
        map.setCenter(currentLocationMarker.getPosition());
    }

    function getNearbyCouriers(callback) {
        var bounds = map.getBounds(),
        northEast = bounds.getNorthEast(),
        southWest = bounds.getSouthWest();
        courier.getNearbyCouriers({
                northEast: {
                    latitude: northEast.lat(),
                    longitude: northEast.lng()},
                southWest: {
                    latitude: southWest.lat(),
                    longitude: southWest.lng()}},
                function(nearbyCouriers) {
                    showNearbyCouriers(nearbyCouriers);
                    callback();
                });
    }

    function showNearbyCouriers(couriers) {
        var courierData,
        nearbyCourierLocation,
        nearbyCourierLocations = [];

        nearbyCourierMarkers = [];
        for (var i = 0, max = couriers.length; i < max; i++) {
            courierData = couriers[i];
            nearbyCourierLocation = new g.LatLng(courierData.position.latitude, courierData.position.longitude);
            nearbyCourierMarkers.push(new g.Marker({
                map: map,
                position: nearbyCourierLocation,
                title: courierData.id,
                icon: "../images/icon-" + courierData.vehicle + ".png"}));
            nearbyCourierLocations.push(nearbyCourierLocation);
        }
        fitToLocations(nearbyCourierLocations);
    }

    function hideNearbyCouriers() {
        if (nearbyCourierMarkers) {
            for (var i = 0, max = nearbyCourierMarkers.length; i < max; i++) {
                nearbyCourierMarkers[i].setMap(null);
            }
            nearbyCourierMarkers = null;
        }
    }

    function toggleNearbyCouriers(callback) {
        if (nearbyCourierMarkers) {
            hideNearbyCouriers();
            callback(false);
        } else {
            getNearbyCouriers(function() {
                callback(true);
            });
        }
    }

    function showRoute(route) {
        if (route.equals(currentRoute)) {
            return;
        } else {
            hideRoute();
        }

        var travelMode,
        directionsService = new g.DirectionsService(),
        directionsRequest;
       
        directionsRenderer = new g.DirectionsRenderer();
        directionsRenderer.setMap(map);

        switch (courier.getTravelMode()) {
            case courier.BIKING:
                travelMode = g.DirectionsTravelMode.BICYCLING;
                break;
            case courier.DRIVING:
            default:
                travelMode = g.DirectionsTravelMode.DRIVING;
                break;
        }

        directionsRequest = {
            origin: currentLocationMarker.getPosition(),
            waypoints: [{location: new g.LatLng(route.getFrom().latitude, route.getFrom().longitude)}],
            optimizeWaypoints: true,
            destination: new g.LatLng(route.getTo().latitude, route.getTo().longitude),
            travelMode: travelMode,
            unitSystem: g.DirectionsUnitSystem.METRIC
        };

        directionsService.route(directionsRequest, function(directionsResult, status) {
            if (status == g.DirectionsStatus.OK) {
                directionsRenderer.setDirections(directionsResult);
                currentRoute = route;
            }
        });
    }

    function hideRoute() {
        if (directionsRenderer) {
            directionsRenderer.setMap(null);
            directionsRenderer = null;
            currentRoute = null;
        }
    }

    function fitToLocations(locations) {
        if (locations.length == 0) {
            return;
        }
        var bounds = new g.LatLngBounds();
        for (var i = 0, max = locations.length; i < max; i++) {
            bounds.extend(locations[i]);
        }
        map.fitBounds(bounds);
    }

    function fitToPositions(positions) {
        var locations = [];
        for (var i = 0, max = positions.length; i < max; i++) {
            if (positions[i]) {
                locations.push(new g.LatLng(positions[i].latitude, positions[i].longitude));
            }
        }
        fitToLocations(locations);
    }

    function showDefaultState() {
        hideRoute();
        hideNearbyCouriers();
        map.setZoom(mapOptions.zoom);
    }

    return  {
        init: init,
        showMyLocation: showMyLocation,
        toggleNearbyCouriers: toggleNearbyCouriers,
        hideNearbyCouriers: hideNearbyCouriers,
        showRoute: showRoute,
        fitToPositions: fitToPositions,
        showDefaultState: showDefaultState
    }
}(TIRAMIZOO, jQuery));

/**
 * Object to encapsulate from/to route information
 */
TIRAMIZOO.namespace("route");
TIRAMIZOO.route = function (newFrom, newTo) {
    var from = newFrom,
    to = newTo;

    function getFrom() {
        return from;
    }

    function getTo() {
        return to;
    }

    function equals(route) {
        if (!route) {
            return false;
        }
        return  route.getFrom().latitude == from.latitude &&
                route.getFrom().longitude == from.longitude &&
                route.getTo().latitude == to.latitude &&
                route.getTo().longitude == to.longitude;
    }

    return  {
        equals: equals,
        getFrom: getFrom,
        getTo: getTo
    }
};

/**
 * Notifications during delivery workflow
 */
TIRAMIZOO.namespace("workflowNotifications");
TIRAMIZOO.workflowNotifications = (function (app, $) {
    var SECONDS_TO_ACCEPT = 20,
    events = app.events,
    notifications = app.notifications,
    progressIntervalID,
    progressBar,
    progressBarMessage,
    progressStartTime,
    timeoutCallback;

    function showDeliveryOffer(deliveryData, newTimeoutCallback) {
        timeoutCallback = newTimeoutCallback;
        var title = "New Delivery Offer",
        message = "From "
                + deliveryData.pop.address.street
                + " to " + deliveryData.pod.address.street
                + " (" + deliveryData.pop.notes + ")";

        notifications.show({
            title: title,
            message: message,
            sticky: true
        });
        showAcceptanceTimeout();
    }

    function showAcceptanceTimeout() {
        notifications.show({
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
            hideAll();
            timeoutCallback();
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
        var title = "Go To Point of Pickup",
        contact = pickUpData.pop.contact,
        message = pickUpData.pop.address.street
                + ", " + contact.name + ", "
                + contact.company_name + ", "
                + contact.phone + " "
                + " (" + pickUpData.pop.notes + ")";

        notifications.show({
            title: title,
            message: message,
            sticky: true
        });
    }

    function showDelivery(deliveryData) {
        var title = "Go To Point of Delivery",
        contact = deliveryData.pod.contact,
        message = deliveryData.pod.address.street
                + ", " + contact.name + ", "
                + contact.company_name + ", "
                + contact.phone + " "
                + " (" + deliveryData.pod.notes + ")";

        notifications.show({
            title: title,
            message: message,
            sticky: true
        });
    }

    function showStatus(newStatus) {
        notifications.status({
            title: "Info",
            message: newStatus.message,
            sticky: false
        });
    }

    function hideAll() {
        hideAcceptanceTimeout();
        notifications.hideAll();
    }

    return {
        showDeliveryOffer: showDeliveryOffer,
        hideAcceptanceTimeout: hideAcceptanceTimeout,
        showPickUp: showPickUp,
        showDelivery: showDelivery,
        showStatus: showStatus,
        hideAll: hideAll
    };

}(TIRAMIZOO, $));

/**
 * Workflow Base State
 */
TIRAMIZOO.namespace("workflow.state");
TIRAMIZOO.workflow.state = function (app, $) {
    var workflow = app.workflow;

    function init(data) { }
    function acceptDelivery() { }
    function declineDelivery() { }
    function pickedUp() { }
    function delivered() { }
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
        pickedUp: pickedUp,
        delivered: delivered,
        bill: bill,
        cancel: cancel
    }
};

/**
 * Workflow Default State
 */
TIRAMIZOO.namespace("workflow.defaultState");
TIRAMIZOO.workflow.defaultState = function (app, $) {
    var map = app.map,
    navigation = app.navigation,
    notifications = app.workflowNotifications;

    function init(data) {
        notifications.hideAll();
        navigation.showDefaultState();
        map.showDefaultState();
    }

    return {
        init: init
    }
};

/**
 * Workflow Delivery Offer State
 */
TIRAMIZOO.namespace("workflow.deliveryOfferState");
TIRAMIZOO.workflow.deliveryOfferState = function (app, $) {
    var ajax = app.ajax,
    courier = app.courier,
    navigation = app.navigation,
    notifications = app.workflowNotifications,
    workflow = app.workflow;

    function init(deliveryOffer) {
        workflow.setCurrentDelivery(deliveryOffer);
        notifications.showDeliveryOffer(deliveryOffer, deliveryOfferTimedOut);
        navigation.showDeliveryOffer();
        workflow.showDeliveryRoute(deliveryOffer);
    }

    function deliveryOfferTimedOut() {
        workflow.setState("default");
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
        console.log("currentDelivery", workflow.getCurrentDelivery());
        ajax.postJSON({
            action:"couriers/" +
                    courier.getID() +
                    "/delivery_offers/" +
                    workflow.getCurrentDelivery().id +
                    "/answer",
            params: {answer: response},
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

/**
 * Workflow Delivery Accepted State
 */
TIRAMIZOO.namespace("workflow.acceptedState");
TIRAMIZOO.workflow.acceptedState = function (app, $) {
    var codes = app.codes,
    courier = app.courier,
    map = app.map,
    navigation = app.navigation,
    notifications = app.workflowNotifications,
    workflow = app.workflow;

    function init(pickUpData) {
        if (pickUpData.status.code == codes.OK) {
            notifications.showPickUp(pickUpData);
            navigation.showDeliveryAccepted();
            workflow.showDeliveryRoute(pickUpData);
            map.fitToPositions([courier.getPosition(), pickUpData.pop.position]);
        } else {
            notifications.showStatus(pickUpData.status);
            navigation.showDefaultState();
            map.showDefaultState();
        }
    }

    function pickedUp() {
        workflow.setRemoteDeliveryState("picked_up", function(dropOffData) {
            workflow.setState("picked_up", dropOffData);
        });
    }

    return {
        init: init,
        pickedUp: pickedUp
    }
};

/**
 * Workflow Delivery Picked Up State
 */
TIRAMIZOO.namespace("workflow.pickedUpState");
TIRAMIZOO.workflow.pickedUpState = function (app, $) {
    var map = app.map,
    navigation = app.navigation,
    notifications = app.workflowNotifications,
    workflow = app.workflow;

    function init(deliveryData) {
        notifications.showDelivery(deliveryData);
        navigation.showPickedUp();
        workflow.showDeliveryRoute(deliveryData);
        map.fitToPositions([deliveryData.pop.position, deliveryData.pod.position]);
    }

    function delivered() {
        workflow.setRemoteDeliveryState("delivered", function(billingData) {
            workflow.setState("delivered", billingData);
        });
    }

    return {
        init: init,
        delivered: delivered
    }
};

/**
 * Workflow Delivery Delivered State
 */
TIRAMIZOO.namespace("workflow.deliveredState");
TIRAMIZOO.workflow.deliveredState = function (app, $) {
    var map = app.map,
    navigation = app.navigation,
    notifications = app.workflowNotifications,
    workflow = app.workflow;

    function init(billingData) {
        app.main.gotoPage("/billings/edit");
        workflow.setCurrentDelivery(null);
        notifications.hideAll();
        navigation.showDefaultState();
        map.showDefaultState();
    }

    return {
        init: init
    }
};

/**
 * Delivery workflow (state machine)
 */
TIRAMIZOO.namespace("workflow");
TIRAMIZOO.workflow = (function (app, $) {
    var ajax = app.ajax,
    courier = app.courier,
    map = app.map,
    route = app.route,
    stateMapping = {
        delivery_offer: "deliveryOfferState",
        accepted: "acceptedState",
        picked_up: "pickedUpState",
        delivered: "deliveredState",
        billed: "defaultState",
        cancelled: "defaultState"
    },
    workflow = app.workflow,
    currentDelivery,
    currentState;

    function init(info) {
        currentDelivery = info.currentDelivery;
        if (currentDelivery) {
            setState(currentDelivery.state, currentDelivery);
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

    function pickedUp() {
        currentState.pickedUp();
    }

    function delivered() {
        currentState.delivered();
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
            action:"couriers/" + courier.getID() + "/deliveries/" + currentDelivery.id + "/state",
            params: {state: state, position: courier.getPosition()},
            callback: function(data) {
                callback(data);
            }
        });
    }

    function showDeliveryRoute(delivery) {
        map.showRoute(route(delivery.pop.position, delivery.pod.position));
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
        showDeliveryRoute: showDeliveryRoute,
        setState: setState,
        setDefaultState: setDefaultState,
        acceptDelivery: acceptDelivery,
        declineDelivery: declineDelivery,
        pickedUp: pickedUp,
        delivered: delivered,
        bill: bill,
        cancel: cancel
    }
}(TIRAMIZOO, jQuery));

/**
 * Utility functions to manage the main navigation
 */
TIRAMIZOO.namespace("navigation");
TIRAMIZOO.navigation = (function (app, $) {
    var courier = app.courier,
    map = app.map,
    workflow = app.workflow,
    defaultMenuItems,
    mainNav = $("#main-nav");

    function init() {
        setupNavigation();
    }

    function setupNavigation() {
        mainNav.delegate("a", "click", function(ev) {
            switch($(this).attr("id")) {
                case "my-location":
                    setMyLocation();
                    break;
                case "work-state":
                    changeWorkState();
                    break;
                case "radar":
                    changeRadar();
                    break;
                case "accept-delivery":
                    workflow.acceptDelivery();
                    break;
                case "decline-delivery":
                    workflow.declineDelivery();
                    break;
                case "picked-up":
                    workflow.pickedUp();
                    break;
                case "delivered":
                    workflow.delivered();
                    break;
                case "cancel":
                    workflow.cancel();
                    break;
            }
            $(this).removeClass("ui-btn-active");
            mainNav.find("a").each(function(index, element) {
                setButton({
                    id: $(this).attr("id"),
                    active: $(this).data("active")});
            });
        });
    }

    function setMyLocation() {
        map.showMyLocation();
    }

    function changeWorkState() {
        courier.toggleWorkState(setWorkState);
    }

    function setWorkState(state) {
        setButton({
            id: "work-state",
            label: courier.isAvailable() ? "Available" : "Not Available",
            active: courier.isAvailable()});
    }

    function changeRadar() {
        map.toggleNearbyCouriers(function(active) {
            setButton({id: "radar", active: active});
        });
    }

    function radarOff() {
        map.hideNearbyCouriers();
        setButton({id: "radar", active: false});
    }

    function showDeliveryOffer() {
        radarOff();
        setMenuItems([
            {id:"accept-delivery", label:"Accept", icon:"accept"},
            {id:"decline-delivery", label:"Decline", icon:"decline"}]);
    }

    function showDeliveryAccepted() {
        radarOff();
        setMenuItems([
            {id:"picked-up", label:"Delivery Picked Up", icon:"accept"},
            {id:"service-time", label:"Service Time", icon:"time"},
            {id:"cancel", label:"Cancel", icon:"decline"}]);
    }

    function showPickedUp() {
        radarOff();
        setMenuItems([
            {id:"delivered", label:"Delivered", icon:"accept"},
            {id:"service-time", label:"Service Time", icon:"time"},
            {id:"cancel", label:"Cancel", icon:"decline"}]);
    }

    function setButton(options) {
        var btn = $("#" + options.id),
        activeClass = "main-nav-btn-active";

        if (options.hasOwnProperty("active") &&
            options.active != btn.data("active")) {
            btn.data("active", options.active);
            if (options.active) {
                btn.addClass(activeClass);
            } else {
                btn.removeClass(activeClass);
            }
        }
        if (options.label) {
            btn.find(".ui-btn-text").text(options.label);
        }
    }

    function setMenuItems(items) {
        var navList,
        item,
        clonedItem,
        grid = ["a", "b", "c", "d", "e"];

        item = mainNav.find("li:first").clone();
        item.attr("class", "")
                .find("a:first").attr("id", "")
                .find("span.ui-icon").attr("class", "ui-icon");

        mainNav.find("ul:first").remove();

        navList = mainNav
                .append("<ul></ul>")
                .find("ul:first").addClass("ui-grid-" + grid[items.length - 2]);

        $.each(items, function(index, itemData) {
            clonedItem = item.clone();
            clonedItem
                    .addClass("ui-block-" + grid[index])
                    .find("a:first").attr("id", itemData.id)
                    .find(".ui-btn-text").text(itemData.label)
                    .end()
                    .find("span.ui-icon").addClass("ui-icon-" + itemData.icon);
            navList.append(clonedItem);
        });
    }

    function setDefaultMenuItems(newDefaultMenuItems) {
        defaultMenuItems = newDefaultMenuItems;
    }

    function showDefaultState() {
        mainNav.html(defaultMenuItems);
    }

    return  {
        init: init,
        setDefaultMenuItems: setDefaultMenuItems,
        setWorkState: setWorkState,
        radarOff: radarOff,
        showDeliveryOffer: showDeliveryOffer,
        showDeliveryAccepted: showDeliveryAccepted,
        showPickedUp: showPickedUp,
        showDefaultState: showDefaultState
    }
}(TIRAMIZOO, jQuery));

/**
 * Main object
 */
TIRAMIZOO.namespace("index");
TIRAMIZOO.index = (function (app, $) {
    var codes = app.codes,
    events = app.events,
    map = app.map,
    navigation = app.navigation,
    workflow = app.workflow;

    function init(options) {
        events.add("deliveryOffer", onDeliveryOffer);
        navigation.init();
        navigation.setDefaultMenuItems(options.defaultMenuItems);
        navigation.setWorkState(options.workState);
        map.init();
        workflow.init({currentDelivery: getCurrentDelivery(options.courierInfo.current_delivery)});
    }

    function getCurrentDelivery(currentDelivery) {
        if (currentDelivery) {
            currentDelivery.status = {code: codes.OK};
        }
        return currentDelivery;
    }

    function onDeliveryOffer(event, deliveryOffer) {
        workflow.setState("delivery_offer", deliveryOffer);
    }

    return {
        init: init
    }
}(TIRAMIZOO, jQuery));