class FakeCourier

  attr_accessor :id

  def authenticate
    @id = "1"
  end

  def get_info
    {
      id: "1",
      work_state: "not_available",
      travel_mode: "biking"
    }
  end

  def set_state(params)
    {work_state: "available"};
  end

  def set_location(params)
    {location: "nirvana"}
  end

  def nearby_couriers
    [
      {
        id: "1",
        position: {
          latitude: 48.14978,
          longitude:  11.57573
        },
        vehicle: "bike"
      },
      {
        id: "2",
        position: {
          latitude: 48.13899,
          longitude:  11.55010
        },
        vehicle: "car"
      },
      {
        id: "3",
        position: {
          latitude: 48.13857,
          longitude:  11.56576
        },
        vehicle: "car"
      },
      {
        id: "4",
        position: {
          latitude: 48.13307,
          longitude:  11.57463
        },
        vehicle: "motorbike"
      },
      {
        id: "5",
        position: {
          latitude: 48.14264,
          longitude:  11.57711
        },
        vehicle: "cargobike"
      },
      {
        id: "5",
        position: {
          latitude: 48.14264,
          longitude:  11.57711
        },
        vehicle: "cargobike"
      },
      {
        id: "6",
        position: {
          latitude: 48.14702,
          longitude:  11.58182
        },
        vehicle: "van"
      }
    ]
  end

  def get_delivery_info(id)
    {
      id: "1",
      state: "accepted",
      pickup: {
        location: {
          position: {
            latitude: 48.13307,
            longitude: 11.57463
          },
          address: {
            street: "Muellerstr. 42"
          }
        },
        contact: 	{
          company_name: "tiramizoo",
          name: "Michael Loehr",
          phone: "089123456789"
        },
        notes: "Big box"
      },
      dropoff: {
        location: {
          position: {
            latitude: 48.1498756,
            longitude: 11.5758714
          },
          address: {
            street: "Tuerkenstr. 60"
          }
        },
        contact: {
          company_name: "tiramizoo",
          name: "Max Mustermann",
          phone: "089123456789"
        },
        notes: "Big box"
      }
    }
  end

  def set_delivery_state(params)
    case params[:state]
      when "arrived_at_pickup"
        get_result arrived_at_pickup
      when "arrived_at_dropoff"
        get_result arrived_at_dropoff
      else
        get_result
    end
  end

  def set_delivery_offer_response(params)
    case params[:response]
      when "accepted"
        get_result delivery_accepted
      when "declined"
        get_result
      else
        get_result
    end
  end

  protected
  def get_result(result = {})
    result[:status] = {
        code: "OK",
        message: "OK"}
    result
  end

  def delivery_accepted
    get_delivery_info(1)
  end

  def arrived_at_pickup
    get_delivery_info(1)
  end

  def arrived_at_dropoff
    get_delivery_info(1)
  end

end