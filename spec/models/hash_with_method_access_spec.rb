require "spec_helper"

describe HashWithMethodAccess do
  
  context "hash with some values" do
    before do
      a_hash = {
          foo: "foo",
          bar: {
              can: "can",
              haz: "haz"
          }}
      @method_hash = a_hash.extend(HashWithMethodAccess)
    end

    it "should be accessible with method syntax" do
      @method_hash.foo.should == "foo"
    end

    it "should be accessible with method syntax for nested properties" do
      @method_hash.bar.haz.should == "haz"
    end

    it "should raise error when accessing non-existing properties" do
      lambda { @method_hash.non_existent }.should raise_error
    end
  end

end