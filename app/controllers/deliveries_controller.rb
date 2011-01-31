class DeliveriesController < ApplicationController

  def index
    
  end

  def info
    render :json => @current_courier.get_delivery_info(request_json) if request.get?
  end

  def state
    render :json => @current_courier.set_delivery_state(request_json) if request.post?
  end

  def offer_answer
    render :json => @current_courier.set_delivery_offer_answer(request_json) if request.post?
  end

end