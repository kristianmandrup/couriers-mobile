class ApplicationController < ActionController::Base
  protect_from_forgery

  protected
  # jquery mobile "redirect" via rjs template
  def mobile_redirect_to(path)
    @mobile_redirect_path = path
    render "application/redirect"
  end

  def json_request
    JSON.parse(request.body.read)
  end

  def render_json(obj)
    render :json => obj
  end
  
end