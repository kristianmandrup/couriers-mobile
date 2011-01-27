require "spec_helper"

describe HashWithMethodAccess do
  context "hash with foo and bar" do
    before do
      @a_hash = {:foo => "foo", :bar => "bar"}
    end

    it "should access hash value using foo method" do
      method_hash = HashWithMethodAccess.new(@a_hash)
      method_hash.foo.should == "foo"
    end

    it "should not access hash value using blip method" do
      method_hash = HashWithMethodAccess.new(@a_hash)
      lambda {method_hash.blip}.should raise_error
    end
  end

end