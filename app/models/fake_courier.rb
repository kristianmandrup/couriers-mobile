class FakeCourier

  attr_accessor :id

  def authenticate
    @id = 1
  end

  def get_info
    {
      "work_state" => "not_available"
    }
  end

  def set_state(state)
    {"work_state" => "available"};
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
        "vehicle" => "bike"
      },
      {
        "id" => "2",
        "position" => {
                "latitude" => 48.13899,
                "longitude" => 11.55010
            },
        "vehicle" => "car"
      },
      {
        "id" => "3",
        "position" => {
                "latitude" => 48.13857,
                "longitude" => 11.56576
            },
        "vehicle" => "car"
      },
      {
        "id" => "4",
        "position" => {
                "latitude" => 48.13307,
                "longitude" => 11.57463
            },
        "vehicle" => "motorbike"
      },
      {
        "id" => "5",
        "position" => {
                "latitude" => 48.14264,
                "longitude" => 11.57711
            },
        "vehicle" => "cargobike"
      },
      {
        "id" => "5",
        "position" => {
                "latitude" => 48.14264,
                "longitude" => 11.57711
            },
        "vehicle" => "cargobike"
      },
      {
        "id" => "6",
        "position" => {
                "latitude" => 48.14702,
                "longitude" => 11.58182
            },
        "vehicle" => "van"
      }
    ]
  end

  def get_delivery_info(delivery)
    {}
  end

  def set_delivery_state(delivery)
    case delivery[:state]
      when "arrived_at_pickup"
        arrived_at_pickup response_result
      when "arrived_at_dropoff"
        arrived_at_dropoff response_result
      else
        response_result
    end
  end

  def set_delivery_offer_response(delivery)
    case delivery[:response]
      when "accepted"
        delivery_accepted response_result
      when "declined"
        response_result
      else
        response_result
    end
  end

  protected
  def response_result
    {status: {
        code: "OK",
        message: "OK"}
    }
  end

  def delivery_accepted(result)
    result[:pickup] = {
        location: {
            address: {
              street: "Muellerstr. 42"
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