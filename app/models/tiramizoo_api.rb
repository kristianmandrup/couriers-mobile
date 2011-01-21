module TiramizooApi

  def call_api(method, path, params = {})
    rest_url = File.join(APP_CONFIG["tiramizoo_api_url"], "#{path}.json")
    
    case method
      when :get
        RestClient.send method, rest_url
      when :post
        RestClient.send method, rest_url, params
    end
  end

end