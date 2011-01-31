module HashWithMethodAccess

  def method_missing(id, *args, &block)
    value = self[id]
    case value
      when nil
        raise NoMethodError
      when Hash
        value = self[id].extend(HashWithMethodAccess)
      else
        value
    end
  end

end