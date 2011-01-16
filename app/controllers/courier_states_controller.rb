class CourierStatesController < ApplicationController

  def show
    
  end

  def edit
    online_state = CourierState.new
    online_state.id = 1
    online_state.name = "online"

    offline_state = CourierState.new
    offline_state.id = 2
    offline_state.name = "offline"

    @states = [online_state, offline_state]
  end

  def update
    respond_to do |format|
      format.html { redirect_to root_path }
      format.xml  { head :ok }
    end
  end

end