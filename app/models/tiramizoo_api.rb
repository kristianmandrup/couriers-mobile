module TiramizooApi
  
  module ClassMethods

    # refactor to use https://github.com/dbalatero/typhoeus instead of rest-client
    def call_api(method, path, params = {})
      rest_url = File.join(APP_CONFIG["tiramizoo_api_url"], "#{path}.json")
      case method
        when :get, :delete
          result = RestClient.send method, rest_url, :accept => :json
        else
          result = RestClient.send method, rest_url, params.to_json, :content_type => :json, :accept => :json
      end
      result
    end
    
  end

  def self.included(base)
    base.extend(ClassMethods)
  end

  def method_missing(id, *args, &block)
    case id.to_s
      when /^api_(.*)/
        y args
        self.class.call_api $1.to_sym, *args
      else
        super
    end
  end

end