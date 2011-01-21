class ApiController < ApplicationController

  respond_to :json

  def state
    respond_with({:work_state => "available"}) if request.get?
    respond_with({:work_state => "not_available"}) if request.post?
  end

end