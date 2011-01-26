class SettingsController < ApplicationController

  def edit
    @settings = Settings.find()
  end

  def update
    #if @settings.update_attributes(params[:settings])
      #render :update do |page|
        #page.redirect_to root_url
      #end
    #end
    mobile_redirect_to root_path
  end

end