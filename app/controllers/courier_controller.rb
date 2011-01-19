class CourierController < ApplicationController

  responds_to :json

  def state

    respond_with(@state)
  end

end