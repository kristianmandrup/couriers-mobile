class BillingsController < ApplicationController

  def edit
    @current_delivery = HashWithMethodAccess.new(@current_courier.get_info[:current_delivery])
  end

  def update
    mobile_redirect_to root_path
    #render :update do |page|
      #page.redirect_to root_url
    #end
  end

end

