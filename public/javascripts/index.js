/**
 * Utility functions to control the map
 */
TIRAMIZOO.namespace("map");
TIRAMIZOO.map = (function (app, $) {
    var pubsub = app.pubsub,
    ajax = app.ajax,
    map,
    initialPosition = new google.maps.LatLng(48.137035, 11.575919),
    mapOptions = {
        zoom: 15,
        center: initialPosition,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        mapTypeControl: true,
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
        currentLocationMarker = new google.maps.Marker({map: map, position: initialPosition, title: "YOU!"});
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

    function geolocationSuccess(position) {
        app.log("geolocationSuccess");
        updatePosition(position);
    }

    function geolocationChanged(position) {
        app.log("geolocationChanged");
        updatePosition(position);
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

    function fitMapToMarkers(markers) {
        var bounds = new google.maps.LatLngBounds();
        for (var i = 0, max = markers.length; i < max; i++) {
          bounds.extend(markers[i].getPosition());
        }
        map.fitBounds(bounds);
    }

    function updatePosition(position) {
        app.log("updatePosition");
        var currentPosition = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
        currentLocationMarker.setPosition(currentPosition);
        map.setCenter(currentPosition);
        ajax.postJSON({
            action:"courier/location",
            params: {position:{latitude: currentPosition.lat(), longitude: currentPosition.lng()}},
            callback: function(data) {
                app.log("posted location");
            },
            loader: false
        });
    }

    function getNearbyCouriers(callback) {
        var bounds = map.getBounds();
        var northEast = bounds.getNorthEast();
        var southWest = bounds.getSouthWest();
        ajax.getJSON({
                action: "location/nearby_couriers",
                params: {
                    ne_latitude: northEast.lat(),
                    ne_longitude: northEast.lng(),
                    sw_latitude: southWest.lat(),
                    sw_longitude: southWest.lng()
                },
                callback: function(data) {
                    showNearbyCouriers(data);
                    callback();
                }
            });
    }

    function showNearbyCouriers(courierLocations) {
        console.log("showNearbyCouriers");
        console.dir(courierLocations);
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

    function hideNearbyCouriers() {
        var courierMarker;
        for (var i = 0, max = nearbyCourierMarkers.length; i < max; i++) {
            courierMarker = nearbyCourierMarkers[i];
            courierMarker.setMap(null);
        }
        nearbyCourierMarkers = null;
    }

    $(document).ready(function() {
        app.log("index ready");
        setupMap();
        setupGeolocation();
    });

    return  {
        getNearbyCouriers: getNearbyCouriers,
        showNearbyCouriers: showNearbyCouriers,
        hideNearbyCouriers: hideNearbyCouriers,
        myLocation: getCurrentPosition
    }
}(TIRAMIZOO, jQuery));

/**
 * Utility functions to manage the main navigation
 */
TIRAMIZOO.namespace("navigation");
TIRAMIZOO.navigation = (function (app, $) {
    var map = app.map,
    ajax = app.ajax,
    model = app.model;

    function setLocation() {
        map.myLocation();
    }

    function changeState() {
        ajax.postJSON({
            action: "courier/state",
            params: {work_state: model.courier.workState == model.courier.AVAILABLE ? model.courier.NOT_AVAILABLE : model.courier.AVAILABLE},
            callback: function(data) {
                setState(data.work_state);
            }
        });
    }

    function setState(state) {
        var courierAvailable = state == model.courier.AVAILABLE;
        model.courier.workState = state;
        setButton({id: "state", label: courierAvailable ? "Available" : "Not Available", active: courierAvailable});
    }

    function setRadar(active) {
        model.radar.active = active;
        setButton({id: "radar", active: active});
    }

    function changeRadar() {
        if (!model.radar.active) {
            map.getNearbyCouriers(function() {
                setRadar(true);
            });
        } else {
            map.hideNearbyCouriers();
            setRadar(false);
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
        if (options.label) {
            btn.find(".ui-btn-text").text(options.label);
        }
    }

    function setMenuItems(items) {
        var itemNode = $('.ui-block-a').clone();
        for (var i = 0, max = items.length; i < max; i++) {
            itemNode.appendTo('#main-nav ul');
        }
    }

    $(document).ready(function() {
        $("#main-nav").delegate("a", "click", function() {
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
            }
        });
        $.jGrowl("Hello world!");
    });

    return  {
        setState: setState
    }
}(TIRAMIZOO, jQuery));