module BillingsHelper

  def pickup_street
    @current_delivery[:pickup][:address][:street]
  end

  def dropoff_street
    @current_delivery[:dropoff][:address][:street]
  end

end