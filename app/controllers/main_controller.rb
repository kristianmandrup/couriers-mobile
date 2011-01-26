class MainController < ApplicationController
  layout "application"

  def index
    @courier_info = @current_courier.get_info
  end
  
end