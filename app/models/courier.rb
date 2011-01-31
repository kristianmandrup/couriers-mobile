# Note: This class does not use ruby getter and setters because ruby setters cannot return an arbitrary value
# However, we want to return the result of the put/post request here
class Courier
  include TiramizooApi

  attr_accessor :id

  def authenticate
    @id = "1"
  end

  def get_info
    api_get "#{courier_path}/info"
  end

  def set_state(params)
    api_put "#{courier_path}/state", params
  end

  def set_location(params)
    api_put "#{courier_path}/location", params
  end

  def nearby_couriers
    api_get "location/nearby_couriers"
  end

  def get_delivery_info(params)
    api_get "#{courier_path}/deliveries/#{params[:id]}/info"
  end

  def set_delivery_state(params)
    api_put "#{courier_path}/deliveries/#{params[:id]}/state", params
  end

  def set_delivery_offer_answer(params)
    api_put "#{courier_path}/delivery_offers/#{params[:id]}/answer", params
  end

  protected
  def courier_path
    "couriers/#{id}"
  end

end