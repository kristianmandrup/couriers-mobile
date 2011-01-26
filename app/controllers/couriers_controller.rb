class CouriersController < ApplicationController

  def info
    render :json => @current_courier.get_info if request.get?
  end

  def state
    render :json => @current_courier.set_state(params) if request.post?
  end

  def location
    render :json => @current_courier.set_location(params) if request.post?
  end

  def nearby_couriers
    render :json => @current_courier.nearby_couriers if request.get?
  end

end