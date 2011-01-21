module TiramizooApi

  def call_api(method, path, params = {})

    rest_url = File.join(APP_CONFIG["tiramizoo_api_url"], "#{path}.json")
    p "RestClient URL: #{rest_url}"

    case method
      when :get
        result = RestClient.send method, rest_url, {:accept => :json}
      when :post
        result = RestClient.send method, rest_url, params.to_json, :content_type => :json, :accept => :json
    end

    p "RestClient.result: #{result}"

    result
  end

end