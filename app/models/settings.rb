class Settings
  include ActiveModel::Validations
  include ActiveModel::Conversion
  extend ActiveModel::Naming

  attr_accessor :username, :password

  def initialize(attributes = {})
    attributes.each do |name, value|
      send("#{name}=", value)
    end
  end

  def self.find
    
  end

  def save
    if valid?
      #save to webservice
    else
      false
    end
  end

  def persisted?
    false
  end

end