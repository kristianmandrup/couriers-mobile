tiramizooTest = function (app, $) {
    var pubsub = app.pubsub;

    function newDelivery() {
        pubsub.publish({
            channel:"delivery-channel-1",
            action:"new_delivery",
                data: {
                    id: 1,
                    directions: "3,4 km to destination",
                    pickup: {
                        location: {
                            position: {
                                latitude: 48.1359717,
                                longitude: 11.572207
                            },
                            address: {
                                street: "Sendlinger Straße 7",
                                zip: "80331",
                                city: "München"
                            }
                        },
                        notes: "Big box"
                    },
                    dropoff: {
                        location: {
                            position: {
                                latitude: 48.1498756,
                                longitude: 11.5758714
                            },
                            address: {
                                street: "Türkenstraße 60",
                                zip: "80799",
                                city: "München"
                            }
                        },
                        notes: "Big box"
                    }
                }
        });
    }

    return {
       newDelivery: newDelivery
    };

};