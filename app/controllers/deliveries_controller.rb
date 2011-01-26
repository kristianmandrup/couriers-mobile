class DeliveriesController < ApplicationController

  def index
    
  end

  def delivery_info
    render :json => @current_courier.get_delivery_info(params) if request.get?
  end

  def delivery_state
    render :json => @current_courier.set_delivery_state(params) if request.post?
  end

  def delivery_offer_response
    render :json => @current_courier.set_delivery_offer_response(params) if request.post?
  end

end