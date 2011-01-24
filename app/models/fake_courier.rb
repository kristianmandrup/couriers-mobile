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
    {}
  end

end