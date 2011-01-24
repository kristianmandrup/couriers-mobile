/**
 * Functions for controlling the Google Map
 */
TIRAMIZOO.namespace("map");
TIRAMIZOO.map = (function (app, $) {
    var pubsub = app.pubsub,
    ajax = app.ajax,
    courier = app.courier,
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
        enableHighAccuracy:false,
        maximumAge:30000,
        timeout:30000},
    currentLocationMarker,
    nearbyCourierMarkers;

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
        app.log("updatePosition");
        var currentLocation = new google.maps.LatLng(position.latitude, position.longitude);
        currentLocationMarker.setPosition(currentLocation);
        map.setCenter(currentLocation);
        courier.setPosition(position);
    }

    function showMyLocation() {
        console.log("showMyLocation", currentLocationMarker.getPosition());
        map.setCenter(currentLocationMarker.getPosition());
    }

    function getNearbyCouriers(callback) {
        app.log("getNearbyCouriers");
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
        app.log("showNearbyCouriers", courierLocations);
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
                title: courierLocation.id});
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
        var courierMarker;
        for (var i = 0, max = nearbyCourierMarkers.length; i < max; i++) {
            courierMarker = nearbyCourierMarkers[i];
            courierMarker.setMap(null);
        }
        nearbyCourierMarkers = null;
    }

   function showRoute(pickUpLocation, dropOffLocation) {
        var courier = app.courier,
        directionsService = new google.maps.DirectionsService(),
        directionsRequest,
        directionsRenderer = new google.maps.DirectionsRenderer();
        directionsRenderer.setMap(map);

        switch (courier.travelMode) {
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

    function toggleRadar(callback) {
        if (nearbyCourierMarkers) {
            hideNearbyCouriers();
            callback(false);
        } else {
            getNearbyCouriers(function() {
                callback(true);
            });
        }
    }

    $(document).ready(function() {
        setupMap();
        setupGeolocation();
    });

    return  {
        toggleRadar: toggleRadar,
        showMyLocation: showMyLocation,
        showRoute: showRoute
    }
}(TIRAMIZOO, jQuery));

/**
 * Utility functions to manage the main navigation
 */
TIRAMIZOO.namespace("navigation");
TIRAMIZOO.navigation = (function (app, $) {
    var workflow = app.workflow,
    events = app.events,
    map = app.map,
    courier = app.courier,
    defaultMenuItems,
    mainNav = $("#main-nav");

    function setupNavigation() {
        mainNav.delegate("a", "click", function(ev) {
            switch($(this).attr("id")) {
                case "location":
                    setLocation();
                    break;
                case "state":
                    changeState();
                    break;
                case "radar":
                    changeRadar();
                    break;
                case "accept-delivery":
                    acceptDelivery();
                    break;
                case "decline-delivery":
                    declineDelivery();
                    break;
                case "arrived-at-pickup":
                    arrivedAtPickUp();
                    break;
                case "arrived-at-dropoff":
                    arrivedAtDropOff();
                    break;
                case "bill":
                    bill();
                    break;
                case "cancel":
                    cancel();
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

    function addEvents() {
        app.events.add("newDelivery", onNewDelivery);
    }

    function showDefaultMenuItems() {
        console.log("showDefaultMenuItems", defaultMenuItems);
        mainNav.html(defaultMenuItems);
    }

    function onNewDelivery(event, data) {
        console.log("onNewDelivery (navigation)", data);
        setMenuItems([
                {id:"accept-delivery", label:"Accept", icon:"accept"},
                {id:"decline-delivery", label:"Decline", icon:"decline"}]);
        map.showRoute(data.pickup.location.position, data.dropoff.location.position);
    }

    function acceptDelivery() {
        workflow.acceptDelivery(function() {
            setMenuItems([
                {id:"arrived-at-pickup", label:"Arrived At Pickup", icon:"accept"},
                {id:"cancel", label:"Cancel", icon:"decline"}]);
        });
    }

    function declineDelivery() {
        workflow.declineDelivery(function() {
            showDefaultMenuItems();
        });
    }

    function arrivedAtPickUp() {
        workflow.arrivedAtPickUp(function() {
            setMenuItems([
                {id:"arrived-at-dropoff", label:"Arrived At Dropoff", icon:"accept"},
                {id:"cancel", label:"Cancel", icon:"decline"}]);
        });
    }

    function arrivedAtDropOff() {
        workflow.arrivedAtDropOff(function() {
            setMenuItems([
                {id:"bill", label:"Go To Billing", icon:"accept"},
                {id:"cancel", label:"Cancel", icon:"decline"}]);
        });
    }

    function bill() {
        workflow.bill();
    }

    function cancel() {
        workflow.cancel(function() {
            showDefaultMenuItems();
        });
    }

    function setLocation() {
        map.showMyLocation();
    }

    function changeState() {
        courier.toggleWorkState(setState);
    }

    function setState(state) {
        setButton({
            id: "state",
            label: courier.isAvailable() ? "Available" : "Not Available",
            active: courier.isAvailable()});
    }

    function changeRadar() {
        map.toggleRadar(function(active) {
            setButton({id: "radar", active: active});
        });
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

    $(document).ready(function() {
        setupNavigation();
        addEvents();
    });

    return  {
        setState: setState,
        setDefaultMenuItems: setDefaultMenuItems
    }
}(TIRAMIZOO, jQuery));

/**
 * Main object
 */
TIRAMIZOO.namespace("index");
TIRAMIZOO.index = (function (app, $) {
    var navigation = app.navigation;

    function init(options) {
        console.log("options", options.defaultMenuItems);
        navigation.setState(options.workState);
        navigation.setDefaultMenuItems(options.defaultMenuItems);
    }

    return {
        init: init
    }

}(TIRAMIZOO, jQuery));