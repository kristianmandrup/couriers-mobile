class BillingsController < ApplicationController

  def edit
    
  end

  def update
    render :update do |page|
      page.redirect_to root_url
    end
  end

end