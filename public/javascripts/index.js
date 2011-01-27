/**
 * Functions for Geolocation API
 */
TIRAMIZOO.namespace("geolocation");
TIRAMIZOO.geolocation = (function (app, $) {
    var geolocation,
    geolocationOptions = {
        enableHighAccuracy: false,
        maximumAge: 30000,
        timeout: 30000},
    geolocationID,
    updatePositionCallback;

    function init(newUpdatePositionCallback) {
        updatePositionCallback = newUpdatePositionCallback;
        start();
    }

    function start() {
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
        updatePositionCallback(geoPosition.coords.latitude, geoPosition.coords.longitude);
    }

    return {
        init: init
    }
}(TIRAMIZOO, jQuery));

/**
 * Functions for controlling the Google Map
 */
TIRAMIZOO.namespace("map");
TIRAMIZOO.map = (function (app, $) {
    var courier = app.courier,
    geolocation = app.geolocation,
    g = google.maps,
    map,
    mapOptions = {
        zoom: 15,
        center: new g.LatLng(48.1359717, 11.572207),
        mapTypeId: g.MapTypeId.ROADMAP,
        mapTypeControl: false,
        mapTypeControlOptions: {
            style: g.MapTypeControlStyle.HORIZONTAL_BAR,
            position: g.ControlPosition.LEFT_CENTER
        },
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
    routeFromPosition,
    routeToPosition;

    $(document).ready(function() {
        map = new g.Map(document.getElementById("map-canvas"), mapOptions);
        currentLocationMarker = new g.Marker({map: map, position: mapOptions.center, title: "YOU!"});
        updatePosition(mapOptions.center.lat(), mapOptions.center.lng());
        geolocation.init(updatePosition);
    });

    function updatePosition(latitude, longitude) {
        var currentLocation = new g.LatLng(latitude, longitude);
        currentLocationMarker.setPosition(currentLocation);
        map.setCenter(currentLocation);
        courier.setPosition({latitude: latitude, longitude: longitude});
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

    function routeAlreadyCalculate(fromPosition, toPosition) {
        if (routeFromPosition && routeToPosition) {
            if (fromPosition.latitude == routeFromPosition.latitude &&
                fromPosition.longitude == routeFromPosition.longitude &&
                toPosition.latitude == routeToPosition.latitude &&
                toPosition.longitude == routeToPosition.longitude) {
                return true;
            }
        }
        return false;
    }

    function showRoute(pickUpPosition, dropOffPosition) {
        if (routeAlreadyCalculate(pickUpPosition, dropOffPosition)) {
            return;
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
            waypoints: [{location: new g.LatLng(pickUpPosition.latitude, pickUpPosition.longitude)}],
            optimizeWaypoints: true,
            destination: new g.LatLng(dropOffPosition.latitude, dropOffPosition.longitude),
            travelMode: travelMode,
            unitSystem: g.DirectionsUnitSystem.METRIC
        };

        directionsService.route(directionsRequest, function(directionsResult, status) {
            if (status == g.DirectionsStatus.OK) {
                directionsRenderer.setDirections(directionsResult);
                routeFromPosition = pickUpPosition;
                routeToPosition = dropOffPosition;
            }
        });
    }

    function hideRoute() {
        if (directionsRenderer) {
            directionsRenderer.setMap(null);
            directionsRenderer = null;
        }
        routeFromPosition = null;
        routeToPosition = null;
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
            locations.push(new g.LatLng(positions[i].latitude, positions[i].longitude));
        }
        fitToLocations(locations);
    }

    function showDefaultState() {
        hideRoute();
        hideNearbyCouriers();
        map.setZoom(mapOptions.zoom);
    }

    return  {
        showMyLocation: showMyLocation,
        toggleNearbyCouriers: toggleNearbyCouriers,
        showRoute: showRoute,
        fitToPositions: fitToPositions,
        showDefaultState: showDefaultState
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

    $(document).ready(function() {
        setupNavigation();
    });

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

    function showNewDelivery() {
        setButton({id:"radar", active: false});
        setMenuItems([
            {id:"accept-delivery", label:"Accept", icon:"accept"},
            {id:"decline-delivery", label:"Decline", icon:"decline"}]);
    }

    function showDeliveryAccepted() {
        setMenuItems([
            {id:"picked-up", label:"Delivery picked up", icon:"accept"},
            {id:"service-time", label:"Service Time", icon:"time"},
            {id:"cancel", label:"Cancel", icon:"decline"}]);
    }

    function showPickedUp() {
        setMenuItems([
            {id:"delivered", label:"Delivered", icon:"accept"},
            {id:"service-time", label:"Service Time", icon:"time"},
            {id:"cancel", label:"Cancel", icon:"decline"}]);
    }

    function setButton(options) {
        var btn = $("#" + options.id),
        activeClass = "main-nav-btn-active";
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
        setDefaultMenuItems: setDefaultMenuItems,
        setWorkState: setWorkState,
        showNewDelivery: showNewDelivery,
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
    var courier = app.courier,
    events = app.events,
    navigation = app.navigation,
    map = app.map;

    function init(options) {
        navigation.setDefaultMenuItems(options.defaultMenuItems);
        navigation.setWorkState(options.workState);

        events.add("defaultState", onDefaultState);
        events.add("newDelivery", onNewDelivery);
        events.add("deliveryAccepted", onDeliveryAccepted);
        events.add("deliveryNotAccepted", onDeliveryNotAccepted);
        events.add("pickedUp", pickedUp);
        events.add("billing", onBilling);
    }

    function onDefaultState(event, data) {
        navigation.showDefaultState();
        map.showDefaultState();
    }

    function onNewDelivery(event, delivery) {
        navigation.showNewDelivery();
        map.showDefaultState();
        showDeliveryRoute(delivery);
    }

    function onDeliveryAccepted(event, delivery) {
        navigation.showDeliveryAccepted();
        showDeliveryRoute(delivery);
        map.fitToPositions([courier.getPosition(), delivery.pickup.position]);
    }

    function onDeliveryNotAccepted(event, delivery) {
        navigation.showDefaultState();
        map.showDefaultState();
    }

    function pickedUp(event, delivery) {
        navigation.showPickedUp();
        showDeliveryRoute(delivery);
        map.fitToPositions([delivery.pickup.position, delivery.dropoff.position]);
    }

    function onBilling(event, data) {
        navigation.showDefaultState();
        map.showDefaultState();
    }

    function showDeliveryRoute(delivery) {
        map.showRoute(delivery.pickup.position, delivery.dropoff.position);
    }

    return {
        init: init
    }
}(TIRAMIZOO, jQuery));