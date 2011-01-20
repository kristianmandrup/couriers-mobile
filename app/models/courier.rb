class Courier

  attr_accessor :current_courier

  def self.current_courier
    @current_courier = Courier.new
  end

  def current_state
    #state_result = RestClient.get "http://tiramizoo-beta.heroku.com/courier/state"
    #ActiveSupport::JSON.decode(state_result)
    @current_state = {
      :work_state => "available",
      :current_delivery => {
        :state => "ready",
        :id => "1"
      }
    }
  end

  def change_state
    
  end

  def update_location
    
  end

end