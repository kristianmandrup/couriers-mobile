class MainController < ActionController::Base
  layout "application"

  def index
    @courier = Courier.current_courier
  end
  
end