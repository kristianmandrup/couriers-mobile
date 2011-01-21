class CouriersController < ApplicationController

  def state
    render_json Courier.current.get_state if request.get?
    render_json Courier.current.set_state(json_request) if request.post?
  end

  def location
    render_json Courier.current.set_location(json_request) if request.post?
  end

  def nearby_couriers
    render_json Courier.current.nearby_couriers if request.get?
  end

end