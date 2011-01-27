class DeliveriesController < ApplicationController

  def index
    
  end

  def info
    render :json => @current_courier.get_delivery_info(params) if request.get?
  end

  def state
    render :json => @current_courier.set_delivery_state(params) if request.post?
  end

  def offer_answer
    render :json => @current_courier.set_delivery_offer_answer(params) if request.post?
  end

end