$(document).ready(function() {
    var mapOptions = {
        zoom: 6,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    },
    map;

    geoLocationSuccess = function(position) {
       map.setCenter(new google.maps.LatLng(position.coords.latitude, position.coords.longitude));
    },
    geoLocationError = function() {
       map.setCenter(new google.maps.LatLng(60, 105));
    };

    map = new google.maps.Map(document.getElementById("map-canvas"), mapOptions);
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(geoLocationSuccess, geoLocationError);
    } else {
        geoLocationError();
    }

});