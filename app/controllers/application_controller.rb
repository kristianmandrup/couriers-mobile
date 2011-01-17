class ApplicationController < ActionController::Base
  protect_from_forgery

  # jquery mobile "redirect" via rjs template
  def mobile_redirect_to(path)
    @mobile_redirect_path = path
    render "application/redirect"
  end
end