class MainController < ApplicationController
  layout "application"

  def index
    p "current_courier #{@current_courier}"
    @courier_state = @current_courier.get_info
  end
  
end