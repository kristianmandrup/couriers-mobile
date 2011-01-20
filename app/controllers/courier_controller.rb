class CourierController < ApplicationController

  respond_to :json

  def state
    respond_with(Courier.current_courier.current_state) if request.get?
    if request.post?
      Courier.current_courier.current_state = {}
      respond_with(current_state)
    end
  end

end