class FakeCourier

  attr_accessor :id

  def authenticate
    @id = 1
  end

  def get_state
    {
      "work_state" => "not_available",
      "current_delivery" => {
        "state" => "ready",
        "id" => "1"
      }
    }
  end

  def set_state(state)
    {"work_state" => "available"};
  end

  def location
    
  end

  def set_location(location)
    {"location" => "nirvana"}
  end

  def nearby_couriers
    [
      {
        "id" => "1",
        "position" => {
                "latitude" => 48.14978394834768,
                "longitude" => 11.57573014497757
            },
        "vehicle" => "bike|cargobike|motorbike|car|van"
      },
      {
        "id" => "2",
        "position" => {
                "latitude" => 48.13922104853906,
                "longitude" => 11.56599909067154
            },
        "vehicle" => "bike|cargobike|motorbike|car|van"
      }
    ]
  end

  def set_delivery_state(delivery)
    result = {status: {
        code: "OK",
        message: "OK"}
    }
    case delivery[:state]
      when "accepted"
        delivery_accepted result
      when "arrived_at_pickup"
        arrived_at_pickup result
      when "arrived_at_dropoff"
        arrived_at_dropoff result
      else
        result
    end
  end

  def delivery_accepted(result)
    result[:pickup] = {
        location: {
            address: {
              street: "Sendlinger Str. 7"
           }
        },
        contact: 	{
          company_name: "tiramizoo",
          name: "Michael Loehr",
          email: "michael.loehr@tiramizoo.com",
          phone: "089123456789"
        },
        notes: "Big box"
    }
    result
  end

  def arrived_at_pickup(result)
    result[:dropoff] = {
        location: {
            address: {
              street: "Tuerkenstr. 60"
           }
        },
        contact: 	{
          company_name: "tiramizoo",
          name: "Max Mustermann",
          email: "max.mustermann@host.com",
          phone: "089123456789"
        },
        notes: "Big box"
    }
    result
  end

  def arrived_at_dropoff(result)
    arrived_at_pickup result
  end

end