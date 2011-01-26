tiramizooTest = function (app, $) {
    var pubsub = app.pubsub;

    function newDelivery() {
        pubsub.publish({
            channel:"delivery-1",
            action:"delivery_offer",
                data: {
                    id: 1,
                    pickup: {
                        location: {
                            position: {
                                latitude: 48.13307,
                                longitude: 11.57463
                            },
                            address: {
                                street: "Müllerstr. 42"
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
                                street: "Türkenstraße 60"
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