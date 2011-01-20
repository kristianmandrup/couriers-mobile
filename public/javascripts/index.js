/**
 * Utility functions to control the map
 */
TIRAMIZOO.namespace("map");
TIRAMIZOO.map = (function ($) {
    var pubsub = TIRAMIZOO.pubsub,
    map,
    initialLocation = new google.maps.LatLng(48.137035, 11.575919),
    mapOptions = {
        zoom: 12,
        center: new google.maps.LatLng(48.137035, 11.575919),
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        navigationControlOptions: {style: google.maps.NavigationControlStyle.ZOOM_PAN},
        zoomControlOptions: {style: google.maps.ZoomControlStyle.SMALL}
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
        currentLocationMarker.setPosition(initialLocation);
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

    fitMapToMarkers = function(markers) {
        var bounds = new google.maps.LatLngBounds();
        for (var i = 0, max = markers.length; i < max; i++) {
          bounds.extend(markers[i]);
        }
        map.fitBounds(bounds);
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
        fitMapToMarkers([currentLocation]);
    };

    $(document).ready(function() {
        console.log("index ready");
        setupMap();
        setupGeolocation();
    })
}(jQuery));

/**
 * Utility functions to manage the courier workflow
 */
TIRAMIZOO.namespace("navigation");
TIRAMIZOO.navigation = (function ($) {
    function setMenuItems(items) {
        var itemNode = $('.ui-block-a').clone();
        for (var i = 0, max = items.length; i < max; i++) {
            itemNode.appendTo('#main-nav ul');
        }
    }

    function setButton(options) {
        var activeClass = "ui-btn-active",
        btn = $("#" + options.id);
        if (options.active) {
            btn.addClass(activeClass);
        } else {
            btn.removeClass(activeClass);
        }
        console.log(btn.find(".ui-btn-text").size());
        btn.find(".ui-btn-text").text(options.label);
    }

    function setState(state) {
        var courierAvailable = state == "available";
        TIRAMIZOO.courier.workState = state;
        setButton({
            id: "state",
            label: courierAvailable ? "Available" : "Not Available",
            active: courierAvailable});
    }

    function changeStatus() {
        $.post(
                "/courier/state",
                {work_state:getButtonData("state")},
                function(data) {
                    setState(data.workState);
                });
    }

    function changeRadar() {

    }

    $(document).ready(function() {
        $("#main-nav").delegate("a", "click", function() {
            switch($(this).attr("data-icon")) {
                case "state":
                    changeStatus();
                    break;
                case "radar":
                    changeRadar();
                    break;
            }
        });
        $.jGrowl("Hello world!");
    });

    return  {
        setState: setState
    }
}(jQuery));