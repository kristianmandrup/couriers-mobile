class Courier
  include TiramizooApi
  
  attr_accessor :current

  def self.current
    @current = Courier.new
  end

  def get_state
    #call_api :get, "courier/state"
    {
      "work_state" => "not_available",
      "current_delivery" => {
        "state" => "ready",
        "id" => "1"
      }
    }
  end

  def set_state(state)
    #call_api :post, "courier/state", state
    {"work_state" => "available"};
  end

  def location
    
  end

  def set_location(location)
    #call_api :post, "courier/location", location
    {"location" => "nirvana"}
  end

  def nearby_couriers
    #call_api :get, "location/nearby_couriers"
    [
      {
        #id" => "1",
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

end