class Courier
  include TiramizooApi

  attr_accessor :id

  def authenticate
    @id = 1
  end

  def get_info
    call_api :get, "couriers/#{id}/info"
  end

  def set_state(params)
    call_api :put, "couriers/#{id}/state", params
  end

  def set_location(params)
    call_api :put, "couriers/#{id}/location", params
  end

  def nearby_couriers
    call_api :get, "location/nearby_couriers"
  end

  def get_delivery_info(params)
    call_api :get, "couriers/#{id}/deliveries/#{params[:id]}/info"
  end

  def set_delivery_state(params)
    call_api :put, "couriers/#{id}/deliveries/#{params[:id]}/state", params
  end

  def set_delivery_offer_answer(params)
    call_api :put, "couriers/#{id}/delivery_offers/#{params[:id]}/answer", params
  end

end