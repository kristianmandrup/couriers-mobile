class Courier
  include TiramizooApi

  attr_accessor :id

  def authenticate
    @id = 1
  end

  def get_info
    call_api :get, "courier/info"
  end

  def set_state(state)
    call_api :put, "courier/state", state
  end

  def set_location(location)
    call_api :put, "courier/location", location
  end

  def nearby_couriers
    call_api :get, "location/nearby_couriers"
  end

  def get_delivery_info(delivery)
    call_api :get, "courier/deliveries/#{delivery[:id]}/info"
  end

  def set_delivery_state(delivery)
    call_api :put, "courier/deliveries/#{delivery[:id]}/state"
  end

  def set_delivery_offer_response(delivery)
    call_api :put, "courier/delivery_offers/#{delivery[:id]}/state", delivery
  end

end