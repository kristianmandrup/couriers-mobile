class SettingsController < ApplicationController

  def edit
    @settings = Settings.find()
  end

  def update
    #if @settings.update_attributes(params[:settings])
      
    #end
    redirect_to root_path
  end

end