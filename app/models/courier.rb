class Courier
  include TiramizooApi

  attr_accessor :id

  def authenticate
    @id = 1
  end

  def get_state
    call_api :get, "courier/state"
  end

  def set_state(state)
    call_api :post, "courier/state", state
  end

  def set_location(location)
    call_api :post, "courier/location", location
  end

  def nearby_couriers
    call_api :get, "location/nearby_couriers"
  end

  def set_delivery_state(delivery)
    call_api :post, "courier/deliveries/#{id}/state", delivery
  end

end