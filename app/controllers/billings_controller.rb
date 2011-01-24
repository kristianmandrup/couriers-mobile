class BillingsController < ApplicationController

  def edit
    @current_delivery = @current_courier.get_state
  end

  def update
    render :update do |page|
      page.redirect_to root_url
    end
  end

end