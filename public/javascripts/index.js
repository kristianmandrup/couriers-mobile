/**
 * Functions for controlling the Google Map
 */
TIRAMIZOO.namespace("map");
TIRAMIZOO.map = (function (app, $) {
    var courier = app.courier,
    map,
    initialLocation = new google.maps.LatLng(48.1359717, 11.572207),
    mapOptions = {
        zoom: 15,
        center: initialLocation,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        mapTypeControlOptions: {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.LEFT_CENTER
        },
        navigationControl: true,
        navigationControlOptions: {
            style: google.maps.NavigationControlStyle.ZOOM_PAN,
            position: google.maps.ControlPosition.LEFT_CENTER
        },
        scaleControl: true,
        scaleControlOptions: {
            position: google.maps.ControlPosition.LEFT_CENTER
        }
    },
    geolocation,
    geolocationOptions = {
        enableHighAccuracy: false,
        maximumAge: 30000,
        timeout: 30000},
    directionsRenderer,
    currentLocationMarker,
    nearbyCourierMarkers;

    $(document).ready(function() {
        setupMap();
        setupGeolocation();
    });

    function setupMap() {
        map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
        currentLocationMarker = new google.maps.Marker({map: map, position: initialLocation, title: "YOU!"});
        updatePosition({latitude: initialLocation.lat(), longitude: initialLocation.lng()});
    }

    function setupGeolocation() {
        geolocation = navigator.geolocation;
        app.log(geolocation ? "hasGeolocation" : "noGeolocation");
        if (geolocation) {
            getCurrentPosition();
            geolocation.watchPosition(geolocationChanged, geolocationError, geolocationOptions);
        } else {
            geolocationError({code:"general"});
        }
    }

    function getCurrentPosition() {
        app.log("getCurrentPosition");
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

    function updateGeoPosition() {
        updatePosition({latitude: position.coords.latitude, longitude: position.coords.latitude});
    }

    function updatePosition(position) {
        var currentLocation = new google.maps.LatLng(position.latitude, position.longitude);
        currentLocationMarker.setPosition(currentLocation);
        map.setCenter(currentLocation);
        courier.setPosition(position);
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

    function showNearbyCouriers(courierLocations) {
        var courierMarker,
        courierLocation,
        courierPosition;

        nearbyCourierMarkers = [];
        for (var i = 0, max = courierLocations.length; i < max; i++) {
            courierLocation = courierLocations[i];
            courierPosition = new google.maps.LatLng(courierLocation.position.latitude, courierLocation.position.longitude);
            courierMarker = new google.maps.Marker({
                map: map,
                position: courierPosition,
                title: courierLocation.id,
                icon: "../images/icon-" + courierLocation.vehicle + ".png"});
            nearbyCourierMarkers.push(courierMarker);
        }
        fitMapToMarkers(nearbyCourierMarkers);
    }

    function fitMapToMarkers(markers) {
        if (markers.length == 0) {
            return;
        }
        var bounds = new google.maps.LatLngBounds();
        for (var i = 0, max = markers.length; i < max; i++) {
          bounds.extend(markers[i].getPosition());
        }
        map.fitBounds(bounds);
    }

    function hideNearbyCouriers() {
        if (nearbyCourierMarkers) {
            for (var i = 0, max = nearbyCourierMarkers.length; i < max; i++) {
                nearbyCourierMarkers[i].setMap(null);
            }
            nearbyCourierMarkers = null;
        }
    }

    function showRoute(pickUpLocation, dropOffLocation) {
        console.log("showRoute", pickUpLocation, dropOffLocation);
        var courier = app.courier,
        travelMode,
        directionsService = new google.maps.DirectionsService(),
        directionsRequest;
       
        directionsRenderer = new google.maps.DirectionsRenderer();
        directionsRenderer.setMap(map);

        switch (courier.getTravelMode()) {
            case courier.BIKING:
                travelMode = google.maps.DirectionsTravelMode.BICYCLING;
                break;
            case courier.DRIVING:
            default:
                travelMode = google.maps.DirectionsTravelMode.DRIVING;
                break;
        }

        directionsRequest = {
            origin: currentLocationMarker.getPosition(),
            waypoints: [{location: new google.maps.LatLng(pickUpLocation.latitude, pickUpLocation.longitude)}],
            optimizeWaypoints: true,
            destination: new google.maps.LatLng(dropOffLocation.latitude, dropOffLocation.longitude),
            travelMode: travelMode,
            unitSystem: google.maps.DirectionsUnitSystem.METRIC
        };

        directionsService.route(directionsRequest, function(response, status) {
            if (status == google.maps.DirectionsStatus.OK) {
                directionsRenderer.setDirections(response);
            }
        });
    }

    function hideRoute() {
        if (directionsRenderer) {
            directionsRenderer.setMap(null);
            directionsRenderer = null;
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

    function showDefaultState() {
        hideRoute();
        hideNearbyCouriers();
    }

    return  {
        showMyLocation: showMyLocation,
        toggleNearbyCouriers: toggleNearbyCouriers,
        showRoute: showRoute,
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
                case "arrived-at-pickup":
                    workflow.arrivedAtPickUp();
                    break;
                case "arrived-at-dropoff":
                    workflow.arrivedAtDropOff();
                    break;
                case "bill":
                    workflow.bill();
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
            {id:"arrived-at-pickup", label:"Arrived At Pickup", icon:"accept"},
            {id:"service-time", label:"Service Time", icon:"time"},
            {id:"cancel", label:"Cancel", icon:"decline"}]);
    }

    function showArrivedAtPickUp() {
        setMenuItems([
            {id:"arrived-at-dropoff", label:"Arrived At Dropoff", icon:"accept"},
            {id:"service-time", label:"Service Time", icon:"time"},
            {id:"cancel", label:"Cancel", icon:"decline"}]);
    }

    function showArrivedAtDropOff() {
        setMenuItems([
            {id:"bill", label:"Go To Billing", icon:"accept"},
            {id:"cancel", label:"Cancel", icon:"decline"}]);
    }

    function setButton(options) {
        var btn = $("#" + options.id),
        activeClass = "main-nav-btn-active";
        
        if (options.hasOwnProperty("active") &&
            options.active != btn.data("active")) {
            btn.data("active", options.active);
            console.log("set button", options.id, options.active);
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
        showArrivedAtPickUp: showArrivedAtPickUp,
        showArrivedAtDropOff: showArrivedAtDropOff,
        showDefaultState: showDefaultState
    }
}(TIRAMIZOO, jQuery));

/**
 * Main object
 */
TIRAMIZOO.namespace("index");
TIRAMIZOO.index = (function (app, $) {
    var events = app.events, 
    navigation = app.navigation,
    map = app.map;

    function init(options) {
        navigation.setDefaultMenuItems(options.defaultMenuItems);
        navigation.setWorkState(options.workState);

        events.add("defaultState", onDefaultState);
        events.add("newDelivery", onNewDelivery);
        events.add("deliveryAccepted", onDeliveryAccepted);
        events.add("deliveryNotAccepted", onDeliveryNotAccepted);
        events.add("arrivedAtPickUp", onArrivedAtPickUp);
        events.add("arrivedAtDropOff", onArrivedAtDropOff);
    }

    function onDefaultState(event, data) {
        navigation.showDefaultState();
        map.showDefaultState();
    }

    function onNewDelivery(event, data) {
        navigation.showNewDelivery();
        map.showDefaultState();
        map.showRoute(data.pickup.location.position, data.dropoff.location.position);
    }

    function onDeliveryAccepted(event, data) {
        navigation.showDeliveryAccepted();
    }

    function onDeliveryNotAccepted(event, data) {
        navigation.showDefaultState();
        map.showDefaultState();
    }

    function onArrivedAtPickUp(event, data) {
        navigation.showArrivedAtPickUp();
    }

    function onArrivedAtDropOff(event, data) {
        navigation.showArrivedAtDropOff();
    }

    return {
        init: init
    }
}(TIRAMIZOO, jQuery));