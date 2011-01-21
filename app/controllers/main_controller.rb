class MainController < ApplicationController
  layout "application"

  def index
    @courier_state = Courier.current.get_state
  end
  
end