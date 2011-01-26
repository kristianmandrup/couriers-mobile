class Courier
  include TiramizooApi

  attr_accessor :id

  def authenticate
    @id = 1
  end

  def get_info
    call_api :get, "courier/info"
  end

  def set_state(params)
    call_api :put, "courier/state", params
  end

  def set_location(params)
    call_api :put, "courier/location", params
  end

  def nearby_couriers
    call_api :get, "location/nearby_couriers"
  end

  def get_delivery_info(id)
    call_api :get, "courier/deliveries/#{id}/info"
  end

  def set_delivery_state(params)
    call_api :put, "courier/deliveries/#{params[:id]}/state"
  end

  def set_delivery_offer_response(params)
    call_api :put, "courier/delivery_offers/#{params[:id]}/state", params
  end

end