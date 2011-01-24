class CouriersController < ApplicationController

  def state
    render_json @current_courier.get_state if request.get?
    render_json @current_courier.set_state(params) if request.post?
  end

  def location
    render_json @current_courier.set_location(params) if request.post?
  end

  def nearby_couriers
    render_json @current_courier.nearby_couriers if request.get?
  end

  def delivery_state
    render_json @current_courier.set_delivery_state(params) if request.post?
  end

end