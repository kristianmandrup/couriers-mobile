class MainController < ActionController::Base
  layout "application"

  def index
    @courier = Courier.current_courier
    respond_to do |format|
      format.html
      format.js
    end
  end
  
end