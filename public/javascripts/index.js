/**
 * Controller with utility function for the map
 */
TIRAMIZOO.namespace("map");
TIRAMIZOO.map = (function ($) {
    var pubsub = TIRAMIZOO.pubsub,
    map,
    mapOptions = {
        zoom: 6,
        center: new google.maps.LatLng(48.137035, 11.575919),
        mapTypeId: google.maps.MapTypeId.ROADMAP
    },
    geolocation,
    geolocationOptions = {
        enableHighAccuracy:false,
        maximumAge:30000,
        timeout:10000},
    currentLocation,
    currentLocationMarker,

    setupMap = function() {
        map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
        currentLocationMarker = new google.maps.Marker({
            map: map,
            title: "YOU!"});
    },

    setupGeolocation = function() {
        geolocation = navigator.geolocation;
        console.log(geolocation ? "hasGeolocation" : "noGeolocation");
        if (geolocation) {
            getCurrentPosition();
            geolocation.watchPosition(geolocationChanged, geolocationError, geolocationOptions);
        } else {
            geolocationError({code:"general"});
        }
    },

    getCurrentPosition = function() {
        geolocation.getCurrentPosition(geolocationSuccess, geolocationError, geolocationOptions);
    },

    geolocationSuccess = function(position) {
        console.log("geolocationSuccess");
        updatePosition(position);
    },

    geolocationChanged = function(position) {
        console.log("geolocationChanged");
        updatePosition(position);
    },

    geolocationError = function(error) {
        console.log("geolocationError: " + error.message + " code: " + error.code);
        console.log("errorCode constants: PERMISSION_DENIED: " + error.PERMISSION_DENIED + ", POSITION_UNAVAILABLE: " + error.POSITION_UNAVAILABLE + ", TIMEOUT: " + error.TIMEOUT);
        switch (error.code) {
            case error.PERMISSION_DENIED:
                    
                break;
            case error.POSITION_UNAVAILABLE:
                getCurrentPosition();
                break;
            case error.TIMEOUT:
                getCurrentPosition();
                break;
            default:
                    
                break;
        }
    },

    updatePosition = function(position) {
        console.log("updatePosition");
        currentLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        pubsub.publish({
            channel: "tiramizoo-courier-location",
            action: "update_location",
            data: {
                latitude: position.coords.latitude,
                position: position.coords.longitude}});
        currentLocationMarker.setPosition(currentLocation);
        map.setCenter(currentLocation);
    };

    $(document).ready(function() {
        console.log("index ready");
        setupMap();
        setupGeolocation();
    })
}(jQuery));