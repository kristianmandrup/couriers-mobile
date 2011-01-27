class HashWithMethodAccess
	def initialize(hash)		
		self.class.class_eval do 		
			hash.each_pair do |key, value|
				define_method(key) do 
					value
				end
			end
		end
	end	
end