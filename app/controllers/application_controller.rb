class ApplicationController < ActionController::Base
  protect_from_forgery

  before_filter :authenticate

  def authenticate
    @current_courier = FakeCourier.new
    @current_courier.authenticate
  end

  protected
  # jquery mobile "redirect" via rjs template
  def mobile_redirect_to(path)
    @mobile_redirect_path = path
    render "application/redirect"
  end

end