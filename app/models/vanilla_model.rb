module VanillaModel
  def self.included(base)
    base.class_eval do
        include ActiveModel::Validations
        include ActiveModel::Conversion
        extend ActiveModel::Naming

        def initialize(attributes = {})
          update_attributes attributes
        end
      
        def update_attributes(attributes)
          attributes.each do |name, value|
            send("#{name}=", value)
          end
        end

        def save
          if valid?
            #save
          else
            false
          end
        end

        def persisted?
          false
        end
    end
  end
end